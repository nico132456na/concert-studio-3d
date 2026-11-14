import { memo, Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, PerformanceMonitor, Html } from '@react-three/drei';
import { getArena } from '../data/arenas';
import { ArenaModel } from './ArenaModel';
import { StageObjects } from './StageObjects';
import { FixtureRig } from './Fixtures';
import { Audience } from './Audience';
import { CameraRig, clampIndoor } from './CameraRig';
import { LowFog, PostFX, StageFx } from './Effects';
import { SoundCoverage } from './SoundCoverage';
import { PerformerRig } from './PerformerRig';
import { Backstage } from './Backstage';
import { Avatar } from './Avatar';
import { DEFAULT_LOOK } from '../performer/state';
import { stepEngine } from './lightingEngine';
import { useSettings, QUALITY } from '../state/settingsStore';
import { useCareer } from '../life/careerStore';
import { tierFor } from '../life/data';
import { useUI } from '../state/uiStore';
import { useProject } from '../state/projectStore';
import { thumbnailSource } from '../storage/autosave';
import { fmt } from '../util/misc';

export type ViewportMode = 'editor' | 'live' | 'preview' | 'menu' | 'performer';

/** Live performance numbers, read by the settings performance monitor. */
export const perf = { fps: 0, calls: 0, tris: 0, frameMs: 0 };

function Engine() {
  useFrame((_, dt) => stepEngine(Math.min(dt, 0.1)), -1);
  return null;
}

function PerfProbe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.info.autoReset = false;
  }, [gl]);
  let frames = 0;
  let acc = 0;
  useFrame((_, dt) => {
    frames++;
    acc += dt;
    if (acc > 0.5) {
      perf.fps = Math.round(frames / acc);
      perf.frameMs = Math.round((acc / frames) * 1000 * 10) / 10;
      perf.calls = gl.info.render.calls;
      perf.tris = gl.info.render.triangles;
      frames = 0;
      acc = 0;
    }
    gl.info.reset();
    // priority must stay <= 0: a positive priority makes R3F stop rendering automatically
  }, 0);
  return null;
}

function ThumbnailBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    thumbnailSource.capture = () => {
      gl.render(scene, camera);
      const src = gl.domElement;
      const c = document.createElement('canvas');
      const w = 360;
      c.width = w;
      c.height = Math.round((w * src.height) / Math.max(1, src.width));
      c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    };
    return () => {
      thumbnailSource.capture = null;
    };
  }, [gl, scene, camera]);
  return null;
}

function Guides() {
  const guides = useUI((s) => s.guides);
  if (!guides) return null;
  return (
    <group>
      {guides.x !== undefined && (
        <mesh position={[guides.x, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[0.08, 400]} />
          <meshBasicMaterial color="#ff3df2" depthTest={false} transparent opacity={0.9} />
        </mesh>
      )}
      {guides.z !== undefined && (
        <mesh position={[0, 0.06, guides.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[400, 0.08]} />
          <meshBasicMaterial color="#ff3df2" depthTest={false} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

/** In plan views, show the selected item's distance from the center line and stage front. */
function Measure() {
  const view = useUI((s) => s.view);
  const sel = useUI((s) => s.selection);
  const project = useProject((s) => s.project);
  if (view !== 'top' || sel.length !== 1 || !project) return null;
  const o = project.objects.find((x) => x.id === sel[0]);
  const f = project.fixtures.find((x) => x.id === sel[0]);
  const pos = o?.pos ?? f?.pos;
  if (!pos) return null;
  const [x, , z] = pos;
  return (
    <group>
      <mesh position={[x / 2, 0.07, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[Math.abs(x) || 0.001, 0.06]} />
        <meshBasicMaterial color="#ffd166" depthTest={false} transparent />
      </mesh>
      <mesh position={[x, 0.07, z / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[0.06, Math.abs(z) || 0.001]} />
        <meshBasicMaterial color="#66d9ff" depthTest={false} transparent />
      </mesh>
      <Html position={[x / 2, 0.1, z]} center style={{ pointerEvents: 'none' }}>
        <div className="dim-label yellow">{fmt(Math.abs(x))} m from center</div>
      </Html>
      <Html position={[x, 0.1, z / 2]} center style={{ pointerEvents: 'none' }}>
        <div className="dim-label cyan">{fmt(Math.abs(z))} m from front</div>
      </Html>
    </group>
  );
}

function Scene({ mode, arenaId }: { mode: ViewportMode; arenaId: string }) {
  const quality = useSettings((s) => s.effective);
  const showGrid = useUI((s) => s.showGrid);
  const gridSize = useUI((s) => s.gridSize);
  const showCrowd = useUI((s) => s.showCrowd);
  const view = useUI((s) => s.view);
  const lightEnv = useUI((s) => s.lightEnv);
  const showFixtures = useUI((s) => s.showFixtures);
  const savedCam = useProject((s) => s.project?.camera);
  const arena = getArena(arenaId);
  const q = QUALITY[quality];
  const density = useSettings((s) => s.crowdDensity ?? 1);
  const live = useCareer((s) => !!s.live);
  const career = useCareer((s) => s.career);
  const editor = mode === 'editor';
  const performerLook = useProject((s) => s.project?.performer?.look) ?? DEFAULT_LOOK;
  const crowd = mode === 'live' || mode === 'performer' || mode === 'menu' || mode === 'preview' || (editor && (showCrowd || view === 'audience'));
  // restore the saved camera only when the editor first opens
  const initial = useMemo(() => {
    if (editor && savedCam) return savedCam;
    // frame the design: center on its footprint so off-center stages (in-the-round, globes) are in view
    const objs = (useProject.getState().project?.objects ?? []).filter((o) => !o.hidden);
    if (!objs.length) return undefined;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const o of objs) {
      const r = Math.max(o.size[0], o.size[2]) / 2;
      x0 = Math.min(x0, o.pos[0] - r);
      x1 = Math.max(x1, o.pos[0] + r);
      z0 = Math.min(z0, o.pos[2] - r);
      z1 = Math.max(z1, o.pos[2] + r);
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const R = Math.min(70, Math.max(14, Math.max(x1 - x0, z1 - z0) / 2));
    return clampIndoor({ pos: [cx + R * 0.7, R * 0.55 + 6, cz + R * 1.25 + 10], target: [cx, 4, cz] }, arena);
  }, [arenaId, editor]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Engine />
      <PerfProbe />
      {editor && <ThumbnailBridge />}
      {mode === 'performer' ? <PerformerRig arena={arena} /> : <CameraRig arena={arena} autoRotate={mode === 'menu' || mode === 'preview'} initial={initial} />}
      {mode === 'performer' && <Backstage />}
      {mode === 'performer' && <Avatar look={performerLook} />}
      <ArenaModel arena={arena} />
      <StageObjects interactive={editor} shadows={q.shadows} />
      <FixtureRig hidden={editor && !showFixtures} interactive={editor} lightCount={q.lights} ceiling={arena.ceiling} shadows={q.shadows} segs={q.beamSegs} />
      {crowd && <Audience arena={arena} count={Math.round((mode === 'menu' ? q.crowd * 0.6 : q.crowd) * density * (live ? tierFor(career.xp, career.sandbox).crowdFill : 1))} />}
      <LowFog count={quality === 'low' ? 10 : 22} />
      {(mode === 'live' || mode === 'preview' || mode === 'performer') && <StageFx />}
      {editor && showGrid && (
        <Grid
          position={[0, 0.02, 0]}
          args={[10, 10]}
          cellSize={gridSize}
          cellThickness={0.6}
          cellColor="#3a3f4a"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#5a6170"
          fadeDistance={view === 'top' ? 400 : 120}
          fadeStrength={1.5}
          infiniteGrid
          followCamera={false}
        />
      )}
      {editor && <SoundCoverage />}
      {editor && <Guides />}
      {editor && <Measure />}
      <PostFX bloom={q.bloom} ao={q.ao} smaa={q.smaa} cinematic={lightEnv === 'cinematic'} ultra={quality === 'ultra'} />
    </>
  );
}

export const Viewport = memo(function Viewport({ mode, arenaId }: { mode: ViewportMode; arenaId: string }) {
  const quality = useSettings((s) => s.effective);
  const graphics = useSettings((s) => s.graphics);
  const setEffective = useSettings((s) => s.setEffective);
  const q = QUALITY[quality];
  const onMissed = (e: MouseEvent) => {
    if (mode !== 'editor') return;
    if (e.type !== 'click') return;
    const ui = useUI.getState();
    if (ui.dragging || ui.multiSelect) return;
    ui.select([]);
  };
  return (
    <Canvas
      key={quality}
      className="viewport-canvas"
      dpr={[1, Math.min(q.dpr, window.devicePixelRatio || 1)]}
      shadows={q.shadows}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      onPointerMissed={onMissed}
      style={{ touchAction: 'none' }}
    >
      {graphics === 'auto' && (
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => {
            if (quality === 'ultra') setEffective('high');
            else if (quality === 'high') setEffective('medium');
            else if (quality === 'medium') setEffective('low');
          }}
        />
      )}
      <Suspense fallback={null}>
        <Scene mode={mode} arenaId={arenaId} />
      </Suspense>
    </Canvas>
  );
});

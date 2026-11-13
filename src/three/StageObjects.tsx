import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { StageObject } from '../types';
import { getGeometry, ledWholeSurface } from './geometry';
import { buildMaterial, disposeMaterial, unitBoxEdges } from './materials3d';
import { createLedMaterial } from './ledMaterial';
import { screenOutput } from './lightingEngine';
import { VISUAL_BY_ID } from '../data/visuals';
import { textTexture } from './textures';
import { useMediaTexture } from './media';
import { handleItemClick, handleItemPointerDown } from './interaction';
import { useProject } from '../state/projectStore';
import { useUI } from '../state/uiStore';
import { fmt } from '../util/misc';

interface Props {
  obj: StageObject;
  selected: boolean;
  interactive: boolean;
  showLabel: boolean;
  shadows: boolean;
}

function LedSurface({ obj, geometry, side }: { obj: StageObject; geometry: THREE.BufferGeometry; side?: THREE.Side }) {
  const mat = useMemo(() => createLedMaterial(side ?? THREE.FrontSide), [side]);
  useEffect(() => () => mat.dispose(), [mat]);
  const led = obj.led!;
  const media = useMediaTexture(led.visual === 'media' ? led.mediaId : undefined, led.mediaType);
  const text = useMemo(() => (led.visual === 'text' ? textTexture(led.text || ' ') : null), [led.visual, led.text]);
  const [w, h, d] = obj.size;
  const aspect = obj.kind === 'ledFloor' ? w / Math.max(0.01, d) : obj.kind === 'ledCurved' ? (w * 1.2) / Math.max(0.01, h) : obj.kind === 'ledCircle' ? 1 : w / Math.max(0.01, h);

  useFrame((state, dt) => {
    const out = screenOutput(obj, Math.min(dt, 0.1));
    if (!out) return;
    const u = mat.uniforms;
    // live visual overrides may switch modes; textures follow the active look
    const vis = out.look.visual;
    u.uMode.value = VISUAL_BY_ID[vis]?.mode ?? 2;
    u.uTime.value = state.clock.elapsedTime * out.look.speed;
    u.uBright.value = out.bright * 1.5;
    u.uC1.value.copy(out.c1);
    u.uC2.value.copy(out.c2);
    u.uAspect.value = aspect;
    const res = led.resolution;
    if (res > 0) {
      if (aspect >= 1) u.uRes.value.set(Math.round(res * aspect), res);
      else u.uRes.value.set(res, Math.round(res / aspect));
    } else u.uRes.value.set(0, 0);
    const map = vis === 'text' ? text ?? textTexture(led.text || ' ') : vis === 'media' ? media : null;
    u.uMap.value = map;
    u.uHasMap.value = map ? 1 : 0;
  });
  return <mesh geometry={geometry} material={mat} raycast={undefined} />;
}

function Extras({ obj }: { obj: StageObject }) {
  // non-scaled children: suspension cables / catwalk rails
  if (obj.kind === 'ledHanging' || obj.kind === 'floating') {
    const top = obj.pos[1] + obj.size[1];
    const len = Math.max(0, 40 - top);
    const xs = [-obj.size[0] * 0.4, obj.size[0] * 0.4];
    return (
      <>
        {xs.map((x, i) => (
          <mesh key={i} position={[x, obj.size[1] + len / 2, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.025, 0.025, len, 4]} />
            <meshBasicMaterial color="#222" />
          </mesh>
        ))}
      </>
    );
  }
  if (obj.kind === 'catwalk') {
    return (
      <>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * obj.size[0]) / 2, obj.size[1] + 0.55, 0]} raycast={() => null}>
            <boxGeometry args={[0.06, 1.1, obj.size[2]]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.4} transparent opacity={0.6} />
          </mesh>
        ))}
      </>
    );
  }
  return null;
}

export const StageObjectMesh = memo(function StageObjectMesh({ obj, selected, interactive, showLabel, shadows }: Props) {
  const geo = getGeometry(obj.kind, obj.size);
  const whole = ledWholeSurface(obj.kind) || obj.material.preset === 'led';
  const material = useMemo(() => buildMaterial(obj.material, obj.size, geo.mainBack ? THREE.BackSide : THREE.FrontSide), [obj.material, geo.mainBack, Math.round(obj.size[0]), Math.round(obj.size[1]), Math.round(obj.size[2])]);
  useEffect(() => () => disposeMaterial(material), [material]);
  const group = useRef<THREE.Group>(null);

  const scale: [number, number, number] = [Math.max(0.01, obj.size[0]), Math.max(0.01, obj.size[1]), Math.max(0.01, obj.size[2])];
  const isGlass = obj.material.opacity < 0.999;

  return (
    <group
      ref={group}
      position={obj.pos}
      rotation={obj.rot}
      onClick={interactive ? (e) => handleItemClick(e, obj.id) : undefined}
      onPointerDown={interactive ? (e) => handleItemPointerDown(e, obj.id) : undefined}
    >
      <group scale={scale}>
        {whole && obj.led ? (
          <LedSurface obj={obj} geometry={geo.main} />
        ) : (
          <mesh geometry={geo.main} material={material} castShadow={shadows && !isGlass} receiveShadow={shadows} renderOrder={isGlass ? 2 : 0} />
        )}
        {geo.screen && obj.led && !whole && <LedSurface obj={obj} geometry={geo.screen} />}
        {selected && (
          <lineSegments geometry={unitBoxEdges} scale={[1.02, 1.02, 1.02]} raycast={() => null}>
            <lineBasicMaterial color={obj.locked ? '#ff9a3c' : '#4da3ff'} depthTest={false} transparent opacity={0.95} />
          </lineSegments>
        )}
      </group>
      <Extras obj={obj} />
      {selected && showLabel && (
        <Html position={[0, obj.size[1] + 0.6, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="dim-label">
            {fmt(obj.size[0])} × {fmt(obj.size[2])} × {fmt(obj.size[1])} m
          </div>
        </Html>
      )}
    </group>
  );
});

export function StageObjects({ interactive, shadows }: { interactive: boolean; shadows: boolean }) {
  const objects = useProject((s) => s.project?.objects);
  const selection = useUI((s) => s.selection);
  const screen = useUI((s) => s.screen);
  const sel = useMemo(() => new Set(selection), [selection]);
  if (!objects) return null;
  const showSel = screen === 'editor';
  const single = selection.length === 1;
  return (
    <group>
      {objects.filter((o) => !o.hidden).map((o) => (
        <StageObjectMesh key={o.id} obj={o} selected={showSel && sel.has(o.id)} interactive={interactive} showLabel={showSel && single} shadows={shadows} />
      ))}
    </group>
  );
}

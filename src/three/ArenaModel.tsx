import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { ArenaDef } from '../data/arenas';
import { getArenaBuild, type SeatSet } from './arenaGeometry';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useSettings, QUALITY } from '../state/settingsStore';
import { floorTexture, grassTexture, pitchTexture } from './textures';
import { engine } from './lightingEngine';
import { useUI } from '../state/uiStore';
import { useProject } from '../state/projectStore';
import { withWorldDetail } from './worldDetail';
import { pbrSet } from './pbrTextures';
import { createLedMaterial } from './ledMaterial';
import type { TimeOfDay } from '../types';

const noRay = () => null;

const skyVert = `varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const skyFrag = `
uniform vec3 uTop; uniform vec3 uHorizon; uniform float uStars;
varying vec3 vW;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
void main(){
  float y = clamp(vW.y, 0.0, 1.0);
  vec3 c = mix(uHorizon, uTop, pow(y, 0.45));
  vec3 g = floor(vW * 420.0);
  float s = step(0.9975, h(g)) * smoothstep(0.05, 0.4, y) * uStars;
  c += vec3(s);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const SKY: Record<TimeOfDay, { top: string; horizon: string; stars: number }> = {
  day: { top: '#3d78c8', horizon: '#b9d4ea', stars: 0 },
  evening: { top: '#1a2450', horizon: '#e0864a', stars: 0.2 },
  night: { top: '#020206', horizon: '#0a0c18', stars: 1 },
};

function Sky({ kind, time }: { kind: ArenaDef['sky']; time: TimeOfDay }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(time !== 'night' ? SKY[time].top : kind === 'dusk' ? '#05060f' : '#020206') },
          uHorizon: { value: new THREE.Color(time !== 'night' ? SKY[time].horizon : kind === 'dusk' ? '#2a1838' : '#0a0c18') },
          uStars: { value: SKY[time].stars },
        },
      }),
    [kind, time],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  if (kind === 'indoor') return null;
  return (
    <mesh material={mat} raycast={noRay} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[900, 32, 16]} />
    </mesh>
  );
}

/** A dark arena-like environment for reflections: black room, a ring of distant rig lights. */
function arenaEnvScene() {
  const sc = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: '#2b2e38', side: THREE.BackSide }));
  sc.add(dome);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(48, 48, 4, 48, 1, true), new THREE.MeshBasicMaterial({ color: '#4a4e5a', side: THREE.BackSide }));
  band.position.y = 2;
  sc.add(band);
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 2.0) });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 3), lamp);
    m.position.set(Math.sin(a) * 26, 28, Math.cos(a) * 26);
    sc.add(m);
  }
  const warm = new THREE.Mesh(new THREE.PlaneGeometry(30, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.5, 0.35), side: THREE.DoubleSide }));
  warm.position.set(0, 10, -40);
  sc.add(warm);
  return sc;
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const src = arenaEnvScene();
    const env = pmrem.fromScene(src, 0.02).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      src.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
    };
  }, [gl, scene]);
  return null;
}

export function timeFor(arena: ArenaDef, t?: TimeOfDay): TimeOfDay {
  return arena.sky === 'indoor' ? 'night' : t ?? 'night';
}

function AtmosphereSync({ arena, time }: { arena: ArenaDef; time: TimeOfDay }) {
  const scene = useThree((s) => s.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const fogC = time === 'day' ? '#a9c0d6' : time === 'evening' ? '#4a3a48' : arena.sky === 'indoor' ? '#050508' : '#07070f';
    const fog = new THREE.FogExp2(fogC, 0.004);
    scene.fog = fog;
    scene.background = new THREE.Color(arena.sky === 'indoor' ? (arena.kind === 'empty' ? '#0b0b0d' : '#050507') : time === 'day' ? '#9cc0e0' : time === 'evening' ? '#3a2a3a' : '#020206');
    return () => {
      scene.fog = null;
    };
  }, [scene, arena, time]);
  const fill = useRef<THREE.DirectionalLight>(null);
  const gl = useThree((st) => st.gl);
  useFrame(() => {
    const ui = useUI.getState();
    const st = useSettings.getState();
    // lighting environment: bright neutral work light while building, darker for the show
    const env = ui.screen === 'editor' ? ui.lightEnv : ui.screen === 'menu' || ui.screen === 'arenas' || ui.screen === 'gallery' ? 'preview' : ui.lightEnv === 'cinematic' ? 'cinematic' : 'concert';
    let house = engine.house;
    if (env === 'construction') house = Math.max(house, 1);
    else if (env === 'concert') house *= 0.35;
    else if (env === 'cinematic') house *= 0.2;
    const work = env === 'construction';
    // daylight / sunset for open-air venues
    const sun = time === 'day' ? 1 : time === 'evening' ? 0.45 : 0;
    house = Math.max(house, sun * 1.2);
    if (hemi.current) {
      hemi.current.intensity = (work ? 2.2 : Math.max(0.55, arena.ambient * 1.6 + house * 1.4)) * st.ambient;
      hemi.current.color.set(work ? '#f2f4f8' : time === 'day' ? '#cfe2ff' : time === 'evening' ? '#ffb88a' : '#8aa0c8');
      hemi.current.groundColor.set(work ? '#6a6a70' : '#1a1410');
    }
    if (dir.current) {
      dir.current.intensity = (work ? 2.4 : sun ? sun * 3.2 : house * 0.9 + (arena.sky === 'dusk' ? 0.15 : 0.05)) * st.ambient;
      dir.current.color.set(work ? '#ffffff' : time === 'evening' ? '#ffa860' : time === 'day' ? '#fff4e6' : '#c8d4ff');
      if (time === 'evening' && !work) dir.current.position.set(-80, 18, -60);
      else dir.current.position.set(30, 60, 50);
      dir.current.shadow.intensity = st.shadow;
    }
    if (fill.current) fill.current.intensity = (work ? 1.4 : 0) * st.ambient;
    (scene as any).environmentIntensity = (work ? 1.8 : env === 'preview' ? 1.2 : 0.9 + sun * 0.8) * st.envBright;
    gl.toneMappingExposure = (work ? 1.15 : env === 'cinematic' ? 0.95 : 1.05) * st.exposure;
    if (scene.fog instanceof THREE.FogExp2) {
      const size = Math.max(arena.floor.xMax - arena.floor.xMin, arena.floor.zMax - arena.floor.zMin);
      scene.fog.density = ((work ? 0.25 : 0.6) + engine.haze * (work || sun > 0.5 ? 0.3 : 1.2)) / Math.max(120, size * 3.2) * (sun > 0.5 ? 0.35 : 1);
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#8aa0c8', '#1a1410', 0.3]} />
      <directionalLight ref={dir} position={[30, 60, 50]} intensity={0.2} color="#c8d4ff" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70} shadow-camera-near={1} shadow-camera-far={240} />
      <directionalLight ref={fill} position={[-40, 30, 30]} intensity={0} color="#eef2ff" />
    </>
  );
}

/** Individual instanced seats (High/Ultra quality). */
function ArenaSeats({ set }: { set: SeatSet }) {
  const mesh = useMemo(() => {
    const back = new THREE.BoxGeometry(0.46, 0.42, 0.06).translate(0, 0.55, -0.2);
    const seat = new THREE.BoxGeometry(0.46, 0.08, 0.36).translate(0, 0.42, 0);
    const g = mergeGeometries([back.toNonIndexed(), seat.toNonIndexed()])!;
    const m = new THREE.MeshStandardMaterial({ color: '#3a4152', roughness: 0.7 });
    const n = set.count;
    const im = new THREE.InstancedMesh(g, m, n);
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      q.setFromAxisAngle(up, set.yaw[i] + Math.PI);
      mtx.compose(new THREE.Vector3(set.pos[i * 3], set.pos[i * 3 + 1] - 0.4, set.pos[i * 3 + 2]), q, one);
      im.setMatrixAt(i, mtx);
    }
    im.instanceMatrix.needsUpdate = true;
    im.raycast = () => {};
    return im;
  }, [set]);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  return <primitive object={mesh} />;
}

export function ArenaModel({ arena }: { arena: ArenaDef }) {
  const build = useMemo(() => getArenaBuild(arena), [arena]);
  const f = arena.floor;
  const floorW = f.xMax - f.xMin;
  const floorD = f.zMax - f.zMin;

  const floorMat = useMemo(() => {
    let tex: THREE.Texture;
    const indoor = arena.kind !== 'festival' && arena.kind !== 'amphi' && arena.kind !== 'stadium' && arena.kind !== 'empty';
    if (arena.kind === 'festival' || arena.kind === 'amphi') tex = grassTexture().clone();
    else if (arena.kind === 'stadium') tex = pitchTexture().clone();
    else if (indoor) {
      // arena/hall concert floor: black masonite-style floor covering panels
      const d = pbrSet('deck')!;
      const m = new THREE.MeshStandardMaterial({ color: '#2a2b2f', roughness: 0.75, metalness: 0.05 });
      const rep = [floorW / 2.44, floorD / 2.44];
      for (const [k, t] of [['map', d.map], ['normalMap', d.normal], ['roughnessMap', d.rough]] as const) {
        if (!t) continue;
        const c = t.clone();
        c.repeat.set(rep[0], rep[1]);
        (m as any)[k] = c;
      }
      return m;
    } else tex = floorTexture().clone();
    tex.needsUpdate = true;
    const rep = arena.kind === 'stadium' ? [1, 1] : [floorW / 4, floorD / 4];
    tex.repeat.set(rep[0], rep[1]);
    const color = arena.kind === 'festival' ? '#3a4a30' : arena.kind === 'stadium' ? '#ffffff' : arena.floorColor;
    return new THREE.MeshStandardMaterial({ color, map: tex, roughness: arena.kind === 'empty' ? 0.35 : 0.85, metalness: 0.0 });
  }, [arena, floorW, floorD]);
  useEffect(() => () => {
    for (const k of ['map', 'normalMap', 'roughnessMap']) (floorMat as any)[k]?.dispose();
    floorMat.dispose();
  }, [floorMat]);
  // stadium: turf protection panels over the general-admission area
  const turfMat = useMemo(() => {
    if (arena.kind !== 'stadium') return null;
    const d = pbrSet('deck')!;
    const st = arena.standing;
    const m = new THREE.MeshStandardMaterial({ color: '#6d7076', roughness: 0.7 });
    for (const [k, t] of [['map', d.map], ['normalMap', d.normal]] as const) {
      if (!t) continue;
      const c = t.clone();
      c.repeat.set((st.xMax - st.xMin) / 2, (st.zMax - st.zMin) / 2);
      (m as any)[k] = c;
    }
    return m;
  }, [arena]);
  useEffect(() => () => {
    if (!turfMat) return;
    turfMat.map?.dispose();
    turfMat.normalMap?.dispose();
    turfMat.dispose();
  }, [turfMat]);
  const time = timeFor(arena, useProject((st) => st.project?.timeOfDay));

  const seatingMat = useMemo(() => withWorldDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), { scale: 0.35, strength: 0.22, grime: 0.1 }), []);
  const structMat = useMemo(() => withWorldDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.55 }), { scale: 1.2, strength: 0.15, grime: 0 }), []);
  const shellMat = useMemo(() => withWorldDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), { scale: 0.2, strength: 0.3, grime: 0.2 }), []);
  const glowMat = useMemo(() => ribbonMaterial(), []);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }), []);
  const seats = useSettings((st) => QUALITY[st.effective].seats);
  useEffect(() => () => [seatingMat, structMat, shellMat, glowMat, glassMat].forEach((m) => m.dispose()), [seatingMat, structMat, shellMat, glowMat, glassMat]);
  useFrame((st) => {
    (glowMat as any).userData.uTime.value = st.clock.elapsedTime;
  });

  const outerGround = arena.kind === 'festival' || arena.kind === 'amphi' || arena.kind === 'stadium' || arena.kind === 'empty';

  return (
    <group>
      <Environment />
      <AtmosphereSync arena={arena} time={time} />
      <Sky kind={arena.sky} time={time} />
      {/* concert floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(f.xMin + f.xMax) / 2, 0, (f.zMin + f.zMax) / 2]} material={floorMat} raycast={noRay} receiveShadow>
        <planeGeometry args={[floorW, floorD]} />
      </mesh>
      {outerGround && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 40]} raycast={noRay}>
          <circleGeometry args={[arena.kind === 'empty' ? 400 : 700, 48]} />
          <meshStandardMaterial color={arena.kind === 'empty' ? '#0a0a0b' : arena.kind === 'amphi' ? '#141a10' : '#0d140a'} roughness={1} />
        </mesh>
      )}
      {turfMat && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(arena.standing.xMin + arena.standing.xMax) / 2, 0.012, (arena.standing.zMin + arena.standing.zMax) / 2]} material={turfMat} raycast={noRay} receiveShadow>
          <planeGeometry args={[arena.standing.xMax - arena.standing.xMin, arena.standing.zMax - arena.standing.zMin]} />
        </mesh>
      )}
      {arena.bowl && arena.ceiling && <VideoBoard x={0} y={arena.ceiling - 11} z={arena.bowl.cz + arena.bowl.b * 0.35} />}
      {build.seating && <mesh geometry={build.seating} material={seatingMat} raycast={noRay} receiveShadow />}
      {build.structure && <mesh geometry={build.structure} material={structMat} raycast={noRay} />}
      {build.shell && <mesh geometry={build.shell} material={shellMat} raycast={noRay} />}
      {build.glow && <mesh geometry={build.glow} material={glowMat} raycast={noRay} />}
      {build.glass && <mesh geometry={build.glass} material={glassMat} raycast={noRay} renderOrder={2} />}
      {seats && build.allSeats && build.allSeats.count > 0 && <ArenaSeats set={build.allSeats} />}
    </group>
  );
}


/** Glow geometry material: LED ribbon boards (pure-blue vertex colour) get scrolling original content. */
function ribbonMaterial() {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
  const uTime = { value: 0 };
  m.userData.uTime = uTime;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW;').replace('#include <project_vertex>', '#include <project_vertex>\nvRW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vRW;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  if (vColor.b > 0.9 && vColor.r < 0.12 && vColor.g < 0.2) {
    float a = atan(vRW.x, vRW.z);
    float band = fract(a * 6.0 - uTime * 0.08);
    float chev = step(0.5, fract(a * 60.0 + vRW.y * 2.0 - uTime * 0.6));
    vec3 c1 = vec3(0.05, 0.25, 1.0), c2 = vec3(0.9, 0.1, 0.6);
    diffuseColor.rgb = mix(c1, c2, smoothstep(0.3, 0.7, band)) * (0.55 + 0.35 * chev);
  }`,
      );
  };
  m.customProgramCacheKey = () => 'ribbon-v1';
  return m;
}

/** Centre-hung video board: four LED faces, under-ring and steel frame. */
function VideoBoard({ x, y, z }: { x: number; y: number; z: number }) {
  const mats = useMemo(() => [0, 1, 2, 3].map(() => createLedMaterial()), []);
  const ring = useMemo(() => createLedMaterial(), []);
  useEffect(() => () => [...mats, ring].forEach((m) => m.dispose()), [mats, ring]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    for (const m of [...mats, ring]) {
      const u = m.uniforms;
      u.uMode.value = m === ring ? 2 : 3;
      u.uTime.value = t * 0.6;
      u.uBright.value = 1.1;
      u.uC1.value.set('#1a3cff');
      u.uC2.value.set('#ff2a8a');
      u.uSize.value.set(m === ring ? 30 : 9, m === ring ? 1.2 : 5.2);
      u.uPitch.value = 0.006;
      u.uAspect.value = m === ring ? 25 : 9 / 5.2;
    }
  });
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.8, roughness: 0.4 }), []);
  useEffect(() => () => steel.dispose(), [steel]);
  return (
    <group position={[x, y, z]}>
      <mesh material={steel} raycast={noRay}>
        <boxGeometry args={[9.4, 5.6, 9.4]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`f${i}`} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.sin((i * Math.PI) / 2) * 4.71, 0, Math.cos((i * Math.PI) / 2) * 4.71]} material={mats[i]} raycast={noRay}>
          <planeGeometry args={[9, 5.2]} />
        </mesh>
      ))}
      <mesh position={[0, -3.6, 0]} material={ring} raycast={noRay}>
        <cylinderGeometry args={[4.6, 4.6, 1.2, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 5, 0]} material={steel} raycast={noRay}>
        <cylinderGeometry args={[0.15, 0.15, 6, 8]} />
      </mesh>
    </group>
  );
}

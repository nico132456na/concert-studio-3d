import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ArenaDef } from '../data/arenas';
import { getArenaBuild, type SeatSet } from './arenaGeometry';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useSettings, QUALITY } from '../state/settingsStore';
import { floorTexture, grassTexture, pitchTexture } from './textures';
import { engine } from './lightingEngine';
import { useUI } from '../state/uiStore';

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

function Sky({ kind }: { kind: ArenaDef['sky'] }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(kind === 'dusk' ? '#05060f' : '#020206') },
          uHorizon: { value: new THREE.Color(kind === 'dusk' ? '#2a1838' : '#0a0c18') },
          uStars: { value: 1 },
        },
      }),
    [kind],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  if (kind === 'indoor') return null;
  return (
    <mesh material={mat} raycast={noRay} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[900, 32, 16]} />
    </mesh>
  );
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    (scene as any).environmentIntensity = 0.35;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function AtmosphereSync({ arena }: { arena: ArenaDef }) {
  const scene = useThree((s) => s.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const fog = new THREE.FogExp2(arena.sky === 'indoor' ? '#050508' : '#07070f', 0.004);
    scene.fog = fog;
    scene.background = new THREE.Color(arena.sky === 'indoor' ? (arena.kind === 'empty' ? '#0b0b0d' : '#050507') : '#020206');
    return () => {
      scene.fog = null;
    };
  }, [scene, arena]);
  useFrame(() => {
    const ui = useUI.getState();
    // lighting environment: work lights while building, darker for the show
    const env = ui.screen === 'editor' ? ui.lightEnv : ui.screen === 'menu' || ui.screen === 'arenas' || ui.screen === 'gallery' ? 'preview' : ui.lightEnv === 'cinematic' ? 'cinematic' : 'concert';
    let house = engine.house;
    if (env === 'construction') house = Math.max(house, 0.9);
    else if (env === 'concert') house *= 0.35;
    else if (env === 'cinematic') house *= 0.2;
    if (hemi.current) hemi.current.intensity = arena.ambient * 1.6 + house * 1.4;
    if (dir.current) dir.current.intensity = house * (env === 'construction' ? 1.6 : 0.9) + (arena.sky === 'dusk' ? 0.15 : 0.05);
    if (scene.fog instanceof THREE.FogExp2) {
      const size = Math.max(arena.floor.xMax - arena.floor.xMin, arena.floor.zMax - arena.floor.zMin);
      scene.fog.density = (0.6 + engine.haze * 1.2) / Math.max(120, size * 3.2);
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#8aa0c8', '#1a1410', 0.3]} />
      <directionalLight ref={dir} position={[30, 60, 50]} intensity={0.2} color="#c8d4ff" />
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
    if (arena.kind === 'festival' || arena.kind === 'amphi') tex = grassTexture().clone();
    else if (arena.kind === 'stadium') tex = pitchTexture().clone();
    else tex = floorTexture().clone();
    tex.needsUpdate = true;
    const rep = arena.kind === 'stadium' ? [1, 1] : [floorW / 4, floorD / 4];
    tex.repeat.set(rep[0], rep[1]);
    const color = arena.kind === 'festival' ? '#3a4a30' : arena.kind === 'stadium' ? '#ffffff' : arena.floorColor;
    return new THREE.MeshStandardMaterial({ color, map: tex, roughness: arena.kind === 'empty' ? 0.35 : 0.85, metalness: 0.0 });
  }, [arena, floorW, floorD]);
  useEffect(() => () => floorMat.dispose(), [floorMat]);

  const seatingMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), []);
  const structMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 }), []);
  const shellMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }), []);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }), []);
  const seats = useSettings((st) => QUALITY[st.effective].seats);
  useEffect(() => () => [seatingMat, structMat, shellMat, glowMat, glassMat].forEach((m) => m.dispose()), [seatingMat, structMat, shellMat, glowMat, glassMat]);

  const outerGround = arena.kind === 'festival' || arena.kind === 'amphi' || arena.kind === 'stadium' || arena.kind === 'empty';

  return (
    <group>
      <Environment />
      <AtmosphereSync arena={arena} />
      <Sky kind={arena.sky} />
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
      {build.seating && <mesh geometry={build.seating} material={seatingMat} raycast={noRay} />}
      {build.structure && <mesh geometry={build.structure} material={structMat} raycast={noRay} />}
      {build.shell && <mesh geometry={build.shell} material={shellMat} raycast={noRay} />}
      {build.glow && <mesh geometry={build.glow} material={glowMat} raycast={noRay} />}
      {build.glass && <mesh geometry={build.glass} material={glassMat} raycast={noRay} renderOrder={2} />}
      {seats && build.allSeats && build.allSeats.count > 0 && <ArenaSeats set={build.allSeats} />}
    </group>
  );
}

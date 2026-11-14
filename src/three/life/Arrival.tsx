import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCareer } from '../../life/careerStore';
import { VEHICLE_BY_ID, tierFor } from '../../life/data';
import { interactables, useLife, walkArea, type Interactable } from '../../life/state';
import { lifeActions } from '../../life/actions';
import { player } from '../../performer/state';
import { rng } from '../../util/misc';
import { DROP, P, textTexture } from './City';
import { Vehicle } from './Vehicle';
import { Avatar, makeDriver } from '../Avatar';
import { NPC_LOOKS, followStep } from './Npc';

const noRay = () => null;

export const CARPET = { x: DROP.x, z0: 4 * P + 4, z1: 4 * P + 36.5 };
export const DOOR = new THREE.Vector3(DROP.x, 0, CARPET.z1 + 0.3);
export const ARRIVAL_SPAWN: [number, number] = [DROP.x - 1.6, 4 * P + 5];

/** Flash events fired by paparazzi; read by the HUD for the camera-flash overlay. */
export const flashes = { last: 0 };

function personGeo() {
  const body = new THREE.CylinderGeometry(0.16, 0.2, 1.12, 6).translate(0, 0.56, 0).toNonIndexed();
  const head = new THREE.SphereGeometry(0.13, 6, 4).translate(0, 1.3, 0).toNonIndexed();
  const armL = new THREE.BoxGeometry(0.08, 0.6, 0.08).translate(-0.22, 1.5, 0.05).toNonIndexed();
  const armR = new THREE.BoxGeometry(0.08, 0.6, 0.08).translate(0.22, 1.5, 0.05).toNonIndexed();
  const g = mergeGeometries([body, head, armL, armR].map((x) => (x.deleteAttribute('uv'), x)))!;
  const pos = g.getAttribute('position');
  const arm = new Float32Array(pos.count);
  const headW = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    arm[i] = Math.abs(pos.getX(i)) > 0.15 && pos.getY(i) > 1.15 ? 1 : 0;
    headW[i] = !arm[i] && pos.getY(i) > 1.16 ? 1 : 0;
  }
  g.setAttribute('aArm', new THREE.BufferAttribute(arm, 1));
  g.setAttribute('aHead', new THREE.BufferAttribute(headW, 1));
  return g;
}

/** Instanced cheering fans behind the barricades (diverse skin tones and clothes). */
function Fans({ count }: { count: number }) {
  const { mesh, uniforms, phones } = useMemo(() => {
    const r = rng(31);
    const g = personGeo();
    const n = count;
    const phase = new Float32Array(n), skin = new Float32Array(n * 3);
    const skins = ['#f2d0b5', '#e0b08a', '#c68a5e', '#9a6340', '#6b4128', '#3f2617'].map((c) => new THREE.Color(c));
    const cols = ['#ff2a4a', '#f2f2f2', '#111111', '#2a7bff', '#ffc21a', '#8a2aff', '#3ddc84', '#ff7a1a', '#20283a', '#ff6b9d'];
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.85 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const ph: number[] = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(r() * 3);
      const x = CARPET.x + side * (4.2 + row * 0.75 + r() * 0.3);
      const z = CARPET.z0 + 2 + r() * (CARPET.z1 - CARPET.z0 - 6);
      q.setFromAxisAngle(up, side > 0 ? -Math.PI / 2 + (r() - 0.5) * 0.6 : Math.PI / 2 + (r() - 0.5) * 0.6);
      const s = 0.9 + r() * 0.2;
      m.compose(new THREE.Vector3(x, 0.18, z), q, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(cols[Math.floor(r() * cols.length)]));
      phase[i] = r() * 6.28;
      const sk = skins[Math.floor(r() * skins.length)];
      skin.set([sk.r, sk.g, sk.b], i * 3);
      if (r() < 0.6) ph.push(x - side * 0.25, 2.1 + r() * 0.3, z);
    }
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    g.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 3));
    const uniforms = { uTime: { value: 0 }, uNear: { value: new THREE.Vector3() } };
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aPhase;\nattribute float aArm;\nattribute float aHead;\nattribute vec3 aSkin;\nuniform float uTime;\nuniform vec3 uNear;\nvarying float vHead;\nvarying vec3 vSkin;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec3 wp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
           float near = 1.0 - smoothstep(2.0, 9.0, distance(wp.xz, uNear.xz));
           float excite = 0.35 + near * 0.9;
           transformed.y += max(0.0, sin(uTime * (5.0 + near * 4.0) + aPhase)) * 0.12 * excite;
           transformed.y += aArm * (0.25 + 0.3 * sin(uTime * 3.0 + aPhase)) * excite;
           vHead = aHead; vSkin = aSkin;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vHead;\nvarying vec3 vSkin;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vSkin, vHead);');
    };
    mesh.raycast = () => {};
    mesh.frustumCulled = false;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(ph, 3));
    const phones = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#e8f0ff', size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    phones.raycast = () => {};
    return { mesh, uniforms, phones };
  }, [count]);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
    phones.geometry.dispose();
    (phones.material as THREE.Material).dispose();
  }, [mesh, phones]);
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uNear.value.copy(player.pos);
  });
  return (
    <>
      <primitive object={mesh} />
      <primitive object={phones} />
    </>
  );
}

/** Photographers with camera flashes that light up the arrival. */
function Paparazzi({ count }: { count: number }) {
  const people = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: count }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return { x: CARPET.x + side * (4.3 + r() * 0.8), z: CARPET.z0 + 1 + (i >> 1) * 1.4 + r() * 0.5, side, next: r() * 2 };
    });
  }, [count]);
  const sprites = useRef<(THREE.Mesh | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const flashTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(220,235,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => flashTex.dispose(), [flashTex]);
  const look = useMemo(() => ({ ...NPC_LOOKS.manager, top: 'jacket' as const, topColor: '#3a3a3e', glasses: false }), []);
  const drivers = useMemo(() => people.map((p) => makeDriver(p.x, p.z, p.side > 0 ? -Math.PI / 2 : Math.PI / 2)), [people]);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const close = Math.abs(player.pos.z - CARPET.z0) < 18;
    let flashI = 0;
    people.forEach((p, i) => {
      const d = drivers[i];
      d.yaw = Math.atan2(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
      d.action = 'point';
      d.actionT = 0.5;
      const s = sprites.current[i];
      if (t > p.next) {
        p.next = t + (close ? 0.25 + Math.random() * 1.1 : 1.5 + Math.random() * 3);
        flashes.last = performance.now();
        if (s) s.userData.t = t;
      }
      if (s) {
        const age = t - (s.userData.t ?? -10);
        const k = Math.max(0, 1 - age / 0.12);
        s.visible = k > 0;
        s.scale.setScalar(0.6 + k * 1.4);
        s.position.set(d.pos.x + Math.sin(d.yaw) * 0.35, 1.62, d.pos.z + Math.cos(d.yaw) * 0.35);
        flashI = Math.max(flashI, k);
      }
    });
    if (light.current) {
      light.current.intensity = flashI * 120;
      light.current.position.set(player.pos.x, 2.4, player.pos.z + 2);
    }
    void dt;
  });
  return (
    <>
      {drivers.map((d, i) => (
        <group key={i}>
          <Avatar look={look} driver={d} />
          <mesh ref={(m) => (sprites.current[i] = m)} raycast={noRay} visible={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={flashTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <pointLight ref={light} intensity={0} distance={16} color="#eef4ff" />
    </>
  );
}

function SecurityDetail({ n }: { n: number }) {
  const drivers = useMemo(() => Array.from({ length: n }, (_, i) => makeDriver(ARRIVAL_SPAWN[0] + (i % 2 ? 1.2 : -1.2), ARRIVAL_SPAWN[1] - 1 - i)), [n]);
  const offs: [number, number][] = [[-1.1, -0.9], [1.1, -0.9], [-1.2, 1.4], [1.2, 1.4]];
  useFrame((_, dt) => {
    const c = Math.cos(player.yaw), s = Math.sin(player.yaw);
    drivers.forEach((d, i) => {
      const [ox, oz] = offs[i % offs.length];
      // offsets are in the player's local frame (x right, z forward)
      const tx = player.pos.x + ox * c + oz * s, tz = player.pos.z - ox * s + oz * c;
      followStep(d, THREE.MathUtils.clamp(tx, CARPET.x - 3, CARPET.x + 3), tz, Math.min(dt, 0.05));
    });
  });
  return (
    <>
      {drivers.map((d, i) => (
        <Avatar key={i} look={i % 2 ? NPC_LOOKS.security2 : NPC_LOOKS.security} driver={d} />
      ))}
    </>
  );
}

export function Arrival() {
  const career = useCareer((s) => s.career);
  const tier = tierFor(career.xp, career.sandbox);
  const def = VEHICLE_BY_ID[career.vehicle] ?? VEHICLE_BY_ID.sedan;

  useEffect(() => {
    walkArea.test = (x, z) => x > CARPET.x - 3.1 && x < CARPET.x + 3.1 && z > CARPET.z0 - 0.5 && z < CARPET.z1;
    const list: Interactable[] = [];
    for (let z = CARPET.z0 + 4; z < CARPET.z1 - 4; z += 6)
      for (const side of [-1, 1])
        list.push({
          id: `fans-${side}-${z}`,
          x: CARPET.x + side * 2.6,
          z,
          r: 2.2,
          label: 'Fans are calling your name',
          actions: [
            { label: 'Sign autographs', run: () => lifeActions.fanMoment('autograph', side) },
            { label: 'Take a selfie', run: () => lifeActions.fanMoment('selfie', side) },
          ],
        });
    list.push({ id: 'door', x: DOOR.x, z: DOOR.z - 1.2, r: 2.4, label: 'Artist entrance', actions: [{ label: 'Enter the venue', run: () => lifeActions.enterVenue() }] });
    interactables.list = list;
    return () => {
      interactables.list = [];
    };
  }, []);

  const sign = useMemo(() => textTexture(['ARTIST ENTRANCE'], '#0a0a0a', '#ffffff', '#202020', 1024, 160), []);
  useEffect(() => () => sign.dispose(), [sign]);
  const barricade = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1])
      for (let z = CARPET.z0 + 1; z < CARPET.z1 - 1; z += 2.2) {
        parts.push(new THREE.BoxGeometry(0.05, 1.05, 2.1).translate(CARPET.x + side * 3.5, 0.18 + 0.55, z + 1.05).toNonIndexed());
        parts.push(new THREE.BoxGeometry(0.5, 0.04, 0.5).translate(CARPET.x + side * 3.5, 0.2, z).toNonIndexed());
      }
    return mergeGeometries(parts)!;
  }, []);
  useEffect(() => () => barricade.dispose(), [barricade]);

  return (
    <group>
      {/* red carpet */}
      <mesh position={[CARPET.x, 0.2, (CARPET.z0 + CARPET.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
        <planeGeometry args={[3, CARPET.z1 - CARPET.z0]} />
        <meshStandardMaterial color="#7a0a12" roughness={0.95} />
      </mesh>
      <mesh geometry={barricade} raycast={noRay}>
        <meshStandardMaterial color="#b8bcc4" metalness={0.8} roughness={0.35} />
      </mesh>
      {/* artist entrance */}
      <group position={[DOOR.x, 0.2, DOOR.z]}>
        <mesh position={[0, 1.6, 0.2]} raycast={noRay}>
          <boxGeometry args={[3.4, 3.2, 0.3]} />
          <meshStandardMaterial color="#0b0b0d" emissive="#203050" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 3.7, 0]} rotation={[0, Math.PI, 0]} raycast={noRay}>
          <planeGeometry args={[4.4, 0.7]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
        <mesh position={[0, 3.7, -0.02]} raycast={noRay}>
          <planeGeometry args={[4.4, 0.7]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 3.2, -2]} intensity={40} distance={12} color="#ffe6c8" />
      </group>
      {/* parked motorcade */}
      <Vehicle def={def} color={career.vehicleColors[career.vehicle] ?? def.colors[0]} position={[DROP.x, 0, 4 * P + 2.2]} rotation={[0, Math.PI / 2, 0]} lights />
      {Array.from({ length: tier.escorts }, (_, i) => (
        <Vehicle key={i} def={VEHICLE_BY_ID.suv} color="#0b0b0d" position={[DROP.x - 9 * (i + 1), 0, 4 * P + 2.2]} rotation={[0, Math.PI / 2, 0]} lights />
      ))}
      <Fans count={tier.fans} />
      <Paparazzi count={tier.paparazzi} />
      <SecurityDetail n={tier.security} />
      <hemisphereLight args={['#4a5a8a', '#1a1a20', 0.8]} />
      {[0.25, 0.6, 0.92].map((f) => (
        <pointLight key={f} position={[CARPET.x, 6, CARPET.z0 + (CARPET.z1 - CARPET.z0) * f]} intensity={60} distance={18} color="#fff0dc" />
      ))}
      <FlashSync />
    </group>
  );
}

function FlashSync() {
  useFrame(() => {
    const age = performance.now() - flashes.last;
    const ui = useLife.getState();
    const on = age < 90 ? 1 : 0;
    if (ui.flashes !== on) ui.set({ flashes: on });
  });
  return null;
}

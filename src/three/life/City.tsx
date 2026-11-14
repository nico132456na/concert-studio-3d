import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCareer } from '../../life/careerStore';
import { VEHICLE_BY_ID, tierFor } from '../../life/data';
import { car, useLife } from '../../life/state';
import { lifeActions } from '../../life/actions';
import { player, input } from '../../performer/state';
import { rng } from '../../util/misc';
import { Vehicle } from './Vehicle';

const noRay = () => null;

/* ---------------- city layout ---------------- */
export const P = 58; // road pitch
export const ROAD_W = 14;
const N = 6;
const isPlaza = (i: number, j: number) => i >= 4 && j >= 4;
export const ROUTE: [number, number][] = [
  [-20, P],
  [3 * P, P],
  [3 * P, 4 * P],
  [4.55 * P, 4 * P],
];
export const DROP = new THREE.Vector3(4.55 * P, 0, 4 * P);
export const VENUE_C = new THREE.Vector3(5 * P, 0, 5 * P + 4);

/** Block footprints (sidewalk slabs) that cars can't enter. */
export const BLOCKS: { x0: number; x1: number; z0: number; z1: number }[] = [];
for (let i = -1; i < N; i++)
  for (let j = -1; j < N; j++) {
    if (isPlaza(i, j)) continue;
    BLOCKS.push({ x0: i * P + ROAD_W / 2, x1: (i + 1) * P - ROAD_W / 2, z0: j * P + ROAD_W / 2, z1: (j + 1) * P - ROAD_W / 2 });
  }
// venue plaza (one big block)
BLOCKS.push({ x0: 4 * P + ROAD_W / 2, x1: 7 * P, z0: 4 * P + ROAD_W / 2, z1: 7 * P });

export function carBlocked(x: number, z: number, r = 1.1) {
  if (x < -P - 10 || x > (N + 1) * P || z < -P - 10 || z > (N + 1) * P) return true;
  return BLOCKS.some((b) => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r);
}

/* ---------------- textures ---------------- */
function windowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#07080c';
  g.fillRect(0, 0, 128, 128);
  const r = rng(9);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const on = r() > 0.55;
      g.fillStyle = on ? (r() > 0.75 ? '#a8d0ff' : '#ffd89a') : '#10131c';
      g.fillRect(x * 16 + 4, y * 16 + 4, 9, 10);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function textTexture(lines: string[], bg: string, fg: string, accent: string, w = 1024, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, bg);
  grd.addColorStop(1, accent);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.textAlign = 'center';
  g.fillStyle = fg;
  lines.forEach((l, i) => {
    const size = i === 0 ? h * 0.3 : h * 0.11;
    g.font = `900 ${size}px system-ui, -apple-system, sans-serif`;
    g.fillText(l, w / 2, h * (i === 0 ? 0.45 : 0.62 + (i - 1) * 0.15), w * 0.92);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- static city ---------------- */
function Buildings() {
  const { geo, mat, side } = useMemo(() => {
    const r = rng(42);
    const parts: THREE.BufferGeometry[] = [];
    const sideParts: THREE.BufferGeometry[] = [];
    for (let i = -1; i < N; i++)
      for (let j = -1; j < N; j++) {
        if (isPlaza(i, j)) continue;
        const x0 = i * P + ROAD_W / 2 + 2, z0 = j * P + ROAD_W / 2 + 2, s = P - ROAD_W - 4;
        const nx = r() > 0.4 ? 2 : 1, nz = r() > 0.4 ? 2 : 1;
        for (let a = 0; a < nx; a++)
          for (let b = 0; b < nz; b++) {
            const w = s / nx - 2, d = s / nz - 2;
            const far = Math.hypot(i - 2.5, j - 2.5);
            const h = 12 + r() * (far < 2.5 ? 90 : 40);
            const g = new THREE.BoxGeometry(w, h, d);
            const uv = g.getAttribute('uv');
            const nrm = g.getAttribute('normal');
            for (let k = 0; k < uv.count; k++) {
              const top = Math.abs(nrm.getY(k)) > 0.5;
              const sx = Math.abs(nrm.getX(k)) > 0.5 ? d : w;
              uv.setXY(k, top ? 0.02 : uv.getX(k) * (sx / 12), top ? 0.02 : uv.getY(k) * (h / 12));
            }
            g.translate(x0 + (a + 0.5) * (s / nx), h / 2 + 0.18, z0 + (b + 0.5) * (s / nz));
            parts.push(g);
          }
        const sw = new THREE.BoxGeometry(P - ROAD_W, 0.18, P - ROAD_W);
        sw.translate(i * P + P / 2, 0.09, j * P + P / 2);
        sideParts.push(sw);
      }
    const tex = windowTexture();
    const mat = new THREE.MeshStandardMaterial({ color: '#1c1f28', roughness: 0.7, metalness: 0.3, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.1 });
    return { geo: mergeGeometries(parts)!, mat, side: mergeGeometries(sideParts)! };
  }, []);
  useEffect(() => () => {
    geo.dispose();
    side.dispose();
    mat.emissiveMap?.dispose();
    mat.dispose();
  }, [geo, mat, side]);
  return (
    <>
      <mesh geometry={geo} material={mat} raycast={noRay} />
      <mesh geometry={side} raycast={noRay}>
        <meshStandardMaterial color="#3a3c42" roughness={0.9} />
      </mesh>
    </>
  );
}

function Streets() {
  const { lamps, glows, dashes } = useMemo(() => {
    const lampGeo = new THREE.CylinderGeometry(0.09, 0.12, 7, 6).translate(0, 3.5, 0);
    const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ color: '#2a2c30', metalness: 0.6, roughness: 0.5 }), 400);
    const glows = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }), 400);
    const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.02, 3), new THREE.MeshBasicMaterial({ color: '#c8c8c0' }), 1200);
    const m = new THREE.Matrix4();
    let li = 0, di = 0;
    for (let k = -1; k <= N; k++)
      for (let t = -P; t < (N + 1) * P; t += 29) {
        for (const side of [-1, 1]) {
          if (li >= 400) break;
          const off = side * (ROAD_W / 2 + 0.6);
          const pos: [number, number][] = [[k * P + off, t], [t, k * P + off]];
          for (const [x, z] of pos) {
            if (li >= 400) break;
            if (BLOCKS.slice(-1).some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1)) continue;
            m.makeTranslation(x, 0.18, z);
            lamps.setMatrixAt(li, m);
            m.makeTranslation(x - side * 0.6 * (pos[0][0] === x ? 1 : 0), 7.1, z - side * 0.6 * (pos[0][0] === x ? 0 : 1));
            glows.setMatrixAt(li, m);
            li++;
          }
        }
      }
    for (let k = -1; k <= N; k++)
      for (let t = -P; t < (N + 1) * P; t += 7) {
        if (di + 2 > 1200) break;
        m.makeTranslation(k * P, 0.01, t);
        dashes.setMatrixAt(di++, m);
        m.makeRotationY(Math.PI / 2).setPosition(t, 0.01, k * P);
        dashes.setMatrixAt(di++, m);
      }
    lamps.count = glows.count = li;
    dashes.count = di;
    [lamps, glows, dashes].forEach((x) => {
      x.raycast = () => {};
      x.frustumCulled = false;
    });
    return { lamps, glows, dashes };
  }, []);
  useEffect(() => () => [lamps, glows, dashes].forEach((x) => {
    x.geometry.dispose();
    (x.material as THREE.Material).dispose();
    x.dispose();
  }), [lamps, glows, dashes]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3 * P, 0, 3 * P]} raycast={noRay}>
        <planeGeometry args={[(N + 4) * P, (N + 4) * P]} />
        <meshStandardMaterial color="#26272c" roughness={0.8} metalness={0.1} />
      </mesh>
      <primitive object={lamps} />
      <primitive object={glows} />
      <primitive object={dashes} />
    </>
  );
}

/* ---------------- traffic & pedestrians ---------------- */
type TCar = { axis: 0 | 1; line: number; dir: 1 | -1; t: number; v: number; vNow: number };

function Traffic() {
  const cars = useMemo<TCar[]>(() => {
    const r = rng(5);
    return Array.from({ length: 42 }, () => ({ axis: r() > 0.5 ? 1 : 0, line: Math.floor(r() * (N + 1)), dir: r() > 0.5 ? 1 : -1, t: r() * (N + 1) * P, v: 8 + r() * 6, vNow: 10 }) as TCar);
  }, []);
  const { body, cabin, head, tail } = useMemo(() => {
    const mk = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const x = new THREE.InstancedMesh(g, m, cars.length);
      x.raycast = () => {};
      x.frustumCulled = false;
      return x;
    };
    const body = mk(new THREE.BoxGeometry(1.9, 0.75, 4.6).translate(0, 0.65, 0), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.6 }));
    const cabin = mk(new THREE.BoxGeometry(1.7, 0.55, 2.4).translate(0, 1.3, -0.2), new THREE.MeshStandardMaterial({ color: '#0b0d12', roughness: 0.05, metalness: 0.9 }));
    const head = mk(new THREE.BoxGeometry(1.5, 0.12, 0.05).translate(0, 0.75, 2.31), new THREE.MeshBasicMaterial({ color: '#fff6e0', toneMapped: false }));
    const tail = mk(new THREE.BoxGeometry(1.5, 0.12, 0.05).translate(0, 0.75, -2.31), new THREE.MeshBasicMaterial({ color: '#ff1020', toneMapped: false }));
    const r = rng(8);
    const cols = ['#111111', '#c0c0c0', '#f2f2f2', '#20283a', '#7a1a1a', '#2a4a7a', '#3a3a3e', '#d8c8a0'];
    for (let i = 0; i < cars.length; i++) body.setColorAt(i, new THREE.Color(cols[Math.floor(r() * cols.length)]));
    return { body, cabin, head, tail };
  }, [cars]);
  useEffect(() => () => [body, cabin, head, tail].forEach((x) => {
    x.geometry.dispose();
    (x.material as THREE.Material).dispose();
    x.dispose();
  }), [body, cabin, head, tail]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const span = (N + 2) * P;
    cars.forEach((c, i) => {
      const lane = c.line * P + c.dir * (c.axis === 0 ? -3.5 : 3.5);
      const x = c.axis === 0 ? c.t - P : lane;
      const z = c.axis === 0 ? lane : c.t - P;
      // stop behind the player's car
      const fx = c.axis === 0 ? c.dir : 0, fz = c.axis === 1 ? c.dir : 0;
      const dx = car.pos.x - x, dz = car.pos.z - z;
      const ahead = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
      const want = ahead > 0 && ahead < 12 && lateral < 2.6 ? 0 : c.v;
      c.vNow += (want - c.vNow) * Math.min(1, dt * 3);
      c.t = (((c.t + c.dir * c.vNow * dt) % span) + span) % span;
      q.setFromAxisAngle(up, Math.atan2(fx, fz));
      m.compose(v.set(x, 0, z), q, one);
      body.setMatrixAt(i, m);
      cabin.setMatrixAt(i, m);
      head.setMatrixAt(i, m);
      tail.setMatrixAt(i, m);
    });
    [body, cabin, head, tail].forEach((x) => (x.instanceMatrix.needsUpdate = true));
    // the player's car pushes through slowly when it touches traffic
    for (const c of cars) {
      const lane = c.line * P + c.dir * (c.axis === 0 ? -3.5 : 3.5);
      const x = c.axis === 0 ? c.t - P : lane, z = c.axis === 0 ? lane : c.t - P;
      if (Math.hypot(car.pos.x - x, car.pos.z - z) < 3.2) car.speed *= 0.9;
    }
  });
  return (
    <>
      <primitive object={body} />
      <primitive object={cabin} />
      <primitive object={head} />
      <primitive object={tail} />
    </>
  );
}

const PED_COUNT = 160;
function Pedestrians() {
  const { mesh, peds } = useMemo(() => {
    const r = rng(17);
    const g = mergeGeometries([new THREE.CylinderGeometry(0.17, 0.2, 1.15, 6).translate(0, 0.58, 0), new THREE.SphereGeometry(0.13, 6, 4).translate(0, 1.3, 0)].map((x) => x.toNonIndexed()))!;
    const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.9 }), PED_COUNT);
    mesh.raycast = () => {};
    mesh.frustumCulled = false;
    const cols = ['#20283a', '#5a3a24', '#7a1a1a', '#d8c8a0', '#3a5a3a', '#f2f2f2', '#2a4a7a', '#111111', '#c0603a', '#8a2aff'];
    const blocks = BLOCKS.filter((b) => b.x1 - b.x0 < P);
    const peds = Array.from({ length: PED_COUNT }, (_, i) => {
      mesh.setColorAt(i, new THREE.Color(cols[Math.floor(r() * cols.length)]));
      const b = blocks[Math.floor(r() * blocks.length)];
      return { b, t: r(), v: (0.8 + r() * 0.8) / (4 * (b.x1 - b.x0)) * (r() > 0.5 ? 1 : -1), off: 1 + r() * 2.5 };
    });
    return { mesh, peds };
  }, []);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame((state, dt) => {
    peds.forEach((p, i) => {
      p.t = (p.t + p.v * Math.min(dt, 0.05) + 1) % 1;
      const { x0, x1, z0, z1 } = p.b;
      const L = x1 - x0, side = Math.floor(p.t * 4), f = (p.t * 4) % 1;
      const o = p.off;
      let x = 0, z = 0, yaw = 0;
      if (side === 0) { x = x0 + o + f * (L - 2 * o); z = z0 + o; yaw = Math.PI / 2; }
      else if (side === 1) { x = x1 - o; z = z0 + o + f * (L - 2 * o); yaw = 0; }
      else if (side === 2) { x = x1 - o - f * (L - 2 * o); z = z1 - o; yaw = -Math.PI / 2; }
      else { x = x0 + o; z = z1 - o - f * (L - 2 * o); yaw = Math.PI; }
      if (p.v < 0) yaw += Math.PI;
      q.setFromAxisAngle(up, yaw);
      m.compose(v.set(x, 0.18 + Math.abs(Math.sin(state.clock.elapsedTime * 6 + i)) * 0.04, z), q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

/* ---------------- venue landmark & billboards ---------------- */
export function VenueBuilding({ name, venueName }: { name: string; venueName: string }) {
  const tex = useMemo(() => {
    const t = textTexture([name.toUpperCase(), `LIVE TONIGHT · ${venueName.toUpperCase()}`], '#05060a', '#ffffff', '#1a2a6a', 2048, 256);
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
  }, [name, venueName]);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((_, dt) => {
    tex.offset.x -= dt * 0.02;
  });
  return (
    <group position={[VENUE_C.x, 0, VENUE_C.z]}>
      <mesh position={[0, 11, 0]} raycast={noRay}>
        <cylinderGeometry args={[34, 36, 22, 48, 1, true]} />
        <meshStandardMaterial color="#2a2d36" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 17, 0]} raycast={noRay}>
        <cylinderGeometry args={[34.6, 34.6, 5, 48, 1, true]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 22.5, 0]} raycast={noRay}>
        <sphereGeometry args={[36, 32, 8, 0, Math.PI * 2, 0, 0.5]} />
        <meshStandardMaterial color="#3a3d46" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
        <circleGeometry args={[52, 48]} />
        <meshStandardMaterial color="#4a4c52" roughness={0.8} />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 36.4, 11, Math.cos(a) * 36.4]} rotation={[0, a, 0]} raycast={noRay}>
            <boxGeometry args={[0.6, 20, 0.2]} />
            <meshBasicMaterial color={i % 2 ? '#6fa8ff' : '#ffffff'} toneMapped={false} />
          </mesh>
        );
      })}
      <pointLight position={[0, 6, -44]} intensity={900} distance={70} color="#9fc0ff" />
    </group>
  );
}

function Billboards({ name, genre }: { name: string; genre: string }) {
  const tex = useMemo(() => textTexture([name.toUpperCase(), `NEW ALBUM · ${genre.toUpperCase()}`, 'TOUR TONIGHT'], '#1a0a2a', '#ffffff', '#c0306a'), [name, genre]);
  useEffect(() => () => tex.dispose(), [tex]);
  const spots: [number, number, number][] = [
    [1.5 * P, P + ROAD_W / 2 + 2.2, Math.PI],
    [3 * P + ROAD_W / 2 + 2.2, 2.5 * P, -Math.PI / 2],
    [3.6 * P, 4 * P - ROAD_W / 2 - 2.2, 0],
    [0.5 * P, P - ROAD_W / 2 - 2.2, 0],
  ];
  return (
    <>
      {spots.map(([x, z, ry], i) => (
        <group key={i} position={[x, 9, z]} rotation={[0, ry, 0]}>
          <mesh raycast={noRay}>
            <planeGeometry args={[16, 8]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
          <mesh position={[0, -6, -0.3]} raycast={noRay}>
            <boxGeometry args={[0.5, 6, 0.5]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ---------------- player car & motorcade ---------------- */
const tmpV = new THREE.Vector3();

export function resetCar() {
  car.pos.set(ROUTE[0][0], 0, ROUTE[0][1] + 3.5);
  car.yaw = Math.PI / 2;
  car.speed = 0;
  car.steer = 0;
  car.wp = 1;
  car.trail = [car.pos.clone()];
  car.trailDist = 0;
}

function Motorcade() {
  const career = useCareer((s) => s.career);
  const tier = tierFor(career.xp, career.sandbox);
  const def = VEHICLE_BY_ID[career.vehicle] ?? VEHICLE_BY_ID.sedan;
  const me = useRef<THREE.Group>(null);
  const escorts = useRef<(THREE.Group | null)[]>([]);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const ui = useLife.getState();
    if (ui.phase !== 'drive' || ui.fade > 0.5) return;
    // controls: autopilot or joystick
    let throttle = 0, steer = 0;
    if (ui.autopilot) {
      const w = ROUTE[Math.min(car.wp, ROUTE.length - 1)];
      const lane = car.wp < ROUTE.length ? 3.5 : 0;
      const prev = ROUTE[car.wp - 1];
      const dirx = Math.sign(w[0] - prev[0]), dirz = Math.sign(w[1] - prev[1]);
      // keep right: offset target to the right side of the travel direction
      const tx = w[0] - dirz * lane, tz = w[1] + dirx * lane;
      const dx = tx - car.pos.x, dz = tz - car.pos.z;
      const dist = Math.hypot(dx, dz);
      let diff = Math.atan2(dx, dz) - car.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      steer = THREE.MathUtils.clamp(diff * 2.2, -1, 1);
      const vWant = dist < 24 && car.wp < ROUTE.length - 1 ? 7 : car.wp === ROUTE.length - 1 && dist < 30 ? Math.max(0, dist / 3) : 15;
      throttle = THREE.MathUtils.clamp((vWant - car.speed) * 0.6, -1, 1);
      if (dist < 9 && car.wp < ROUTE.length - 1) car.wp++;
    } else {
      throttle = input.moveY;
      steer = -input.moveX;
    }
    const accel = throttle >= 0 ? def.accel : 14;
    car.speed += throttle * accel * dt;
    car.speed -= car.speed * 0.25 * dt;
    car.speed = THREE.MathUtils.clamp(car.speed, -6, def.top);
    car.steer += (steer - car.steer) * Math.min(1, dt * 6);
    car.yaw += car.steer * Math.min(1, Math.abs(car.speed) / 6) * 0.9 * dt * Math.sign(car.speed || 1);
    const nx = car.pos.x + Math.sin(car.yaw) * car.speed * dt, nz = car.pos.z + Math.cos(car.yaw) * car.speed * dt;
    if (!carBlocked(nx, nz)) car.pos.set(nx, 0, nz);
    else car.speed = -car.speed * 0.25;
    // breadcrumb trail for the escorts
    const last = car.trail[car.trail.length - 1];
    if (!last || last.distanceTo(car.pos) > 0.6) {
      car.trail.push(car.pos.clone());
      if (car.trail.length > 200) car.trail.shift();
    }
    if (me.current) {
      me.current.position.copy(car.pos);
      me.current.rotation.y = car.yaw;
    }
    escorts.current.forEach((g, i) => {
      if (!g) return;
      const back = Math.round((9 * (i + 1)) / 0.6);
      const idx = Math.max(0, car.trail.length - 1 - back);
      const p = car.trail[idx], q2 = car.trail[Math.min(car.trail.length - 1, idx + 2)];
      g.position.copy(p);
      if (q2 && q2.distanceTo(p) > 0.01) g.rotation.y = Math.atan2(q2.x - p.x, q2.z - p.z);
    });
    // the player avatar rides along (used by cameras / HUD)
    player.pos.copy(car.pos);
    const dDrop = car.pos.distanceTo(DROP);
    useLife.getState().set({ speedKmh: Math.round(Math.abs(car.speed) * 3.6), distLeft: Math.round(dDrop) });
    if (dDrop < 10 && Math.abs(car.speed) < 4) lifeActions.arrive();
    lightTarget.position.copy(tmpV.set(car.pos.x + Math.sin(car.yaw) * 20, 0, car.pos.z + Math.cos(car.yaw) * 20));
    lightTarget.updateMatrixWorld();
  });
  const color = career.vehicleColors[career.vehicle] ?? def.colors[0];
  return (
    <>
      <group ref={me}>
        <Vehicle def={def} color={color} lights />
      </group>
      <primitive object={lightTarget} />
      <HeadLight target={lightTarget} />
      {Array.from({ length: tier.escorts }, (_, i) => (
        <group key={i} ref={(g) => (escorts.current[i] = g)}>
          <Vehicle def={VEHICLE_BY_ID.suv} color="#0b0b0d" lights />
        </group>
      ))}
    </>
  );
}

function HeadLight({ target }: { target: THREE.Object3D }) {
  const l = useRef<THREE.SpotLight>(null);
  useFrame(() => {
    if (!l.current) return;
    l.current.position.set(car.pos.x + Math.sin(car.yaw) * 2.6, 1.0, car.pos.z + Math.cos(car.yaw) * 2.6);
  });
  return <spotLight ref={l} target={target} angle={0.55} penumbra={0.6} intensity={180} distance={60} color="#fff4e0" />;
}

export function City({ driving }: { driving: boolean }) {
  const career = useCareer((s) => s.career);
  return (
    <group>
      <Streets />
      <Buildings />
      <Traffic />
      <Pedestrians />
      <Billboards name={career.name} genre={career.genre} />
      <VenueBuilding name={career.name} venueName={lifeActions.venueName()} />
      {driving && <Motorcade />}
      <hemisphereLight args={['#5a6a9a', '#2a2a30', 1.6]} />
      <directionalLight position={[-80, 120, 40]} intensity={0.5} color="#9fb4ff" />
      <Stars />
    </group>
  );
}

export function Stars() {
  const pts = useMemo(() => {
    const r = rng(3);
    const a: number[] = [];
    for (let i = 0; i < 900; i++) {
      const th = r() * Math.PI * 2, ph = r() * 1.2;
      a.push(Math.cos(th) * Math.sin(ph) * 900 + 3 * P, Math.cos(ph) * 900, Math.sin(th) * Math.sin(ph) * 900 + 3 * P);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
    return g;
  }, []);
  useEffect(() => () => pts.dispose(), [pts]);
  return (
    <points geometry={pts} raycast={noRay}>
      <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} />
    </points>
  );
}

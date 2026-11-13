import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROOMS, BACKSTAGE_Y, CEILING, LIFT, ARENA_DOOR, type Obstacle, type Room } from '../data/backstage';
import { textTexture } from './textures';
import { createLedMaterial } from './ledMaterial';
import { player } from '../performer/state';

const Y = BACKSTAGE_Y;
const noRay = () => null;

class Kit {
  solid: THREE.BufferGeometry[] = [];
  glow: THREE.BufferGeometry[] = [];
  metal: THREE.BufferGeometry[] = [];
  obstacles: Obstacle[] = [];
  private add(list: THREE.BufferGeometry[], g: THREE.BufferGeometry, color: string) {
    const ng = g.index ? g.toNonIndexed() : g;
    ng.deleteAttribute('uv');
    const c = new THREE.Color(color);
    const n = ng.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    list.push(ng);
  }
  /** box by center (y = bottom, relative to backstage floor) */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, block = false, kind: 'solid' | 'glow' | 'metal' = 'solid') {
    const g = new THREE.BoxGeometry(w, h, d).translate(x, Y + y + h / 2, z);
    this.add(kind === 'glow' ? this.glow : kind === 'metal' ? this.metal : this.solid, g, color);
    if (block) this.obstacles.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h });
  }
  cyl(x: number, y: number, z: number, r: number, h: number, color: string, kind: 'solid' | 'glow' | 'metal' = 'solid', seg = 16) {
    const g = new THREE.CylinderGeometry(r, r, h, seg).translate(x, Y + y + h / 2, z);
    this.add(kind === 'glow' ? this.glow : kind === 'metal' ? this.metal : this.solid, g, color);
  }
  sphere(x: number, y: number, z: number, r: number, color: string, kind: 'solid' | 'glow' | 'metal' = 'solid') {
    this.add(kind === 'glow' ? this.glow : kind === 'metal' ? this.metal : this.solid, new THREE.SphereGeometry(r, 12, 8).translate(x, Y + y, z), color);
  }
  build(list: THREE.BufferGeometry[]) {
    return list.length ? mergeGeometries(list, false) : null;
  }
}

/* ---------------------------- furniture sets ---------------------------- */

function sofa(k: Kit, x: number, z: number, w: number, rotY: 0 | 1, color: string) {
  // rotY 0: back toward -z, 1: back toward -x
  if (!rotY) {
    k.box(x, 0, z, w, 0.45, 0.9, color, true);
    k.box(x, 0.45, z - 0.35, w, 0.5, 0.2, color);
    k.box(x - w / 2 + 0.1, 0.45, z, 0.2, 0.25, 0.9, color);
    k.box(x + w / 2 - 0.1, 0.45, z, 0.2, 0.25, 0.9, color);
  } else {
    k.box(x, 0, z, 0.9, 0.45, w, color, true);
    k.box(x - 0.35, 0.45, z, 0.2, 0.5, w, color);
  }
}

function vanity(k: Kit, x: number, z: number, len: number, wallX: number) {
  const dir = Math.sign(x - wallX);
  k.box(wallX + dir * 0.45, 0, z, 0.9, 0.78, len, '#1d1b1e', true);
  k.box(wallX + dir * 0.03, 1.0, z, 0.04, 1.2, len - 0.4, '#ffffff', false, 'metal');
  for (let i = 0; i <= Math.floor(len / 0.5); i++) {
    const zz = z - len / 2 + 0.2 + i * ((len - 0.4) / Math.floor(len / 0.5));
    k.sphere(wallX + dir * 0.08, 2.3, zz, 0.06, '#fff2d0', 'glow');
  }
  for (let j = 0; j < 4; j++) {
    k.sphere(wallX + dir * 0.08, 1.05 + j * 0.4, z - len / 2 + 0.15, 0.06, '#fff2d0', 'glow');
    k.sphere(wallX + dir * 0.08, 1.05 + j * 0.4, z + len / 2 - 0.15, 0.06, '#fff2d0', 'glow');
  }
}

function chair(k: Kit, x: number, z: number, color: string) {
  k.box(x, 0, z, 0.5, 0.45, 0.5, color, true);
  k.box(x, 0.45, z + 0.22, 0.5, 0.5, 0.08, color);
}

function desk(k: Kit, x: number, z: number, w: number, d: number, screens: number, faders = false) {
  k.box(x, 0, z, w, 0.75, d, '#2a2b30', true);
  for (let i = 0; i < screens; i++) {
    const sx = x - w / 2 + (w / screens) * (i + 0.5);
    k.box(sx, 0.85, z - d / 2 + 0.15, Math.min(0.9, (w / screens) * 0.85), 0.55, 0.05, ['#2d5cff', '#1ae0aa', '#ff7a1a', '#9b6bff'][i % 4], false, 'glow');
    k.box(sx, 0.75, z - d / 2 + 0.2, 0.08, 0.1, 0.08, '#111');
  }
  if (faders) for (let i = 0; i < Math.floor(w / 0.12); i++) k.box(x - w / 2 + 0.1 + i * 0.12, 0.76, z + 0.1, 0.03, 0.02, 0.25, i % 8 === 0 ? '#ff4040' : '#3ddc84', false, 'glow');
}

function rack(k: Kit, x: number, z: number) {
  k.box(x, 0, z, 0.6, 1.9, 0.8, '#121316', true);
  for (let i = 0; i < 10; i++) k.box(x - 0.2 + (i % 3) * 0.08, 0.2 + i * 0.16, z - 0.41, 0.03, 0.03, 0.02, i % 3 ? '#3ddc84' : '#4da3ff', false, 'glow');
}

function flightCase(k: Kit, x: number, z: number, w: number, h: number, d: number) {
  k.box(x, 0.1, z, w, h, d, '#151517', true);
  k.box(x, 0.1, z, w + 0.04, 0.04, d + 0.04, '#b8bcc4', false, 'metal');
  k.box(x, 0.1 + h - 0.04, z, w + 0.04, 0.04, d + 0.04, '#b8bcc4', false, 'metal');
  k.cyl(x - w / 2 + 0.12, 0, z - d / 2 + 0.12, 0.05, 0.1, '#222');
  k.cyl(x + w / 2 - 0.12, 0, z + d / 2 - 0.12, 0.05, 0.1, '#222');
}

function plant(k: Kit, x: number, z: number) {
  k.cyl(x, 0, z, 0.22, 0.45, '#5a4636');
  const g = new THREE.ConeGeometry(0.35, 1.1, 7).translate(x, Y + 0.95, z);
  (k as any).add(k.solid, g, '#2f6b2f');
}

function furnish(k: Kit, r: Room) {
  const { x0, x1, z0, z1 } = r.rect;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  switch (r.id) {
    case 'dressing':
      vanity(k, x0 + 1, cz, 5, x0);
      chair(k, x0 + 1.4, cz - 1.2, '#3a2a2a');
      chair(k, x0 + 1.4, cz + 1.2, '#3a2a2a');
      sofa(k, cx + 1, z0 + 0.6, 3.4, 0, '#6b0d12');
      k.box(cx + 1, 0, z0 + 2, 1.2, 0.4, 0.7, '#1d1b1e', true);
      k.box(x1 - 1.3, 0, z1 - 0.4, 2.2, 2.3, 0.6, '#5a3a24', true); // wardrobe
      k.box(x1 - 1.3, 1.2, z1 - 0.72, 0.04, 0.3, 0.02, '#d9a740', false, 'metal');
      // clothing rack with outfits
      k.box(cx - 0.5, 1.7, z1 - 1.6, 2.4, 0.04, 0.04, '#c0c0c0', false, 'metal');
      k.box(cx - 1.7, 0, z1 - 1.6, 0.04, 1.75, 0.5, '#c0c0c0', true, 'metal');
      k.box(cx + 0.7, 0, z1 - 1.6, 0.04, 1.75, 0.5, '#c0c0c0', false, 'metal');
      ['#d9a740', '#111111', '#ff2a4a', '#ffffff', '#2a7bff', '#9b2aff'].forEach((c, i) => k.box(cx - 1.4 + i * 0.36, 0.7, z1 - 1.6, 0.06, 0.95, 0.5, c));
      k.box(x0 + 2.5, 0, z0 + 0.05, 1, 2.1, 0.08, '#e8e2da'); // bathroom door
      k.box(cx, 0.001, cz, 4, 0.02, 3, '#7a2a33'); // rug
      k.box(x0 + 0.5, 0, z1 - 0.5, 0.8, 1.9, 0.6, '#3a3a40', true); // lockers
      break;
    case 'makeup':
      vanity(k, x0 + 1, cz, 7, x0);
      for (const dz of [-2, 0, 2]) {
        k.cyl(x0 + 1.6, 0, cz + dz, 0.25, 0.45, '#888', 'metal');
        k.box(x0 + 1.6, 0.45, cz + dz, 0.6, 0.15, 0.6, '#151515', true);
        k.box(x0 + 1.9, 0.6, cz + dz, 0.12, 0.7, 0.6, '#151515');
      }
      k.box(x1 - 0.5, 0, cz, 0.8, 0.9, 3, '#e8e2da', true);
      for (let i = 0; i < 12; i++) k.cyl(x1 - 0.5, 0.9, cz - 1.3 + i * 0.22, 0.04, 0.18 + (i % 3) * 0.06, ['#ff6b9d', '#ffd166', '#66d9ff'][i % 3]);
      k.box(cx + 1, 0, z0 + 0.5, 1.4, 1, 0.6, '#ffffff', true); // wash basin
      break;
    case 'lounge':
      k.box(cx, 0, z0 + 0.6, 6, 1.05, 0.7, '#2a1d14', true); // bar
      k.box(cx, 1.05, z0 + 0.6, 6.2, 0.05, 0.8, '#d9a740', false, 'metal');
      for (let i = 0; i < 5; i++) k.cyl(cx - 2.4 + i * 1.2, 0, z0 + 1.4, 0.2, 0.75, '#8a6a40', 'metal');
      k.box(cx, 1.6, z0 + 0.12, 5, 0.6, 0.06, '#ff2ad4', false, 'glow');
      sofa(k, cx + 1, z1 - 0.8, 4, 0, '#2c2440');
      k.box(cx + 1, 0, z1 - 2.2, 1.6, 0.42, 0.8, '#1d1b1e', true);
      plant(k, x1 - 0.6, z0 + 0.8);
      break;
    case 'green':
      sofa(k, cx + 1, z1 - 0.8, 4.5, 0, '#35553a');
      sofa(k, cx - 3.5, cz, 3, 1, '#35553a');
      k.box(cx + 0.5, 0, cz, 1.8, 0.42, 1, '#3b2a22', true);
      for (let i = 0; i < 5; i++) k.box(cx + 0.1 + i * 0.2, 0.42, cz, 0.12, 0.06, 0.12, ['#ffcf6b', '#ff7a1a', '#7dff4d'][i % 3]);
      k.box(cx + 1, 0, z0 + 0.6, 4, 0.9, 0.7, '#2a2a2e', true); // snack counter
      plant(k, x0 + 0.6, z0 + 0.8);
      plant(k, x0 + 0.6, z1 - 0.8);
      break;
    case 'office':
      desk(k, cx - 1.5, z0 + 1.2, 2.6, 1, 2);
      desk(k, cx + 1.8, z0 + 1.2, 2.2, 1, 1);
      chair(k, cx - 1.5, z0 + 2.3, '#222');
      chair(k, cx + 1.8, z0 + 2.3, '#222');
      k.box(x1 - 0.06, 1, cz + 1, 0.04, 1.2, 2.6, '#f2f2f2'); // whiteboard
      k.box(cx, 0, z1 - 0.5, 4, 2, 0.5, '#3a3a40', true); // shelves
      break;
    case 'stagemgmt':
      desk(k, cx, z0 + 1.2, 4.2, 1, 4);
      chair(k, cx - 1, z0 + 2.3, '#222');
      chair(k, cx + 1, z0 + 2.3, '#222');
      k.box(cx, 2.2, z0 + 0.06, 1.6, 0.45, 0.04, '#ff2a2a', false, 'glow'); // show clock
      rack(k, x1 - 0.5, z1 - 0.6);
      break;
    case 'lighting':
      desk(k, cx, cz - 0.5, 4.5, 1.4, 3, true);
      chair(k, cx - 1, cz + 0.8, '#222');
      chair(k, cx + 1, cz + 0.8, '#222');
      rack(k, x1 - 0.5, z0 + 0.6);
      rack(k, x1 - 0.5, z1 - 0.6);
      break;
    case 'audio':
      desk(k, cx, cz - 0.5, 5, 1.5, 2, true);
      k.box(cx - 2.2, 0.75, cz - 1.1, 0.25, 0.4, 0.25, '#111');
      k.box(cx + 2.2, 0.75, cz - 1.1, 0.25, 0.4, 0.25, '#111');
      chair(k, cx, cz + 0.9, '#222');
      rack(k, x1 - 0.5, z0 + 0.6);
      rack(k, x1 - 0.5, z0 + 1.5);
      rack(k, x1 - 0.5, z1 - 0.6);
      break;
    case 'vip':
      sofa(k, cx, z0 + 0.6, 4.5, 0, '#1a1a1a');
      sofa(k, cx, z1 - 0.6, 4.5, 0, '#1a1a1a');
      k.box(cx, 0, cz, 1.6, 0.5, 1, '#d9a740', true, 'metal');
      k.cyl(cx, 0.5, cz, 0.12, 0.35, '#2a5a2a');
      k.sphere(cx, 2.9, cz, 0.35, '#fff2d0', 'glow');
      k.box(cx, 0.001, cz, 5, 0.02, 4, '#3a2a10');
      break;
    case 'dock': {
      for (let i = 0; i < 6; i++) flightCase(k, x0 + 2 + i * 1.6, z0 + 2, 1.3, 1.1, 0.9);
      for (let i = 0; i < 4; i++) flightCase(k, x0 + 2 + i * 1.6, z0 + 3.5, 1.3, 0.8, 0.9);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) k.box(x1 - 3 + i * 0.0, 0.1 + j * 0.62, z0 + 2 + i * 1.4, 1.3, 0.58, 1, '#0d0d0f', j === 0); // speaker stacks
      for (let i = 0; i < 3; i++) k.box(x1 - 6, 0.1 + i * 0.5, z1 - 3, 3, 0.45, 2, '#1a1a1c', i === 0); // stage decks
      for (let i = 0; i < 4; i++) k.box(x0 + 6 + i * 0.7, 0.3 + (i % 2) * 0.55, z1 - 2.5, 0.5, 0.5, 4, '#b8bcc4', i === 0, 'metal'); // truss sections
      k.box(0, 0, z0 + 0.05, 8, 3.2, 0.1, '#5a5c62'); // roll-up door
      for (let i = 0; i < 16; i++) k.box(0, 0.1 + i * 0.2, z0 + 0.12, 8, 0.03, 0.02, '#3a3c40');
      k.box(x0 + 3, 0, z1 - 1.2, 1.2, 0.8, 2, '#d9a740', true, 'metal'); // cart
      // emergency exits
      k.box(x0 + 0.06, 0, z0 + 5, 0.1, 2.2, 1.2, '#7a1a1a');
      k.box(x1 - 0.06, 0, z0 + 5, 0.1, 2.2, 1.2, '#7a1a1a');
      k.box(x0 + 0.1, 2.35, z0 + 5, 0.04, 0.3, 0.8, '#1aff6a', false, 'glow');
      k.box(x1 - 0.1, 2.35, z0 + 5, 0.04, 0.3, 0.8, '#1aff6a', false, 'glow');
      break;
    }
    case 'corridor':
      for (let z = z0 + 2; z < z1; z += 4) k.box(0, CEILING - 0.06, z, 0.5, 0.04, 2.4, '#e8f0ff', false, 'glow');
      k.box(-0.8, 0.005, cz, 0.08, 0.01, z1 - z0, '#ffd166', false, 'glow');
      break;
    case 'tunnel':
      for (const sx of [-1, 1]) k.box(sx * 2.2, 0.02, cz, 0.06, 0.04, z1 - z0, '#2a7bff', false, 'glow');
      break;
  }
}

/** Walls along one side of a rect with openings (from door rects of rooms touching it). */
function wallSegments(k: Kit, axis: 'x' | 'z', fixed: number, a0: number, a1: number, gaps: [number, number][], color: string) {
  const sorted = gaps.filter(([g0, g1]) => g1 > a0 && g0 < a1).sort((p, q) => p[0] - q[0]);
  let cur = a0;
  const seg = (s0: number, s1: number) => {
    if (s1 - s0 < 0.05) return;
    if (axis === 'x') k.box(fixed, 0, (s0 + s1) / 2, 0.25, CEILING, s1 - s0, color);
    else k.box((s0 + s1) / 2, 0, fixed, s1 - s0, CEILING, 0.25, color);
  };
  for (const [g0, g1] of sorted) {
    seg(cur, g0);
    // lintel above door
    if (axis === 'x') k.box(fixed, 2.5, (g0 + g1) / 2, 0.25, CEILING - 2.5, g1 - g0, color);
    else k.box((g0 + g1) / 2, 2.5, fixed, g1 - g0, CEILING - 2.5, 0.25, color);
    cur = g1;
  }
  seg(cur, a1);
}

export interface BackstageData {
  obstacles: Obstacle[];
}
export const backstageData: BackstageData = { obstacles: [] };

function Sign({ text, pos, rotY, w = 1.6, color = '#ffffff' }: { text: string; pos: [number, number, number]; rotY: number; w?: number; color?: string }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: textTexture(text), color, toneMapped: false }), [text, color]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={pos} rotation={[0, rotY, 0]} material={mat} raycast={noRay}>
      <planeGeometry args={[w, w / 4]} />
    </mesh>
  );
}

function Door({ room }: { room: Room }) {
  const ref = useRef<THREE.Mesh>(null);
  const d = room.door!;
  const west = d.x1 < 0 && room.id !== 'dock';
  const east = d.x0 > 0 && room.id !== 'dock';
  const isDock = room.id === 'dock';
  const wx = west ? -2.125 : east ? 2.125 : 0;
  const width = isDock ? 3.2 : d.z1 - d.z0;
  const center: [number, number, number] = isDock ? [0, Y + 1.25, -51.125] : [wx, Y + 1.25, (d.z0 + d.z1) / 2];
  const open = useRef(0);
  useFrame((_, dt) => {
    const near = player.active && Math.hypot(player.pos.x - center[0], player.pos.z - center[2]) < 3 && player.pos.y < -3;
    open.current += ((near ? 1 : 0) - open.current) * Math.min(1, dt * 6);
    if (!ref.current) return;
    const slide = open.current * width * 0.95;
    if (isDock) ref.current.position.set(center[0] + slide, center[1], center[2]);
    else ref.current.position.set(center[0], center[1], center[2] - slide);
  });
  return (
    <mesh ref={ref} position={center} raycast={noRay}>
      <boxGeometry args={isDock ? [width, 2.5, 0.08] : [0.08, 2.5, width]} />
      <meshStandardMaterial color={isDock ? '#6a6c72' : '#2a2c33'} metalness={0.6} roughness={0.35} emissive="#111216" />
    </mesh>
  );
}

export function Backstage() {
  const tv = useMemo(() => createLedMaterial(), []);
  const { solid, glow, metal } = useMemo(() => {
    const k = new Kit();
    // all door gaps on corridor walls
    const westGaps = ROOMS.filter((r) => r.door && r.door.x1 < 0 && r.id !== 'dock').map((r) => [r.door!.z0, r.door!.z1] as [number, number]);
    const eastGaps = ROOMS.filter((r) => r.door && r.door.x0 > 0 && r.id !== 'dock').map((r) => [r.door!.z0, r.door!.z1] as [number, number]);
    for (const r of ROOMS) {
      const { x0, x1, z0, z1 } = r.rect;
      k.box((x0 + x1) / 2, -0.1, (z0 + z1) / 2, x1 - x0 + 0.5, 0.1, z1 - z0 + 0.5, r.floor);
      k.box((x0 + x1) / 2, CEILING, (z0 + z1) / 2, x1 - x0 + 0.5, 0.12, z1 - z0 + 0.5, '#1a1b1e');
      if (r.id === 'corridor') {
        wallSegments(k, 'x', -2.125, z0, -6.2, westGaps, r.wall);
        wallSegments(k, 'x', 2.125, z0, -6.2, eastGaps, r.wall);
        continue;
      }
      if (r.id === 'tunnel') {
        wallSegments(k, 'x', -2.6, z0, z1, [], r.wall);
        wallSegments(k, 'x', 2.6, z0, z1, [[ARENA_DOOR.z - 0.9, ARENA_DOOR.z + 0.9]], r.wall);
        wallSegments(k, 'z', z1 + 0.1, x0, x1, [], r.wall);
        k.box(-2.35, 0, -6.2, 0.5, CEILING, 0.25, r.wall);
        k.box(2.35, 0, -6.2, 0.5, CEILING, 0.25, r.wall);
        furnish(k, r);
        continue;
      }
      const gapZ: [number, number][] = r.door && r.id !== 'dock' ? [[r.door.z0 + 0.4, r.door.z1 - 0.4]] : [];
      // outer wall on the far side, inner wall on the corridor side (with door gap)
      const westRoom = x1 < 0 && r.id !== 'dock';
      if (r.id === 'dock') {
        wallSegments(k, 'x', x0, z0, z1, [], r.wall);
        wallSegments(k, 'x', x1, z0, z1, [], r.wall);
        wallSegments(k, 'z', z0, x0, x1, [], r.wall);
        wallSegments(k, 'z', z1 + 0.125, x0, x1, [[-1.6, 1.6]], r.wall);
      } else {
        wallSegments(k, 'x', westRoom ? x0 : x1, z0, z1, [], r.wall);
        wallSegments(k, 'z', z0, x0, x1, [], r.wall);
        wallSegments(k, 'z', z1, x0, x1, [], r.wall);
        void gapZ; // the corridor walls form the room's inner wall (with the door gap)
      }
      furnish(k, r);
      // ceiling light panel
      k.box((x0 + x1) / 2, CEILING - 0.05, (z0 + z1) / 2, 2.4, 0.04, 1.2, '#fff4e0', false, 'glow');
    }
    // stage lift pad
    k.cyl(LIFT.x, 0, LIFT.z, LIFT.r, 0.12, '#30333a', 'metal', 32);
    const ring = new THREE.TorusGeometry(LIFT.r, 0.05, 6, 40).rotateX(Math.PI / 2).translate(LIFT.x, Y + 0.14, LIFT.z);
    (k as any).add(k.glow, ring, '#4da3ff');
    backstageData.obstacles = k.obstacles;
    return { solid: k.build(k.solid), glow: k.build(k.glow), metal: k.build(k.metal) };
  }, []);
  useEffect(() => () => {
    solid?.dispose();
    glow?.dispose();
    metal?.dispose();
    tv.dispose();
  }, [solid, glow, metal, tv]);
  useFrame((s) => {
    tv.uniforms.uTime.value = s.clock.elapsedTime;
    tv.uniforms.uMode.value = 3;
    tv.uniforms.uBright.value = 1.2;
  });
  const green = ROOMS.find((r) => r.id === 'green')!.rect;
  return (
    <group>
      {solid && (
        <mesh geometry={solid} raycast={noRay}>
          <meshStandardMaterial vertexColors roughness={0.75} emissive="#2a2a30" emissiveIntensity={0.35} />
        </mesh>
      )}
      {metal && (
        <mesh geometry={metal} raycast={noRay}>
          <meshStandardMaterial vertexColors metalness={1} roughness={0.12} envMapIntensity={1.5} />
        </mesh>
      )}
      {glow && (
        <mesh geometry={glow} raycast={noRay}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
      )}
      {/* green room TV */}
      <mesh position={[green.x0 + 0.08, Y + 1.6, (green.z0 + green.z1) / 2 + 1]} rotation={[0, Math.PI / 2, 0]} material={tv} raycast={noRay}>
        <planeGeometry args={[3, 1.7]} />
      </mesh>
      {ROOMS.filter((r) => r.door).map((r) => (
        <Door key={r.id} room={r} />
      ))}
      {ROOMS.filter((r) => r.door && r.id !== 'dock').map((r) => {
        const west = r.door!.x1 < 0;
        const z = r.door!.z1 + 0.9;
        return <Sign key={`s-${r.id}`} text={r.name.toUpperCase()} pos={[west ? -1.85 : 1.85, Y + 2.2, z]} rotY={west ? Math.PI / 2 : -Math.PI / 2} w={1.5} />;
      })}
      <Sign text="STAGE ▲" pos={[0, Y + 2.9, -6.9]} rotY={Math.PI} w={2.2} color="#4da3ff" />
      <Sign text="LOADING DOCK" pos={[0, Y + 2.9, -50.6]} rotY={0} w={2.4} color="#ffd166" />
      <Sign text="ARENA FLOOR ▶" pos={[2.45, Y + 2.7, ARENA_DOOR.z]} rotY={-Math.PI / 2} w={1.8} color="#1aff6a" />
      <pointLight position={[-8, Y + 3, -15]} intensity={18} distance={14} decay={2} color="#ffe2b8" />
      <pointLight position={[0, Y + 3, -28]} intensity={14} distance={22} decay={2} color="#dfe8ff" />
      <pointLight position={[-8, Y + 3, -45]} intensity={14} distance={14} decay={2} color="#ffe8c8" />
      <pointLight position={[0, Y + 3, -58]} intensity={16} distance={20} decay={2} color="#f0f0ff" />
    </group>
  );
}

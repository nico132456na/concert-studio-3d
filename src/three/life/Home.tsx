import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useCareer } from '../../life/careerStore';
import { HOME_BY_ID, VEHICLE_BY_ID, tierFor, tierIndex } from '../../life/data';
import { interactables, walkArea, type Interactable } from '../../life/state';
import { lifeActions } from '../../life/actions';
import { Vehicle } from './Vehicle';
import { Npc, NPC_LOOKS } from './Npc';

const noRay = () => null;

type Rect = { x0: number; z0: number; x1: number; z1: number };
export const HOME_ROOMS: Record<'living' | 'bedroom' | 'closet' | 'studio' | 'garage', Rect & { name: string }> = {
  living: { name: 'Living Room', x0: -7, z0: -6, x1: 7, z1: 6 },
  bedroom: { name: 'Bedroom', x0: -7, z0: -14, x1: 0, z1: -6 },
  closet: { name: 'Walk-in Closet', x0: 0, z0: -14, x1: 7, z1: -6 },
  studio: { name: 'Recording Studio', x0: -17, z0: -6, x1: -7, z1: 6 },
  garage: { name: 'Garage', x0: 7, z0: -6, x1: 23, z1: 8 },
};
/** Door gaps: [x, z, axis] — axis 'x' means the wall runs along x. */
const DOORS: [number, number, 'x' | 'z'][] = [
  [-3.5, -6, 'x'],
  [3.5, -6, 'x'],
  [-7, 0, 'z'],
  [7, 0, 'z'],
];
/** Wall segments [x0, z0, x1, z1] (axis-aligned). */
const WALLS: [number, number, number, number][] = [
  [-7, -14, 7, -14],
  [-17, -6, 23, -6],
  [-17, 6, -7, 6],
  [7, 8, 23, 8],
  [-17, -6, -17, 6],
  [-7, -14, -7, 6],
  [0, -14, 0, -6],
  [7, -14, 7, 8],
  [23, -6, 23, 8],
];
const WALL_H = 3.4;
export const GARAGE_SLOTS = [10.5, 14.5, 18.5, 22 - 1.4];

export function roomAt(x: number, z: number) {
  for (const r of Object.values(HOME_ROOMS)) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.name;
  return 'Hallway';
}

/** Split a wall into pieces around door gaps. */
function wallPieces(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (const [x0, z0, x1, z1] of WALLS) {
    const alongX = z0 === z1;
    const cuts = DOORS.filter(([dx, dz, ax]) => (alongX ? ax === 'x' && dz === z0 && dx > x0 && dx < x1 : ax === 'z' && dx === x0 && dz > z0 && dz < z1))
      .map(([dx, dz]) => (alongX ? dx : dz))
      .sort((a, b) => a - b);
    let s = alongX ? x0 : z0;
    const e = alongX ? x1 : z1;
    for (const c of [...cuts, Infinity]) {
      const end = c === Infinity ? e : c - 0.8;
      if (end - s > 0.05) out.push(alongX ? [s, z0, end, z0] : [x0, s, x0, end]);
      if (c !== Infinity) s = c + 0.8;
    }
  }
  return out;
}

type Furn = { pos: [number, number, number]; size: [number, number, number]; color: string; rough?: number; metal?: number; emissive?: string; block?: boolean; rotY?: number };

export function Home() {
  const career = useCareer((s) => s.career);
  const home = HOME_BY_ID[career.home] ?? HOME_BY_ID.apartment;
  const tier = tierFor(career.xp, career.sandbox);
  const ti = tierIndex(tier.id);
  const look = career.look;

  const furniture = useMemo<Furn[]>(() => {
    const a = home.accent;
    const f: Furn[] = [
      // living
      { pos: [0, 0, 3], size: [4.4, 0.85, 1.1], color: '#2a2a30', block: true },
      { pos: [0, 0.85, 3.45], size: [4.4, 0.6, 0.25], color: '#2a2a30' },
      { pos: [0, 0, 1.2], size: [1.8, 0.42, 0.9], color: '#c9c2b4', rough: 0.3, block: true },
      { pos: [0, 0.01, 1.8], size: [6, 0.02, 4.4], color: a, rough: 1 },
      { pos: [0, 1.0, -5.85], size: [3.4, 1.9, 0.08], color: '#050507', emissive: '#203050' },
      { pos: [0, 0, -5.5], size: [3.6, 0.5, 0.5], color: '#1a1a1e', block: true },
      { pos: [6.4, 0, -2.5], size: [0.5, 2.4, 3], color: '#3a2a1c', block: true },
      { pos: [-6.3, 0, 5.3], size: [0.7, 1.4, 0.7], color: '#2f6b2f' },
      { pos: [6.3, 0, 5.3], size: [0.7, 1.4, 0.7], color: '#2f6b2f' },
      // bedroom
      { pos: [-3.5, 0, -12.6], size: [2.4, 0.55, 2.6], color: '#e8e4dc', block: true },
      { pos: [-3.5, 0, -13.85], size: [2.6, 1.3, 0.2], color: a },
      { pos: [-5.3, 0, -13.4], size: [0.6, 0.55, 0.5], color: '#3a2a1c', block: true },
      { pos: [-1.7, 0, -13.4], size: [0.6, 0.55, 0.5], color: '#3a2a1c', block: true },
      { pos: [-6.6, 0, -9.5], size: [0.6, 1.0, 2.2], color: '#3a2a1c', block: true },
      // closet
      { pos: [3.5, 0, -13.6], size: [6.4, 2.2, 0.6], color: '#2a2a2e', block: true },
      { pos: [6.6, 0, -10], size: [0.6, 2.2, 6.4], color: '#2a2a2e', block: true },
      { pos: [3.2, 0, -10], size: [2, 0.9, 1], color: '#e8e4dc', rough: 0.3, block: true },
      { pos: [0.25, 0.2, -9.5], size: [0.06, 2.0, 1.2], color: '#cfd8e0', metal: 1, rough: 0.05 },
      // studio
      { pos: [-12, 0, -1], size: [3.4, 0.95, 1.2], color: '#1a1a1e', block: true },
      { pos: [-12, 0.95, -1.3], size: [3, 0.08, 0.7], color: '#333', emissive: '#4da3ff' },
      { pos: [-13.4, 0.95, -1.6], size: [0.35, 0.5, 0.3], color: '#111' },
      { pos: [-10.6, 0.95, -1.6], size: [0.35, 0.5, 0.3], color: '#111' },
      { pos: [-12, 0, -4.2], size: [4.4, 2.7, 0.08], color: '#9ab', metal: 0.9, rough: 0.05 },
      { pos: [-16.9, 0.6, 0], size: [0.1, 2, 10], color: '#2a3a5a', rough: 1 },
      // garage
      { pos: [22.7, 0.2, 1], size: [0.1, 2.6, 10], color: '#3a3a3e' },
    ];
    if (ti >= 1) f.push({ pos: [-4.6, 0, 3.6], size: [1.5, 1.0, 1.4], color: '#0b0b0d', rough: 0.15, metal: 0.4, block: true });
    return f;
  }, [home.accent, ti]);

  // walkable + interactables
  useEffect(() => {
    const rooms = Object.values(HOME_ROOMS);
    const doorRects = DOORS.map(([x, z, ax]) => (ax === 'x' ? { x0: x - 0.7, x1: x + 0.7, z0: z - 0.6, z1: z + 0.6 } : { x0: x - 0.6, x1: x + 0.6, z0: z - 0.7, z1: z + 0.7 }));
    const blocks = furniture.filter((f) => f.block).map((f) => ({ x0: f.pos[0] - f.size[0] / 2 - 0.25, x1: f.pos[0] + f.size[0] / 2 + 0.25, z0: f.pos[2] - f.size[2] / 2 - 0.25, z1: f.pos[2] + f.size[2] / 2 + 0.25 }));
    const cars = career.vehicles.slice(0, 4).map((v, i) => {
      const d = VEHICLE_BY_ID[v];
      return { x0: GARAGE_SLOTS[i] - d.dims[1] / 2 - 0.3, x1: GARAGE_SLOTS[i] + d.dims[1] / 2 + 0.3, z0: 1.5 - d.dims[0] / 2 - 0.3, z1: 1.5 + d.dims[0] / 2 + 0.3 };
    });
    const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
    walkArea.test = (x, z) => (rooms.some((r) => inR(r, x, z, 0.35)) || doorRects.some((r) => inR(r, x, z))) && !blocks.some((r) => inR(r, x, z)) && !cars.some((r) => inR(r, x, z));

    const list: Interactable[] = [
      { id: 'manager', x: -3.8, z: -1.5, r: 2.2, label: 'Talk to your manager', actions: [{ label: 'Talk', run: () => lifeActions.talk('manager') }] },
      { id: 'assistant', x: 4.6, z: -4.3, r: 2.2, label: 'Talk to your assistant', actions: [{ label: 'Talk', run: () => lifeActions.talk('assistant') }] },
      { id: 'security', x: 9.5, z: -3.5, r: 2.4, label: 'Head of security', actions: [{ label: 'Talk', run: () => lifeActions.talk('security') }] },
      { id: 'mirror', x: 1.2, z: -9.5, r: 1.8, label: 'Closet mirror', actions: [{ label: 'Change outfit', run: () => lifeActions.closet() }] },
      { id: 'mic', x: -12, z: 0.6, r: 2.0, label: 'Studio console', actions: [{ label: 'Record a song', run: () => lifeActions.record() }] },
      { id: 'bed', x: -3.5, z: -10.6, r: 1.8, label: 'Bed', actions: [{ label: 'Check phone', run: () => lifeActions.talk('phone') }] },
      { id: 'tv', x: 0, z: -4.4, r: 1.8, label: 'TV', actions: [{ label: 'Plan tonight’s show', run: () => lifeActions.pickShow() }] },
    ];
    career.vehicles.slice(0, 4).forEach((v, i) => {
      const d = VEHICLE_BY_ID[v];
      list.push({
        id: `car-${v}`,
        x: GARAGE_SLOTS[i] - d.dims[1] / 2 - 0.9,
        z: 1.5,
        r: 1.8,
        label: `${d.label}${career.vehicle === v ? ' (selected)' : ''}`,
        actions: [
          { label: 'Drive to the venue', run: () => lifeActions.drive(v) },
          { label: 'Change paint', run: () => lifeActions.paint(v) },
        ],
      });
    });
    interactables.list = list;
    return () => {
      interactables.list = [];
    };
  }, [furniture, career.vehicles, career.vehicle]);

  const pieces = useMemo(wallPieces, []);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: home.floor, roughness: 0.45, metalness: 0.05 }), [home.floor]);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: home.wall, roughness: 0.85 }), [home.wall]);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9fc2e0', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18 }), []);
  useEffect(() => () => [floorMat, wallMat, glassMat].forEach((m) => m.dispose()), [floorMat, wallMat, glassMat]);

  const securityCount = Math.max(1, tier.security);
  return (
    <group>
      {/* floors */}
      {Object.entries(HOME_ROOMS).map(([id, r]) => (
        <mesh key={id} position={[(r.x0 + r.x1) / 2, -0.05, (r.z0 + r.z1) / 2]} material={id === 'garage' ? undefined : floorMat} receiveShadow raycast={noRay}>
          <boxGeometry args={[r.x1 - r.x0, 0.1, r.z1 - r.z0]} />
          {id === 'garage' && <meshStandardMaterial color="#4a4a4e" roughness={0.6} />}
        </mesh>
      ))}
      {/* ceilings (hidden from above so the top camera works) */}
      {/* walls */}
      {pieces.map(([x0, z0, x1, z1], i) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const glass = z0 === 6 && z1 === 6 && x0 >= -7;
        return (
          <mesh key={i} position={[(x0 + x1) / 2, WALL_H / 2, (z0 + z1) / 2]} rotation={[0, z0 === z1 ? 0 : Math.PI / 2, 0]} material={glass ? glassMat : wallMat} raycast={noRay}>
            <boxGeometry args={[len + 0.2, WALL_H, 0.2]} />
          </mesh>
        );
      })}
      {/* living-room window wall */}
      <mesh position={[0, WALL_H / 2, 6]} material={glassMat} raycast={noRay}>
        <boxGeometry args={[14, WALL_H, 0.06]} />
      </mesh>
      {/* furniture */}
      {furniture.map((f, i) => (
        <mesh key={i} position={[f.pos[0], f.pos[1] + f.size[1] / 2, f.pos[2]]} rotation={[0, f.rotY ?? 0, 0]} castShadow raycast={noRay}>
          <boxGeometry args={f.size} />
          <meshStandardMaterial color={f.color} roughness={f.rough ?? 0.7} metalness={f.metal ?? 0} emissive={f.emissive ?? '#000000'} emissiveIntensity={f.emissive ? 1.2 : 0} />
        </mesh>
      ))}
      {/* awards wall: one disc per career tier reached + shows */}
      {Array.from({ length: Math.min(8, ti * 2 + Math.min(4, career.shows.length)) }, (_, i) => (
        <mesh key={i} position={[6.12, 1.2 + (i % 2) * 0.8, -3.6 + Math.floor(i / 2) * 0.7]} rotation={[0, -Math.PI / 2, 0]} raycast={noRay}>
          <cylinderGeometry args={[0.24, 0.24, 0.03, 24]} />
          <meshStandardMaterial color={i < ti * 2 ? '#e8e8f0' : '#d9a740'} metalness={1} roughness={0.15} />
        </mesh>
      ))}
      {/* clothes on rails */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[0.8 + i * 0.42, 1.25, -13.2]} raycast={noRay}>
          <boxGeometry args={[0.32, 0.95, 0.4]} />
          <meshStandardMaterial color={[look.topColor, '#111', '#f2f2f2', home.accent, '#20283a', '#8a2aff', '#ff2a4a'][i % 7]} roughness={0.9} />
        </mesh>
      ))}
      {/* studio mic */}
      <mesh position={[-12, 1.5, -5]} raycast={noRay}><cylinderGeometry args={[0.06, 0.05, 0.22, 10]} /><meshStandardMaterial color="#888" metalness={1} roughness={0.3} /></mesh>
      <mesh position={[-12, 0.7, -5]} raycast={noRay}><cylinderGeometry args={[0.015, 0.015, 1.4, 6]} /><meshStandardMaterial color="#222" /></mesh>
      {/* chandelier for big homes */}
      {home.scale >= 1.2 && (
        <mesh position={[0, WALL_H - 0.6, 0.5]} raycast={noRay}>
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial color="#fff" emissive="#ffe0a0" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      )}
      {/* garage door */}
      <mesh position={[15, 1.6, 7.9]} raycast={noRay}>
        <boxGeometry args={[7, 3.2, 0.1]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* cars */}
      {career.vehicles.slice(0, 4).map((v, i) => (
        <Vehicle key={v} def={VEHICLE_BY_ID[v]} color={career.vehicleColors[v] ?? VEHICLE_BY_ID[v].colors[0]} position={[GARAGE_SLOTS[i], 0, 1.5]} lights={career.vehicle === v} />
      ))}
      {/* people */}
      <Npc look={NPC_LOOKS.manager} x={-3.8} z={-1.5} yaw={0.6} />
      <Npc look={NPC_LOOKS.assistant} x={4.6} z={-4.3} yaw={-0.4} />
      {Array.from({ length: Math.min(2, securityCount) }, (_, i) => (
        <Npc key={i} look={i ? NPC_LOOKS.security2 : NPC_LOOKS.security} x={9.5 + i * 1.2} z={-3.5} yaw={Math.PI} />
      ))}
      {/* outside view */}
      <Outside view={home.view} />
      {/* lights */}
      <hemisphereLight args={['#fff4e6', '#4a4038', 1.1]} />
      {[
        [0, 0],
        [-3.5, -10],
        [3.5, -10],
        [-12, 0],
        [15, 1],
      ].map(([x, z], i) => (
        <pointLight key={i} position={[x, WALL_H - 0.3, z]} intensity={i === 3 ? 18 : 26} distance={14} decay={1.6} color={i === 3 ? '#9fc8ff' : '#ffe6c8'} />
      ))}
    </group>
  );
}

function Outside({ view }: { view: 'city' | 'garden' | 'hills' }) {
  const tex = useMemo(() => {
    if (view !== 'city') return null;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#05070f');
    grd.addColorStop(1, '#1a1830');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 256);
    let x = 0;
    while (x < 512) {
      const w = 20 + Math.random() * 40, h = 60 + Math.random() * 170;
      g.fillStyle = '#0a0b12';
      g.fillRect(x, 256 - h, w, h);
      for (let wy = 256 - h + 6; wy < 250; wy += 8) for (let wx = x + 3; wx < x + w - 4; wx += 6) if (Math.random() > 0.55) {
        g.fillStyle = Math.random() > 0.8 ? '#9fc8ff' : '#ffd79a';
        g.fillRect(wx, wy, 3, 4);
      }
      x += w + 2;
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [view]);
  useEffect(() => () => tex?.dispose(), [tex]);
  if (tex)
    return (
      <mesh position={[0, 6, 40]} rotation={[0, Math.PI, 0]} raycast={noRay}>
        <planeGeometry args={[160, 80]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    );
  return (
    <group>
      <mesh position={[0, -0.12, 30]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
        <planeGeometry args={[120, 48]} />
        <meshStandardMaterial color={view === 'garden' ? '#2f5a2f' : '#3a4a2a'} roughness={1} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={i} position={[-40 + i * 5.3, 2.6, 14 + (i % 3) * 7]} raycast={noRay}>
          <coneGeometry args={[1.4, 5, 7]} />
          <meshStandardMaterial color="#1f3f22" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 10, 60]} rotation={[0, Math.PI, 0]} raycast={noRay}>
        <planeGeometry args={[200, 40]} />
        <meshBasicMaterial color={view === 'hills' ? '#26324a' : '#30405a'} />
      </mesh>
    </group>
  );
}

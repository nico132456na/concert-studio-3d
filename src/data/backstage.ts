/**
 * Backstage level: a working venue underneath the stage (floor at BACKSTAGE_Y).
 * Everything is described as axis-aligned rectangles on the plan (x, z) so the same data
 * drives rendering, walking (collision) and the navigation map.
 */
export const BACKSTAGE_Y = -8;
export const CEILING = 3.4;

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export type RoomId =
  | 'dressing' | 'makeup' | 'lounge' | 'green' | 'office' | 'stagemgmt' | 'lighting' | 'audio' | 'vip' | 'dock' | 'corridor' | 'tunnel';

export interface Room {
  id: RoomId;
  name: string;
  rect: Rect;
  floor: string;
  wall: string;
  /** door opening rect that joins the room to the corridor */
  door?: Rect;
  /** where to stand when teleporting here */
  spawn: [number, number];
  /** player faces this way on spawn (radians) */
  facing: number;
}

const W = 0.25; // wall thickness

export const ROOMS: Room[] = [
  { id: 'corridor', name: 'Crew Corridor', rect: { x0: -2, x1: 2, z0: -51.2, z1: -5.4 }, floor: '#3a3c40', wall: '#4a4c50', spawn: [0, -30], facing: Math.PI },
  { id: 'tunnel', name: 'Performer Tunnel', rect: { x0: -2.5, x1: 2.5, z0: -6.2, z1: -1.2 }, floor: '#141416', wall: '#1d1e22', spawn: [0, -5], facing: 0 },
  { id: 'dressing', name: 'Artist Dressing Room', rect: { x0: -14, x1: -2 - W, z0: -20, z1: -10 }, floor: '#5a4636', wall: '#2c2a2e', door: { x0: -2 - W - 0.7, x1: -1.3, z0: -16.2, z1: -13.8 }, spawn: [-8, -15], facing: Math.PI / 2 },
  { id: 'makeup', name: 'Hair & Makeup', rect: { x0: -14, x1: -2 - W, z0: -30, z1: -21 }, floor: '#d8d2c8', wall: '#e8e2da', door: { x0: -2 - W - 0.7, x1: -1.3, z0: -26.6, z1: -24.4 }, spawn: [-3.6, -25.5], facing: -Math.PI / 2 },
  { id: 'lounge', name: 'Artist Lounge', rect: { x0: -14, x1: -2 - W, z0: -40, z1: -31 }, floor: '#3b2a22', wall: '#3a2f3a', door: { x0: -2 - W - 0.7, x1: -1.3, z0: -36.6, z1: -34.4 }, spawn: [-3.6, -35.5], facing: -Math.PI / 2 },
  { id: 'green', name: 'Green Room', rect: { x0: -14, x1: -2 - W, z0: -50, z1: -41 }, floor: '#2f3a2c', wall: '#3b4a37', door: { x0: -2 - W - 0.7, x1: -1.3, z0: -46.6, z1: -44.4 }, spawn: [-3.6, -45.5], facing: -Math.PI / 2 },
  { id: 'office', name: 'Production Office', rect: { x0: 2 + W, x1: 12, z0: -18, z1: -10 }, floor: '#4a4a4e', wall: '#5a5c62', door: { x0: 1.3, x1: 2 + W + 0.7, z0: -15.1, z1: -12.9 }, spawn: [3.6, -14], facing: Math.PI / 2 },
  { id: 'stagemgmt', name: 'Stage Management', rect: { x0: 2 + W, x1: 12, z0: -26, z1: -19 }, floor: '#3d4048', wall: '#4b4f58', door: { x0: 1.3, x1: 2 + W + 0.7, z0: -23.6, z1: -21.4 }, spawn: [3.6, -22.5], facing: Math.PI / 2 },
  { id: 'lighting', name: 'Lighting Control', rect: { x0: 2 + W, x1: 12, z0: -34, z1: -27 }, floor: '#202226', wall: '#26282e', door: { x0: 1.3, x1: 2 + W + 0.7, z0: -31.6, z1: -29.4 }, spawn: [3.6, -30.5], facing: Math.PI / 2 },
  { id: 'audio', name: 'Audio Control', rect: { x0: 2 + W, x1: 12, z0: -42, z1: -35 }, floor: '#22242a', wall: '#2a2c33', door: { x0: 1.3, x1: 2 + W + 0.7, z0: -39.6, z1: -37.4 }, spawn: [3.6, -38.5], facing: Math.PI / 2 },
  { id: 'vip', name: 'VIP Waiting Room', rect: { x0: 2 + W, x1: 12, z0: -50, z1: -43 }, floor: '#1e1a14', wall: '#2e2618', door: { x0: 1.3, x1: 2 + W + 0.7, z0: -47.6, z1: -45.4 }, spawn: [3.6, -46.5], facing: Math.PI / 2 },
  { id: 'dock', name: 'Loading Dock & Storage', rect: { x0: -16, x1: 16, z0: -66, z1: -51 - W }, floor: '#55524c', wall: '#3d3b38', door: { x0: -1.8, x1: 1.8, z0: -51 - W - 0.7, z1: -50.4 }, spawn: [0, -58], facing: 0 },
];

export const ROOM_BY_ID: Record<string, Room> = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

/** Stage lift at the end of the performer tunnel. */
export const LIFT = { x: 0, z: -2.6, r: 1.3 };
/** Door to the arena floor (teleports to the side of the stage). */
export const ARENA_DOOR = { x: 2.3, z: -4, r: 1.4 };

/** Furniture footprints that block walking (approximate). */
export interface Obstacle extends Rect {
  h: number;
}

export function inRect(r: Rect, x: number, z: number, pad = 0) {
  return x >= r.x0 + pad && x <= r.x1 - pad && z >= r.z0 + pad && z <= r.z1 - pad;
}

export function walkableBackstage(x: number, z: number, obstacles: Obstacle[], radius = 0.3) {
  let ok = false;
  for (const r of ROOMS) {
    if (inRect(r.rect, x, z, radius)) ok = true;
    if (r.door && inRect(r.door, x, z, 0)) ok = true;
  }
  if (!ok) return false;
  for (const o of obstacles) if (inRect(o, x, z, -radius)) return false;
  return true;
}

export function roomAt(x: number, z: number): Room | undefined {
  return ROOMS.find((r) => r.id !== 'corridor' && inRect(r.rect, x, z)) ?? ROOMS.find((r) => inRect(r.rect, x, z));
}

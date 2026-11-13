import * as THREE from 'three';
import type { StageObject } from '../types';
import { getGeometry } from './geometry';

/**
 * Surface queries against the real (scaled, rotated) geometry of stage objects.
 * Used for placing new objects on top of decks and for walking the performer
 * over stairs, ramps, domes and any custom shape.
 */

const probe = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
const ray = new THREE.Raycaster();
const inv = new THREE.Matrix4();
const mtx = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const origin = new THREE.Vector3();
const down = new THREE.Vector3(0, -1, 0);
const hits: THREE.Intersection[] = [];

function objectMatrix(o: StageObject, out: THREE.Matrix4) {
  e.set(o.rot[0], o.rot[1], o.rot[2]);
  q.setFromEuler(e);
  return out.compose(new THREE.Vector3(o.pos[0], o.pos[1], o.pos[2]), q, new THREE.Vector3(Math.max(0.01, o.size[0]), Math.max(0.01, o.size[1]), Math.max(0.01, o.size[2])));
}

/** Cheap horizontal reach test before raycasting. */
function near(o: StageObject, x: number, z: number) {
  const r = Math.hypot(o.size[0], o.size[2]) / 2 + 0.2;
  return Math.abs(x - o.pos[0]) <= r && Math.abs(z - o.pos[2]) <= r;
}

/** Height of the top surface of one object at (x, z), or null if (x, z) is not over it. */
export function topOf(o: StageObject, x: number, z: number, fromY = 200): number | null {
  if (o.hidden || !near(o, x, z)) return null;
  const geo = getGeometry(o.kind, o.size, o.outline).main;
  probe.geometry = geo;
  objectMatrix(o, mtx);
  probe.matrixWorld.copy(mtx);
  probe.matrixAutoUpdate = false;
  origin.set(x, fromY, z);
  ray.set(origin, down);
  ray.far = fromY + 50;
  hits.length = 0;
  probe.raycast(ray, hits);
  if (!hits.length) return null;
  let best = -Infinity;
  for (const h of hits) best = Math.max(best, h.point.y);
  void inv;
  return best;
}

/** Flat decks that other items can be set down on. */
const DECKS = new Set(['platform', 'circlePlatform', 'hexPlatform', 'runway', 'bstage', 'floating', 'catwalk', 'ovalPlatform', 'semicircle', 'trianglePlatform', 'octagon', 'diamond', 'crossStage', 'tStage', 'uStage', 'lStage', 'hStage', 'ringStage', 'curvedRunway', 'rotatingPlatform', 'custom', 'ledFloor']);

const WALK_SKIP = new Set(['ledTransparent', 'curtain', 'fabric', 'ledCeiling', 'trussGrid', 'circleTruss', 'curvedTruss']);

/** Highest deck top under a point, for placing new objects on the stage. */
export function supportHeight(objects: StageObject[], x: number, z: number, excludeId?: string) {
  let h = 0;
  for (const o of objects) {
    if (o.id === excludeId) continue;
    if (!DECKS.has(o.kind) || o.size[1] > 8) continue;
    const t = topOf(o, x, z);
    if (t !== null && t > h && t < 20) h = t;
  }
  return h;
}

export interface WalkResult {
  ground: number;
  blocked: boolean;
}

/**
 * Ground for a walker whose feet are at `feetY`. Surfaces higher than `step` above the
 * feet block movement; things more than `head` above the feet are walked under.
 */
export function walkSurface(objects: StageObject[], x: number, z: number, feetY: number, baseGround: number, step = 0.7, head = 1.9): WalkResult {
  let ground = baseGround;
  let blocked = false;
  for (const o of objects) {
    if (WALK_SKIP.has(o.kind) || o.hidden) continue;
    if (o.pos[1] > feetY + head) continue; // overhead (flown) — walk under it
    const t = topOf(o, x, z, feetY + head + 30);
    if (t === null) continue;
    if (t <= feetY + step) ground = Math.max(ground, t);
    else blocked = true;
  }
  return { ground, blocked };
}

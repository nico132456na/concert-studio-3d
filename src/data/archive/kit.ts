import type { DesignSeed, Fixture, FixtureType, LedSpec, StageObject, Vec3, VisualId } from '../../types';
import { makeFixture, makeObject, makeFromDef } from '../library';
import { finalize, fixtureRow, standardRig } from '../builders';
import type { Palette } from '../sceneGen';

/** Small toolkit used to describe tour stages compactly but with their own geometry. */

export const O = makeObject;
export const D = makeFromDef;
export const F = makeFixture;
export { fixtureRow, standardRig };

export const deg = (a: number) => (a * 180) / Math.PI;

/** End stage deck whose front edge sits at z = 0. */
export function endStage(w: number, d: number, h = 1.6, material = 'glossBlack', name = 'Main Stage'): StageObject[] {
  return [
    O('platform', { pos: [0, 0, -d / 2], size: [w, h, d], material, name, tag: 'main' }),
    O('stairs', { pos: [-w / 2 - 1.6, 0, -1.6], rot: [0, -Math.PI / 2, 0], size: [2.5, h, 3], name: 'Stairs L', material: 'matteBlack', tag: 'main' }),
    O('stairs', { pos: [w / 2 + 1.6, 0, -1.6], rot: [0, Math.PI / 2, 0], size: [2.5, h, 3], name: 'Stairs R', material: 'matteBlack', tag: 'main' }),
  ];
}

/** Straight runway between two points on the floor plan. */
export function walk(x0: number, z0: number, x1: number, z1: number, w = 2.6, h = 1.6, material = 'glossBlack', name = 'Runway'): StageObject {
  const dx = x1 - x0, dz = z1 - z0;
  return O('runway', { pos: [(x0 + x1) / 2, 0, (z0 + z1) / 2], size: [w, h, Math.hypot(dx, dz)], rot: [0, Math.atan2(dx, dz), 0], material, name, tag: 'main' });
}

export function disc(x: number, z: number, dia: number, h = 1.6, material = 'glossBlack', name = 'B-Stage', y = 0): StageObject {
  return O('circlePlatform', { pos: [x, y, z], size: [dia, h, dia], material, name, tag: 'main' });
}

export function screen(x: number, y: number, z: number, w: number, h: number, visual: VisualId, c1: string, c2: string, extra: Partial<Omit<StageObject, 'led' | 'material'>> & { material?: any; led?: Partial<LedSpec>; kind?: StageObject['kind'] } = {}): StageObject {
  const { kind = 'ledWall', led, ...rest } = extra;
  return O(kind, { pos: [x, y, z], size: [w, h, rest.size?.[2] ?? 0.4], ...rest, led: { visual, color1: c1, color2: c2, ...(led ?? {}) } });
}

/** IMAG side screens either side of a stage. */
export function imag(offsetX: number, y: number, z: number, w: number, h: number, visual: VisualId = 'gradient', c1 = '#ffffff', c2 = '#2a7bff', circle = false): StageObject[] {
  return [-1, 1].map((s) => O(circle ? 'ledCircle' : 'ledVertical', { pos: [s * offsetX, y, z], size: [w, h, 0.4], rot: [0, -s * 0.12, 0], name: s < 0 ? 'IMAG Left' : 'IMAG Right', led: { visual, color1: c1, color2: c2 } }));
}

/** Left/right line arrays + outfills + a sub row. */
export function pa(width: number, y = 12, z = 1, subs = true): StageObject[] {
  const x = width / 2 + 3;
  const out = [
    D('lineArray', { pos: [-x, y, z], rot: [0, 0.18, 0], name: 'Main PA L' }),
    D('lineArray', { pos: [x, y, z], rot: [0, -0.18, 0], name: 'Main PA R' }),
    D('sideHang', { pos: [-x - 3, y, z - 1], rot: [0, 0.6, 0], name: 'Outfill L' }),
    D('sideHang', { pos: [x + 3, y, z - 1], rot: [0, -0.6, 0], name: 'Outfill R' }),
  ];
  if (subs) out.push(D('subArray', { pos: [0, 0, z + 2.5], size: [Math.min(width, 24), 0.7, 1], name: 'Sub Array' }));
  return out;
}

/** PA hangs on a ring (in-the-round shows). */
export function paRing(n: number, r: number, cz: number, y: number): StageObject[] {
  const out: StageObject[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(D('lineArray', { pos: [Math.sin(a) * r, y, cz + Math.cos(a) * r], rot: [0, a, 0], name: `PA ${i + 1}` }));
  }
  return out;
}

export function ringFixtures(n: number, r: number, cz: number, y: number, color: string, types: FixtureType[] = ['spot', 'beam'], tilt = 22): Fixture[] {
  const out: Fixture[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(F(types[i % types.length], { pos: [Math.sin(a) * r, y, cz + Math.cos(a) * r], pan: deg(a) + 180, tilt, color, name: `Ring ${i + 1}` }));
  }
  return out;
}

export function around(n: number, r: number, cz: number, fn: (x: number, z: number, a: number, i: number) => void) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    fn(Math.sin(a) * r, cz + Math.cos(a) * r, a, i);
  }
}

export function seed(objects: StageObject[], fixtures: Fixture[], palette: Palette, atmosphere?: DesignSeed['atmosphere']) {
  return finalize(objects, fixtures, palette, atmosphere);
}

/** Standard end-stage rig + PA; returns objects & fixtures to merge. */
export function rig(width: number, palette: Palette, opts: Parameters<typeof standardRig>[2] = {}, paY = 12) {
  const r = standardRig(width, palette, opts);
  return { objects: [...r.objects, ...pa(width, paY)], fixtures: r.fixtures };
}

export type V3 = Vec3;

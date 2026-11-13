import type { DesignSeed, Fixture, FixtureType, StageObject, Vec3 } from '../types';
import { makeFixture, makeObject } from './library';
import type { Palette } from './sceneGen';
import { buildAutoShow } from './sceneGen';

export type StageShape = 'rect' | 'circle' | 'hex' | 'thrust' | 'tshape' | 'wide';

export interface StageParams {
  shape: StageShape;
  width: number;
  depth: number;
  height: number;
  levels: number;
  runway: number; // length, 0 = none
  bstage: boolean;
  stairs: boolean;
  material: string;
}

export const DEFAULT_STAGE: StageParams = {
  shape: 'rect',
  width: 24,
  depth: 12,
  height: 1.6,
  levels: 1,
  runway: 0,
  bstage: false,
  stairs: true,
  material: 'glossBlack',
};

/** Parametric main-stage generator. All parts are tagged 'main' so they can be rebuilt. */
export function buildMainStage(p: StageParams): StageObject[] {
  const out: StageObject[] = [];
  const tag = 'main';
  const deck = (kind: StageObject['kind'], pos: Vec3, size: Vec3, name: string) =>
    out.push(makeObject(kind, { pos, size, name, material: p.material, tag }));

  const W = p.width, D = p.depth, H = p.height;
  if (p.shape === 'circle') deck('circlePlatform', [0, 0, -D / 2], [W, H, W], 'Main Stage');
  else if (p.shape === 'hex') deck('hexPlatform', [0, 0, -D / 2], [W, H, W], 'Main Stage');
  else deck('platform', [0, 0, -D / 2], [W, H, D], 'Main Stage');

  if (p.shape === 'thrust') deck('platform', [0, 0, 3], [W * 0.45, H, 6], 'Thrust');
  if (p.shape === 'tshape') {
    deck('platform', [0, 0, 4], [4, H, 8], 'T Runway');
    deck('platform', [0, 0, 9], [W * 0.7, H, 3], 'T Crossbar');
  }
  if (p.shape === 'wide') {
    deck('platform', [-W / 2 - 4, 0, -D / 2 + 2], [8, H, D - 4], 'Wing L');
    deck('platform', [W / 2 + 4, 0, -D / 2 + 2], [8, H, D - 4], 'Wing R');
  }

  for (let i = 1; i < p.levels; i++) {
    const s = 1 - i * 0.22;
    const w = Math.max(3, W * s);
    const d = Math.max(2.5, D * (1 - i * 0.28));
    const y = H + (i - 1) * 1.6;
    const kind = p.shape === 'circle' ? 'circlePlatform' : p.shape === 'hex' ? 'hexPlatform' : 'platform';
    const dd = kind === 'platform' ? d : w;
    out.push(makeObject(kind, { pos: [0, y, -D + dd / 2 + 0.5], size: [w, 1.6, dd], name: `Level ${i + 1}`, material: p.material, tag }));
    if (p.stairs) out.push(makeObject('stairs', { pos: [0, y, -D + dd + 1.9], size: [3, 1.6, 2.8], name: `Stairs L${i + 1}`, material: 'matteBlack', tag }));
  }

  if (p.runway > 0) {
    deck('runway', [0, 0, p.runway / 2], [3, H, p.runway], 'Runway');
    if (p.bstage) deck('bstage', [0, 0, p.runway + 3], [8, H, 8], 'B-Stage');
  } else if (p.bstage) {
    deck('bstage', [0, 0, 14], [8, H, 8], 'B-Stage');
  }

  if (p.stairs && H > 0.4) {
    out.push(makeObject('stairs', { pos: [-W / 2 - 1.6, 0, -1.6], rot: [0, -Math.PI / 2, 0], size: [2.5, H, 3], name: 'Side Stairs L', material: 'matteBlack', tag }));
    out.push(makeObject('stairs', { pos: [W / 2 + 1.6, 0, -1.6], rot: [0, Math.PI / 2, 0], size: [2.5, H, 3], name: 'Side Stairs R', material: 'matteBlack', tag }));
  }
  return out;
}

/* ----------------------------- rig helpers ----------------------------- */

export function fixtureRow(type: FixtureType, count: number, from: Vec3, to: Vec3, over: Partial<Fixture> = {}): Fixture[] {
  const out: Fixture[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const pos: Vec3 = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
    out.push(makeFixture(type, { pos, name: `${over.name ?? type} ${i + 1}`, ...over, ...(over.name ? { name: `${over.name} ${i + 1}` } : {}) }));
  }
  return out;
}

export function trussWithSpots(y: number, width: number, z: number, count: number, type: FixtureType = 'spot', over: Partial<Fixture> = {}) {
  const objects = [makeObject('truss', { pos: [0, y, z], size: [width, 0.5, 0.5], name: 'Truss' })];
  const fixtures = fixtureRow(type, count, [-width / 2 + 1, y - 0.4, z], [width / 2 - 1, y - 0.4, z], { name: type === 'beam' ? 'Beam' : 'Spot', ...over });
  return { objects, fixtures };
}

export function finalize(objects: StageObject[], fixtures: Fixture[], palette: Palette, atmosphere?: DesignSeed['atmosphere']): DesignSeed {
  const { scenes, cues } = buildAutoShow(fixtures, objects, palette);
  return { objects, fixtures, scenes, cues, atmosphere };
}

/** Standard rig used by many templates. */
export function standardRig(width: number, palette: Palette, opts: { trussY?: number; spots?: number; beams?: number; floor?: number; wash?: number; blinders?: boolean; lasers?: number; strobes?: number } = {}) {
  const y = opts.trussY ?? 13;
  const objects: StageObject[] = [];
  const fixtures: Fixture[] = [];
  const front = trussWithSpots(y, width + 4, 2, opts.spots ?? 6, 'spot', { color: palette[2], tilt: 30, pan: 180, role: 'front' });
  const back = trussWithSpots(y + 1, width, -9, opts.beams ?? 8, 'beam', { color: palette[1], tilt: 15, role: 'back' });
  objects.push(...front.objects, ...back.objects);
  fixtures.push(...front.fixtures, ...back.fixtures);
  if (opts.wash ?? 4) fixtures.push(...fixtureRow('wash', opts.wash ?? 4, [-width / 2, y - 0.4, -4], [width / 2, y - 0.4, -4], { name: 'Wash', color: palette[0], tilt: 20, pan: 180, role: 'top' }));
  if (opts.floor ?? 6) fixtures.push(...fixtureRow('ledbar', opts.floor ?? 6, [-width / 2 + 2, 1.7, -1], [width / 2 - 2, 1.7, -1], { name: 'Floor Bar', color: palette[0], tilt: 170, role: 'floor' }));
  if (opts.blinders ?? true) fixtures.push(...fixtureRow('blinder', 2, [-width / 2 - 1, 8, 1], [width / 2 + 1, 8, 1], { name: 'Blinder', intensity: 0, tilt: 82 }));
  if (opts.lasers) fixtures.push(...fixtureRow('laser', opts.lasers, [-width / 3, 1.9, -1.5], [width / 3, 1.9, -1.5], { name: 'Laser', color: '#1aff9c' }));
  if (opts.strobes) fixtures.push(...fixtureRow('strobe', opts.strobes, [-width / 2, y + 0.5, -2], [width / 2, y + 0.5, -2], { name: 'Strobe', intensity: 0.8 }));
  return { objects, fixtures };
}

import type { Fixture, FixtureType, LedSpec, ObjectKind, StageObject, Vec3, MaterialSpec } from '../types';
import { mat } from './materials';
import { uid } from '../util/misc';

export type LibraryCategory = 'stage' | 'led' | 'structure' | 'soft' | 'decor';

export interface ObjectDef {
  kind: ObjectKind;
  label: string;
  category: LibraryCategory;
  size: Vec3;
  y?: number;
  material: string;
  led?: boolean;
  /** LED covers the whole surface rather than the front face */
  ledAll?: boolean;
  hint: string;
}

export const OBJECT_DEFS: ObjectDef[] = [
  // Stage foundations
  { kind: 'platform', label: 'Platform', category: 'stage', size: [12, 1.6, 8], material: 'glossBlack', hint: 'Rectangular deck' },
  { kind: 'circlePlatform', label: 'Round Stage', category: 'stage', size: [10, 1.6, 10], material: 'glossBlack', hint: 'Circular deck' },
  { kind: 'hexPlatform', label: 'Hex Stage', category: 'stage', size: [9, 1.6, 9], material: 'glossBlack', hint: 'Six-sided deck' },
  { kind: 'runway', label: 'Runway', category: 'stage', size: [3, 1.6, 16], material: 'glossBlack', hint: 'Long thrust walkway' },
  { kind: 'bstage', label: 'B-Stage', category: 'stage', size: [7, 1.6, 7], material: 'glossBlack', hint: 'Round satellite stage' },
  { kind: 'floating', label: 'Floating Platform', category: 'stage', size: [5, 0.5, 5], y: 6, material: 'aluminum', hint: 'Suspended deck' },
  { kind: 'stairs', label: 'Stairs', category: 'stage', size: [3, 1.6, 3], material: 'matteBlack', hint: 'Steps up to a deck' },
  { kind: 'ramp', label: 'Ramp', category: 'stage', size: [3, 1.6, 6], material: 'matteBlack', hint: 'Sloped walkway' },
  { kind: 'catwalk', label: 'Catwalk', category: 'stage', size: [2, 0.3, 14], y: 7, material: 'steelGrid', hint: 'Elevated bridge' },
  // LED
  { kind: 'ledWall', label: 'LED Wall', category: 'led', size: [20, 9, 0.4], y: 1.6, material: 'matteBlack', led: true, hint: 'Main video wall' },
  { kind: 'ledVertical', label: 'Vertical Panel', category: 'led', size: [4, 10, 0.3], y: 1.6, material: 'matteBlack', led: true, hint: 'Tall portrait screen' },
  { kind: 'ledHorizontal', label: 'Horizontal Strip', category: 'led', size: [18, 2, 0.3], y: 11, material: 'matteBlack', led: true, hint: 'Wide banner screen' },
  { kind: 'ledCircle', label: 'Circular Screen', category: 'led', size: [8, 8, 0.4], y: 3, material: 'matteBlack', led: true, hint: 'Round screen' },
  { kind: 'ledHanging', label: 'Hanging Screen', category: 'led', size: [8, 4.5, 0.3], y: 10, material: 'matteBlack', led: true, hint: 'Flown from the roof' },
  { kind: 'ledPillar', label: 'LED Pillar', category: 'led', size: [1.2, 9, 1.2], y: 0, material: 'led', led: true, ledAll: true, hint: 'Four-sided column' },
  { kind: 'ledFloor', label: 'LED Floor', category: 'led', size: [10, 0.12, 6], y: 1.6, material: 'led', led: true, ledAll: true, hint: 'Video dance floor' },
  { kind: 'ledCurved', label: 'Curved Wall', category: 'led', size: [18, 8, 6], y: 1.6, material: 'matteBlack', led: true, hint: 'Wrap-around screen' },
  // Structures
  { kind: 'truss', label: 'Truss', category: 'structure', size: [14, 0.5, 0.5], y: 12, material: 'aluminum', hint: 'Box truss span' },
  { kind: 'trussTower', label: 'Truss Tower', category: 'structure', size: [0.6, 12, 0.6], material: 'aluminum', hint: 'Vertical truss' },
  { kind: 'beam', label: 'Steel Beam', category: 'structure', size: [12, 0.6, 0.35], y: 10, material: 'steel', hint: 'I-beam' },
  { kind: 'lightTower', label: 'Lighting Tower', category: 'structure', size: [2.5, 14, 1.5], material: 'aluminum', hint: 'Tower with crossbar' },
  { kind: 'frame', label: 'Portal Frame', category: 'structure', size: [16, 12, 0.6], material: 'steel', hint: 'Rectangular gate' },
  { kind: 'arch', label: 'Arch', category: 'structure', size: [16, 10, 0.8], material: 'aluminum', hint: 'Curved gate' },
  { kind: 'scaffold', label: 'Scaffold', category: 'structure', size: [6, 8, 2], material: 'steel', hint: 'Industrial frame' },
  // Soft goods & panels
  { kind: 'curtain', label: 'Curtain', category: 'soft', size: [14, 10, 0.4], material: 'fabric', hint: 'Draped fabric' },
  { kind: 'glassPanel', label: 'Glass Panel', category: 'soft', size: [4, 6, 0.1], y: 1.6, material: 'glass', hint: 'Transparent wall' },
  { kind: 'fabric', label: 'Fabric Sail', category: 'soft', size: [12, 2, 8], y: 12, material: 'white', hint: 'Tensioned canopy' },
  // Decorative / architectural
  { kind: 'monolith', label: 'Monolith', category: 'decor', size: [3, 10, 1.2], material: 'glossBlack', hint: 'Tall slab' },
  { kind: 'cube', label: 'Cube', category: 'decor', size: [3, 3, 3], material: 'white', hint: 'Box block' },
  { kind: 'sphere', label: 'Sphere', category: 'decor', size: [4, 4, 4], y: 2, material: 'mirror', hint: 'Ball / mirror ball' },
  { kind: 'ring', label: 'Halo Ring', category: 'decor', size: [10, 10, 0.6], y: 8, material: 'neon', hint: 'Glowing ring' },
  { kind: 'torus', label: 'Torus', category: 'decor', size: [6, 1.2, 6], y: 10, material: 'aluminum', hint: 'Flat ring' },
  { kind: 'pyramid', label: 'Pyramid', category: 'decor', size: [8, 6, 8], material: 'glossBlack', hint: 'Four-sided pyramid' },
  { kind: 'column', label: 'Column', category: 'decor', size: [1.2, 10, 1.2], material: 'white', hint: 'Round pillar' },
  { kind: 'cylinder', label: 'Cylinder', category: 'decor', size: [3, 3, 3], material: 'matteBlack', hint: 'Drum shape' },
  { kind: 'cone', label: 'Cone', category: 'decor', size: [3, 4, 3], material: 'matteBlack', hint: 'Spike / cone' },
  { kind: 'wedge', label: 'Wedge', category: 'decor', size: [4, 2, 4], material: 'matteBlack', hint: 'Angled block' },
];

export const OBJECT_DEF: Record<string, ObjectDef> = Object.fromEntries(OBJECT_DEFS.map((d) => [d.kind, d]));

export const CATEGORY_LABEL: Record<LibraryCategory, string> = {
  stage: 'Stage',
  led: 'LED Screens',
  structure: 'Structures',
  soft: 'Panels & Fabric',
  decor: 'Shapes',
};

export function isLedKind(kind: ObjectKind) {
  return !!OBJECT_DEF[kind]?.led;
}

export function defaultLed(over: Partial<LedSpec> = {}): LedSpec {
  return { visual: 'gradient', color1: '#2a7bff', color2: '#9b2aff', brightness: 1, speed: 1, resolution: 48, text: 'CONCERT STUDIO', ...over };
}

export function makeObject(
  kind: ObjectKind,
  over: Partial<Omit<StageObject, 'material' | 'led'>> & { material?: Partial<MaterialSpec> | string; led?: Partial<LedSpec> } = {},
): StageObject {
  const def = OBJECT_DEF[kind] ?? OBJECT_DEFS[0];
  const { material, led, ...rest } = over;
  const baseMat = typeof material === 'string' ? mat(material) : mat(def.material, material ?? {});
  const needsLed = def.led || baseMat.preset === 'led';
  return {
    id: uid('o'),
    kind,
    name: def.label,
    pos: [0, def.y ?? 0, 0],
    rot: [0, 0, 0],
    size: [...def.size] as Vec3,
    material: baseMat,
    led: needsLed ? defaultLed(led) : undefined,
    ...rest,
  };
}

/* ---------------------------------- Fixtures --------------------------------- */

export interface FixtureDef {
  type: FixtureType;
  label: string;
  hint: string;
  defaults: Partial<Fixture>;
  y: number;
}

export const FIXTURE_DEFS: FixtureDef[] = [
  { type: 'spot', label: 'Moving Spot', hint: 'Sharp moving head', y: 12, defaults: { beamAngle: 14, tilt: 25, focus: 0.6, color: '#ffffff' } },
  { type: 'beam', label: 'Moving Beam', hint: 'Tight pencil beam', y: 12, defaults: { beamAngle: 4, tilt: 20, focus: 0.9, color: '#9b2aff', movement: 'sweep', moveSpeed: 0.8, moveSize: 35 } },
  { type: 'wash', label: 'Wash Light', hint: 'Soft wide fill', y: 11, defaults: { beamAngle: 40, tilt: 30, focus: 0.1, color: '#2a7bff' } },
  { type: 'ledbar', label: 'LED Bar', hint: 'Pixel batten', y: 0.2, defaults: { beamAngle: 22, tilt: 165, focus: 0.3, color: '#ff2ad4', role: 'floor' } },
  { type: 'ledtube', label: 'LED Tube', hint: 'Vertical light tube', y: 1.6, defaults: { beamAngle: 0, tilt: 90, focus: 0.5, color: '#ffffff' } },
  { type: 'strobe', label: 'Strobe', hint: 'Bright flash', y: 11, defaults: { beamAngle: 70, tilt: 35, focus: 0.1, color: '#ffffff', effect: 'strobe', strobeRate: 8, intensity: 0.8 } },
  { type: 'laser', label: 'Laser', hint: 'Laser fan', y: 2, defaults: { beamAngle: 50, tilt: 95, focus: 1, color: '#1aff9c', movement: 'fan', moveSpeed: 1, moveSize: 15 } },
  { type: 'follow', label: 'Follow Spot', hint: 'Spotlight on artist', y: 14, defaults: { beamAngle: 8, tilt: 60, pan: 180, focus: 0.7, color: '#fff3e0' } },
  { type: 'floor', label: 'Floor Light', hint: 'Uplight on deck', y: 1.6, defaults: { beamAngle: 18, tilt: 160, focus: 0.6, color: '#ff7a1a', role: 'floor' } },
  { type: 'ceiling', label: 'Ceiling Light', hint: 'Down light', y: 16, defaults: { beamAngle: 30, tilt: 0, focus: 0.4, color: '#ffffff', role: 'top' } },
  { type: 'blinder', label: 'Audience Blinder', hint: 'Hits the crowd', y: 9, defaults: { beamAngle: 60, tilt: 80, focus: 0.1, color: '#ffc78a', intensity: 0, role: 'audience' } },
  { type: 'pixel', label: 'Pixel Fixture', hint: 'Pixel-mapped head', y: 10, defaults: { beamAngle: 10, tilt: 30, focus: 0.7, color: '#1ae0ff', effect: 'colorchase', effectSpeed: 1 } },
];

export const FIXTURE_DEF: Record<string, FixtureDef> = Object.fromEntries(FIXTURE_DEFS.map((d) => [d.type, d]));

export function makeFixture(type: FixtureType, over: Partial<Fixture> = {}): Fixture {
  const def = FIXTURE_DEF[type] ?? FIXTURE_DEFS[0];
  return {
    id: uid('f'),
    type,
    name: def.label,
    pos: [0, def.y, 0],
    yaw: 0,
    on: true,
    color: '#ffffff',
    intensity: 1,
    pan: 0,
    tilt: 25,
    beamAngle: 14,
    focus: 0.5,
    movement: 'none',
    moveSpeed: 1,
    moveSize: 25,
    effect: 'none',
    effectSpeed: 1,
    strobeRate: 6,
    role: 'top',
    ...def.defaults,
    ...over,
  };
}

export const FIXTURE_LOOK_KEYS = [
  'on', 'color', 'intensity', 'pan', 'tilt', 'beamAngle', 'focus', 'movement', 'moveSpeed', 'moveSize', 'effect', 'effectSpeed', 'strobeRate',
] as const;

export function lookOf(f: Fixture) {
  const o: any = {};
  for (const k of FIXTURE_LOOK_KEYS) o[k] = (f as any)[k];
  return o as import('../types').FixtureLook;
}

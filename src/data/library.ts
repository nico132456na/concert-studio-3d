import type { Fixture, FixtureType, LedSpec, ObjectKind, StageObject, Vec3, MaterialSpec } from '../types';
import { mat } from './materials';
import { uid } from '../util/misc';

export type LibraryCategory = 'stage' | 'shapes' | 'structure' | 'rigging' | 'led' | 'audio' | 'soft' | 'decor';

export interface ObjectDef {
  /** unique library id (variants share a kind) */
  id: string;
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
  motion?: StageObject['motion'];
  ledVisual?: LedSpec['visual'];
}

type D = Omit<ObjectDef, 'id'> & { id?: string };
const defs: D[] = [
  // ---------- Stage: basic shapes ----------
  { kind: 'platform', label: 'Rectangle', category: 'stage', size: [12, 1.6, 8], material: 'glossBlack', hint: 'Rectangular deck' },
  { id: 'square', kind: 'platform', label: 'Square', category: 'stage', size: [10, 1.6, 10], material: 'glossBlack', hint: 'Square deck' },
  { kind: 'circlePlatform', label: 'Circle', category: 'stage', size: [10, 1.6, 10], material: 'glossBlack', hint: 'Circular deck' },
  { kind: 'ovalPlatform', label: 'Oval', category: 'stage', size: [16, 1.6, 9], material: 'glossBlack', hint: 'Elliptical deck' },
  { kind: 'semicircle', label: 'Semicircle', category: 'stage', size: [16, 1.6, 8], material: 'glossBlack', hint: 'Half-round thrust' },
  { kind: 'trianglePlatform', label: 'Triangle', category: 'stage', size: [12, 1.6, 10], material: 'glossBlack', hint: 'Wedge-shaped deck' },
  { kind: 'hexPlatform', label: 'Hexagon', category: 'stage', size: [9, 1.6, 9], material: 'glossBlack', hint: 'Six-sided deck' },
  { kind: 'octagon', label: 'Octagon', category: 'stage', size: [10, 1.6, 10], material: 'glossBlack', hint: 'Eight-sided deck' },
  { kind: 'diamond', label: 'Diamond', category: 'stage', size: [12, 1.6, 12], material: 'glossBlack', hint: 'Rotated square' },
  { kind: 'crossStage', label: 'Cross', category: 'stage', size: [16, 1.6, 16], material: 'glossBlack', hint: 'Plus-shaped deck' },
  { kind: 'tStage', label: 'T-Shape', category: 'stage', size: [16, 1.6, 14], material: 'glossBlack', hint: 'Stage + center runway' },
  { kind: 'uStage', label: 'U-Shape', category: 'stage', size: [18, 1.6, 14], material: 'glossBlack', hint: 'Horseshoe deck' },
  { kind: 'lStage', label: 'L-Shape', category: 'stage', size: [14, 1.6, 12], material: 'glossBlack', hint: 'Corner deck' },
  { kind: 'hStage', label: 'H-Shape', category: 'stage', size: [16, 1.6, 14], material: 'glossBlack', hint: 'Twin decks + bridge' },
  { kind: 'runway', label: 'Runway', category: 'stage', size: [3, 1.6, 16], material: 'glossBlack', hint: 'Long thrust walkway' },
  { kind: 'bstage', label: 'B-Stage', category: 'stage', size: [7, 1.6, 7], material: 'glossBlack', hint: 'Round satellite stage' },
  { kind: 'stairs', label: 'Stairs', category: 'stage', size: [3, 1.6, 3], material: 'matteBlack', hint: 'Steps up to a deck' },
  { kind: 'ramp', label: 'Ramp', category: 'stage', size: [3, 1.6, 6], material: 'matteBlack', hint: 'Sloped walkway' },
  { id: 'glassDeck', kind: 'platform', label: 'Glass Deck', category: 'stage', size: [6, 1.6, 6], material: 'frosted', hint: 'Transparent flooring' },
  { id: 'metalDeck', kind: 'platform', label: 'Metal Deck', category: 'stage', size: [6, 1.6, 6], material: 'steelGrid', hint: 'Steel grating deck' },
  { id: 'riser', kind: 'platform', label: 'Riser', category: 'stage', size: [4, 0.6, 3], material: 'matteBlack', hint: 'Band / drum riser' },
  { id: 'fascia', kind: 'ledHorizontal', label: 'Stage Fascia', category: 'stage', size: [16, 1.2, 0.1], y: 0.2, material: 'matteBlack', led: true, hint: 'LED strip on deck front' },
  // ---------- Stage: advanced shapes ----------
  { id: 'round360', kind: 'circlePlatform', label: '360° Round', category: 'shapes', size: [20, 1.8, 20], material: 'glossBlack', hint: 'In-the-round stage' },
  { kind: 'ringStage', label: 'Ring Stage', category: 'shapes', size: [22, 1.6, 22], material: 'glossBlack', hint: 'Circle walkway with hole' },
  { kind: 'curvedRunway', label: 'Curved Runway', category: 'shapes', size: [16, 1.6, 16], material: 'glossBlack', hint: 'Arcing walkway' },
  { kind: 'spiralRunway', label: 'Spiral Runway', category: 'shapes', size: [12, 4, 12], material: 'aluminum', hint: 'Rising spiral ramp' },
  { id: 'crossRunway', kind: 'crossStage', label: 'Cross Runway', category: 'shapes', size: [30, 1.6, 30], material: 'glossBlack', hint: 'Four long arms' },
  { id: 'satellite', kind: 'circlePlatform', label: 'Satellite', category: 'shapes', size: [5, 2.2, 5], material: 'glossBlack', hint: 'Small outpost platform' },
  { kind: 'floating', label: 'Floating Platform', category: 'shapes', size: [5, 0.5, 5], y: 6, material: 'aluminum', hint: 'Suspended deck' },
  { id: 'floatingRound', kind: 'circlePlatform', label: 'Suspended Disc', category: 'shapes', size: [6, 0.5, 6], y: 7, material: 'chrome', hint: 'Flying round platform' },
  { id: 'elevated', kind: 'platform', label: 'Elevated Deck', category: 'shapes', size: [8, 4, 6], material: 'glossBlack', hint: 'Tall second level' },
  { kind: 'rotatingPlatform', label: 'Rotating Platform', category: 'shapes', size: [8, 1.8, 8], material: 'mirror', hint: 'Revolving turntable', motion: 'rotate' },
  { kind: 'lift', label: 'Stage Lift', category: 'shapes', size: [3, 1.6, 3], material: 'steelGrid', hint: 'Rises up and down', motion: 'lift' },
  { kind: 'waveStage', label: 'Wave Stage', category: 'shapes', size: [18, 2.2, 8], material: 'white', hint: 'Undulating top' },
  { kind: 'halfSphere', label: 'Dome Stage', category: 'shapes', size: [14, 5, 14], material: 'white', hint: 'Half-sphere mound' },
  { kind: 'mountain', label: 'Mountain', category: 'shapes', size: [20, 12, 14], material: 'concrete', hint: 'Faceted peak' },
  { id: 'globeStage', kind: 'ledSphere', label: 'Globe Stage', category: 'shapes', size: [14, 14, 14], material: 'led', led: true, ledAll: true, hint: 'Earth sphere you stand on', ledVisual: 'earth' },
  { id: 'portal', kind: 'frame', label: 'Portal', category: 'shapes', size: [20, 14, 1.5], material: 'white', hint: 'Giant gate frame' },
  { kind: 'catwalk', label: 'Catwalk', category: 'shapes', size: [2, 0.3, 14], y: 7, material: 'steelGrid', hint: 'Elevated bridge' },
  // ---------- Architecture ----------
  { kind: 'arch', label: 'Arch', category: 'structure', size: [16, 10, 0.8], material: 'aluminum', hint: 'Curved gate' },
  { kind: 'frame', label: 'Rectangular Frame', category: 'structure', size: [16, 12, 0.6], material: 'steel', hint: 'Portal frame' },
  { kind: 'ring', label: 'Floating Ring', category: 'structure', size: [10, 10, 0.6], y: 8, material: 'neon', hint: 'Glowing halo' },
  { id: 'circleFrame', kind: 'ring', label: 'Circular Frame', category: 'structure', size: [14, 14, 1], material: 'aluminum', hint: 'Round portal' },
  { kind: 'cubeFrame', label: 'Suspended Cube', category: 'structure', size: [6, 6, 6], y: 8, material: 'chrome', hint: 'Open cube frame' },
  { kind: 'geoDome', label: 'Geodesic Dome', category: 'structure', size: [20, 10, 20], material: 'aluminum', hint: 'Lattice dome' },
  { kind: 'geoFrame', label: 'Geo Sphere', category: 'structure', size: [8, 8, 8], y: 6, material: 'chrome', hint: 'Lattice sphere' },
  { id: 'dome', kind: 'halfSphere', label: 'Dome Shell', category: 'structure', size: [16, 8, 16], material: 'frosted', hint: 'Translucent dome' },
  { kind: 'sphere', label: 'Giant Sphere', category: 'structure', size: [6, 6, 6], y: 3, material: 'mirror', hint: 'Ball / mirror ball' },
  { id: 'tower', kind: 'monolith', label: 'Tower', category: 'structure', size: [4, 18, 4], material: 'concrete', hint: 'Tall block tower' },
  { kind: 'column', label: 'Column', category: 'structure', size: [1.2, 10, 1.2], material: 'white', hint: 'Round pillar' },
  { kind: 'monolith', label: 'Monolith', category: 'structure', size: [3, 10, 1.2], material: 'glossBlack', hint: 'Tall slab' },
  { kind: 'scaffold', label: 'Metal Framework', category: 'structure', size: [6, 8, 2], material: 'steel', hint: 'Scaffold frame' },
  { kind: 'glassPanel', label: 'Glass Wall', category: 'structure', size: [4, 6, 0.1], material: 'glass', hint: 'Transparent wall' },
  { kind: 'ribbedWall', label: 'Decorative Wall', category: 'structure', size: [12, 6, 1], material: 'white', hint: 'Ribbed fin wall' },
  { kind: 'railing', label: 'Railing', category: 'structure', size: [6, 1.1, 0.1], material: 'aluminum', hint: 'Safety rail' },
  { kind: 'beam', label: 'Steel Beam', category: 'structure', size: [12, 0.6, 0.35], y: 10, material: 'steel', hint: 'I-beam' },
  { id: 'support', kind: 'column', label: 'Support Leg', category: 'structure', size: [0.4, 6, 0.4], material: 'steel', hint: 'Deck support' },
  // ---------- Truss & rigging ----------
  { kind: 'truss', label: 'Straight Truss', category: 'rigging', size: [14, 0.5, 0.5], y: 12, material: 'aluminum', hint: 'Box truss span' },
  { kind: 'curvedTruss', label: 'Curved Truss', category: 'rigging', size: [16, 0.6, 6], y: 12, material: 'aluminum', hint: 'Arc truss' },
  { kind: 'circleTruss', label: 'Circular Truss', category: 'rigging', size: [12, 0.6, 12], y: 12, material: 'aluminum', hint: 'Halo truss' },
  { kind: 'triangleTruss', label: 'Triangle Truss', category: 'rigging', size: [12, 0.5, 0.5], y: 12, material: 'aluminum', hint: 'Tri-chord truss' },
  { id: 'squareTruss', kind: 'circleTruss', label: 'Square Truss', category: 'rigging', size: [12, 0.6, 12], y: 12, material: 'steel', hint: 'Box frame truss' },
  { kind: 'trussGrid', label: 'Hanging Grid', category: 'rigging', size: [20, 0.6, 14], y: 14, material: 'aluminum', hint: 'Lighting grid' },
  { id: 'ceilingTruss', kind: 'truss', label: 'Ceiling Truss', category: 'rigging', size: [30, 0.8, 0.8], y: 20, material: 'steel', hint: 'High roof span' },
  { id: 'lightBridge', kind: 'truss', label: 'Lighting Bridge', category: 'rigging', size: [24, 1.2, 1.2], y: 14, material: 'aluminum', hint: 'Heavy truss bridge' },
  { kind: 'trussTower', label: 'Vertical Tower', category: 'rigging', size: [0.6, 12, 0.6], material: 'aluminum', hint: 'Vertical truss' },
  { kind: 'lightTower', label: 'Lighting Tower', category: 'rigging', size: [2.5, 14, 1.5], material: 'aluminum', hint: 'Tower with crossbar' },
  { id: 'speakerScaffold', kind: 'scaffold', label: 'Speaker Wing', category: 'rigging', size: [4, 12, 3], material: 'steel', hint: 'PA support structure' },
  { id: 'suspendedFrame', kind: 'frame', label: 'Suspended Frame', category: 'rigging', size: [12, 6, 0.4], y: 12, material: 'aluminum', hint: 'Flown frame' },
  // ---------- LED ----------
  { kind: 'ledWall', label: 'LED Wall', category: 'led', size: [20, 9, 0.4], y: 1.6, material: 'matteBlack', led: true, hint: 'Main video wall' },
  { kind: 'ledCurved', label: 'Curved Wall', category: 'led', size: [18, 8, 6], y: 1.6, material: 'matteBlack', led: true, hint: 'Wrap-around screen' },
  { kind: 'ledVertical', label: 'Vertical Panel', category: 'led', size: [4, 10, 0.3], y: 1.6, material: 'matteBlack', led: true, hint: 'Tall portrait screen' },
  { kind: 'ledHorizontal', label: 'Horizontal Strip', category: 'led', size: [18, 2, 0.3], y: 11, material: 'matteBlack', led: true, hint: 'Wide banner' },
  { kind: 'ledCircle', label: 'Circular Screen', category: 'led', size: [8, 8, 0.4], y: 3, material: 'matteBlack', led: true, hint: 'Round screen' },
  { kind: 'ledHanging', label: 'Hanging Screen', category: 'led', size: [8, 4.5, 0.3], y: 10, material: 'matteBlack', led: true, hint: 'Flown from the roof' },
  { kind: 'ledSphere', label: 'LED Sphere', category: 'led', size: [6, 6, 6], y: 6, material: 'led', led: true, ledAll: true, hint: 'Spherical screen', ledVisual: 'earth' },
  { kind: 'ledCylinder', label: 'LED Cylinder', category: 'led', size: [4, 8, 4], material: 'led', led: true, ledAll: true, hint: 'Round column screen' },
  { kind: 'ledCube', label: 'LED Cube', category: 'led', size: [5, 5, 5], y: 8, material: 'led', led: true, ledAll: true, hint: 'Six-sided cube' },
  { kind: 'ledTunnel', label: 'LED Tunnel', category: 'led', size: [6, 5, 10], material: 'led', led: true, ledAll: true, hint: 'Walk-through arch', ledVisual: 'tunnel' },
  { kind: 'ledArch', label: 'LED Arch', category: 'led', size: [14, 9, 1], material: 'led', led: true, ledAll: true, hint: 'Curved video arch' },
  { kind: 'ledCeiling', label: 'LED Ceiling', category: 'led', size: [16, 0.2, 10], y: 14, material: 'led', led: true, ledAll: true, hint: 'Overhead screen' },
  { kind: 'ledFloor', label: 'LED Floor', category: 'led', size: [10, 0.12, 6], y: 1.6, material: 'led', led: true, ledAll: true, hint: 'Video dance floor' },
  { kind: 'ledPillar', label: 'LED Pillar', category: 'led', size: [1.2, 9, 1.2], material: 'led', led: true, ledAll: true, hint: 'Four-sided column' },
  { kind: 'ledTransparent', label: 'Transparent Screen', category: 'led', size: [10, 6, 0.05], y: 2, material: 'led', led: true, ledAll: true, hint: 'See-through mesh LED' },
  { id: 'flexPanel', kind: 'ledCurved', label: 'Flexible Panel', category: 'led', size: [6, 3, 1.5], y: 2, material: 'matteBlack', led: true, hint: 'Bent LED sheet' },
  { id: 'signage', kind: 'ledHorizontal', label: 'Custom Sign', category: 'led', size: [10, 2, 0.3], y: 9, material: 'matteBlack', led: true, hint: 'Text sign', ledVisual: 'text' },
  // ---------- Audio ----------
  { kind: 'lineArray', label: 'Line Array', category: 'audio', size: [1.4, 6, 1.1], y: 9, material: 'matteBlack', hint: 'Flown main PA hang' },
  { id: 'sideHang', kind: 'lineArray', label: 'Side Hang', category: 'audio', size: [1.3, 5, 1.1], y: 8, material: 'matteBlack', hint: 'Outfill array' },
  { kind: 'subwoofer', label: 'Subwoofer', category: 'audio', size: [1.3, 0.7, 1], material: 'matteBlack', hint: 'Low-frequency box' },
  { id: 'subArray', kind: 'subwoofer', label: 'Sub Array', category: 'audio', size: [8, 0.7, 1], material: 'matteBlack', hint: 'Row of subs' },
  { kind: 'groundStack', label: 'Ground Stack', category: 'audio', size: [1.4, 2.8, 1.1], material: 'matteBlack', hint: 'Stacked subs + tops' },
  { id: 'sideFill', kind: 'groundStack', label: 'Side Fill', category: 'audio', size: [1.2, 2.2, 1], y: 1.6, material: 'matteBlack', hint: 'Stage side monitor' },
  { id: 'frontFill', kind: 'speakerCab', label: 'Front Fill', category: 'audio', size: [0.6, 0.4, 0.4], material: 'matteBlack', hint: 'Lip fill for front rows' },
  { kind: 'speakerCab', label: 'Bass Cabinet', category: 'audio', size: [0.9, 1.2, 0.6], y: 1.6, material: 'matteBlack', hint: 'Backline cab' },
  { id: 'djMonitor', kind: 'speakerCab', label: 'DJ Monitor', category: 'audio', size: [0.7, 1, 0.6], y: 1.6, material: 'matteBlack', hint: 'Booth monitor' },
  { kind: 'wedgeMonitor', label: 'Floor Wedge', category: 'audio', size: [0.8, 0.45, 0.6], y: 1.6, material: 'matteBlack', hint: 'Stage monitor' },
  { kind: 'speakerTower', label: 'Speaker Tower', category: 'audio', size: [1.2, 6, 1], material: 'matteBlack', hint: 'Pole-mounted PA' },
  { kind: 'delayTower', label: 'Delay Tower', category: 'audio', size: [2.5, 14, 2.5], material: 'steel', hint: 'Delay PA for back rows' },
  { id: 'iemRack', kind: 'cube', label: 'In-Ear Rack', category: 'audio', size: [0.6, 1, 0.6], y: 1.6, material: 'carbon', hint: 'IEM transmitter rack' },
  // ---------- Soft goods ----------
  { kind: 'curtain', label: 'Curtain', category: 'soft', size: [14, 10, 0.4], material: 'fabric', hint: 'Draped fabric' },
  { id: 'kabuki', kind: 'curtain', label: 'Red Drape', category: 'soft', size: [18, 12, 0.5], material: 'redVelvet', hint: 'Theatre drape' },
  { kind: 'fabric', label: 'Fabric Sail', category: 'soft', size: [12, 2, 8], y: 12, material: 'white', hint: 'Tensioned canopy' },
  { id: 'mirrorPanel', kind: 'glassPanel', label: 'Mirror Panel', category: 'soft', size: [3, 6, 0.1], material: 'mirror', hint: 'Mirror wall' },
  { id: 'backlit', kind: 'glassPanel', label: 'Backlit Panel', category: 'soft', size: [3, 6, 0.1], material: 'neon', hint: 'Glowing panel' },
  { id: 'frostPanel', kind: 'glassPanel', label: 'Frosted Panel', category: 'soft', size: [4, 6, 0.1], material: 'frosted', hint: 'Diffuse screen' },
  // ---------- Decorative ----------
  { kind: 'sculpture', label: 'Sculpture', category: 'decor', size: [5, 5, 2], y: 2, material: 'chrome', hint: 'Abstract knot' },
  { kind: 'tree', label: 'Tree', category: 'decor', size: [4, 7, 4], material: 'white', hint: 'Artificial tree' },
  { kind: 'rock', label: 'Rock', category: 'decor', size: [5, 3, 4], material: 'concrete', hint: 'Rock formation' },
  { kind: 'cube', label: 'Cube', category: 'decor', size: [3, 3, 3], material: 'white', hint: 'Box block' },
  { kind: 'pyramid', label: 'Pyramid', category: 'decor', size: [8, 6, 8], material: 'glossBlack', hint: 'Four-sided pyramid' },
  { kind: 'torus', label: 'Torus', category: 'decor', size: [6, 1.2, 6], y: 10, material: 'aluminum', hint: 'Flat ring' },
  { kind: 'cylinder', label: 'Cylinder', category: 'decor', size: [3, 3, 3], material: 'matteBlack', hint: 'Drum shape' },
  { kind: 'cone', label: 'Cone', category: 'decor', size: [3, 4, 3], material: 'matteBlack', hint: 'Spike / cone' },
  { kind: 'wedge', label: 'Wedge', category: 'decor', size: [4, 2, 4], material: 'matteBlack', hint: 'Angled block' },
  { id: 'decoStairs', kind: 'stairs', label: 'Grand Stairs', category: 'decor', size: [8, 3, 5], material: 'white', hint: 'Showpiece staircase' },
];

export const OBJECT_DEFS: ObjectDef[] = defs.map((d) => ({ ...d, id: d.id ?? d.kind }));
export const DEF_BY_ID: Record<string, ObjectDef> = Object.fromEntries(OBJECT_DEFS.map((d) => [d.id, d]));
export const OBJECT_DEF: Record<string, ObjectDef> = {};
for (const d of OBJECT_DEFS) if (!OBJECT_DEF[d.kind]) OBJECT_DEF[d.kind] = d;
OBJECT_DEF.custom = { id: 'custom', kind: 'custom', label: 'Custom Shape', category: 'stage', size: [12, 1.6, 10], material: 'glossBlack', hint: 'Your outline' };

export const CATEGORY_LABEL: Record<LibraryCategory, string> = {
  stage: 'Stage',
  shapes: 'Advanced',
  structure: 'Architecture',
  rigging: 'Truss',
  led: 'LED',
  audio: 'Sound',
  soft: 'Panels',
  decor: 'Decor',
};

export const AUDIO_KINDS = new Set<ObjectKind>(['lineArray', 'subwoofer', 'groundStack', 'speakerCab', 'wedgeMonitor', 'speakerTower', 'delayTower']);

export function isLedKind(kind: ObjectKind) {
  return !!OBJECT_DEF[kind]?.led;
}

export function defaultLed(over: Partial<LedSpec> = {}): LedSpec {
  return { visual: 'gradient', color1: '#2a7bff', color2: '#9b2aff', brightness: 1, speed: 1, resolution: 48, text: 'CONCERT STUDIO', ...over };
}

type ObjOver = Partial<Omit<StageObject, 'material' | 'led'>> & { material?: Partial<MaterialSpec> | string; led?: Partial<LedSpec> };

/** Create from a library entry id (variants like 'square' or 'globeStage'). */
export function makeFromDef(defId: string, over: ObjOver = {}): StageObject {
  const def = DEF_BY_ID[defId] ?? OBJECT_DEF[defId] ?? OBJECT_DEFS[0];
  return makeObject(def.kind, { name: def.label, size: [...def.size] as Vec3, material: over.material ?? def.material, motion: def.motion, ...over, led: { ...(def.ledVisual ? { visual: def.ledVisual } : {}), ...(def.kind === 'ledSphere' || def.kind === 'ledCylinder' ? { resolution: 0 } : {}), ...(over.led ?? {}) } }, def);
}

export function makeObject(kind: ObjectKind, over: ObjOver = {}, defOverride?: ObjectDef): StageObject {
  const def = defOverride ?? OBJECT_DEF[kind] ?? OBJECT_DEFS[0];
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

import type { DesignSeed, Fixture, StageObject } from '../types';
import { makeFixture, makeObject } from './library';
import { buildMainStage, DEFAULT_STAGE, finalize, fixtureRow, standardRig } from './builders';
import type { Palette } from './sceneGen';

export interface TemplateDef {
  id: string;
  name: string;
  blurb: string;
  palette: Palette;
  build: () => DesignSeed;
}

const P = {
  mono: ['#dce9ff', '#ffffff', '#8c8c8c'] as Palette,
  neon: ['#1ae0ff', '#ff2ad4', '#ffffff'] as Palette,
  purple: ['#1a5cff', '#8a2aff', '#ffffff'] as Palette,
  warm: ['#ff7a1a', '#ffc21a', '#ffffff'] as Palette,
  red: ['#ff1010', '#ff7a1a', '#ffffff'] as Palette,
  green: ['#7dff4d', '#1ae0ff', '#ffffff'] as Palette,
};

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'minimal',
    name: 'Minimalist',
    blurb: 'One white deck, one wall, clean light',
    palette: P.mono,
    build() {
      const objects = buildMainStage({ ...DEFAULT_STAGE, width: 22, depth: 10, material: 'white' });
      objects.push(makeObject('ledWall', { pos: [0, 1.6, -9.6], size: [22, 8, 0.3], led: { visual: 'minimal', color1: '#ffffff', color2: '#000000' } }));
      const rig = standardRig(22, P.mono, { spots: 6, beams: 6, wash: 4, floor: 4 });
      return finalize([...objects, ...rig.objects], rig.fixtures, P.mono);
    },
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    blurb: 'Halo ring, curved screen, chrome',
    palette: P.neon,
    build() {
      const objects = buildMainStage({ ...DEFAULT_STAGE, shape: 'thrust', width: 26, depth: 12, material: 'glossBlack' });
      objects.push(
        makeObject('ledCurved', { pos: [0, 1.6, -13], size: [26, 9, 6], led: { visual: 'tunnel', color1: '#1ae0ff', color2: '#ff2ad4' } }),
        makeObject('ring', { pos: [0, 11, -5], size: [12, 12, 0.5], material: { preset: 'neon', emissive: '#1ae0ff', emissiveIntensity: 3 } }),
        makeObject('sphere', { pos: [-10, 7, -4], size: [2, 2, 2], material: 'chrome' }),
        makeObject('sphere', { pos: [10, 7, -4], size: [2, 2, 2], material: 'chrome' }),
      );
      const rig = standardRig(26, P.neon, { lasers: 4, strobes: 3 });
      return finalize([...objects, ...rig.objects], rig.fixtures, P.neon, { haze: 0.8 });
    },
  },
  {
    id: 'stadium',
    name: 'Stadium',
    blurb: 'Wide deck, wings, giant screens',
    palette: P.purple,
    build() {
      const objects = buildMainStage({ ...DEFAULT_STAGE, shape: 'wide', width: 36, depth: 16, runway: 20, bstage: true });
      objects.push(
        makeObject('ledWall', { pos: [0, 1.6, -15.5], size: [34, 14, 0.4], led: { visual: 'plasma', color1: '#1a5cff', color2: '#8a2aff' } }),
        makeObject('ledVertical', { pos: [-26, 1.6, -9], size: [8, 14, 0.4], rot: [0, 0.25, 0] }),
        makeObject('ledVertical', { pos: [26, 1.6, -9], size: [8, 14, 0.4], rot: [0, -0.25, 0] }),
        makeObject('lightTower', { pos: [-22, 0, 10], size: [2.5, 16, 1.5] }),
        makeObject('lightTower', { pos: [22, 0, 10], size: [2.5, 16, 1.5] }),
      );
      const rig = standardRig(36, P.purple, { trussY: 18, spots: 8, beams: 12, wash: 6, floor: 8, strobes: 4, lasers: 2 });
      rig.fixtures.push(makeFixture('spot', { pos: [-22, 15, 10], pan: 160, tilt: 50, name: 'Tower Spot L' }), makeFixture('spot', { pos: [22, 15, 10], pan: 200, tilt: 50, name: 'Tower Spot R' }));
      return finalize([...objects, ...rig.objects], rig.fixtures, P.purple);
    },
  },
  {
    id: 'circular',
    name: 'Circular 360°',
    blurb: 'In-the-round stage under a halo',
    palette: P.warm,
    build() {
      const objects: StageObject[] = [
        makeObject('circlePlatform', { pos: [0, 0, 10], size: [18, 1.6, 18], name: 'Round Stage', tag: 'main' }),
        makeObject('circlePlatform', { pos: [0, 1.6, 10], size: [8, 0.6, 8], name: 'Center Riser', material: 'white', tag: 'main' }),
        makeObject('torus', { pos: [0, 14, 10], size: [20, 1, 20], material: 'aluminum', name: 'Halo Truss' }),
      ];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        objects.push(makeObject('ledHanging', { pos: [Math.sin(a) * 6, 16, 10 + Math.cos(a) * 6], rot: [0, a, 0], size: [7, 4, 0.3], led: { visual: 'gradient', color1: '#ff7a1a', color2: '#5a1a6e' } }));
      }
      const fixtures: Fixture[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        fixtures.push(makeFixture(i % 2 ? 'beam' : 'spot', { pos: [Math.sin(a) * 10, 14, 10 + Math.cos(a) * 10], pan: (a * 180) / Math.PI + 180, tilt: 25, color: i % 2 ? '#ffc21a' : '#ff7a1a', name: `Halo ${i + 1}` }));
      }
      fixtures.push(...fixtureRow('ledbar', 8, [-6, 1.7, 3], [6, 1.7, 3], { name: 'Edge Bar', tilt: 175 }));
      return finalize(objects, fixtures, P.warm);
    },
  },
  {
    id: 'floatingLed',
    name: 'Floating LED',
    blurb: 'Suspended screens over a clean deck',
    palette: P.neon,
    build() {
      const objects = buildMainStage({ ...DEFAULT_STAGE, width: 28, depth: 12 });
      [-12, -6, 0, 6, 12].forEach((x, i) =>
        objects.push(makeObject('ledHanging', { pos: [x, 6 + (i % 2) * 3, -8 + Math.abs(x) * 0.2], size: [5, 7, 0.3], led: { visual: i % 2 ? 'water' : 'particles', color1: '#1ae0ff', color2: '#ff2ad4' } })),
      );
      objects.push(makeObject('floating', { pos: [0, 5, 4], size: [6, 0.4, 4], material: 'chrome' }));
      const rig = standardRig(28, P.neon, { spots: 6, beams: 10 });
      return finalize([...objects, ...rig.objects], rig.fixtures, P.neon);
    },
  },
  {
    id: 'multilevel',
    name: 'Multi-Level',
    blurb: 'Three tiers with stairs and towers',
    palette: P.purple,
    build() {
      const objects = buildMainStage({ ...DEFAULT_STAGE, width: 28, depth: 14, levels: 3 });
      objects.push(
        makeObject('ledWall', { pos: [0, 4.8, -13.6], size: [20, 9, 0.3] }),
        makeObject('ledPillar', { pos: [-13, 1.6, -6] }),
        makeObject('ledPillar', { pos: [13, 1.6, -6] }),
      );
      const rig = standardRig(28, P.purple, { strobes: 2 });
      return finalize([...objects, ...rig.objects], rig.fixtures, P.purple);
    },
  },
  {
    id: 'festival',
    name: 'Festival',
    blurb: 'Huge roof, side screens, pyro energy',
    palette: P.green,
    build() {
      const objects = buildMainStage({ ...DEFAULT_STAGE, width: 34, depth: 16, height: 2 });
      objects.push(
        makeObject('frame', { pos: [0, 0, -2], size: [42, 22, 1], name: 'Roof Portal' }),
        makeObject('fabric', { pos: [0, 22, -8], size: [44, 3, 16], name: 'Roof', material: 'matteBlack' }),
        makeObject('ledWall', { pos: [0, 2, -15.5], size: [30, 13, 0.4], led: { visual: 'bars', color1: '#7dff4d', color2: '#1aff9c' } }),
        makeObject('ledVertical', { pos: [-28, 4, 2], size: [9, 12, 0.4], name: 'IMAG Left', led: { visual: 'gradient' } }),
        makeObject('ledVertical', { pos: [28, 4, 2], size: [9, 12, 0.4], name: 'IMAG Right', led: { visual: 'gradient' } }),
        makeObject('scaffold', { pos: [-28, 0, 2], size: [9, 4, 2] }),
        makeObject('scaffold', { pos: [28, 0, 2], size: [9, 4, 2] }),
      );
      const rig = standardRig(34, P.green, { trussY: 19, spots: 8, beams: 14, lasers: 6, strobes: 4 });
      return finalize([...objects, ...rig.objects], rig.fixtures, P.green, { haze: 0.85 });
    },
  },
  {
    id: 'industrial',
    name: 'Industrial',
    blurb: 'Scaffold, steel and raw strobes',
    palette: P.red,
    build() {
      const objects = buildMainStage({ ...DEFAULT_STAGE, width: 22, depth: 10, material: 'steelGrid' });
      objects.push(
        makeObject('scaffold', { pos: [0, 1.6, -9], size: [22, 9, 2] }),
        makeObject('beam', { pos: [0, 9, -2], size: [24, 0.6, 0.35] }),
        makeObject('ledHorizontal', { pos: [0, 5, -7.8], size: [16, 2, 0.3], led: { visual: 'text', text: 'NO SIGNAL', color1: '#ff1010' } }),
        makeObject('cube', { pos: [-8, 1.6, -3], size: [2, 2, 2], material: 'concrete' }),
        makeObject('cube', { pos: [8, 1.6, -3], size: [2, 2, 2], material: 'concrete' }),
      );
      const rig = standardRig(22, P.red, { trussY: 11, spots: 4, beams: 8, strobes: 6, lasers: 2 });
      return finalize([...objects, ...rig.objects], rig.fixtures, P.red, { haze: 0.9 });
    },
  },
];

export const TEMPLATE_BY_ID: Record<string, TemplateDef> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

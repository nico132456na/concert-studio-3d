import type { DesignSeed, Fixture, StageObject } from '../types';
import { makeFixture, makeObject } from './library';
import { buildMainStage, DEFAULT_STAGE, finalize, fixtureRow, standardRig } from './builders';
import type { Palette } from './sceneGen';

export interface ArtistDesign {
  id: string;
  title: string;
  style: string;
  description: string;
  arenaId: string;
  palette: Palette;
  build: () => DesignSeed;
}

export interface Artist {
  id: string;
  name: string;
  aesthetic: string;
  designs: ArtistDesign[];
}

const circleOf = (n: number, r: number, cz: number, y: number, fn: (x: number, z: number, a: number, i: number) => void) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    fn(Math.sin(a) * r, cz + Math.cos(a) * r, a, i);
  }
};

export const ARTISTS: Artist[] = [
  {
    id: 'kanye',
    name: 'Kanye West',
    aesthetic: 'Minimal architecture, suspended structures, stark light',
    designs: [
      {
        id: 'kanye-floating',
        title: 'Suspended Platform',
        style: 'Floating stage over the crowd',
        description: 'A single platform flown above the arena floor, rigged from a grid of lights that moves with it. No screens, only light and architecture.',
        arenaId: 'basketball',
        palette: ['#ff7a1a', '#ffd7a3', '#ffffff'],
        build() {
          const objects: StageObject[] = [
            makeObject('floating', { pos: [0, 7, 16], size: [10, 0.6, 18], name: 'Floating Stage', material: 'matteBlack' }),
            makeObject('frame', { pos: [0, 13, 16], size: [14, 0.4, 22], name: 'Light Grid', material: 'matteBlack' }),
          ];
          const fixtures: Fixture[] = [];
          for (let x = -6; x <= 6; x += 3) for (let z = 7; z <= 25; z += 4.5) fixtures.push(makeFixture('wash', { pos: [x, 12.6, z], tilt: 0, beamAngle: 26, color: '#ff7a1a', name: 'Grid Wash' }));
          fixtures.push(...fixtureRow('beam', 6, [-7, 12.6, 6], [7, 12.6, 26], { name: 'Grid Beam', color: '#ffd7a3', tilt: 10 }));
          return finalize(objects, fixtures, ['#ff7a1a', '#ffd7a3', '#ffffff'], { haze: 0.9 });
        },
      },
      {
        id: 'kanye-mountain',
        title: 'Monolith Mountain',
        style: 'Geometric peak and white light',
        description: 'A huge faceted mountain form on a minimal deck, lit by stark white walls of light. An original take on geometric, sculptural staging.',
        arenaId: 'megadome',
        palette: ['#ffffff', '#dce9ff', '#ff1010'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 30, depth: 16, material: 'matteBlack', stairs: false });
          objects.push(
            makeObject('pyramid', { pos: [0, 1.6, -7], size: [22, 14, 12], name: 'Mountain', material: 'concrete' }),
            makeObject('pyramid', { pos: [-9, 1.6, -4], size: [9, 7, 6], name: 'Peak L', material: 'concrete' }),
            makeObject('runway', { pos: [0, 0, 18], size: [2.5, 1.6, 36], material: 'white' }),
          );
          const rig = standardRig(30, ['#ffffff', '#dce9ff', '#ff1010'], { trussY: 24, spots: 10, beams: 12, floor: 0, strobes: 6 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#ffffff', '#dce9ff', '#ff1010'], { haze: 1 });
        },
      },
    ],
  },
  {
    id: 'drake',
    name: 'Drake',
    aesthetic: 'Floating LED structures, futuristic architecture',
    designs: [
      {
        id: 'drake-orbs',
        title: 'Hovering Orbs',
        style: 'Kinetic spheres in the round',
        description: 'A center stage under dozens of suspended glowing spheres and a huge overhead screen ring.',
        arenaId: 'basketball',
        palette: ['#d9a740', '#ffffff', '#1a5cff'],
        build() {
          const objects: StageObject[] = [
            makeObject('platform', { pos: [0, 0, 14], size: [22, 1.6, 10], name: 'Center Stage', material: 'glossBlack', tag: 'main' }),
            makeObject('ledCurved', { pos: [0, 16, 14], size: [26, 4, 14], name: 'Overhead Ring', led: { visual: 'gradient', color1: '#d9a740', color2: '#000000' } }),
          ];
          let i = 0;
          for (let x = -10; x <= 10; x += 4) for (let z = 7; z <= 21; z += 3.5) objects.push(makeObject('sphere', { pos: [x, 9 + ((i++ * 7) % 5), z], size: [1.6, 1.6, 1.6], name: 'Orb', material: { preset: 'neon', emissive: '#ffd27a', emissiveIntensity: 2.5 } }));
          const fixtures = [...fixtureRow('spot', 8, [-12, 18, 6], [12, 18, 6], { name: 'Spot', tilt: 25, color: '#ffffff' }), ...fixtureRow('beam', 8, [-12, 18, 22], [12, 18, 22], { name: 'Beam', pan: 180, tilt: 25, color: '#d9a740' })];
          return finalize(objects, fixtures, ['#d9a740', '#ffffff', '#1a5cff']);
        },
      },
      {
        id: 'drake-ship',
        title: 'Floating Screen Ship',
        style: 'Giant flown LED vessel',
        description: 'A long catwalk stage with a massive flown screen structure hovering above, built for futuristic fly-overs.',
        arenaId: 'megadome',
        palette: ['#1ae0ff', '#1a5cff', '#ffffff'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 26, depth: 10, runway: 30, bstage: true });
          objects.push(
            makeObject('ledHanging', { pos: [0, 18, 10], size: [24, 6, 8], name: 'Flying Screen', led: { visual: 'water', color1: '#1a5cff', color2: '#1ae0ff' } }),
            makeObject('catwalk', { pos: [0, 12, 15], size: [3, 0.3, 26] }),
            makeObject('ledWall', { pos: [0, 1.6, -9.6], size: [26, 10, 0.3], led: { visual: 'skyline', color1: '#1ae0ff', color2: '#020210' } }),
          );
          const rig = standardRig(26, ['#1ae0ff', '#1a5cff', '#ffffff'], { trussY: 22, beams: 12, lasers: 4 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#1ae0ff', '#1a5cff', '#ffffff']);
        },
      },
    ],
  },
  {
    id: 'kendrick',
    name: 'Kendrick Lamar',
    aesthetic: 'Theatrical, cinematic, multi-level',
    designs: [
      {
        id: 'kendrick-theatre',
        title: 'Cinematic Theatre',
        style: 'Stage-within-a-stage',
        description: 'A raised box set framed by a portal with a cinematic widescreen above. Lighting comes from tight, dramatic side angles.',
        arenaId: 'basketball',
        palette: ['#ffffff', '#ffd7a3', '#ff1010'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 26, depth: 14, levels: 2 });
          objects.push(
            makeObject('frame', { pos: [0, 1.6, -3], size: [20, 11, 0.8], name: 'Proscenium', material: 'white' }),
            makeObject('ledHorizontal', { pos: [0, 14, -6], size: [26, 5, 0.3], name: 'Cinema Screen', led: { visual: 'clouds', color1: '#9ec9ff', color2: '#ffffff' } }),
            makeObject('curtain', { pos: [0, 1.6, -12], size: [24, 12, 0.4], material: 'redVelvet' }),
          );
          const fixtures = [
            ...fixtureRow('spot', 5, [-16, 3, -8], [-16, 3, 4], { name: 'Side L', pan: 90, tilt: 80, color: '#ffffff' }),
            ...fixtureRow('spot', 5, [16, 3, -8], [16, 3, 4], { name: 'Side R', pan: -90, tilt: 80, color: '#ffffff' }),
            makeFixture('follow', { pos: [0, 16, 30], name: 'Follow Spot', pan: 180, tilt: 55 }),
            ...fixtureRow('wash', 4, [-10, 16, 0], [10, 16, 0], { name: 'Top Wash', tilt: 10, color: '#ffd7a3' }),
          ];
          return finalize(objects, fixtures, ['#ffffff', '#ffd7a3', '#ff1010'], { haze: 0.6 });
        },
      },
      {
        id: 'kendrick-split',
        title: 'Split Levels',
        style: 'Two-story set with stairs',
        description: 'Two stacked decks connected by stairs and a red light box. Built for storytelling across levels.',
        arenaId: 'megadome',
        palette: ['#ff1010', '#ffffff', '#1a5cff'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 30, depth: 14, levels: 3, material: 'concrete' });
          objects.push(makeObject('cube', { pos: [10, 1.6, 2], size: [5, 5, 5], name: 'Light Box', material: { preset: 'frosted', color: '#ff2a2a', emissive: '#ff1010', emissiveIntensity: 1 } }));
          const rig = standardRig(30, ['#ff1010', '#ffffff', '#1a5cff'], { spots: 8, beams: 8 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#ff1010', '#ffffff', '#1a5cff']);
        },
      },
    ],
  },
  {
    id: 'travis',
    name: 'Travis Scott',
    aesthetic: 'Immersive, large-scale, futuristic environments',
    designs: [
      {
        id: 'travis-loop',
        title: 'Loop Ride',
        style: 'Track loop over the floor',
        description: 'A huge suspended loop structure circles above a B-stage while lasers and fire-colored beams fill the room.',
        arenaId: 'megadome',
        palette: ['#ff7a1a', '#ff1010', '#ffc21a'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 26, depth: 12, runway: 24, bstage: true });
          objects.push(
            makeObject('ring', { pos: [0, 4, 27], size: [22, 22, 1], rot: [0, Math.PI / 2, 0], name: 'Loop', material: 'aluminum' }),
            makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [26, 12, 0.3], led: { visual: 'fire', color1: '#ff2a00', color2: '#ffc21a' } }),
          );
          const rig = standardRig(26, ['#ff7a1a', '#ff1010', '#ffc21a'], { lasers: 6, strobes: 6, beams: 12 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#ff7a1a', '#ff1010', '#ffc21a'], { haze: 1, fog: 0.8 });
        },
      },
      {
        id: 'travis-pyramid',
        title: 'Stone Monument',
        style: 'Center pyramid in the round',
        description: 'A towering stepped pyramid in the middle of the floor with screens on every face.',
        arenaId: 'football',
        palette: ['#ff7a1a', '#ffffff', '#5a1a6e'],
        build() {
          const objects: StageObject[] = [
            makeObject('platform', { pos: [0, 0, 30], size: [26, 2, 26], material: 'concrete', name: 'Base', tag: 'main' }),
            makeObject('pyramid', { pos: [0, 2, 30], size: [18, 14, 18], material: 'concrete' }),
          ];
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            objects.push(makeObject('ledWall', { pos: [Math.sin(a) * 16, 6, 30 + Math.cos(a) * 16], rot: [0, a, 0], size: [12, 7, 0.3], led: { visual: 'noise', color1: '#ff7a1a', color2: '#200000' } }));
          }
          const fixtures: Fixture[] = [];
          circleOf(16, 15, 30, 24, (x, z, a, i) => fixtures.push(makeFixture(i % 2 ? 'beam' : 'spot', { pos: [x, 24, z], pan: (a * 180) / Math.PI + 180, tilt: 20, color: '#ff7a1a', name: `Ring ${i + 1}` })));
          return finalize(objects, fixtures, ['#ff7a1a', '#ffffff', '#5a1a6e']);
        },
      },
    ],
  },
  {
    id: 'weeknd',
    name: 'The Weeknd',
    aesthetic: 'Dark futuristic architecture, cinematic LED, atmosphere',
    designs: [
      {
        id: 'weeknd-skyline',
        title: 'Dystopian Skyline',
        style: 'City of towers and a moon',
        description: 'A dark city of block towers lines a long runway toward a giant glowing moon over the field. Heavy haze, red light.',
        arenaId: 'football',
        palette: ['#ff1010', '#ffffff', '#ff7a1a'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 50, depth: 14, runway: 40, bstage: true, material: 'concrete' });
          const heights = [14, 22, 10, 28, 16, 12, 24, 9, 18];
          heights.forEach((h, i) => {
            const x = -24 + i * 6;
            objects.push(makeObject('monolith', { pos: [x, 1.6, -10 - (i % 3) * 2], size: [4.5, h, 4], name: 'Tower', material: { preset: 'concrete', emissive: '#ff3b2a', emissiveIntensity: 0.08 } }));
          });
          objects.push(makeObject('ledCircle', { pos: [0, 10, 52], size: [16, 16, 0.4], name: 'Moon', led: { visual: 'eclipse', color1: '#ffe6c8', color2: '#100000' } }));
          const rig = standardRig(50, ['#ff1010', '#ffffff', '#ff7a1a'], { trussY: 32, beams: 14, spots: 8, floor: 10, strobes: 4 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#ff1010', '#ffffff', '#ff7a1a'], { haze: 1, fog: 0.9 });
        },
      },
      {
        id: 'weeknd-halo',
        title: 'Red Halo',
        style: 'Huge tilted ring screen',
        description: 'A gigantic angled red halo hangs over a black glass stage, with sharp white beam curtains.',
        arenaId: 'megadome',
        palette: ['#ff1010', '#ff2a4a', '#ffffff'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, shape: 'circle', width: 22, depth: 22, material: 'glossBlack' });
          objects.push(makeObject('ring', { pos: [0, 10, -11], rot: [-0.35, 0, 0], size: [26, 26, 1], material: { preset: 'neon', emissive: '#ff1010', emissiveIntensity: 3 } }));
          const fixtures = [...fixtureRow('beam', 16, [-20, 22, -4], [20, 22, -4], { name: 'Beam Curtain', tilt: 0, color: '#ffffff' })];
          fixtures.push(...fixtureRow('wash', 6, [-14, 20, 6], [14, 20, 6], { name: 'Red Wash', pan: 180, tilt: 30, color: '#ff1010' }));
          return finalize(objects, fixtures, ['#ff1010', '#ff2a4a', '#ffffff'], { haze: 1 });
        },
      },
    ],
  },
  {
    id: 'beyonce',
    name: 'Beyoncé',
    aesthetic: 'Monumental screens, metallic glamour, runway',
    designs: [
      {
        id: 'beyonce-monolith',
        title: 'Monolith Screen',
        style: 'Rotating cube screen tower',
        description: 'A towering cube of screens anchors a long silver runway. Big, bold, symmetric and metallic.',
        arenaId: 'football',
        palette: ['#d9a740', '#ffffff', '#ff2ad4'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 44, depth: 14, runway: 34, bstage: true, material: 'chrome' });
          objects.push(
            makeObject('ledPillar', { pos: [0, 1.6, -4], size: [16, 22, 8], name: 'Screen Monolith', led: { visual: 'geometric', color1: '#d9a740', color2: '#000000' } }),
            makeObject('arch', { pos: [0, 1.6, 30], size: [14, 9, 0.8], material: 'gold' }),
          );
          const rig = standardRig(44, ['#d9a740', '#ffffff', '#ff2ad4'], { trussY: 28, beams: 16, spots: 10, strobes: 4 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#d9a740', '#ffffff', '#ff2ad4']);
        },
      },
      {
        id: 'beyonce-arch',
        title: 'Silver Arch',
        style: 'Chrome arch over a mirrored deck',
        description: 'A chrome arch portal with a mirrored floor and a wide horizontal screen for a sleek, futuristic look.',
        arenaId: 'megadome',
        palette: ['#c0c0ff', '#ffffff', '#8a2aff'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 34, depth: 14, runway: 18, material: 'mirror' });
          objects.push(
            makeObject('arch', { pos: [0, 1.6, -4], size: [30, 18, 1.2], material: 'chrome' }),
            makeObject('ledHorizontal', { pos: [0, 4, -13.6], size: [32, 9, 0.3], led: { visual: 'noise', color1: '#d9d9d9', color2: '#202226' } }),
          );
          const rig = standardRig(34, ['#c0c0ff', '#ffffff', '#8a2aff'], { trussY: 22 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#c0c0ff', '#ffffff', '#8a2aff']);
        },
      },
    ],
  },
  {
    id: 'taylor',
    name: 'Taylor Swift',
    aesthetic: 'Long runways, multiple worlds, huge LED floor',
    designs: [
      {
        id: 'taylor-eras',
        title: 'Diamond Runway',
        style: 'Main stage, runway, diamond B-stage',
        description: 'A giant screen wall with a long runway into a diamond-shaped B-stage with an LED floor, built for scene changes.',
        arenaId: 'football',
        palette: ['#ff6b9d', '#9b2aff', '#ffc21a'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 44, depth: 14, runway: 40 });
          objects.push(
            makeObject('hexPlatform', { pos: [0, 0, 44], size: [14, 1.6, 14], rot: [0, Math.PI / 6, 0], name: 'Diamond', material: 'glossBlack', tag: 'main' }),
            makeObject('ledFloor', { pos: [0, 1.6, 44], size: [9, 0.12, 9], rot: [0, Math.PI / 4, 0], led: { visual: 'gradient', color1: '#ff6b9d', color2: '#9b2aff' } }),
            makeObject('ledWall', { pos: [0, 1.6, -13.6], size: [44, 14, 0.4], led: { visual: 'clouds', color1: '#ff6b9d', color2: '#ffffff' } }),
          );
          const rig = standardRig(44, ['#ff6b9d', '#9b2aff', '#ffc21a'], { trussY: 26, spots: 10, beams: 14 });
          rig.fixtures.push(...fixtureRow('spot', 6, [-10, 18, 44], [10, 18, 44], { name: 'Diamond Spot', tilt: 10, color: '#ffffff' }));
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#ff6b9d', '#9b2aff', '#ffc21a']);
        },
      },
      {
        id: 'taylor-cabin',
        title: 'Storybook Set',
        style: 'Soft, warm theatrical world',
        description: 'A moss-and-wood folklore-style set with warm amber light and a fabric canopy over the stage.',
        arenaId: 'theater',
        palette: ['#ffd7a3', '#ff9a1a', '#7dff4d'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 18, depth: 9, material: 'wood' });
          objects.push(
            makeObject('fabric', { pos: [0, 9, -4], size: [16, 1.5, 8], material: 'white' }),
            makeObject('cube', { pos: [-4, 1.6, -6], size: [5, 4, 3], name: 'Cabin', material: 'wood' }),
            makeObject('pyramid', { pos: [-4, 5.6, -6], size: [5.5, 2, 3.5], name: 'Roof', material: 'wood' }),
          );
          const fixtures = fixtureRow('wash', 5, [-8, 12, 2], [8, 12, 2], { name: 'Warm Wash', pan: 180, tilt: 30, color: '#ffd7a3' });
          fixtures.push(makeFixture('follow', { pos: [0, 12, 26], pan: 180, tilt: 64 }));
          return finalize(objects, fixtures, ['#ffd7a3', '#ff9a1a', '#7dff4d'], { haze: 0.5 });
        },
      },
    ],
  },
  {
    id: 'frank',
    name: 'Frank Ocean',
    aesthetic: 'Minimal, intimate, walkways and raw light',
    designs: [
      {
        id: 'frank-walkway',
        title: 'Light Walkway',
        style: 'Long walkway, bare light',
        description: 'A bare runway cutting through a festival crowd with only scaffold and stark white light. Restraint over spectacle.',
        arenaId: 'festival',
        palette: ['#ffffff', '#ffd7a3', '#1a5cff'],
        build() {
          const objects: StageObject[] = [
            makeObject('platform', { pos: [0, 0, -4], size: [14, 1.4, 8], material: 'white', tag: 'main' }),
            makeObject('runway', { pos: [0, 0, 22], size: [2.5, 1.4, 44], material: 'white', tag: 'main' }),
            makeObject('scaffold', { pos: [0, 0, -10], size: [16, 10, 2] }),
          ];
          const fixtures = fixtureRow('spot', 10, [0, 12, 0], [0, 12, 44], { name: 'Walk Light', tilt: 0, beamAngle: 10, color: '#ffffff' });
          return finalize(objects, fixtures, ['#ffffff', '#ffd7a3', '#1a5cff'], { haze: 0.7 });
        },
      },
      {
        id: 'frank-box',
        title: 'Glass Box',
        style: 'Performer in a frosted room',
        description: 'A frosted-glass room sits on a black deck, glowing from within. Quiet, cinematic and minimal.',
        arenaId: 'warehouse',
        palette: ['#9ec9ff', '#ffffff', '#ff7a1a'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 18, depth: 10, stairs: false });
          objects.push(
            makeObject('glassPanel', { pos: [0, 1.6, -1.5], size: [8, 4, 0.1], material: 'frosted' }),
            makeObject('glassPanel', { pos: [-4, 1.6, -5.5], rot: [0, Math.PI / 2, 0], size: [8, 4, 0.1], material: 'frosted' }),
            makeObject('glassPanel', { pos: [4, 1.6, -5.5], rot: [0, Math.PI / 2, 0], size: [8, 4, 0.1], material: 'frosted' }),
          );
          const fixtures = [makeFixture('ceiling', { pos: [0, 10, -5.5], beamAngle: 30, color: '#9ec9ff', name: 'Box Light' }), ...fixtureRow('wash', 2, [-6, 11, 2], [6, 11, 2], { pan: 180, tilt: 30, color: '#ffffff', name: 'Front Wash' })];
          return finalize(objects, fixtures, ['#9ec9ff', '#ffffff', '#ff7a1a']);
        },
      },
    ],
  },
  {
    id: 'tyler',
    name: 'Tyler, The Creator',
    aesthetic: 'Playful sets, bold color worlds, theatrical scenery',
    designs: [
      {
        id: 'tyler-lake',
        title: 'Lakeside Scene',
        style: 'Painted landscape set',
        description: 'A pastel landscape with a water-screen lake, a wooden boat dock and a huge painted sky.',
        arenaId: 'amphi',
        palette: ['#ff6b9d', '#7dff4d', '#1ae0ff'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 24, depth: 12, material: 'wood' });
          objects.push(
            makeObject('ledFloor', { pos: [0, 1.6, -3], size: [16, 0.12, 6], name: 'Lake', led: { visual: 'water', color1: '#1a5cff', color2: '#1ae0ff' } }),
            makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [24, 10, 0.3], name: 'Painted Sky', led: { visual: 'clouds', color1: '#ff6b9d', color2: '#ffffff' } }),
            makeObject('wedge', { pos: [6, 1.6, -3], size: [3, 1, 5], name: 'Boat', material: 'wood' }),
          );
          const rig = standardRig(24, ['#ff6b9d', '#7dff4d', '#1ae0ff'], { beams: 6, spots: 4 });
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#ff6b9d', '#7dff4d', '#1ae0ff'], { haze: 0.5, fog: 0.8 });
        },
      },
      {
        id: 'tyler-garden',
        title: 'Flower Garden',
        style: 'Color-blocked garden set',
        description: 'Oversized colorful shapes as flowers and a striped backdrop for a bright, theatrical look.',
        arenaId: 'basketball',
        palette: ['#ffc21a', '#ff2ad4', '#7dff4d'],
        build() {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 26, depth: 12 });
          const cols = ['#ffc21a', '#ff2ad4', '#7dff4d', '#1ae0ff', '#ff7a1a'];
          for (let i = 0; i < 7; i++) {
            const x = -11 + i * 3.7;
            const h = 3 + ((i * 5) % 4);
            objects.push(makeObject('column', { pos: [x, 1.6, -6], size: [0.4, h, 0.4], material: { preset: 'white', color: '#3b7a3b' }, name: 'Stem' }));
            objects.push(makeObject('sphere', { pos: [x, 1.6 + h, -6], size: [2.4, 2.4, 2.4], material: { preset: 'white', color: cols[i % 5] }, name: 'Flower' }));
          }
          objects.push(makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [26, 10, 0.3], led: { visual: 'bars', color1: '#ffc21a', color2: '#ff2ad4' } }));
          const rig = standardRig(26, ['#ffc21a', '#ff2ad4', '#7dff4d']);
          return finalize([...objects, ...rig.objects], rig.fixtures, ['#ffc21a', '#ff2ad4', '#7dff4d']);
        },
      },
    ],
  },
  {
    id: 'gambino',
    name: 'Childish Gambino',
    aesthetic: 'Immersive projection, raw theatrical light',
    designs: [
      {
        id: 'gambino-dome',
        title: 'Projection Dome',
        style: 'Wrap-around visual world',
        description: 'A curved wrap-around screen hugs a round stage while a single bright halo lights the performer.',
        arenaId: 'basketball',
        palette: ['#ffffff', '#ff7a1a', '#1a5cff'],
        build() {
          const objects: StageObject[] = [
            makeObject('circlePlatform', { pos: [0, 0, 8], size: [14, 1.2, 14], material: 'concrete', tag: 'main' }),
            makeObject('ledCurved', { pos: [0, 1, -4], size: [32, 12, 10], led: { visual: 'particles', color1: '#ffffff', color2: '#020210' } }),
            makeObject('torus', { pos: [0, 12, 8], size: [8, 0.6, 8], material: { preset: 'neon', emissive: '#ffffff', emissiveIntensity: 3 } }),
          ];
          const fixtures = [makeFixture('ceiling', { pos: [0, 18, 8], beamAngle: 18, color: '#ffffff', name: 'Halo Down' }), ...fixtureRow('spot', 6, [-14, 16, 14], [14, 16, 14], { pan: 180, tilt: 30, color: '#ff7a1a', name: 'Spot' })];
          return finalize(objects, fixtures, ['#ffffff', '#ff7a1a', '#1a5cff'], { haze: 0.8 });
        },
      },
      {
        id: 'gambino-island',
        title: 'Island',
        style: 'Stage as an island in the crowd',
        description: 'An organic island of platforms in the middle of the crowd, connected by walkways, under a fabric canopy.',
        arenaId: 'festival',
        palette: ['#7dff4d', '#ffc21a', '#1ae0ff'],
        build() {
          const objects: StageObject[] = [
            makeObject('circlePlatform', { pos: [0, 0, 30], size: [16, 1.6, 16], material: 'wood', tag: 'main' }),
            makeObject('circlePlatform', { pos: [-14, 0, 40], size: [8, 1.2, 8], material: 'wood', tag: 'main' }),
            makeObject('circlePlatform', { pos: [12, 0, 44], size: [7, 1.2, 7], material: 'wood', tag: 'main' }),
            makeObject('fabric', { pos: [0, 14, 32], size: [30, 3, 22], material: 'white' }),
          ];
          const fixtures: Fixture[] = [];
          circleOf(10, 12, 30, 13, (x, z, a, i) => fixtures.push(makeFixture('wash', { pos: [x, 13, z], pan: (a * 180) / Math.PI + 180, tilt: 30, color: '#7dff4d', name: `Canopy ${i + 1}` })));
          return finalize(objects, fixtures, ['#7dff4d', '#ffc21a', '#1ae0ff']);
        },
      },
    ],
  },
];

export const ALL_DESIGNS: (ArtistDesign & { artist: string })[] = ARTISTS.flatMap((a) => a.designs.map((d) => ({ ...d, artist: a.name })));

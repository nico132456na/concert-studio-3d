import type { DesignSeed, Fixture, StageObject } from '../types';
import { makeFixture, makeObject, makeFromDef } from './library';
import { buildMainStage, DEFAULT_STAGE, finalize, fixtureRow, standardRig } from './builders';
import type { Palette } from './sceneGen';

/**
 * Artist stage gallery.
 * - 'reference': a simplified recreation of a real tour's publicly reported stage concept.
 *   Proportions, details and equipment are approximations, not production drawings.
 * - 'inspired': an original design in the spirit of the artist's visual style.
 */
export interface ArtistDesign {
  id: string;
  title: string;
  tour: string;
  year: string;
  accuracy: 'reference' | 'inspired';
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

/* ------------------------------- helpers ------------------------------- */

/** Left/right line-array hangs plus a sub row — every stadium design gets real PA. */
function pa(width: number, y = 12, z = 1, subs = true): StageObject[] {
  const x = width / 2 + 3;
  const out = [
    makeFromDef('lineArray', { pos: [-x, y, z], rot: [0, 0.18, 0], name: 'Main PA L' }),
    makeFromDef('lineArray', { pos: [x, y, z], rot: [0, -0.18, 0], name: 'Main PA R' }),
    makeFromDef('sideHang', { pos: [-x - 3, y, z - 1], rot: [0, 0.6, 0], name: 'Outfill L' }),
    makeFromDef('sideHang', { pos: [x + 3, y, z - 1], rot: [0, -0.6, 0], name: 'Outfill R' }),
  ];
  if (subs) out.push(makeFromDef('subArray', { pos: [0, 0, z + 2.5], size: [Math.min(width, 24), 0.7, 1], name: 'Sub Array' }));
  return out;
}

function ring(n: number, r: number, cz: number, fn: (x: number, z: number, a: number, i: number) => void) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    fn(Math.sin(a) * r, cz + Math.cos(a) * r, a, i);
  }
}
const deg = (a: number) => (a * 180) / Math.PI;

function design(d: Omit<ArtistDesign, 'build'> & { make: () => { objects: StageObject[]; fixtures: Fixture[]; atmosphere?: DesignSeed['atmosphere'] } }): ArtistDesign {
  const { make, ...rest } = d;
  return { ...rest, build: () => { const r = make(); return finalize(r.objects, r.fixtures, d.palette, r.atmosphere); } };
}

/* ------------------------------- gallery ------------------------------- */

export const ARTISTS: Artist[] = [
  {
    id: 'ye',
    name: 'Ye (Kanye West)',
    aesthetic: 'Monumental minimalism, suspended platforms, globes',
    designs: [
      design({
        id: 'ye-globe', title: 'The Globe', tour: 'Ye Live (Bully era)', year: '2026', accuracy: 'reference', arenaId: 'football',
        palette: ['#2a7bff', '#ffffff', '#ff7a1a'],
        description: 'Simplified recreation of the 2026 globe stage: a huge sphere in the middle of the stadium with Earth and moon visuals projected on it, the performer on top, lasers and atmospheric light all around.',
        make: () => {
          const objects: StageObject[] = [
            makeObject('circlePlatform', { pos: [0, 0, 40], size: [26, 1.2, 26], material: 'matteBlack', name: 'Globe Base', tag: 'main' }),
            makeFromDef('globeStage', { pos: [0, 1.2, 40], size: [18, 18, 18], name: 'Globe', led: { visual: 'earth', resolution: 0 } }),
            makeFromDef('round360', { pos: [0, 19.1, 40], size: [4, 0.3, 4], material: 'matteBlack', name: 'Summit Deck' }),
          ];
          const fixtures: Fixture[] = [];
          ring(16, 22, 40, (x, z, a, i) => fixtures.push(makeFixture(i % 2 ? 'beam' : 'spot', { pos: [x, 32, z], pan: deg(a) + 180, tilt: 25, color: '#ffffff', name: `Halo ${i + 1}` })));
          ring(8, 15, 40, (x, z, a, i) => fixtures.push(makeFixture('laser', { pos: [x, 1.3, z], pan: deg(a), tilt: 75, color: i % 2 ? '#2a7bff' : '#1aff9c', name: `Laser ${i + 1}` })));
          ring(4, 30, 40, (x, z, a) => objects.push(makeFromDef('delayTower', { pos: [x, 0, z], rot: [0, a + Math.PI, 0] })));
          return { objects, fixtures, atmosphere: { haze: 0.9, fog: 0.6 } };
        },
      }),
      design({
        id: 'ye-pablo', title: 'Floating Stage', tour: 'Saint Pablo Tour', year: '2016', accuracy: 'reference', arenaId: 'basketball',
        palette: ['#ff7a1a', '#ffd7a3', '#ffffff'],
        description: 'Simplified recreation: a single platform suspended above the general-admission floor, moving over the crowd under a matching grid of lights. No conventional stage at the end of the room.',
        make: () => {
          const objects: StageObject[] = [
            makeObject('floating', { pos: [0, 7, 16], size: [10, 0.6, 18], name: 'Floating Stage', material: 'matteBlack', motion: 'bob', motionSpeed: 0.3 }),
            makeObject('trussGrid', { pos: [0, 13, 16], size: [14, 0.8, 22], name: 'Light Grid', material: 'matteBlack' }),
          ];
          const fixtures: Fixture[] = [];
          for (let x = -6; x <= 6; x += 3) for (let z = 7; z <= 25; z += 4.5) fixtures.push(makeFixture('wash', { pos: [x, 12.6, z], tilt: 0, beamAngle: 26, color: '#ff7a1a', name: 'Grid Wash' }));
          fixtures.push(...fixtureRow('beam', 6, [-7, 12.6, 6], [7, 12.6, 26], { name: 'Grid Beam', color: '#ffd7a3', tilt: 10 }));
          return { objects: [...objects, ...pa(14, 14, 4, false)], fixtures, atmosphere: { haze: 0.9 } };
        },
      }),
      design({
        id: 'ye-yeezus', title: 'The Mountain', tour: 'The Yeezus Tour', year: '2013', accuracy: 'reference', arenaId: 'basketball',
        palette: ['#ffffff', '#ff1010', '#dce9ff'],
        description: 'Simplified recreation: a huge sculpted mountain at the end of the arena, a giant circular screen above it and a long white runway into the crowd.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 28, depth: 14, material: 'matteBlack', stairs: false });
          objects.push(
            makeObject('mountain', { pos: [0, 1.6, -8], size: [26, 14, 12], material: 'concrete' }),
            makeObject('ledCircle', { pos: [0, 16, -10], size: [14, 14, 0.4], name: 'Moon Screen', led: { visual: 'eclipse', color1: '#ffffff', color2: '#100000' } }),
            makeObject('runway', { pos: [0, 0, 14], size: [2.5, 1.6, 28], material: 'white' }),
            ...pa(28),
          );
          const rig = standardRig(28, ['#ffffff', '#ff1010', '#dce9ff'], { trussY: 24, spots: 10, beams: 10, floor: 0, strobes: 6 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures, atmosphere: { haze: 1 } };
        },
      }),
    ],
  },
  {
    id: 'drake',
    name: 'Drake',
    aesthetic: 'Floating LED structures, futuristic architecture',
    designs: [
      design({
        id: 'drake-orbs', title: 'Hovering Orbs', tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId: 'basketball',
        palette: ['#d9a740', '#ffffff', '#1a5cff'],
        description: 'Original design: a center stage under dozens of glowing suspended spheres and an overhead screen ring.',
        make: () => {
          const objects: StageObject[] = [
            makeObject('platform', { pos: [0, 0, 14], size: [22, 1.6, 10], name: 'Center Stage', material: 'glossBlack', tag: 'main' }),
            makeObject('ledCurved', { pos: [0, 16, 14], size: [26, 4, 14], name: 'Overhead Ring', led: { visual: 'gradient', color1: '#d9a740', color2: '#000000' } }),
          ];
          let i = 0;
          for (let x = -10; x <= 10; x += 4) for (let z = 7; z <= 21; z += 3.5) objects.push(makeObject('sphere', { pos: [x, 9 + ((i++ * 7) % 5), z], size: [1.6, 1.6, 1.6], name: 'Orb', material: { preset: 'neon', emissive: '#ffd27a', emissiveIntensity: 2.5 }, motion: 'bob', motionSpeed: 0.5 + (i % 3) * 0.2 }));
          const fixtures = [...fixtureRow('spot', 8, [-12, 18, 6], [12, 18, 6], { name: 'Spot', tilt: 25, color: '#ffffff' }), ...fixtureRow('beam', 8, [-12, 18, 22], [12, 18, 22], { name: 'Beam', pan: 180, tilt: 25, color: '#d9a740' })];
          return { objects: [...objects, ...pa(22, 15, 14, false)], fixtures };
        },
      }),
      design({
        id: 'drake-ship', title: 'Flying Screen', tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId: 'megadome',
        palette: ['#1ae0ff', '#1a5cff', '#ffffff'],
        description: 'Original design: a long catwalk stage with a massive flown screen structure hovering above.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 26, depth: 10, runway: 30, bstage: true });
          objects.push(
            makeObject('ledHanging', { pos: [0, 18, 10], size: [24, 6, 8], name: 'Flying Screen', led: { visual: 'water', color1: '#1a5cff', color2: '#1ae0ff' }, motion: 'bob', motionSpeed: 0.4 }),
            makeObject('catwalk', { pos: [0, 12, 15], size: [3, 0.3, 26] }),
            makeObject('ledWall', { pos: [0, 1.6, -9.6], size: [26, 10, 0.3], led: { visual: 'skyline', color1: '#1ae0ff', color2: '#020210' } }),
            ...pa(26),
          );
          const rig = standardRig(26, ['#1ae0ff', '#1a5cff', '#ffffff'], { trussY: 22, beams: 12, lasers: 4 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
    ],
  },
  {
    id: 'kendrick',
    name: 'Kendrick Lamar',
    aesthetic: 'Theatrical, cinematic, multi-level',
    designs: [
      design({
        id: 'kendrick-theatre', title: 'Cinematic Theatre', tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId: 'basketball',
        palette: ['#ffffff', '#ffd7a3', '#ff1010'],
        description: 'Original design: a raised box set framed by a portal, a widescreen above and tight, dramatic side light.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 26, depth: 14, levels: 2 });
          objects.push(
            makeObject('frame', { pos: [0, 1.6, -3], size: [20, 11, 0.8], name: 'Proscenium', material: 'white' }),
            makeObject('ledHorizontal', { pos: [0, 14, -6], size: [26, 5, 0.3], name: 'Cinema Screen', led: { visual: 'clouds', color1: '#9ec9ff', color2: '#ffffff' } }),
            makeObject('curtain', { pos: [0, 1.6, -12], size: [24, 12, 0.4], material: 'redVelvet' }),
            ...pa(26),
          );
          const fixtures = [
            ...fixtureRow('spot', 5, [-16, 3, -8], [-16, 3, 4], { name: 'Side L', pan: 90, tilt: 80, color: '#ffffff' }),
            ...fixtureRow('spot', 5, [16, 3, -8], [16, 3, 4], { name: 'Side R', pan: -90, tilt: 80, color: '#ffffff' }),
            makeFixture('follow', { pos: [0, 16, 30], name: 'Follow Spot', pan: 180, tilt: 55 }),
            ...fixtureRow('wash', 4, [-10, 16, 0], [10, 16, 0], { name: 'Top Wash', tilt: 10, color: '#ffd7a3' }),
          ];
          return { objects, fixtures, atmosphere: { haze: 0.6 } };
        },
      }),
      design({
        id: 'kendrick-split', title: 'Split Levels', tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId: 'megadome',
        palette: ['#ff1010', '#ffffff', '#1a5cff'],
        description: 'Original design: stacked concrete decks connected by stairs with a glowing red light box for storytelling scenes.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 30, depth: 14, levels: 3, material: 'concrete' });
          objects.push(makeObject('cube', { pos: [10, 1.6, 2], size: [5, 5, 5], name: 'Light Box', material: { preset: 'frosted', color: '#ff2a2a', emissive: '#ff1010', emissiveIntensity: 1 } }), ...pa(30));
          const rig = standardRig(30, ['#ff1010', '#ffffff', '#1a5cff'], { spots: 8, beams: 8 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
    ],
  },
  {
    id: 'travis',
    name: 'Travis Scott',
    aesthetic: 'Immersive, large-scale, futuristic environments',
    designs: [
      design({
        id: 'travis-astro', title: 'Loop Ride', tour: 'Astroworld: Wish You Were Here Tour', year: '2018', accuracy: 'reference', arenaId: 'megadome',
        palette: ['#ff7a1a', '#ff1010', '#ffc21a'],
        description: 'Simplified recreation: a theme-park ride concept with a giant loop track running out over the floor to a B-stage, with fire-colored light and lasers.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 26, depth: 12, runway: 24, bstage: true });
          objects.push(
            makeObject('ring', { pos: [0, 4, 27], size: [22, 22, 1.2], rot: [0, Math.PI / 2, 0], name: 'Loop Track', material: 'aluminum' }),
            makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [26, 12, 0.3], led: { visual: 'fire', color1: '#ff2a00', color2: '#ffc21a' } }),
            ...pa(26),
          );
          const rig = standardRig(26, ['#ff7a1a', '#ff1010', '#ffc21a'], { lasers: 6, strobes: 6, beams: 12 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures, atmosphere: { haze: 1, fog: 0.8 } };
        },
      }),
      design({
        id: 'travis-circus', title: 'Monument in the Round', tour: 'Circus Maximus Tour', year: '2023', accuracy: 'reference', arenaId: 'football',
        palette: ['#ff7a1a', '#ffffff', '#5a1a6e'],
        description: 'Simplified recreation of a central-stage concept: a rocky monument rising from the middle of the floor with the crowd all around it.',
        make: () => {
          const objects: StageObject[] = [
            makeObject('circlePlatform', { pos: [0, 0, 30], size: [26, 2, 26], material: 'concrete', name: 'Base', tag: 'main' }),
            makeObject('mountain', { pos: [0, 2, 28], size: [16, 12, 12], material: 'concrete', name: 'Monument' }),
            makeObject('rock', { pos: [-8, 2, 33], size: [6, 4, 5], material: 'concrete' }),
            makeObject('rock', { pos: [7, 2, 34], size: [5, 3, 4], material: 'concrete' }),
          ];
          ring(4, 16, 30, (x, z, a) => objects.push(makeObject('ledWall', { pos: [x, 6, z], rot: [0, a, 0], size: [12, 7, 0.3], led: { visual: 'noise', color1: '#ff7a1a', color2: '#200000' } })));
          const fixtures: Fixture[] = [];
          ring(16, 15, 30, (x, z, a, i) => fixtures.push(makeFixture(i % 2 ? 'beam' : 'spot', { pos: [x, 24, z], pan: deg(a) + 180, tilt: 20, color: '#ff7a1a', name: `Ring ${i + 1}` })));
          return { objects, fixtures };
        },
      }),
    ],
  },
  {
    id: 'bruno',
    name: 'Bruno Mars',
    aesthetic: 'Showbiz glamour, kinetic truss, warm vintage color',
    designs: [
      design({
        id: 'bruno-romantic', title: 'Rotating Truss Pillars', tour: 'The Romantic Tour', year: '2026', accuracy: 'reference', arenaId: 'football',
        palette: ['#ff2a4a', '#ffc21a', '#ffffff'],
        description: 'Simplified recreation: a very wide stage with ten rotating truss pillars full of moving lights — six that travel behind the band and four fixed at the sides — in front of a stained-glass style backdrop.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 58, depth: 16, material: 'glossBlack' });
          objects.push(makeObject('ledWall', { pos: [0, 1.6, -15.6], size: [46, 14, 0.4], name: 'Stained Glass Wall', led: { visual: 'stained', color1: '#ff2a4a', color2: '#2a7bff', resolution: 0 } }));
          const fixtures: Fixture[] = [];
          const xs = [-24, -15, -9, -3, 3, 9, 15, 24, -28, 28];
          xs.forEach((x, i) => {
            const behind = i < 8 && Math.abs(x) < 20;
            const z = behind ? -10 : -4;
            objects.push(makeObject('trussTower', { pos: [x, 1.6, z], size: [1, 15, 1], name: `Rotating Pillar ${i + 1}`, motion: behind ? 'rotate' : 'none', motionSpeed: 0.6 }));
            for (let k = 0; k < 4; k++) fixtures.push(makeFixture(k % 2 ? 'beam' : 'spot', { pos: [x, 4 + k * 3.2, z + 0.7], pan: 0, tilt: 70 - k * 8, color: k % 2 ? '#ffc21a' : '#ff2a4a', movement: 'sweep', moveSpeed: 0.5, name: `Pillar ${i + 1}.${k + 1}` }));
          });
          objects.push(...pa(58, 14));
          const rig = standardRig(58, ['#ff2a4a', '#ffc21a', '#ffffff'], { trussY: 22, spots: 8, beams: 0, floor: 10, wash: 6 });
          return { objects: [...objects, ...rig.objects], fixtures: [...fixtures, ...rig.fixtures], atmosphere: { haze: 0.75 } };
        },
      }),
    ],
  },
  {
    id: 'weeknd',
    name: 'The Weeknd',
    aesthetic: 'Dark futuristic architecture, cinematic LED, atmosphere',
    designs: [
      design({
        id: 'weeknd-skyline', title: 'Dystopian Skyline', tour: 'After Hours til Dawn Tour', year: '2022', accuracy: 'reference', arenaId: 'football',
        palette: ['#ff1010', '#ffffff', '#ff7a1a'],
        description: 'Simplified recreation: a dark city skyline of tower blocks along the stage, a long runway and a giant glowing moon at the far end, drowned in haze and red light.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 50, depth: 14, runway: 40, bstage: true, material: 'concrete' });
          [14, 22, 10, 28, 16, 12, 24, 9, 18].forEach((h, i) => objects.push(makeObject('monolith', { pos: [-24 + i * 6, 1.6, -10 - (i % 3) * 2], size: [4.5, h, 4], name: 'Tower', material: { preset: 'concrete', emissive: '#ff3b2a', emissiveIntensity: 0.08 } })));
          objects.push(makeObject('ledCircle', { pos: [0, 10, 52], size: [16, 16, 0.4], name: 'Moon', led: { visual: 'eclipse', color1: '#ffe6c8', color2: '#100000' } }), ...pa(50, 16));
          const rig = standardRig(50, ['#ff1010', '#ffffff', '#ff7a1a'], { trussY: 32, beams: 14, spots: 8, floor: 10, strobes: 4 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures, atmosphere: { haze: 1, fog: 0.9 } };
        },
      }),
      design({
        id: 'weeknd-halo', title: 'Red Halo', tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId: 'megadome',
        palette: ['#ff1010', '#ff2a4a', '#ffffff'],
        description: 'Original design: a gigantic angled red halo over a black glass stage with sharp white beam curtains.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, shape: 'circle', width: 22, depth: 22, material: 'glossBlack' });
          objects.push(makeObject('ring', { pos: [0, 10, -11], rot: [-0.35, 0, 0], size: [26, 26, 1], material: { preset: 'neon', emissive: '#ff1010', emissiveIntensity: 3 } }), ...pa(22));
          const fixtures = [...fixtureRow('beam', 16, [-20, 22, -4], [20, 22, -4], { name: 'Beam Curtain', tilt: 0, color: '#ffffff' }), ...fixtureRow('wash', 6, [-14, 20, 6], [14, 20, 6], { name: 'Red Wash', pan: 180, tilt: 30, color: '#ff1010' })];
          return { objects, fixtures, atmosphere: { haze: 1 } };
        },
      }),
    ],
  },
  {
    id: 'beyonce',
    name: 'Beyoncé',
    aesthetic: 'Monumental screens, metallic futurism, runways',
    designs: [
      design({
        id: 'beyonce-renaissance', title: 'Silver Portal', tour: 'Renaissance World Tour', year: '2023', accuracy: 'reference', arenaId: 'football',
        palette: ['#c0c0ff', '#ffffff', '#d9a740'],
        description: 'Simplified recreation: an enormous widescreen LED wall with a circular portal at its center, chrome finishes and a long runway to a satellite stage.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 54, depth: 16, runway: 34, bstage: true, material: 'chrome' });
          objects.push(
            makeObject('ledWall', { pos: [0, 1.6, -15.6], size: [60, 18, 0.4], led: { visual: 'noise', color1: '#d9d9d9', color2: '#202226' } }),
            makeObject('ring', { pos: [0, 2, -14.8], size: [14, 14, 1.5], material: 'chrome', name: 'Portal Ring' }),
            ...pa(54, 18),
          );
          const rig = standardRig(54, ['#c0c0ff', '#ffffff', '#d9a740'], { trussY: 28, beams: 16, spots: 10, strobes: 4 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
      design({
        id: 'beyonce-monolith', title: 'Screen Monolith', tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId: 'football',
        palette: ['#d9a740', '#ffffff', '#ff2ad4'],
        description: 'Original design: a towering cube of screens anchoring a long silver runway.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 44, depth: 14, runway: 34, bstage: true, material: 'chrome' });
          objects.push(makeObject('ledCube', { pos: [0, 1.6, -4], size: [16, 22, 8], name: 'Screen Monolith', led: { visual: 'geometric', color1: '#d9a740', color2: '#000000' } }), makeObject('arch', { pos: [0, 1.6, 30], size: [14, 9, 0.8], material: 'gold' }), ...pa(44, 16));
          const rig = standardRig(44, ['#d9a740', '#ffffff', '#ff2ad4'], { trussY: 28, beams: 16, spots: 10, strobes: 4 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
    ],
  },
  {
    id: 'taylor',
    name: 'Taylor Swift',
    aesthetic: 'Long runways, many worlds, huge LED floor',
    designs: [
      design({
        id: 'taylor-eras', title: 'Diamond Runway', tour: 'The Eras Tour', year: '2023', accuracy: 'reference', arenaId: 'football',
        palette: ['#ff6b9d', '#9b2aff', '#ffc21a'],
        description: 'Simplified recreation: a huge main screen, a long runway into the stadium and a diamond-shaped B-stage with an LED floor that changes for each era.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 44, depth: 14, runway: 40 });
          objects.push(
            makeObject('diamond', { pos: [0, 0, 44], size: [14, 1.6, 14], name: 'Diamond Stage', material: 'glossBlack', tag: 'main' }),
            makeObject('ledFloor', { pos: [0, 1.6, 44], size: [9, 0.12, 9], rot: [0, Math.PI / 4, 0], led: { visual: 'gradient', color1: '#ff6b9d', color2: '#9b2aff' } }),
            makeObject('ledWall', { pos: [0, 1.6, -13.6], size: [44, 14, 0.4], led: { visual: 'clouds', color1: '#ff6b9d', color2: '#ffffff' } }),
            ...pa(44, 16),
          );
          const rig = standardRig(44, ['#ff6b9d', '#9b2aff', '#ffc21a'], { trussY: 26, spots: 10, beams: 14 });
          rig.fixtures.push(...fixtureRow('spot', 6, [-10, 18, 44], [10, 18, 44], { name: 'Diamond Spot', tilt: 10, color: '#ffffff' }));
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
      design({
        id: 'taylor-cabin', title: 'Storybook Set', tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId: 'theater',
        palette: ['#ffd7a3', '#ff9a1a', '#7dff4d'],
        description: 'Original design: a moss-and-wood folklore-style cabin set with warm amber light and a fabric canopy.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 18, depth: 9, material: 'wood' });
          objects.push(makeObject('fabric', { pos: [0, 9, -4], size: [16, 1.5, 8], material: 'white' }), makeObject('cube', { pos: [-4, 1.6, -6], size: [5, 4, 3], name: 'Cabin', material: 'wood' }), makeObject('pyramid', { pos: [-4, 5.6, -6], size: [5.5, 2, 3.5], name: 'Roof', material: 'wood' }), makeObject('tree', { pos: [6, 1.6, -6], size: [4, 7, 4], material: { preset: 'white', color: '#2f5a2f' } }));
          const fixtures = fixtureRow('wash', 5, [-8, 12, 2], [8, 12, 2], { name: 'Warm Wash', pan: 180, tilt: 30, color: '#ffd7a3' });
          fixtures.push(makeFixture('follow', { pos: [0, 12, 26], pan: 180, tilt: 64 }));
          return { objects, fixtures, atmosphere: { haze: 0.5 } };
        },
      }),
    ],
  },
  {
    id: 'dua',
    name: 'Dua Lipa',
    aesthetic: 'Concentric rings, flying platforms, ocean blues',
    designs: [
      design({
        id: 'dua-rings', title: 'Astrolabe Rings', tour: 'Radical Optimism Tour', year: '2024–25', accuracy: 'reference', arenaId: 'basketball',
        palette: ['#1a5cff', '#1ae0ff', '#ffffff'],
        description: 'Simplified recreation: automated concentric LED rings over the stage with a flying circular platform at their center, a curving runway and water-inspired visuals.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, shape: 'circle', width: 18, depth: 18, material: 'glossBlack' });
          objects.push(
            makeObject('ring', { pos: [0, 8, -9], size: [13, 13, 0.5], name: 'Astrolabe Ring A', material: { preset: 'neon', emissive: '#1ae0ff', emissiveIntensity: 2.5 }, motion: 'bob', motionSpeed: 0.4 }),
            makeObject('ring', { pos: [0, 10.5, -9], size: [8, 8, 0.4], rot: [0.5, 0, 0], name: 'Astrolabe Ring B', material: { preset: 'neon', emissive: '#ffffff', emissiveIntensity: 2.5 }, motion: 'bob', motionSpeed: 0.6 }),
            makeFromDef('floatingRound', { pos: [0, 6, -9], size: [4, 0.4, 4], name: 'Flying Puck', motion: 'bob', motionSpeed: 0.5 }),
            makeObject('curvedRunway', { pos: [8, 0, 9], size: [16, 1.6, 16], name: 'Curved Runway' }),
            makeObject('ledCurved', { pos: [0, 1.6, -20], size: [30, 9, 5], led: { visual: 'water', color1: '#0a3d91', color2: '#1ae0ff' } }),
            ...pa(24, 14),
          );
          const rig = standardRig(24, ['#1a5cff', '#1ae0ff', '#ffffff'], { trussY: 20, beams: 10, spots: 6 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures, atmosphere: { haze: 0.8 } };
        },
      }),
    ],
  },
  {
    id: 'postmalone',
    name: 'Post Malone',
    aesthetic: 'Roadhouse Americana, runways, satellite stages',
    designs: [
      design({
        id: 'post-twelve', title: 'Seven Circles', tour: 'Twelve Carat Tour', year: '2022–23', accuracy: 'reference', arenaId: 'basketball',
        palette: ['#ffc21a', '#ffffff', '#ff7a1a'],
        description: 'Simplified recreation: seven circular platforms linked by runways spread across the arena floor so the crowd surrounds the performer.',
        make: () => {
          const objects: StageObject[] = [makeObject('circlePlatform', { pos: [0, 0, 6], size: [12, 1.6, 12], name: 'Main Circle', tag: 'main' })];
          const spots: [number, number][] = [[-12, 14], [12, 14], [-10, 28], [10, 28], [0, 34], [0, 20]];
          spots.forEach(([x, z], i) => {
            objects.push(makeObject('circlePlatform', { pos: [x, 0, z], size: [6, 1.6, 6], name: `Circle ${i + 2}`, tag: 'main' }));
            const [px, pz] = i < 2 ? [0, 6] : i < 4 ? spots[i - 2] : i === 4 ? [0, 20] : [0, 6];
            const dx = x - px, dz = z - pz;
            objects.push(makeObject('runway', { pos: [(x + px) / 2, 0, (z + pz) / 2], size: [2.4, 1.6, Math.hypot(dx, dz)], rot: [0, Math.atan2(dx, dz), 0], name: `Runway ${i + 1}`, tag: 'main' }));
          });
          const fixtures: Fixture[] = [];
          [[0, 6], ...spots].forEach(([x, z], i) => fixtures.push(makeFixture('spot', { pos: [x, 16, z], tilt: 0, beamAngle: 16, color: '#ffc21a', name: `Circle Spot ${i + 1}` })));
          fixtures.push(...fixtureRow('beam', 10, [-16, 18, 0], [16, 18, 0], { name: 'Beam', pan: 180, tilt: 35, color: '#ffffff' }));
          return { objects: [...objects, ...pa(20, 16, 18, false)], fixtures };
        },
      }),
      design({
        id: 'post-bigass', title: 'Roadside Signs', tour: 'Big Ass Stadium Tour', year: '2025', accuracy: 'reference', arenaId: 'football',
        palette: ['#ffc21a', '#ff2a2a', '#ffffff'],
        description: 'Simplified recreation of the reported concept: a main stage dressed with big roadside signs lit by LED nodes, perforated metal panels, side screens and a header screen, plus a runway.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 46, depth: 14, runway: 24, material: 'steelGrid' });
          objects.push(
            makeObject('ledHorizontal', { pos: [0, 16, -10], size: [40, 4, 0.3], name: 'Header Screen', led: { visual: 'gradient', color1: '#ffc21a', color2: '#ff2a2a' } }),
            makeObject('ledVertical', { pos: [-30, 3, 0], size: [10, 13, 0.4], name: 'Side Screen L' }),
            makeObject('ledVertical', { pos: [30, 3, 0], size: [10, 13, 0.4], name: 'Side Screen R' }),
            makeFromDef('signage', { pos: [-12, 6, -9], size: [12, 4, 0.3], name: 'Motel Sign', led: { visual: 'text', text: 'MOTEL', color1: '#ff2a2a' } }),
            makeFromDef('signage', { pos: [12, 6, -9], size: [12, 4, 0.3], name: 'Diner Sign', led: { visual: 'text', text: 'OPEN 24H', color1: '#ffc21a' } }),
            makeObject('ribbedWall', { pos: [0, 1.6, -12], size: [44, 12, 1], name: 'Perforated Metal', material: 'steelGrid' }),
            ...pa(46, 15),
          );
          const rig = standardRig(46, ['#ffc21a', '#ff2a2a', '#ffffff'], { trussY: 24, beams: 12, spots: 10 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
    ],
  },
  {
    id: 'coldplay',
    name: 'Coldplay',
    aesthetic: 'Planets, circles, color and crowd light',
    designs: [
      design({
        id: 'coldplay-spheres', title: 'Planet Stage', tour: 'Music of the Spheres World Tour', year: '2022–25', accuracy: 'reference', arenaId: 'football',
        palette: ['#ff2ad4', '#ffc21a', '#1ae0ff'],
        description: 'Simplified recreation: a rounded main stage with circular screens, a long runway to a B-stage and a small C-stage, with planets hanging above a color-drenched stadium.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, shape: 'circle', width: 26, depth: 26, runway: 36, bstage: true });
          objects.push(
            makeObject('ledCircle', { pos: [-22, 6, -6], size: [14, 14, 0.4], name: 'Circle Screen L', led: { visual: 'plasma', color1: '#ff2ad4', color2: '#ffc21a' } }),
            makeObject('ledCircle', { pos: [22, 6, -6], size: [14, 14, 0.4], name: 'Circle Screen R', led: { visual: 'plasma', color1: '#1ae0ff', color2: '#ff2ad4' } }),
            makeObject('sphere', { pos: [-10, 18, 10], size: [6, 6, 6], name: 'Planet', material: { preset: 'neon', emissive: '#ff7a1a', emissiveIntensity: 1.5 } }),
            makeObject('sphere', { pos: [12, 20, 20], size: [4, 4, 4], name: 'Planet', material: { preset: 'neon', emissive: '#1ae0ff', emissiveIntensity: 1.5 } }),
            makeObject('torus', { pos: [12, 20, 20], size: [8, 0.6, 8], rot: [0.4, 0, 0], name: 'Planet Ring', material: 'gold' }),
            makeObject('circlePlatform', { pos: [26, 0, 50], size: [6, 1.6, 6], name: 'C-Stage', tag: 'main' }),
            ...pa(30, 16),
          );
          const rig = standardRig(30, ['#ff2ad4', '#ffc21a', '#1ae0ff'], { trussY: 26, beams: 14, lasers: 6 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures, atmosphere: { haze: 0.8 } };
        },
      }),
    ],
  },
  {
    id: 'edsheeran',
    name: 'Ed Sheeran',
    aesthetic: 'In-the-round, one performer, giant screens',
    designs: [
      design({
        id: 'ed-math', title: 'Round Revolving Stage', tour: 'The Mathematics Tour (+–=÷×)', year: '2022–25', accuracy: 'reference', arenaId: 'football',
        palette: ['#ffffff', '#ff7a1a', '#1a5cff'],
        description: 'Simplified recreation: a circular revolving stage in the center of the stadium surrounded by towers carrying large hanging screens, so every seat faces the show.',
        make: () => {
          const objects: StageObject[] = [
            makeObject('circlePlatform', { pos: [0, 0, 40], size: [22, 1.6, 22], name: 'Round Stage', tag: 'main' }),
            makeObject('rotatingPlatform', { pos: [0, 1.6, 40], size: [14, 0.3, 14], name: 'Revolve', material: 'glossBlack' }),
          ];
          ring(6, 18, 40, (x, z, a, i) => {
            objects.push(makeObject('trussTower', { pos: [x, 0, z], size: [1.2, 26, 1.2], name: `Tower ${i + 1}` }));
            objects.push(makeObject('ledHanging', { pos: [x * 0.8, 16, 40 + (z - 40) * 0.8], rot: [0, a + Math.PI, 0], size: [10, 7, 0.4], name: `Screen ${i + 1}`, led: { visual: 'gradient', color1: '#ff7a1a', color2: '#1a5cff' } }));
            objects.push(makeFromDef('lineArray', { pos: [x * 0.9, 20, 40 + (z - 40) * 0.9], rot: [0, a + Math.PI, 0] }));
          });
          const fixtures: Fixture[] = [];
          ring(12, 14, 40, (x, z, a, i) => fixtures.push(makeFixture(i % 2 ? 'beam' : 'spot', { pos: [x, 24, z], pan: deg(a) + 180, tilt: 20, color: '#ffffff', name: `Ring ${i + 1}` })));
          return { objects, fixtures };
        },
      }),
    ],
  },
  {
    id: 'rihanna',
    name: 'Rihanna',
    aesthetic: 'Floating structures, stark contrast',
    designs: [
      design({
        id: 'rihanna-anti', title: 'Floating Bridge', tour: 'Anti World Tour', year: '2016', accuracy: 'reference', arenaId: 'basketball',
        palette: ['#ffffff', '#ff1010', '#1a5cff'],
        description: 'Simplified recreation: a long suspended bridge that floats over the floor crowd, connecting the main stage to the back of the arena.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 24, depth: 12 });
          objects.push(makeObject('catwalk', { pos: [0, 6, 16], size: [3, 0.4, 30], name: 'Floating Bridge', material: 'frosted', motion: 'bob', motionSpeed: 0.25 }), makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [24, 10, 0.3], led: { visual: 'minimal', color1: '#ffffff', color2: '#000000' } }), ...pa(24));
          const rig = standardRig(24, ['#ffffff', '#ff1010', '#1a5cff'], { trussY: 18 });
          rig.fixtures.push(...fixtureRow('spot', 6, [0, 16, 4], [0, 16, 30], { name: 'Bridge Spot', tilt: 0, color: '#ffffff' }));
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
    ],
  },
  {
    id: 'badbunny',
    name: 'Bad Bunny',
    aesthetic: 'Island scenery, casita on a B-stage, party energy',
    designs: [
      design({
        id: 'bb-casita', title: 'La Casita', tour: 'Debí Tirar Más Fotos residency', year: '2025', accuracy: 'reference', arenaId: 'football',
        palette: ['#ff7a1a', '#7dff4d', '#ff2ad4'],
        description: 'Simplified recreation: a main stage with green hills and a little house — the “casita” — on a satellite stage out in the crowd, where the party moves mid-show.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 40, depth: 14, material: 'wood' });
          objects.push(
            makeObject('mountain', { pos: [-14, 1.6, -9], size: [16, 9, 8], material: { preset: 'white', color: '#2f6b2f' }, name: 'Hill' }),
            makeObject('mountain', { pos: [12, 1.6, -10], size: [18, 11, 8], material: { preset: 'white', color: '#2a5a2a' }, name: 'Hill' }),
            makeObject('platform', { pos: [18, 0, 42], size: [12, 1.6, 12], name: 'Casita Stage', tag: 'main' }),
            makeObject('cube', { pos: [18, 1.6, 40], size: [6, 3.5, 5], name: 'Casita', material: { preset: 'white', color: '#ff9ab0' } }),
            makeObject('pyramid', { pos: [18, 5.1, 40], size: [7, 1.6, 6], name: 'Casita Roof', material: { preset: 'white', color: '#e8e8e6' } }),
            makeObject('tree', { pos: [14, 1.6, 44], size: [3, 5, 3], material: { preset: 'white', color: '#2f6b2f' } }),
            ...pa(40, 16),
          );
          const rig = standardRig(40, ['#ff7a1a', '#7dff4d', '#ff2ad4'], { trussY: 22, beams: 12 });
          rig.fixtures.push(...fixtureRow('wash', 4, [12, 12, 36], [24, 12, 48], { name: 'Casita Wash', tilt: 10, color: '#ffc78a' }));
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
    ],
  },
  {
    id: 'olivia',
    name: 'Olivia Rodrigo',
    aesthetic: 'Punk-pop theatre, flying moon, purple haze',
    designs: [
      design({
        id: 'olivia-guts', title: 'Flying Moon', tour: 'GUTS World Tour', year: '2024', accuracy: 'reference', arenaId: 'basketball',
        palette: ['#9b2aff', '#ff2a4a', '#ffffff'],
        description: 'Simplified recreation: an end stage with a runway and a crescent moon that flies out over the crowd with the performer on it.',
        make: () => {
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: 24, depth: 12, runway: 16 });
          objects.push(
            makeObject('ring', { pos: [0, 10, 18], size: [7, 7, 1.2], rot: [0, 0, 0.6], name: 'Crescent Moon', material: { preset: 'neon', emissive: '#ffe6c8', emissiveIntensity: 2 }, motion: 'bob', motionSpeed: 0.3 }),
            makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [24, 10, 0.3], led: { visual: 'space', color1: '#9b2aff', color2: '#ff2a4a' } }),
            ...pa(24),
          );
          const rig = standardRig(24, ['#9b2aff', '#ff2a4a', '#ffffff'], { trussY: 18 });
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures, atmosphere: { haze: 0.85 } };
        },
      }),
    ],
  },
  ...inspiredArtists(),
];

/** Artists with original, style-inspired designs (no specific tour claimed). */
function inspiredArtists(): Artist[] {
  const simple = (id: string, name: string, aesthetic: string, title: string, arenaId: string, palette: Palette, description: string, extra: (objs: StageObject[]) => void, opts: Partial<typeof DEFAULT_STAGE> = {}, rigOpts: Parameters<typeof standardRig>[2] = {}): Artist => ({
    id,
    name,
    aesthetic,
    designs: [
      design({
        id: `${id}-1`, title, tour: 'Artist-inspired', year: '—', accuracy: 'inspired', arenaId, palette, description: `Original design: ${description}`,
        make: () => {
          const w = opts.width ?? 28;
          const objects = buildMainStage({ ...DEFAULT_STAGE, width: w, ...opts });
          extra(objects);
          objects.push(...pa(w));
          const rig = standardRig(w, palette, rigOpts);
          return { objects: [...objects, ...rig.objects], fixtures: rig.fixtures };
        },
      }),
    ],
  });
  return [
    simple('frank', 'Frank Ocean', 'Minimal, intimate walkways and raw light', 'Light Walkway', 'festival', ['#ffffff', '#ffd7a3', '#1a5cff'], 'a bare white runway cutting through the crowd with only scaffold and stark light.', (o) => o.push(makeObject('runway', { pos: [0, 0, 22], size: [2.5, 1.4, 44], material: 'white', tag: 'main' }), makeObject('scaffold', { pos: [0, 1.4, -8], size: [16, 10, 2] })), { width: 14, depth: 8, material: 'white', height: 1.4 }, { beams: 0, floor: 0, wash: 2 }),
    simple('tyler', 'Tyler, The Creator', 'Playful sets and bold color worlds', 'Lakeside Scene', 'amphi', ['#ff6b9d', '#7dff4d', '#1ae0ff'], 'a pastel landscape with a water-screen lake, a wooden boat and a painted sky.', (o) => o.push(makeObject('ledFloor', { pos: [0, 1.6, -3], size: [16, 0.12, 6], name: 'Lake', led: { visual: 'water' } }), makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [24, 10, 0.3], led: { visual: 'clouds', color1: '#ff6b9d', color2: '#ffffff' } }), makeObject('wedge', { pos: [6, 1.6, -3], size: [3, 1, 5], name: 'Boat', material: 'wood' }), makeObject('tree', { pos: [-9, 1.6, -7], size: [4, 7, 4], material: { preset: 'white', color: '#3b7a3b' } })), { width: 24, material: 'wood' }),
    simple('gambino', 'Childish Gambino', 'Immersive projection, raw theatrical light', 'Projection Dome', 'basketball', ['#ffffff', '#ff7a1a', '#1a5cff'], 'a wrap-around curved screen hugging a round stage under a bright halo.', (o) => o.push(makeObject('ledCurved', { pos: [0, 1, -12], size: [32, 12, 10], led: { visual: 'particles' } }), makeObject('torus', { pos: [0, 12, -5], size: [8, 0.6, 8], material: { preset: 'neon', emissive: '#ffffff', emissiveIntensity: 3 } })), { shape: 'circle', width: 14, depth: 14, material: 'concrete' }),
    simple('gaga', 'Lady Gaga', 'Gothic opera, multi-level theatre', 'Opera House', 'megadome', ['#ff1010', '#ffd7a3', '#ffffff'], 'a gothic multi-level opera-house set with arches, red drapes and staircases.', (o) => o.push(makeObject('arch', { pos: [0, 4.8, -12], size: [16, 14, 1], material: 'gold' }), makeFromDef('kabuki', { pos: [0, 1.6, -13], size: [28, 16, 0.5] }), makeFromDef('decoStairs', { pos: [0, 1.6, -3], size: [8, 3.2, 5], material: 'glossBlack' }), makeObject('column', { pos: [-10, 1.6, -8], size: [1.4, 14, 1.4], material: 'concrete' }), makeObject('column', { pos: [10, 1.6, -8], size: [1.4, 14, 1.4], material: 'concrete' })), { levels: 3, depth: 16, material: 'glossBlack' }),
    simple('billie', 'Billie Eilish', 'In-the-round intimacy, hovering cubes', 'Hovering Cube', 'basketball', ['#1aff9c', '#1a5cff', '#ffffff'], 'an in-the-round square stage under a hovering LED cube that rises and falls.', (o) => o.push(makeObject('ledCube', { pos: [0, 12, -6], size: [8, 4, 8], led: { visual: 'noise', color1: '#1aff9c', color2: '#000000' }, motion: 'bob', motionSpeed: 0.3 })), { shape: 'rect', width: 14, depth: 14, stairs: false }),
    simple('sabrina', 'Sabrina Carpenter', 'Retro glam, hearts and sparkle', 'Retro Revue', 'basketball', ['#ff6b9d', '#ffc21a', '#ffffff'], 'a retro TV-show set with grand stairs, a heart-shaped glow and pastel color.', (o) => o.push(makeFromDef('decoStairs', { pos: [0, 1.6, -5], size: [10, 3.2, 5], material: 'white' }), makeObject('ring', { pos: [0, 8, -9], size: [9, 9, 0.5], material: { preset: 'neon', emissive: '#ff6b9d', emissiveIntensity: 2.5 } }), makeObject('ledWall', { pos: [0, 1.6, -11.6], size: [26, 10, 0.3], led: { visual: 'gradient', color1: '#ff6b9d', color2: '#ffc21a' } })), { width: 26, material: 'white' }),
    simple('bieber', 'Justin Bieber', 'Clean pop architecture', 'Pop Grid', 'megadome', ['#1a5cff', '#ffffff', '#ff2ad4'], 'a glossy white multi-level stage framed by a grid of LED panels.', (o) => [-15, -5, 5, 15].forEach((x) => o.push(makeObject('ledVertical', { pos: [x, 1.6, -10], size: [6, 12, 0.3] }))), { levels: 2, width: 32, material: 'white' }),
    simple('ariana', 'Ariana Grande', 'Celestial curves and soft light', 'Half Moon', 'megadome', ['#c0c0ff', '#ffffff', '#ff6b9d'], 'a giant half-moon sphere behind a curved white stage.', (o) => o.push(makeObject('halfSphere', { pos: [0, 1.6, -12], rot: [Math.PI / 2, 0, 0], size: [18, 9, 18], material: { preset: 'white', emissive: '#dfe6ff', emissiveIntensity: 0.6 }, name: 'Half Moon' })), { shape: 'circle', width: 22, depth: 22, material: 'white' }),
    simple('harry', 'Harry Styles', 'Joyful color, rainbow light', 'Rainbow Runway', 'football', ['#ff2a4a', '#ffc21a', '#1ae0ff'], 'a bright end stage with rainbow light bars and a long runway to the center.', (o) => o.push(makeObject('ledHorizontal', { pos: [0, 12, -8], size: [36, 3, 0.3], led: { visual: 'bars', color1: '#ff2a4a', color2: '#1ae0ff' } })), { width: 36, runway: 30, bstage: true }, { floor: 10 }),
    simple('sza', 'SZA', 'Oceanic dreamscape', 'Ocean Stage', 'megadome', ['#1ae0ff', '#0a3d91', '#ffc21a'], 'an ocean world with a water LED floor, a diving-board walkway and a lighthouse.', (o) => o.push(makeObject('ledFloor', { pos: [0, 1.6, -2], size: [22, 0.12, 8], led: { visual: 'water' } }), makeObject('catwalk', { pos: [8, 4, 4], size: [1.5, 0.3, 8], name: 'Diving Board' }), makeObject('column', { pos: [-12, 1.6, -8], size: [2.4, 14, 2.4], material: 'white', name: 'Lighthouse' })), { width: 30, material: 'white' }),
    simple('doja', 'Doja Cat', 'Surreal, dark couture', 'Scarlet Cage', 'basketball', ['#ff1010', '#ffffff', '#9b2aff'], 'a surreal red-lit stage with a giant chrome sculpture and a cage frame.', (o) => o.push(makeObject('sculpture', { pos: [0, 4, -8], size: [10, 10, 4], material: 'chrome' }), makeObject('cubeFrame', { pos: [0, 1.6, -2], size: [8, 8, 8], material: 'matteBlack' })), { width: 26 }),
    simple('carti', 'Playboi Carti', 'Rage, red light, heavy strobes', 'Rage Pit', 'warehouse', ['#ff1010', '#ffffff', '#000000'], 'a low black stage in a warehouse with walls of strobes and red beams.', (o) => o.push(makeObject('scaffold', { pos: [0, 1, -8], size: [20, 9, 2] })), { width: 20, height: 1, material: 'matteBlack' }, { strobes: 8, beams: 12 }),
    simple('jcole', 'J. Cole', 'Grounded, warm, storytelling', 'Front Porch', 'basketball', ['#ffd7a3', '#ff7a1a', '#ffffff'], 'a warm wooden set with a porch, a single tree and amber light.', (o) => o.push(makeObject('platform', { pos: [0, 1.6, -6], size: [10, 0.8, 4], material: 'wood', name: 'Porch' }), makeObject('tree', { pos: [9, 1.6, -6], size: [5, 9, 5], material: { preset: 'white', color: '#3b5a2b' } })), { width: 24, material: 'wood' }),
    simple('jayz', 'Jay-Z', 'Monumental, black and gold', 'Black & Gold', 'football', ['#d9a740', '#ffffff', '#000000'], 'a black stage with gold arches, a huge screen and a long runway.', (o) => o.push(makeObject('arch', { pos: [0, 1.6, -6], size: [26, 16, 1], material: 'gold' }), makeObject('ledWall', { pos: [0, 1.6, -13.6], size: [44, 14, 0.4], led: { visual: 'minimal', color1: '#d9a740' } })), { width: 44, runway: 30 }),
    simple('wayne', 'Lil Wayne', 'Playful, neon, swamp funk', 'Neon Swamp', 'festival', ['#7dff4d', '#9b2aff', '#ffc21a'], 'a neon festival stage with swamp trees and a glowing skyline.', (o) => o.push(makeObject('tree', { pos: [-14, 2, -8], size: [6, 10, 6], material: { preset: 'neon', emissive: '#7dff4d', emissiveIntensity: 0.6 } }), makeObject('ledWall', { pos: [0, 2, -13.6], size: [34, 12, 0.4], led: { visual: 'skyline', color1: '#7dff4d', color2: '#100018' } })), { width: 34, height: 2 }),
  ];
}

export const ALL_DESIGNS: (ArtistDesign & { artist: string })[] = ARTISTS.flatMap((a) => a.designs.map((d) => ({ ...d, artist: a.name })));

import type { Fixture, StageObject } from '../../types';
import { O, D, F, endStage, walk, disc, screen, imag, pa, paRing, ringFixtures, around, rig, fixtureRow, deg } from './kit';
import { tour, type Tour } from './types';
import type { Palette } from '../sceneGen';

const S = (label: string, url: string) => ({ label, url });

/** Original inspired concept on an end stage, with a distinct set piece per artist. */
function concept(id: string, artistId: string, title: string, year: number, arenaId: string, palette: Palette, description: string, features: string[], extra: (o: StageObject[], f: Fixture[]) => void, w = 28, d = 12, mat = 'glossBlack'): Tour {
  return tour({
    id, artistId, title, year, era: 'recent', accuracy: 'inspired', venueType: arenaId === 'football' ? 'stadium' : arenaId === 'festival' ? 'festival' : 'arena', arenaId, palette,
    description: `${description} Original concept — not a recreation of a real stage.`, features, sources: [],
    make: () => {
      const objects = [...endStage(w, d, 1.6, mat)];
      const r = rig(w, palette, { beams: 10 });
      extra(objects, r.fixtures);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  });
}

export const OTHER_TOURS: Tour[] = [
  /* ---------------- Metallica ---------------- */
  tour({
    id: 'met-m72', artistId: 'metallica', title: 'M72 World Tour', year: 2023, yearLabel: '2023–26', era: 'stadium', accuracy: 'documented', designers: 'Metallica creative team; Meyer Sound PA', venueType: 'stadium', arenaId: 'football',
    palette: ['#ffffff', '#ff1010', '#ffc21a'],
    description: 'Metallica’s first in-the-round stadium stage: a ring-shaped stage around the “Snake Pit” fan area (about 1,000 fans) in the middle, eight ~30 m cylindrical towers carrying video, PA and lighting, a suspension grid over the stage for near-field PA, and four drum kits spaced around the ring.',
    features: ['Ring stage around the Snake Pit (documented)', 'Eight ~30 m towers with video/PA/lights (documented)', 'Four drum kits around the ring (documented)'],
    sources: [S('ProSoundWeb: Meyer Sound in the round', 'https://www.prosoundweb.com/meyer-sound-delivers-for-metallica-in-the-round/'), S('ROE Visual: M72 World Tour', 'https://roevisual.com/en/news-and-events/news/metallica-m72-world-tour'), S('Blabbermouth: four drum sets', 'https://blabbermouth.net/news/lars-ulrich-explains-why-he-uses-four-drum-sets-during-metallicas-m72-tour')],
    make: () => {
      const cz = 40;
      const objects: StageObject[] = [O('ringStage', { pos: [0, 0, cz], size: [34, 2, 34], name: 'Ring Stage', material: 'matteBlack', tag: 'main' }), O('ledFloor', { pos: [0, 0.05, cz], size: [16, 0.1, 16], name: 'Snake Pit', led: { visual: 'off' } })];
      around(4, 14.5, cz, (x, z, a) => objects.push(D('riser', { pos: [x, 2, z], rot: [0, a, 0], size: [3, 0.6, 2.4], name: 'Drum Riser' })));
      around(8, 34, cz, (x, z, a, i) => {
        objects.push(O('ledCylinder', { pos: [x, 0, z], size: [5, 30, 5], name: `Tower ${i + 1}`, led: { visual: 'noise', color1: '#ffffff', color2: '#000000' } }));
        objects.push(D('lineArray', { pos: [x * 0.92, 24, cz + (z - cz) * 0.92], rot: [0, a + Math.PI, 0], name: `Tower PA ${i + 1}` }));
      });
      objects.push(O('circleTruss', { pos: [0, 16, cz], size: [30, 0.8, 30], name: 'Suspension Grid' }));
      const fixtures: Fixture[] = [...ringFixtures(16, 15, cz, 15.6, '#ffffff'), ...ringFixtures(8, 33, cz, 29, '#ff1010', ['beam'], 40)];
      return { objects, fixtures, atmosphere: { haze: 0.85 } };
    },
  }),
  /* ---------------- Ed Sheeran ---------------- */
  tour({
    id: 'ed-math', artistId: 'edsheeran', title: 'The Mathematics Tour (+–=÷×)', year: 2022, yearLabel: '2022–25', era: 'stadium', accuracy: 'documented', designers: 'Mark Cunniffe (production design)', venueType: 'stadium', arenaId: 'football',
    palette: ['#ffffff', '#ff7a1a', '#1a5cff'],
    description: 'A revolving 90 m² LED stage in the centre of the stadium under a 462 m² transparent 360° “halo” screen that moves up and down, with six double-sided guitar-pick-shaped IMAG screens hung from 30 m masts on a cable net.',
    features: ['Revolving central LED stage (documented)', 'Moving 360° halo screen (documented)', 'Six guitar-pick screens on 30 m masts (documented)'],
    sources: [S('Live Design: first look', 'https://www.livedesignonline.com/concerts/first-look-gallery-ed-sheerans-mathematics-tour'), S('ROE Visual: Mathematics Tour', 'https://roevisual.com/us-en/projects/ed-sheeran-mathematics-tour'), S('disguise case study', 'https://www.disguise.one/en/insights/case-studies/ed-sheeran-tour')],
    make: () => {
      const cz = 40;
      const objects: StageObject[] = [O('circlePlatform', { pos: [0, 0, cz], size: [16, 1.6, 16], name: 'Stage Base', tag: 'main' }), O('rotatingPlatform', { pos: [0, 1.6, cz], size: [10.7, 0.25, 10.7], name: 'Revolving LED Stage', material: 'led', led: { visual: 'gradient', color1: '#ff7a1a', color2: '#1a5cff' } }), O('ledCylinder', { pos: [0, 14, cz], size: [22, 6, 22], name: '360° Halo Screen', motion: 'bob', motionSpeed: 0.2, led: { visual: 'gradient', color1: '#ffffff', color2: '#ff7a1a' } })];
      around(6, 26, cz, (x, z, a, i) => {
        objects.push(O('trussTower', { pos: [x, 0, z], size: [1.2, 30, 1.2], name: `Mast ${i + 1}` }));
        objects.push(O('ledCircle', { pos: [x * 0.82, 15, cz + (z - cz) * 0.82], rot: [0, a + Math.PI, 0], size: [10, 12, 0.4], name: `Pick Screen ${i + 1}`, led: { visual: 'clouds', color1: '#ff7a1a', color2: '#ffffff' } }));
      });
      objects.push(...paRing(6, 20, cz, 22));
      return { objects, fixtures: ringFixtures(12, 14, cz, 24, '#ffffff'), atmosphere: { haze: 0.6 } };
    },
  }),
  /* ---------------- Coldplay ---------------- */
  tour({
    id: 'cp-mots', artistId: 'coldplay', title: 'Music of the Spheres World Tour', year: 2022, yearLabel: '2022–25', era: 'stadium', accuracy: 'documented', designers: 'TAIT (staging); Sooner Routhier (lighting)', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff2ad4', '#ffc21a', '#1ae0ff'],
    description: 'A neon-lit circular main stage (about 60×27 m with a thrust) leading to an LED B-stage and a separate C-stage, two 14 m circular IMAG screens beside the stage, a semicircular “moonrise” screen, four inflatable spherical screens and rings of light around the band.',
    features: ['Circular main stage + thrust (documented)', 'LED B-stage and separate C-stage (documented)', 'Two 14 m circular screens (documented)', 'Four inflatable sphere screens (documented)'],
    sources: [S('TAIT: Music of the Spheres', 'https://www.taittowers.com/work/coldplay-music-of-the-spheres-tour'), S('Live Design: Sooner Routhier lighting', 'https://www.livedesignonline.com/concerts/sooner-routhier-creates-heavenly-lighting-design-coldplay')],
    make: () => {
      const objects: StageObject[] = [O('semicircle', { pos: [0, 0, -6], size: [60, 1.8, 27], name: 'Circular Main Stage', tag: 'main' }), walk(0, 7, 0, 36, 3, 1.8), O('ledFloor', { pos: [0, 0, 40], size: [10, 1.8, 10], name: 'LED B-Stage', tag: 'main', led: { visual: 'plasma' } }), disc(26, 56, 7, 1.6, 'glossBlack', 'C-Stage'), ...imag(36, 4, -2, 14, 14, 'plasma', '#ff2ad4', '#ffc21a', true), O('ledCircle', { pos: [0, 2, -18], size: [22, 11, 0.4], name: 'Moonrise Screen', led: { visual: 'eclipse', color1: '#ffc21a', color2: '#000010' } })];
      [[-14, 22, 12], [14, 20, 18], [-8, 18, 32], [10, 22, 40]].forEach(([x, y, z], i) => objects.push(O('ledSphere', { pos: [x, y, z], size: [5, 5, 5], name: `Inflatable Sphere ${i + 1}`, motion: 'bob', motionSpeed: 0.3, led: { visual: i % 2 ? 'earth' : 'space', resolution: 0 } })));
      objects.push(O('ring', { pos: [0, 10, -6], size: [20, 20, 0.6], name: 'Light Ring', material: { preset: 'neon', emissive: '#ff2ad4', emissiveIntensity: 2.5 } }));
      const r = rig(40, ['#ff2ad4', '#ffc21a', '#1ae0ff'], { trussY: 26, beams: 14, lasers: 6 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.8 } };
    },
  }),
  /* ---------------- Dua Lipa ---------------- */
  tour({
    id: 'dl-ro', artistId: 'dua', title: 'Radical Optimism Tour', year: 2024, yearLabel: '2024–25', era: 'world', accuracy: 'documented', designers: 'Matt Pitman (Pixelmappers); TAIT; MSA (automation)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#1a5cff', '#1ae0ff', '#ffffff'],
    description: 'Automated concentric rings with a flying performer platform at their centre, two 8 m and 5 m “astrolabe” LED rings, six lighting pods and a “puck” on which Dua flew above the stage; an elongated runway with fluid curves echoed the album’s water motif.',
    features: ['Concentric automated rings (documented)', '8 m & 5 m astrolabe LED rings (documented)', 'Flying “puck” platform (documented)', 'Six lighting pods (documented)'],
    sources: [S('TAIT: Radical Optimism', 'https://www.taittowers.com/work/dua-lipa-radical-optimism'), S('Live Design: MSA automation', 'https://www.livedesignonline.com/news/msa-supplies-radical-automation-dua-lipa-tour'), S('Wikipedia', 'https://en.wikipedia.org/wiki/Radical_Optimism_Tour')],
    make: () => {
      const objects: StageObject[] = [disc(0, -6, 18), O('ringStage', { pos: [0, 0, -6], size: [26, 1.2, 26], name: 'Outer Ring', material: 'glossBlack', tag: 'main' }), O('ring', { pos: [0, 9, -6], size: [8, 8, 0.4], rot: [0.4, 0, 0], name: '8 m Astrolabe Ring', material: { preset: 'neon', emissive: '#1ae0ff', emissiveIntensity: 2.5 }, motion: 'bob', motionSpeed: 0.4 }), O('ring', { pos: [0, 10, -6], size: [5, 5, 0.3], rot: [-0.3, 0.6, 0], name: '5 m Astrolabe Ring', material: { preset: 'neon', emissive: '#ffffff', emissiveIntensity: 2.5 }, motion: 'bob', motionSpeed: 0.6 }), D('floatingRound', { pos: [0, 6, -6], size: [3, 0.4, 3], name: 'Flying Puck', motion: 'bob', motionSpeed: 0.5 }), O('curvedRunway', { pos: [8, 0, 10], size: [16, 1.6, 16], name: 'Curved Runway', tag: 'main' }), screen(0, 1.6, -20, 30, 9, 'water', '#0a3d91', '#1ae0ff', { kind: 'ledCurved', size: [30, 9, 5] })];
      around(6, 11, -6, (x, z, a, i) => objects.push(O('cylinder', { pos: [x, 13, z], size: [2.4, 1.2, 2.4], name: `Lighting Pod ${i + 1}`, material: 'aluminum', motion: 'bob', motionSpeed: 0.3 + i * 0.05 })));
      const fixtures = ringFixtures(6, 11, -6, 12.6, '#1ae0ff', ['wash']);
      const r = rig(24, ['#1a5cff', '#1ae0ff', '#ffffff'], { trussY: 20, beams: 10, spots: 6 }, 14);
      return { objects: [...objects, ...r.objects], fixtures: [...fixtures, ...r.fixtures], atmosphere: { haze: 0.8 } };
    },
  }),
  /* ---------------- Lady Gaga ---------------- */
  tour({
    id: 'lg-mayhem', artistId: 'gaga', title: 'The Mayhem Ball', year: 2025, yearLabel: '2025–26', era: 'current', accuracy: 'documented', designers: 'Es Devlin & Jason Ardizzone-West', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#d9a740', '#ffffff'],
    description: 'A Colosseum-like gothic opera house whose balconies and boxes hold Gaga, the band and 22 dancers, with a pendulum-shaped catwalk reaching into the crowd. The structure transforms with LED and finally “burns” in flames at the finale.',
    features: ['Opera-house set with balconies & boxes (documented)', 'Pendulum-shaped catwalk (documented)', 'Burning finale (documented)'],
    sources: [S('The Mayhem Ball — Wikipedia', 'https://en.wikipedia.org/wiki/The_Mayhem_Ball'), S('Paste: Mayhem Ball at MSG', 'https://www.pastemagazine.com/music/lady-gaga/lady-gaga-mayhem-ball-madison-square-garden')],
    make: () => {
      const objects: StageObject[] = [...endStage(30, 12, 1.6, 'matteBlack'), walk(0, 0, 0, 14, 2.4), disc(0, 18, 7, 1.6, 'glossBlack', 'Pendulum Bob')];
      for (let lvl = 0; lvl < 3; lvl++) for (let i = -2; i <= 2; i++) {
        const x = i * 5.6, y = 1.6 + lvl * 4.2, z = -12 + Math.abs(i) * 1.2;
        objects.push(O('platform', { pos: [x, y, z], size: [5, 0.4, 2.4], material: 'gold', name: `Opera Box L${lvl + 1}` }), O('arch', { pos: [x, y + 0.4, z - 1], size: [5, 3.6, 0.5], material: { preset: 'concrete', color: '#8a7a6a' } }), O('railing', { pos: [x, y + 0.4, z + 1.1], size: [4.6, 1.1, 0.1], material: 'gold' }));
      }
      objects.push(D('kabuki', { pos: [0, 1.6, -15], size: [34, 16, 0.5] }));
      const r = rig(30, ['#ff1010', '#d9a740', '#ffffff'], { trussY: 20 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.8 } };
    },
  }),
  /* ---------------- Billie Eilish ---------------- */
  tour({
    id: 'be-hmhas', artistId: 'billie', title: 'Hit Me Hard and Soft: The Tour', year: 2024, yearLabel: '2024–25', era: 'current', accuracy: 'documented', designers: 'Moment Factory (production design, content, show direction)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#1a5cff', '#ffffff', '#1aff9c'],
    description: 'In the round: a long rectangular stage splitting the arena, an enormous LED floor synced to music and light, a large cube at the centre that glows as the show begins, lighting columns hanging from the rafters, band members in sunken pits at either side and an elevating mini-stage.',
    features: ['Long in-the-round stage with LED floor (documented)', 'Central glowing cube (documented)', 'Hanging lighting columns (documented)', 'Sunken band pits (documented)'],
    sources: [S('Wikipedia', 'https://en.wikipedia.org/wiki/Hit_Me_Hard_and_Soft:_The_Tour'), S('Moment Factory', 'https://momentfactory.com/products/billie-eilish-hit-me-hard-and-soft-the-tour'), S('Riff: review', 'https://riffmagazine.com/reviews/billie-eilish-20241210')],
    make: () => {
      const cz = 16;
      const objects: StageObject[] = [O('ledFloor', { pos: [0, 0, cz], size: [36, 1.4, 9], name: 'LED Stage Floor', tag: 'main', led: { visual: 'water', color1: '#1a5cff', color2: '#ffffff' } }), O('ledCube', { pos: [0, 1.4, cz], size: [4, 4, 4], name: 'Central Cube', led: { visual: 'solid', color1: '#ffffff' } }), O('lift', { pos: [12, 1.4, cz], size: [3, 0.6, 3], name: 'Elevating Mini-Stage' }), O('platform', { pos: [-22, -1.2, cz], size: [6, 1.2, 6], name: 'Band Pit L', material: 'matteBlack' }), O('platform', { pos: [22, -1.2, cz], size: [6, 1.2, 6], name: 'Band Pit R', material: 'matteBlack' })];
      for (let i = 0; i < 10; i++) objects.push(O('ledPillar', { pos: [-16 + i * 3.6, 12, cz + (i % 2 ? 6 : -6)], size: [0.6, 6, 0.6], name: 'Hanging Light Column', motion: 'bob', motionSpeed: 0.2 + i * 0.03, led: { visual: 'minimal', color1: '#ffffff' } }));
      return { objects: [...objects, ...paRing(4, 16, cz, 16)], fixtures: ringFixtures(16, 18, cz, 20, '#1a5cff'), atmosphere: { haze: 0.7 } };
    },
  }),
  /* ---------------- Olivia Rodrigo ---------------- */
  tour({
    id: 'or-guts', artistId: 'olivia', title: 'GUTS World Tour', year: 2024, yearLabel: '2024–25', era: 'current', accuracy: 'documented', designers: 'Moment Factory (creative & show direction)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#9b2aff', '#ff2a4a', '#ffffff'],
    description: 'A stage built around her butterfly logo, a car-sized flying crescent moon that carries her around the arena, giant twinkling stars floating over the audience and mobile blocks that rise from the centre platform.',
    features: ['Flying crescent moon (documented)', 'Floating stars over the crowd (documented)', 'Rising blocks (documented)', 'Butterfly-shaped stage (documented motif)'],
    sources: [S('Moment Factory: GUTS World Tour', 'https://momentfactory.com/products/olivia-rodrigo-guts-world-tour'), S('Rolling Stone: opening night', 'https://www.rollingstone.com/music/music-live-reviews/olivia-rodrigo-guts-world-tour-review-opening-night-1234974993')],
    make: () => {
      const wing: [number, number][] = [[0, -0.1], [0.2, -0.5], [0.5, -0.4], [0.45, 0], [0.5, 0.4], [0.2, 0.5], [0, 0.15], [-0.2, 0.5], [-0.5, 0.4], [-0.45, 0], [-0.5, -0.4], [-0.2, -0.5]];
      const objects: StageObject[] = [O('custom', { pos: [0, 0, -6], size: [28, 1.6, 14], outline: wing, name: 'Butterfly Stage', tag: 'main' }), walk(0, 1, 0, 14), O('ring', { pos: [0, 10, 18], size: [7, 7, 1.2], rot: [0, 0, 0.6], name: 'Crescent Moon', material: { preset: 'neon', emissive: '#ffe6c8', emissiveIntensity: 2 }, motion: 'bob', motionSpeed: 0.3 }), screen(0, 1.6, -13.6, 26, 10, 'space', '#9b2aff', '#ff2a4a')];
      for (let i = 0; i < 6; i++) objects.push(O('lift', { pos: [-7.5 + i * 3, 1.6, -6], size: [2, 0.6, 2], name: `Rising Block ${i + 1}`, motionSpeed: 0.4 + i * 0.1 }));
      for (let i = 0; i < 8; i++) objects.push(O('sphere', { pos: [-14 + i * 4, 12 + (i % 3), 14 + (i % 2) * 8], size: [1.2, 1.2, 1.2], name: 'Floating Star', material: { preset: 'neon', emissive: '#fff4c8', emissiveIntensity: 3 }, motion: 'bob', motionSpeed: 0.4 }));
      const r = rig(26, ['#9b2aff', '#ff2a4a', '#ffffff'], { trussY: 18 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.85 } };
    },
  }),
  /* ---------------- Sabrina Carpenter ---------------- */
  tour({
    id: 'sc-sns', artistId: 'sabrina', title: 'Short n’ Sweet Tour', year: 2024, yearLabel: '2024–25', era: 'current', accuracy: 'documented', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff6b9d', '#ffc21a', '#ffffff'],
    description: 'A midcentury-modern dollhouse-style home on stage with a huge staircase, a neon-lit bathroom she walks into mid-show, and a heart-shaped conversation pit connected to the main stage by a short runway.',
    features: ['Midcentury house set (documented)', 'Huge staircase (documented)', 'Heart-shaped conversation pit (documented)'],
    sources: [S('Wallpaper: why artists build homes on stage', 'https://wallpaper.com/art/music/tour-set-design-sabrina-carpenter-house-stage')],
    make: () => {
      const heart: [number, number][] = Array.from({ length: 24 }, (_, i) => {
        const t = (i / 24) * Math.PI * 2;
        return [(16 * Math.sin(t) ** 3) / 34, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 34];
      });
      const objects: StageObject[] = [...endStage(30, 14, 1.6, 'white'), O('platform', { pos: [0, 1.6, -10], size: [20, 0.4, 6], name: 'Upper Floor', material: 'wood' }), D('decoStairs', { pos: [-6, 1.6, -5], size: [6, 4.6, 6], material: 'white', name: 'Huge Staircase' }), O('cube', { pos: [8, 1.6, -9], size: [4, 4, 4], name: 'Neon Bathroom', material: { preset: 'frosted', color: '#ff6b9d', emissive: '#ff2ad4', emissiveIntensity: 1 } }), walk(0, 0, 0, 10, 2.2), O('custom', { pos: [0, 0, 14], size: [10, 1.2, 9], outline: heart, name: 'Heart Conversation Pit', material: { preset: 'white', color: '#ff9ab0' }, tag: 'main' }), screen(0, 6.4, -13.4, 20, 6, 'gradient', '#ff6b9d', '#ffc21a')];
      const r = rig(30, ['#ff6b9d', '#ffc21a', '#ffffff'], { trussY: 16 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  /* ---------------- Post Malone ---------------- */
  tour({
    id: 'pm-12c', artistId: 'postmalone', title: 'Twelve Carat Tour', year: 2022, yearLabel: '2022–23', era: 'world', accuracy: 'documented', designers: 'TAIT (staging)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffc21a', '#ffffff', '#ff7a1a'],
    description: 'Seven circular platforms linked by long runways spread across the arena floor, putting the performer inside the crowd.',
    features: ['Seven circular platforms (documented)', 'Connecting runways (documented)'],
    sources: [S('TAIT: Twelve Carat Tour', 'https://taittowers.com/work/post-malone-twelve-carat-tour')],
    make: () => {
      const objects: StageObject[] = [disc(0, 6, 12, 1.6, 'glossBlack', 'Main Circle')];
      const spots: [number, number][] = [[-12, 14], [12, 14], [-10, 28], [10, 28], [0, 34], [0, 20]];
      spots.forEach(([x, z], i) => {
        objects.push(disc(x, z, 6, 1.6, 'glossBlack', `Circle ${i + 2}`));
        const [px, pz] = i < 2 ? [0, 6] : i < 4 ? spots[i - 2] : i === 4 ? [0, 20] : [0, 6];
        objects.push(walk(px, pz, x, z, 2.4));
      });
      const fixtures: Fixture[] = [[0, 6], ...spots].map(([x, z], i) => F('spot', { pos: [x, 16, z], tilt: 0, beamAngle: 16, color: '#ffc21a', name: `Circle Spot ${i + 1}` }));
      fixtures.push(...fixtureRow('beam', 10, [-16, 18, 0], [16, 18, 0], { name: 'Beam', pan: 180, tilt: 35, color: '#ffffff' }));
      return { objects: [...objects, ...pa(20, 16, 18, false)], fixtures };
    },
  }),
  tour({
    id: 'pm-bast', artistId: 'postmalone', title: 'Big Ass Stadium Tour', year: 2025, era: 'current', accuracy: 'documented', designers: 'Dannah Gottlieb (creative director); Stufish — Ric Lipson & Rachel Duncan (production design)', venueType: 'stadium', arenaId: 'football',
    palette: ['#ffc21a', '#ff2a2a', '#ffffff'],
    description: 'Country-roadside staging: big signs lit by LED nodes, nearly 100 perforated metal sheets, side walls and header screens, and a runway that came alive for the headline set. A platform that started as a simple sign transformed into a grand stage mid-show.',
    features: ['LED-node roadside signs (documented)', 'Perforated metal panels (documented)', 'Header & side screens (documented)', 'Runway (documented)'],
    sources: [S('PRG: On the road with the Big Ass Stadium Tour', 'https://www.prg.com/en/news/on-the-road-with-post-malones-big-ass-stadium-tour'), S('Miami New Times review', 'https://www.miaminewtimes.com/music/review-post-malone-brought-big-ass-country-to-miami-hard-rock-stadium-23327793/')],
    make: () => {
      const objects: StageObject[] = [...endStage(46, 14, 1.6, 'steelGrid'), walk(0, 0, 0, 24), screen(0, 16, -10, 40, 4, 'gradient', '#ffc21a', '#ff2a2a', { kind: 'ledHorizontal', name: 'Header Screen' }), ...imag(30, 3, 0, 10, 13), D('signage', { pos: [-12, 6, -9], size: [12, 4, 0.3], name: 'Motel Sign', led: { visual: 'text', text: 'MOTEL', color1: '#ff2a2a' } }), D('signage', { pos: [12, 6, -9], size: [12, 4, 0.3], name: 'Diner Sign', led: { visual: 'text', text: 'OPEN 24H', color1: '#ffc21a' } }), O('ribbedWall', { pos: [0, 1.6, -12], size: [44, 12, 1], name: 'Perforated Metal', material: 'steelGrid' })];
      const r = rig(46, ['#ffc21a', '#ff2a2a', '#ffffff'], { trussY: 24, beams: 12, spots: 10 }, 15);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  /* ---------------- Bad Bunny ---------------- */
  tour({
    id: 'bb-wht', artistId: 'badbunny', title: 'World’s Hottest Tour', year: 2022, era: 'stadium', accuracy: 'documented', designers: 'Travis Shirley (production design); TAIT (flying island)', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff7a1a', '#1ae0ff', '#7dff4d'],
    description: 'A tropical beach world from Un Verano Sin Ti: island stages with palm trees and water-effect flooring joined by bridges, a “flying island” B-stage that travelled across the stadium, an LED sun on a tracking truss, and a palm tree that lifted him toward the upper decks.',
    features: ['Island stages joined by bridges (documented)', 'Flying island B-stage (documented)', 'LED sun on tracking truss (documented)', 'Water-effect LED floor (documented)'],
    sources: [S('TAIT: World’s Hottest Tour', 'https://www.taittowers.com/work/bad-bunny-worlds-hottest-tour'), S('LSi: Shirley thinks outside the box', 'https://lsionline.com/shirley-thinks-outside-the-box-for-bad-bunny'), S('Designboom: Puerto Rican landscape', 'https://www.designboom.com/design/bad-bunny-tour-stadium-lush-puerto-rican-landscape-sturdy-set-design/')],
    make: () => {
      const objects: StageObject[] = [...endStage(44, 16, 1.6, 'wood'), O('ledFloor', { pos: [0, 1.6, -8], size: [40, 0.12, 14], name: 'Water Floor', led: { visual: 'water', color1: '#0a3d91', color2: '#1ae0ff' } }), disc(-18, 20, 10, 1.6, 'wood', 'Island L'), disc(18, 20, 10, 1.6, 'wood', 'Island R'), walk(-8, 0, -18, 15, 2.4, 1.6, 'wood', 'Bridge L'), walk(8, 0, 18, 15, 2.4, 1.6, 'wood', 'Bridge R'), D('floatingRound', { pos: [0, 10, 34], size: [9, 1, 9], name: 'Flying Island', material: 'wood', motion: 'bob', motionSpeed: 0.25 }), O('ledCircle', { pos: [0, 18, -14], size: [10, 10, 0.4], name: 'LED Sun', motion: 'bob', motionSpeed: 0.2, led: { visual: 'solid', color1: '#ffc21a' } }), O('truss', { pos: [0, 24, -14], size: [40, 1, 1], name: 'Sun Tracking Truss' })];
      [-24, -14, 14, 24, -18, 18].forEach((x, i) => objects.push(O('tree', { pos: [x, 1.6, i < 4 ? -12 : 22], size: [4, 9, 4], material: { preset: 'white', color: '#2f6b2f' }, name: 'Palm Tree' })));
      objects.push(O('tree', { pos: [0, 10.8, 34], size: [3, 6, 3], material: { preset: 'white', color: '#2f6b2f' }, name: 'Island Palm' }));
      const r = rig(44, ['#ff7a1a', '#1ae0ff', '#7dff4d'], { trussY: 22, beams: 12 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bb-casita', artistId: 'badbunny', title: 'No Me Quiero Ir de Aquí (Puerto Rico residency)', year: 2025, era: 'current', accuracy: 'documented', designers: 'Sturdy (design)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff7a1a', '#7dff4d', '#ff2ad4'],
    description: 'A main stage shaped like a mountain facing a smaller B-stage built as “la casita” — a little Puerto Rican house where the party moves mid-show.',
    features: ['Mountain main stage (documented)', '“La casita” B-stage house (documented)'],
    sources: [S('Designboom: Bad Bunny staging', 'https://www.designboom.com/design/bad-bunny-tour-stadium-lush-puerto-rican-landscape-sturdy-set-design/')],
    make: () => {
      const objects: StageObject[] = [O('mountain', { pos: [0, 0, -8], size: [36, 8, 14], material: { preset: 'white', color: '#2f6b2f' }, name: 'Mountain Stage', tag: 'main' }), O('platform', { pos: [0, 0, -2], size: [24, 1.6, 6], name: 'Mountain Lip', tag: 'main' }), O('platform', { pos: [0, 0, 32], size: [12, 1.6, 12], name: 'Casita Stage', tag: 'main' }), O('cube', { pos: [0, 1.6, 31], size: [6, 3.5, 5], name: 'La Casita', material: { preset: 'white', color: '#ff9ab0' } }), O('pyramid', { pos: [0, 5.1, 31], size: [7, 1.6, 6], name: 'Casita Roof', material: { preset: 'white', color: '#e8e8e6' } })];
      const r = rig(30, ['#ff7a1a', '#7dff4d', '#ff2ad4'], { trussY: 18 });
      r.fixtures.push(...fixtureRow('wash', 4, [-6, 12, 26], [6, 12, 38], { name: 'Casita Wash', tilt: 10, color: '#ffc78a' }));
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  /* ---------------- Tyler ---------------- */
  tour({
    id: 'ttc-chroma', artistId: 'tyler', title: 'Chromakopia: The World Tour', year: 2025, era: 'current', accuracy: 'documented', designers: 'Alex Reardon (show designer / creative director)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#3ddc84', '#ffc21a', '#ff1010'],
    description: 'A set that took over half the arena: a main stage built from “Chromakopia” storage containers with a floating catwalk, and a B-stage styled like a cosy living room / his childhood home, with pyrotechnics throughout.',
    features: ['Storage-container main stage (documented)', 'Floating catwalk (documented)', 'Living-room B-stage (documented)'],
    sources: [S('PLSN: Chromakopia tour', 'https://plsn.com/archives/march-2025/tyler-the-creators-chromakopia-tour'), S('Billboard Canada: Montreal', 'https://ca.billboard.com/music/concerts/tyler-the-creator-montreal')],
    make: () => {
      const objects: StageObject[] = [...endStage(34, 14, 1.6, 'steelGrid')];
      for (let i = 0; i < 6; i++) objects.push(O('cube', { pos: [-14 + i * 5.6, 1.6 + (i % 2) * 2.6, -10], size: [5.2, 2.6, 2.4], name: 'Storage Container', material: { preset: 'steel', color: ['#3a5a3a', '#7a5a2a', '#2a3a5a'][i % 3] } }));
      objects.push(O('catwalk', { pos: [0, 5, 6], size: [2.6, 0.4, 18], name: 'Floating Catwalk', motion: 'bob', motionSpeed: 0.2 }), O('platform', { pos: [0, 0, 26], size: [10, 1.4, 8], name: 'Living Room B-Stage', material: 'wood', tag: 'main' }), O('platform', { pos: [0, 1.4, 24.5], size: [4, 0.45, 0.9], name: 'Sofa', material: { preset: 'fabric', color: '#6b4a2a' } }), O('cube', { pos: [-3, 1.4, 28], size: [1.2, 1.6, 0.6], name: 'TV', material: 'glossBlack' }));
      const r = rig(34, ['#3ddc84', '#ffc21a', '#ff1010'], { trussY: 18 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  /* ---------------- Charli XCX ---------------- */
  tour({
    id: 'cx-brat', artistId: 'charli', title: 'Brat Tour', year: 2024, yearLabel: '2024–25', era: 'current', accuracy: 'documented', designers: 'Jonny Kingsbury, Cour Design (stage & lighting); Imogene Strauss (creative director)', venueType: 'arena', arenaId: 'warehouse',
    palette: ['#8ace00', '#ffffff', '#000000'],
    description: 'Raw, industrial and brutalist: exposed scaffolding, LED towers, a kabuki drop and two-tiered walkways, with rain cascading from the ceiling during “Track 10”. No dancers — just Charli and the structure.',
    features: ['Exposed scaffolding (documented)', 'LED towers (documented)', 'Two-tier walkways (documented)', 'Rain from the ceiling (documented)'],
    sources: [S('Wallpaper: the designers behind the Brat tour', 'https://wallpaper.com/art/exhibitions-shows/bringing-brat-to-life-the-designers-behind-charli-xcxs-victory-lap-tour'), S('Pollstar: live review', 'https://news.pollstar.com/2025/05/14/how-charli-xcx-ate-up-brooklyn-barclays-center-gen-z-live-review/')],
    make: () => {
      const objects: StageObject[] = [...endStage(24, 10, 1.2, 'concrete'), O('scaffold', { pos: [0, 1.2, -8], size: [24, 10, 3] }), O('catwalk', { pos: [0, 5, -6], size: [20, 0.3, 2], rot: [0, Math.PI / 2, 0], name: 'Upper Walkway' }), O('ledPillar', { pos: [-11, 1.2, -2], size: [1.4, 10, 1.4], name: 'LED Tower', led: { visual: 'solid', color1: '#8ace00' } }), O('ledPillar', { pos: [11, 1.2, -2], size: [1.4, 10, 1.4], name: 'LED Tower', led: { visual: 'solid', color1: '#8ace00' } }), D('kabuki', { pos: [0, 1.2, 1], size: [24, 9, 0.3], material: { preset: 'fabric', color: '#8ace00' }, name: 'Kabuki Drop', hidden: false }), O('trussGrid', { pos: [0, 12.5, -3], size: [16, 0.6, 8], name: 'Rain Rig' })];
      const r = rig(24, ['#8ace00', '#ffffff', '#000000'], { trussY: 13, strobes: 6 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  /* ---------------- SZA ---------------- */
  tour({
    id: 'sza-sos', artistId: 'sza', title: 'SOS Tour', year: 2023, era: 'world', accuracy: 'documented', venueType: 'arena', arenaId: 'basketball',
    palette: ['#1ae0ff', '#0a3d91', '#ffc21a'],
    description: 'Built around the album cover: every show began and ended with SZA on a diving board over an ocean of projected water, moving through a pier, a trawler, a lighthouse and a seabed.',
    features: ['Diving board over the sea (documented)', 'Pier, trawler, lighthouse, seabed scenes (documented)', 'Ocean projections (documented)'],
    sources: [S('SOS Tour — Wikipedia', 'https://en.wikipedia.org/wiki/SOS_Tour'), S('Inquirer: Philadelphia review', 'https://www.inquirer.com/entertainment/music/sza-philadelphia-wells-fargo-sos-tour-setlist-review-20230926.html')],
    make: () => {
      const objects: StageObject[] = [...endStage(30, 12, 1.6, 'wood'), O('ledFloor', { pos: [0, 1.6, -4], size: [26, 0.12, 8], name: 'Ocean Floor', led: { visual: 'water' } }), O('catwalk', { pos: [8, 4.5, 2], size: [1.5, 0.3, 8], name: 'Diving Board', material: 'white' }), O('column', { pos: [-12, 1.6, -9], size: [2.4, 14, 2.4], material: 'white', name: 'Lighthouse' }), O('platform', { pos: [6, 1.6, -9], size: [10, 1.2, 4], name: 'Pier', material: 'wood' }), O('wedge', { pos: [-4, 1.6, -9], size: [7, 3, 3], rot: [0, Math.PI / 2, 0], name: 'Trawler', material: { preset: 'white', color: '#a03030' } }), screen(0, 1.6, -11.6, 30, 10, 'water', '#0a3d91', '#1ae0ff')];
      const r = rig(30, ['#1ae0ff', '#0a3d91', '#ffc21a'], { trussY: 18 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.6, fog: 0.8 } };
    },
  }),
  /* ---------------- Doja Cat ---------------- */
  tour({
    id: 'dc-scarlet', artistId: 'doja', title: 'The Scarlet Tour', year: 2023, yearLabel: '2023–24', era: 'world', accuracy: 'documented', designers: 'New Substance (production); Image SFX (effects)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#000000'],
    description: 'Horror-themed: a giant black widow spider descending from the ceiling over Doja, a wall of chains, a roaming bloody eyeball, red smoke, fireworks and lasers.',
    features: ['Giant descending spider (documented)', 'Wall of chains (documented)', 'Roaming eyeball (documented)'],
    sources: [S('New Substance: Scarlet Tour', 'https://newsubstance.co.uk/case-study/doja-cat-the-scarlet-tour'), S('TPi: inside the Scarlet Tour', 'https://tpimagazine.com/?p=73006')],
    make: () => {
      const objects: StageObject[] = [...endStage(26, 12, 1.6, 'matteBlack'), O('sculpture', { pos: [0, 8, -4], size: [10, 6, 8], name: 'Black Widow Spider', material: { preset: 'glossBlack', color: '#0a0a0a', emissive: '#ff1010', emissiveIntensity: 0.15 }, motion: 'bob', motionSpeed: 0.2 }), O('sphere', { pos: [6, 1.6, 2], size: [2.4, 2.4, 2.4], name: 'Bloody Eyeball', material: { preset: 'white', color: '#f0e8e0' } })];
      for (let i = 0; i < 14; i++) objects.push(O('column', { pos: [-12 + i * 1.85, 1.6, -11.5], size: [0.12, 10, 0.12], name: 'Chain', material: 'steel' }));
      const r = rig(26, ['#ff1010', '#ffffff', '#000000'], { lasers: 6, strobes: 4 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 1, fog: 0.9 } };
    },
  }),
  /* ---------------- Ariana Grande ---------------- */
  tour({
    id: 'ag-sweetener', artistId: 'ariana', title: 'Sweetener World Tour', year: 2019, era: 'world', accuracy: 'documented', designers: 'LeRoy Bennett', venueType: 'arena', arenaId: 'basketball',
    palette: ['#c0c0ff', '#ffffff', '#ff6b9d'],
    description: 'A semicircular runway looping around an audience pit, a large screen at the back with a hemisphere-like projection and a large inflatable orb — “the moon” — that lowers during “NASA”. Ariana brought the sphere idea to LeRoy Bennett.',
    features: ['Semicircular runway around a pit (documented)', 'Hemisphere projection screen (documented)', 'Inflatable moon orb (documented)'],
    sources: [S('Sweetener World Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Sweetener_World_Tour'), S('LeRoy Bennett: Sweetener World Tour', 'https://leroybennett.com/post/ariana-sweetener')],
    make: () => {
      const objects: StageObject[] = [...endStage(26, 10, 1.6, 'white'), O('curvedRunway', { pos: [-6, 0, 6], size: [12, 1.6, 12], rot: [0, -Math.PI / 2, 0], name: 'Loop Runway L', material: 'white', tag: 'main' }), O('curvedRunway', { pos: [6, 0, 6], size: [12, 1.6, 12], rot: [0, Math.PI, 0], name: 'Loop Runway R', material: 'white', tag: 'main' }), O('halfSphere', { pos: [0, 1.6, -11], rot: [Math.PI / 2, 0, 0], size: [18, 9, 18], name: 'Hemisphere Screen', material: { preset: 'white', emissive: '#c0c0ff', emissiveIntensity: 0.5 } }), O('sphere', { pos: [0, 12, 4], size: [7, 7, 7], name: 'The Moon (inflatable)', material: { preset: 'white', emissive: '#dfe6ff', emissiveIntensity: 0.8 }, motion: 'bob', motionSpeed: 0.2 })];
      const r = rig(26, ['#c0c0ff', '#ffffff', '#ff6b9d'], { trussY: 18 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  /* ---------------- Justin Bieber ---------------- */
  tour({
    id: 'jb-purpose', artistId: 'bieber', title: 'Purpose World Tour', year: 2016, yearLabel: '2016–17', era: 'world', accuracy: 'documented', designers: 'Possible (stage design); Cory FitzGerald (lighting)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#1a5cff', '#ff7a1a'],
    description: 'Opened with Bieber trapped inside a glass cube, and a large glass cube rose from below the stage for “Where Are Ü Now”. A deep thrust into the seating and a flying stage that carried him and dancers out over the house.',
    features: ['Glass cube rising from below (documented)', 'Deep thrust (documented)', 'Flying stage over the house (documented)'],
    sources: [S('Live Design: the ultimate stage show', 'https://www.livedesignonline.com/concerts/ultimate-stage-show-justin-biebers-purpose-tour'), S('Purpose World Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Purpose_World_Tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(28, 12), walk(0, 0, 0, 22, 4), O('glassPanel', { pos: [0, 1.6, -4], size: [4, 4, 4], name: 'Glass Cube', material: 'glass', motion: 'lift', motionSpeed: 0.4 }), D('floatingRound', { pos: [0, 9, 26], size: [8, 0.6, 5], name: 'Flying Stage', motion: 'bob', motionSpeed: 0.25 }), screen(0, 1.6, -12.3, 28, 10, 'geometric', '#ffffff', '#1a5cff')];
      const r = rig(28, ['#ffffff', '#1a5cff', '#ff7a1a'], { trussY: 20 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  /* ---------------- Shawn Mendes ---------------- */
  tour({
    id: 'sm-tour', artistId: 'shawn', title: 'Shawn Mendes: The Tour', year: 2019, era: 'world', accuracy: 'documented', designers: 'Okulus; Louis Oliver (lighting)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff2a4a', '#ffffff', '#ffc21a'],
    description: 'A circular stage with steps up both sides to two 9 m wings, a massive circular video wall looming behind, a circular “halo” truss overhead, and an orb-shaped balloon as a central visual. The rose was the tour icon.',
    features: ['Circular stage + two 9 m wings (documented)', 'Massive circular video wall (documented)', 'Halo truss (documented)', 'Orb balloon (documented)'],
    sources: [S('LSi: Ayrton picked for Shawn Mendes', 'https://www.lsionline.com/ayrton-picked-for-shawn-mendes-tour'), S('LSi: Airstar gets intimate', 'https://www.lsionline.com/airstar-gets-intimate-with-shawn-mendes')],
    make: () => {
      const objects: StageObject[] = [disc(0, -5, 14), O('platform', { pos: [-11.5, 0, -6], size: [9, 1.6, 5], name: 'Wing L (9 m)', tag: 'main' }), O('platform', { pos: [11.5, 0, -6], size: [9, 1.6, 5], name: 'Wing R (9 m)', tag: 'main' }), O('ledCircle', { pos: [0, 2, -14], size: [16, 16, 0.4], name: 'Circular Video Wall', led: { visual: 'clouds', color1: '#ff2a4a', color2: '#ffffff' } }), O('circleTruss', { pos: [0, 13, -5], size: [14, 0.6, 14], name: 'Halo Truss' }), O('sphere', { pos: [0, 9, 6], size: [5, 5, 5], name: 'Orb Balloon', material: { preset: 'white', emissive: '#ffd0d8', emissiveIntensity: 0.6 }, motion: 'bob', motionSpeed: 0.2 })];
      const fixtures = ringFixtures(10, 7, -5, 12.6, '#ff2a4a');
      const r = rig(26, ['#ff2a4a', '#ffffff', '#ffc21a'], { trussY: 18, spots: 4 });
      return { objects: [...objects, ...r.objects], fixtures: [...fixtures, ...r.fixtures] };
    },
  }),
  /* ---------------- Peso Pluma ---------------- */
  tour({
    id: 'pp-exodo', artistId: 'pesopluma', title: 'Éxodo Tour', year: 2024, era: 'current', accuracy: 'documented', designers: 'TAIT (staging)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#ff1010', '#1a5cff'],
    description: 'A 360° centre stage on the arena floor: a circular main stage with a thrust, a piano lift and an upstage riser, with strobes, pyrotechnics, a moon figure and a large laser rig.',
    features: ['Circular 360° centre stage (documented)', 'Thrust + piano lift + riser (documented)', 'Moon figure and lasers (documented)'],
    sources: [S('TAIT: Éxodo Tour', 'https://taittowers.com/work/peso-pluma-exodo-tour'), S('Remezcla: stage layout', 'https://remezcla.com/music/here-are-the-setlist-stage-layout-merch-for-peso-plumas-exodo-tour/')],
    make: () => {
      const cz = 16;
      const objects: StageObject[] = [disc(0, cz, 16, 1.6, 'glossBlack', 'Circular Main Stage'), walk(0, cz + 8, 0, cz + 16, 3), O('lift', { pos: [-4, 1.6, cz - 3], size: [3, 0.6, 2], name: 'Piano Lift' }), D('riser', { pos: [4, 1.6, cz - 4], size: [5, 0.8, 3], name: 'Upstage Riser' }), O('sphere', { pos: [0, 14, cz], size: [6, 6, 6], name: 'Moon', material: { preset: 'white', emissive: '#e8e8ff', emissiveIntensity: 0.9 } })];
      const fixtures = [...ringFixtures(16, 14, cz, 18, '#ffffff'), ...ringFixtures(8, 9, cz, 1.8, '#1aff9c', ['laser'], 95)];
      return { objects: [...objects, ...paRing(4, 14, cz, 15)], fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  /* ---------------- Karol G ---------------- */
  tour({
    id: 'kg-msb', artistId: 'karolg', title: 'Mañana Será Bonito Tour', year: 2023, yearLabel: '2023–24', era: 'stadium', accuracy: 'partial', designers: 'Travis Shirley (production design); Ignacio Rosenberg (lighting)', venueType: 'stadium', arenaId: 'football',
    palette: ['#1ae0ff', '#ff2ad4', '#ffffff'],
    description: 'Lighting followed the album’s story in chapters — blues around “Karolina the Mermaid”, then magentas, pinks and whites. A multi-level platform with catwalks and a rainbow-inspired central arch is reported by a less reliable source.',
    features: ['Three-chapter lighting story (documented)', 'Multi-level stage with catwalks (reported)', 'Rainbow arch (reported, unverified)'],
    sources: [S('Live Design: Elation on Mañana Será Bonito', 'https://www.livedesignonline.com/news/karol-g-electrifies-historic-manana-sera-bonito-world-tour-elation-proteus')],
    make: () => {
      const objects: StageObject[] = [...endStage(48, 16), O('platform', { pos: [0, 1.6, -10], size: [28, 2.4, 6], name: 'Upper Level' }), O('arch', { pos: [0, 4, -11], size: [26, 16, 1.2], name: 'Rainbow Arch (reported)', material: { preset: 'neon', emissive: '#ff2ad4', emissiveIntensity: 1.5 } }), walk(-10, 0, -16, 26, 2.6), walk(10, 0, 16, 26, 2.6), screen(0, 1.6, -15.6, 46, 12, 'water', '#1ae0ff', '#ff2ad4')];
      const r = rig(48, ['#1ae0ff', '#ff2ad4', '#ffffff'], { trussY: 26, beams: 14 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  /* ---------------- Rosalía ---------------- */
  tour({
    id: 'ro-moto', artistId: 'rosalia', title: 'Motomami World Tour', year: 2022, era: 'world', accuracy: 'documented', designers: 'Stufish', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#ff1010', '#000000'],
    description: 'A minimalist, pure-white performance space by Stufish — essentially a blank white box — with an on-stage camera operator moving among the dancers so the screens became a live film.',
    features: ['All-white minimalist stage (documented)', 'On-stage live camera work (documented)'],
    sources: [S('Stufish: Rosalía', 'https://stufish.com/project/rosalia/'), S('Motomami World Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Motomami_World_Tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(26, 12, 1.2, 'white'), O('ribbedWall', { pos: [0, 1.2, -12], size: [26, 9, 0.6], material: 'white', name: 'White Wall' }), screen(0, 10.6, -11.7, 26, 4, 'minimal', '#ffffff', '#000000', { kind: 'ledHorizontal' }), O('cube', { pos: [6, 1.2, 2], size: [0.5, 1.7, 0.5], name: 'Camera Operator', material: 'matteBlack' })];
      const r = rig(26, ['#ffffff', '#ff1010', '#000000'], { trussY: 15, beams: 6 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.3 } };
    },
  }),
  /* ---------------- Linkin Park ---------------- */
  tour({
    id: 'lp-fz', artistId: 'linkinpark', title: 'From Zero World Tour', year: 2024, yearLabel: '2024–26', era: 'current', accuracy: 'partial', designers: 'Mike Carson / Thank You 92 (creative direction & stage design)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#ff1010', '#1a5cff'],
    description: 'Massive cube structures used as visual canvases that act as an LED ceiling installation; at least some shows used a centred 360° stage. How widely the in-the-round layout was used is not confirmed.',
    features: ['Cube structures as LED ceiling (documented)', 'Centred 360° stage at some venues (documented)'],
    sources: [S('Mike Carson: From Zero World Tour', 'https://www.mikecarson.tv/projects/linkin-park-from-zero-world-tour'), S('Concert Chronicles: Phoenix', 'https://theconcertchronicles.com/2025/09/11/from-zero-world-tour-linkin-park-returns-to-arizona-after-a-decade/')],
    make: () => {
      const cz = 16;
      const objects: StageObject[] = [O('platform', { pos: [0, 0, cz], size: [18, 1.8, 18], name: '360° Stage', tag: 'main' })];
      for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) objects.push(O('ledCube', { pos: [x * 7, 13 + ((x + z) % 2) * 1.5, cz + z * 7], size: [5, 5, 5], name: 'Cube Canvas', led: { visual: x === 0 && z === 0 ? 'noise' : 'checker', color1: '#ffffff', color2: '#000000' } }));
      return { objects: [...objects, ...paRing(4, 14, cz, 16)], fixtures: ringFixtures(16, 13, cz, 20, '#ffffff'), atmosphere: { haze: 0.9 } };
    },
  }),
  /* ---------------- K-pop ---------------- */
  tour({
    id: 'bts-ptd', artistId: 'bts', title: 'Permission to Dance on Stage', year: 2021, yearLabel: '2021–22', era: 'stadium', accuracy: 'partial', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff7a1a', '#9b2aff', '#ffffff'],
    description: 'The show was split into five sections, each with its own set matched to the songs, in an orange-and-violet palette. Long runways and floating B-stages are reported by lower-quality sources and are approximated here.',
    features: ['Five themed sections (documented)', 'Orange/violet palette (documented)', 'Long runways + B-stages (reported)'],
    sources: [S('Bandwagon: Seoul livestream review', 'https://bandwagon.asia/articles/bts-permission-to-dance-on-stage-ptd-online-concert-review-setlist-photos-gig-report-jamsil-olympic-stadium-october-2021')],
    make: () => {
      const objects: StageObject[] = [...endStage(56, 16), walk(-18, 0, -30, 40), walk(18, 0, 30, 40), walk(0, 0, 0, 30), disc(0, 34, 10), disc(-30, 44, 8), disc(30, 44, 8), screen(0, 1.6, -15.6, 56, 16, 'gradient', '#ff7a1a', '#9b2aff')];
      const r = rig(56, ['#ff7a1a', '#9b2aff', '#ffffff'], { trussY: 28, beams: 16, spots: 10 }, 18);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bp-bornpink', artistId: 'blackpink', title: 'Born Pink World Tour', year: 2022, yearLabel: '2022–23', era: 'stadium', accuracy: 'partial', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff2ad4', '#000000', '#ffffff'],
    description: 'A record-breaking tour (66 shows, about 1.8 million attendees) with interlude films ranging from a woodland paradise to sci-fi. A “dual black/pink” concept and V-shaped thrust come from a fan wiki and are unverified.',
    features: ['Black/pink dual concept (reported)', 'V-shaped thrust (unverified)', 'Woodland-to-sci-fi interlude films (documented)'],
    sources: [S('Born Pink World Tour (wiki mirror)', 'https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/Born_Pink_World_Tour')],
    make: () => {
      const objects: StageObject[] = [O('platform', { pos: [-12, 0, -8], size: [24, 1.6, 16], material: 'matteBlack', name: 'Black Half', tag: 'main' }), O('platform', { pos: [12, 0, -8], size: [24, 1.6, 16], material: { preset: 'glossBlack', color: '#ff69b4' }, name: 'Pink Half', tag: 'main' }), walk(-2, 0, -16, 30), walk(2, 0, 16, 30), screen(0, 1.6, -16, 46, 14, 'clouds', '#ff2ad4', '#000000')];
      const r = rig(48, ['#ff2ad4', '#000000', '#ffffff'], { trussY: 26, beams: 14 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'skz-dominate', artistId: 'straykids', title: 'dominATE World Tour', year: 2024, yearLabel: '2024–25', era: 'stadium', accuracy: 'partial', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff1010', '#ffffff', '#ffc21a'],
    description: 'Full-length runways, towering LED screens, lasers, fireworks, flames, streamers and coloured smoke timed to the music. Exact stage geometry is approximated.',
    features: ['Full-length runways (documented)', 'Towering LED screens (documented)', 'Flames, lasers, fireworks (documented)'],
    sources: [S('Quaere Living: Tottenham review', 'https://www.quaereliving.com/post/stray-kids-dominate-world-tour-at-tottenham-hotspur-stadium')],
    make: () => {
      const objects: StageObject[] = [...endStage(52, 16), walk(0, 0, 0, 60), O('crossStage', { pos: [0, 0, 40], size: [26, 1.6, 26], name: 'Cross Stage', tag: 'main' }), O('ledVertical', { pos: [-20, 1.6, -12], size: [10, 22, 0.4], name: 'LED Tower L' }), O('ledVertical', { pos: [20, 1.6, -12], size: [10, 22, 0.4], name: 'LED Tower R' }), screen(0, 1.6, -15.6, 28, 18, 'fire', '#ff1010', '#ffc21a')];
      const r = rig(52, ['#ff1010', '#ffffff', '#ffc21a'], { trussY: 28, beams: 14, lasers: 8 }, 18);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  /* ---------------- Original concepts (no reliable stage documentation found) ---------------- */
  concept('fo-walk', 'frank', 'Light Walkway (concept)', 2023, 'festival', ['#ffffff', '#ffd7a3', '#1a5cff'], 'A bare white runway cutting through a festival crowd with only scaffold and stark light.', ['Bare runway through the crowd', 'Scaffold backdrop'], (o) => o.push(walk(0, 0, 0, 44, 2.5, 1.4, 'white'), O('scaffold', { pos: [0, 1.6, -8], size: [16, 10, 2] })), 14, 8, 'white'),
  concept('fo-box', 'frank', 'Glass Box (concept)', 2017, 'warehouse', ['#9ec9ff', '#ffffff', '#ff7a1a'], 'A frosted-glass room glowing from within on a black deck.', ['Frosted glass room'], (o) => o.push(O('glassPanel', { pos: [0, 1.6, -1.5], size: [8, 4, 0.1], material: 'frosted' }), O('glassPanel', { pos: [-4, 1.6, -5.5], rot: [0, Math.PI / 2, 0], size: [8, 4, 0.1], material: 'frosted' }), O('glassPanel', { pos: [4, 1.6, -5.5], rot: [0, Math.PI / 2, 0], size: [8, 4, 0.1], material: 'frosted' })), 18, 10),
  concept('cg-dome', 'gambino', 'Projection Dome (concept)', 2024, 'basketball', ['#ffffff', '#ff7a1a', '#1a5cff'], 'A wrap-around curved screen hugging a round stage under a bright halo. The New World Tour’s actual set was not documented in the sources found.', ['Wrap-around curved screen', 'Halo light'], (o) => o.push(O('ledCurved', { pos: [0, 1, -12], size: [32, 12, 10], led: { visual: 'particles' } }), O('torus', { pos: [0, 12, -5], size: [8, 0.6, 8], material: { preset: 'neon', emissive: '#ffffff', emissiveIntensity: 3 } }))),
  concept('pc-rage', 'carti', 'Rage Pit (concept)', 2025, 'warehouse', ['#ff1010', '#ffffff', '#000000'], 'A low black stage in a warehouse with walls of strobes and red beams.', ['Low black stage', 'Strobe walls'], (o, f) => { o.push(O('scaffold', { pos: [0, 1, -8], size: [20, 9, 2] })); f.push(...fixtureRow('strobe', 8, [-10, 9, -7], [10, 9, -7], { name: 'Strobe Wall' })); }, 20, 8, 'matteBlack'),
  concept('jc-porch', 'jcole', 'Front Porch (concept)', 2024, 'basketball', ['#ffd7a3', '#ff7a1a', '#ffffff'], 'A warm wooden porch set with a single tree and amber light.', ['Porch set', 'Single tree'], (o) => o.push(O('platform', { pos: [0, 1.6, -6], size: [10, 0.8, 4], material: 'wood', name: 'Porch' }), O('tree', { pos: [9, 1.6, -6], size: [5, 9, 5], material: { preset: 'white', color: '#3b5a2b' } })), 24, 12, 'wood'),
  tour({
    id: 'jz-444', artistId: 'jayz', title: '4:44 Tour', year: 2017, era: 'world', accuracy: 'partial', venueType: 'arena', arenaId: 'basketball',
    palette: ['#d9a740', '#ffffff', '#000000'],
    description: 'Reported to use rotating cubes displaying high-definition visuals synced to the performance. Whether it was in the round could not be confirmed; this model uses a centre stage.',
    features: ['Rotating visual cubes (reported)', 'Centre-stage layout (approximation)'],
    sources: [S('Boardroom: Watch the Throne tech talk', 'https://boardroom.tv/tech-talk-jay-z-kanye-watch-the-throne-tour/')],
    make: () => {
      const cz = 16;
      const objects: StageObject[] = [O('octagon', { pos: [0, 0, cz], size: [16, 1.6, 16], name: 'Centre Stage', tag: 'main' })];
      around(4, 6, cz, (x, z, a) => objects.push(O('ledCube', { pos: [x, 12, z], rot: [0, a, 0], size: [4, 4, 4], name: 'Rotating Cube', motion: 'rotate', motionSpeed: 0.3, led: { visual: 'minimal', color1: '#d9a740' } })));
      return { objects: [...objects, ...paRing(4, 14, cz, 15)], fixtures: ringFixtures(12, 12, cz, 18, '#d9a740') };
    },
  }),
  concept('lw-neon', 'wayne', 'Neon Swamp (concept)', 2024, 'festival', ['#7dff4d', '#9b2aff', '#ffc21a'], 'A neon festival stage with swamp trees and a glowing skyline.', ['Neon swamp trees', 'Skyline screen'], (o) => o.push(O('tree', { pos: [-14, 1.6, -8], size: [6, 10, 6], material: { preset: 'neon', emissive: '#7dff4d', emissiveIntensity: 0.6 } }), screen(0, 2, -13.6, 34, 12, 'skyline', '#7dff4d', '#100018')), 34, 14),
  concept('hs-rainbow', 'harry', 'Love On Tour (inspired)', 2022, 'football', ['#ff2a4a', '#ffc21a', '#1ae0ff'], 'A bright stadium stage with rainbow light bars and a long runway. Love On Tour’s production design was by Silent House; reports of a 360° catwalk system come from a weak source, so this is an inspired take.', ['Rainbow light bars', 'Long runway to centre'], (o) => o.push(screen(0, 12, -8, 36, 3, 'bars', '#ff2a4a', '#1ae0ff', { kind: 'ledHorizontal' }), walk(0, 0, 0, 30), disc(0, 34, 10)), 36, 14),
  concept('ateez-pirate', 'ateez', 'Pirate King (concept)', 2024, 'basketball', ['#ffc21a', '#000000', '#ff1010'], 'A ship-deck stage with masts, sails and a plank runway.', ['Ship-deck stage', 'Masts and sails'], (o) => o.push(O('column', { pos: [-6, 1.6, -6], size: [0.6, 14, 0.6], material: 'wood', name: 'Mast' }), O('column', { pos: [6, 1.6, -6], size: [0.6, 12, 0.6], material: 'wood', name: 'Mast' }), O('fabric', { pos: [-6, 8, -6], size: [6, 1.5, 0.4], rot: [Math.PI / 2, 0, 0], material: 'white', name: 'Sail' }), walk(0, 0, 0, 12, 2, 1.6, 'wood', 'Plank')), 26, 12, 'wood'),
  concept('id-loom', 'imaginedragons', 'Arena Loom (concept)', 2025, 'football', ['#ff7a1a', '#ffffff', '#1a5cff'], 'A huge stadium rock stage with a drum riser on a lift and big IMAG.', ['Drum riser lift', 'Big IMAG'], (o) => o.push(O('lift', { pos: [0, 1.6, -8], size: [6, 1.2, 4], name: 'Drum Lift' }), ...imag(28, 4, 0, 10, 13)), 40, 16),
  concept('ff-rock', 'foofighters', 'Throne Rock Show (concept)', 2024, 'football', ['#ffffff', '#ff1010', '#ffc21a'], 'A classic stadium rock stage with a long thrust and a tall lighting wall.', ['Long thrust', 'Lighting wall'], (o, f) => { o.push(walk(0, 0, 0, 24, 4)); f.push(...fixtureRow('wash', 12, [-18, 2, -12], [18, 2, -12], { name: 'Light Wall', tilt: 120, color: '#ffffff' })); }, 40, 14),
  concept('tm-possessive', 'tatemcrae', 'Dance-Floor Stage (concept)', 2025, 'basketball', ['#ff2a4a', '#ffffff', '#000000'], 'A choreography-first stage: a big LED dance floor, a staircase and a runway.', ['LED dance floor', 'Staircase'], (o) => o.push(O('ledFloor', { pos: [0, 1.6, -5], size: [20, 0.12, 9], led: { visual: 'checker', color1: '#ff2a4a', color2: '#000000' } }), D('decoStairs', { pos: [0, 1.6, -10], size: [8, 3, 3], material: 'glossBlack' }), walk(0, 0, 0, 14)), 26, 12),
  concept('hz-forest', 'hozier', 'Unreal Forest (concept)', 2024, 'amphi', ['#7dff4d', '#ffd7a3', '#1a5cff'], 'An earthy stage with stone, trees and warm lantern light.', ['Stone and trees', 'Lantern light'], (o) => o.push(O('rock', { pos: [-8, 1.6, -6], size: [6, 3, 4], material: 'concrete' }), O('tree', { pos: [8, 1.6, -7], size: [5, 9, 5], material: { preset: 'white', color: '#2f5a2f' } })), 24, 12, 'wood'),
  concept('ldr-garden', 'lanadelrey', 'Americana Garden (concept)', 2025, 'football', ['#ffd7a3', '#ff6b9d', '#ffffff'], 'A dreamy Americana porch-and-garden set with swings and soft light.', ['Porch and garden', 'Swing'], (o) => o.push(O('platform', { pos: [0, 1.6, -8], size: [14, 0.8, 5], material: 'white', name: 'Porch' }), O('frame', { pos: [8, 1.6, -3], size: [3, 4, 0.2], material: 'white', name: 'Swing Frame' }), O('tree', { pos: [-10, 1.6, -6], size: [5, 9, 5], material: { preset: 'white', color: '#3b5a2b' } })), 36, 14, 'white'),
];

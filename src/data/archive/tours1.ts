import type { Fixture, StageObject } from '../../types';
import { O, D, F, endStage, walk, disc, screen, imag, pa, paRing, ringFixtures, around, rig, fixtureRow, deg } from './kit';
import { tour, type Tour } from './types';

const S = (label: string, url: string) => ({ label, url });

/* =============================== RIHANNA =============================== */
export const RIHANNA: Tour[] = [
  tour({
    id: 'ri-gggb', artistId: 'rihanna', title: 'Good Girl Gone Bad Tour', year: 2007, yearLabel: '2007–09', era: 'first', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#1a1a1a'],
    description: 'Era concept for her first major headline tour: a sleek black-and-red pop stage with stairs, a short thrust and a wall of light. Not a recreation of the real set.',
    features: ['Black gloss deck with red edge light', 'Central staircase to an upper level', 'Short thrust into the crowd'],
    sources: [],
    make: () => {
      const objects = [...endStage(22, 10), O('platform', { pos: [0, 1.6, -8], size: [10, 1.6, 4], name: 'Upper Level', tag: 'main' }), D('decoStairs', { pos: [0, 1.6, -4.8], size: [6, 1.6, 3], material: 'glossBlack' }), walk(0, 0, 0, 8), screen(0, 3.2, -10.3, 18, 7, 'minimal', '#ff1010', '#000000')];
      const r = rig(22, ['#ff1010', '#ffffff', '#1a1a1a'], { strobes: 4 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'ri-lgoe', artistId: 'rihanna', title: 'Last Girl on Earth Tour', year: 2010, yearLabel: '2010–11', era: 'world', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#9ec9ff', '#ff2a4a'],
    description: 'Era concept: a dystopian, militarised pop set with a lone tower platform and cold white light. Not a recreation of the real set.',
    features: ['Raised tower platform stage-right', 'Metal scaffold backdrop', 'Cold white beam curtain'],
    sources: [],
    make: () => {
      const objects = [...endStage(24, 11, 1.6, 'steelGrid'), O('scaffold', { pos: [0, 1.6, -10], size: [22, 9, 2] }), O('platform', { pos: [8, 1.6, -5], size: [4, 4, 4], material: 'steel', name: 'Tower Platform' }), screen(-7, 4, -9.5, 8, 5, 'noise', '#9ec9ff', '#000000')];
      const r = rig(24, ['#ffffff', '#9ec9ff', '#ff2a4a'], { beams: 12 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  tour({
    id: 'ri-loud', artistId: 'rihanna', title: 'Loud Tour', year: 2011, era: 'world', accuracy: 'partial', designers: 'LeRoy Bennett (production design)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff2a6b', '#ffc21a', '#ffffff'],
    description: 'Production designer LeRoy Bennett framed “loud” as intensity. The documented record is mostly lighting and video; this model shows a high-energy end stage with a long thrust, colour-saturated video and a dense lighting rig. Layout details are approximated.',
    features: ['Designer credit documented (LeRoy Bennett)', 'High-intensity lighting and video', 'Long thrust and B-stage (approximation)'],
    sources: [S('Loud Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Loud_Tour')],
    make: () => {
      const objects = [...endStage(26, 12), walk(0, 0, 0, 16), disc(0, 19, 7), screen(0, 1.6, -12.3, 24, 10, 'plasma', '#ff2a6b', '#ffc21a')];
      const r = rig(26, ['#ff2a6b', '#ffc21a', '#ffffff'], { beams: 14, strobes: 6, floor: 10 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'ri-diamonds', artistId: 'rihanna', title: 'Diamonds World Tour', year: 2013, era: 'stadium', accuracy: 'partial', venueType: 'stadium', arenaId: 'football',
    palette: ['#ffffff', '#c0c0ff', '#ff2a4a'],
    description: 'Crew described the stage as very large — scaled down from the original designs so it could fit arenas in hockey season — needing big crews to build and strike nightly. This model shows a wide, deep stadium stage with a faceted diamond-like centrepiece; the faceted motif is an interpretation.',
    features: ['Very large deck (documented: scaled down to fit arenas)', 'Faceted diamond centrepiece (interpretation)', 'Wide screen wall'],
    sources: [S('Diamonds World Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Diamonds_World_Tour'), S("Live Design: Rihanna's Diamonds Are Forever", 'https://www.livedesignonline.com/concerts/rihanna-s-diamonds-are-forever')],
    make: () => {
      const objects = [...endStage(44, 18, 2), O('diamond', { pos: [0, 2, -9], size: [10, 6, 10], material: 'mirror', name: 'Diamond' }), screen(0, 2, -17.5, 40, 14, 'geometric', '#ffffff', '#202040'), walk(0, 0, 0, 24, 3), disc(0, 28, 9)];
      const r = rig(44, ['#ffffff', '#c0c0ff', '#ff2a4a'], { trussY: 26, beams: 16, spots: 10 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'ri-anti', artistId: 'rihanna', title: 'Anti World Tour', year: 2016, era: 'stadium', accuracy: 'partial', designers: 'Willo Perron (stage design)', venueType: 'stadium', arenaId: 'megadome',
    palette: ['#ffffff', '#ff1010', '#1a5cff'],
    description: 'Willo Perron designed the Anti World Tour stage. Reports of a suspended walkway over the floor are modelled here as a translucent bridge, but the sources found for this archive did not confirm it — treat the bridge as unverified.',
    features: ['Designer documented (Willo Perron)', 'Translucent suspended bridge over the floor (unverified)', 'Stark white minimal look'],
    sources: [S('Anti World Tour (wiki mirror)', 'https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/Anti_World_Tour')],
    make: () => {
      const objects = [...endStage(26, 12, 1.6, 'white'), O('catwalk', { pos: [0, 6, 18], size: [3, 0.4, 30], name: 'Suspended Bridge (unverified)', material: 'frosted', motion: 'bob', motionSpeed: 0.25 }), screen(0, 1.6, -12.3, 26, 10, 'minimal', '#ffffff', '#000000')];
      const r = rig(26, ['#ffffff', '#ff1010', '#1a5cff'], { trussY: 20 });
      r.fixtures.push(...fixtureRow('spot', 6, [0, 16, 5], [0, 16, 32], { name: 'Bridge Spot', tilt: 0, color: '#ffffff' }));
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'ri-sb57', artistId: 'rihanna', title: 'Super Bowl LVII Halftime Show', year: 2023, era: 'special', accuracy: 'documented', designers: 'Willo Perron (design), TAIT (fabrication)', venueType: 'special', arenaId: 'football',
    palette: ['#ffffff', '#ff1010', '#ff7a1a'],
    description: 'Seven suspended platforms floated high above the field, carrying Rihanna and her dancers, so nothing heavy had to roll on the grass. The rest of the stage was built from 23 rolling carts.',
    features: ['Seven floating platforms over the field (documented)', 'Field-protecting design: 23 rolling carts (documented)', 'White costumes against red-orange light'],
    sources: [S('TAIT — Super Bowl LVII', 'https://www.taittowers.com/work/rhianna-apple-music-super-bowl-lvii-halftime-show'), S('Wallpaper: halftime stage design', 'https://wallpaper.com/design-interiors/rihanna-super-bowl-halftime-show-stage-design-willo-perron')],
    make: () => {
      const objects: StageObject[] = [];
      const pts: [number, number, number][] = [[0, 20, 40], [-10, 16, 34], [10, 16, 34], [-16, 12, 44], [16, 12, 44], [-6, 9, 50], [6, 9, 50]];
      pts.forEach(([x, y, z], i) => objects.push(O('floating', { pos: [x, y, z], size: [i === 0 ? 7 : 5, 0.5, i === 0 ? 7 : 5], material: 'frosted', name: `Floating Platform ${i + 1}`, led: undefined })));
      objects.push(O('platform', { pos: [0, 0, 44], size: [30, 0.4, 22], material: 'white', name: 'Field Cart Deck', tag: 'main' }));
      const fixtures: Fixture[] = [];
      pts.forEach(([x, y, z], i) => fixtures.push(F('spot', { pos: [x, y + 10, z], tilt: 0, beamAngle: 12, color: '#ffffff', name: `Platform Key ${i + 1}` })));
      around(12, 30, 44, (x, z, a, i) => fixtures.push(F(i % 2 ? 'beam' : 'wash', { pos: [x, 28, z], pan: deg(a) + 180, tilt: 30, color: i % 2 ? '#ff7a1a' : '#ff1010', name: `Stadium ${i + 1}` })));
      return { objects, fixtures, atmosphere: { haze: 0.5, fog: 0.2 } };
    },
  }),
];

/* =============================== YE =============================== */
export const YE: Tour[] = [
  tour({
    id: 'ye-tts', artistId: 'ye', title: 'Touch the Sky Tour', year: 2006, era: 'first', accuracy: 'inspired', venueType: 'arena', arenaId: 'theater',
    palette: ['#ffc21a', '#ffffff', '#5a1a6e'],
    description: 'Era concept for the Late Registration period: a warm, live-band stage with a string-section riser and soft gold light. Not a recreation.',
    features: ['String section riser', 'Live band layout', 'Warm gold wash'],
    sources: [],
    make: () => {
      const objects = [...endStage(18, 9, 1.4, 'wood'), D('riser', { pos: [-5, 1.4, -6], size: [6, 0.6, 3] }), D('riser', { pos: [5, 1.4, -6], size: [6, 0.6, 3] }), O('curtain', { pos: [0, 1.4, -9], size: [18, 10, 0.4], material: 'redVelvet' })];
      const r = rig(18, ['#ffc21a', '#ffffff', '#5a1a6e'], { beams: 4, spots: 6 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'ye-gitd', artistId: 'ye', title: 'Glow in the Dark Tour', year: 2008, era: 'world', accuracy: 'documented', designers: 'Es Devlin (set design)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#1ae0ff', '#ffffff', '#ff7a1a'],
    description: 'A space opera: Kanye rose on an elevated platform that became a spaceship he “piloted”, which crash-landed on an unknown planet covered in dry ice under a giant moon-like orb.',
    features: ['Planet surface stage with dry-ice fog (documented)', 'Elevated platform / spaceship (documented)', 'Giant moon-like sphere (documented)'],
    sources: [S('Glow in the Dark Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Glow_in_the_Dark_Tour'), S('Hypebeast: Kanye stage design history', 'https://hypebeast.com/2018/10/kanye-west-stage-design-guide-history-timeline')],
    make: () => {
      const objects = [O('mountain', { pos: [0, 0, -4], size: [34, 2.5, 18], material: { preset: 'concrete', color: '#7a6a5a' }, name: 'Planet Surface', tag: 'main' }), O('rock', { pos: [-9, 1.5, -6], size: [5, 3, 4], material: 'concrete' }), O('rock', { pos: [10, 1.5, -2], size: [4, 2.4, 3], material: 'concrete' }), D('floatingRound', { pos: [6, 6, -6], size: [6, 0.8, 4], name: 'Spaceship “Jane”', material: 'chrome', motion: 'bob', motionSpeed: 0.4 }), O('sphere', { pos: [-10, 13, -12], size: [9, 9, 9], material: { preset: 'white', emissive: '#dfe8ff', emissiveIntensity: 0.9 }, name: 'Moon' })];
      const r = rig(30, ['#1ae0ff', '#ffffff', '#ff7a1a'], { lasers: 6, beams: 10 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 1, fog: 1 } };
    },
  }),
  tour({
    id: 'ye-wtt', artistId: 'ye', title: 'Watch the Throne Tour', year: 2011, yearLabel: '2011–12', era: 'world', accuracy: 'documented', designers: 'Es Devlin (with Kanye West & Jay-Z)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#d9a740'],
    description: 'With Jay-Z. A main stage plus two large cubes that elevated into the air with video projected on them — one for each artist on opposite ends of the arena. Es Devlin described the show’s geometry as 90-degree angles.',
    features: ['Main stage at one end (documented)', 'Two elevating projection cubes (documented)', 'Right-angle geometry (documented)'],
    sources: [S('Watch the Throne Tour — Wikipedia', 'https://www.wikipedia.org/wiki/Watch_the_Throne_Tour'), S('Hypebeast: Kanye stage design history', 'https://hypebeast.com/2018/10/kanye-west-stage-design-guide-history-timeline')],
    make: () => {
      const objects = [...endStage(24, 10, 1.6, 'matteBlack'), D('ledCube', { pos: [0, 4, -8], size: [8, 8, 0.6], name: 'Main Screen', led: { visual: 'minimal', color1: '#ff1010' } }), O('ledCube', { pos: [-10, 0, 26], size: [5, 5, 5], name: 'Throne Cube 1', motion: 'lift', motionSpeed: 0.4, led: { visual: 'noise', color1: '#d9a740', color2: '#000000' } }), O('ledCube', { pos: [10, 0, 26], size: [5, 5, 5], name: 'Throne Cube 2', motion: 'lift', motionSpeed: 0.4, led: { visual: 'noise', color1: '#ff1010', color2: '#000000' } })];
      const r = rig(24, ['#ff1010', '#ffffff', '#d9a740'], { strobes: 6, beams: 10 });
      r.fixtures.push(F('spot', { pos: [-10, 18, 26], tilt: 0, name: 'Cube Key 1' }), F('spot', { pos: [10, 18, 26], tilt: 0, name: 'Cube Key 2' }));
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  tour({
    id: 'ye-yeezus', artistId: 'ye', title: 'The Yeezus Tour', year: 2013, yearLabel: '2013–14', era: 'world', accuracy: 'documented', designers: 'Es Devlin, Kanye West', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#ff1010', '#dce9ff'],
    description: 'A sculpted mountain at the end of the arena, a huge circular screen above it and a long runway. Where Watch the Throne was about 90-degree angles, Yeezus was about diagonals.',
    features: ['Mountain set piece (documented)', 'Circular screen above (documented)', 'Diagonal geometry (documented)'],
    sources: [S('Hypebeast: Kanye stage design history', 'https://hypebeast.com/2016/10/kanye-west-stage-design-guide-history-timeline'), S('Complex: design evolution of Kanye’s live shows', 'https://www.complex.com/style/2013/11/the-design-evolution-of-kanye-wests-live-performances')],
    make: () => {
      const objects = [...endStage(28, 14, 1.6, 'matteBlack'), O('mountain', { pos: [0, 1.6, -8], size: [26, 14, 12], material: 'concrete' }), O('ledCircle', { pos: [0, 16, -10], size: [14, 14, 0.4], name: 'Circle Screen', led: { visual: 'eclipse', color1: '#ffffff', color2: '#100000' } }), walk(0, 0, 0, 28, 2.5, 1.6, 'white')];
      const r = rig(28, ['#ffffff', '#ff1010', '#dce9ff'], { trussY: 24, spots: 10, beams: 10, floor: 0, strobes: 6 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 1 } };
    },
  }),
  tour({
    id: 'ye-pablo', artistId: 'ye', title: 'Saint Pablo Tour', year: 2016, era: 'world', accuracy: 'documented', designers: 'Kanye West creative team', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff7a1a', '#ffd7a3', '#ffffff'],
    description: 'A single platform suspended above the general-admission floor, moving over the crowd on a track under a matching grid of lights. No conventional end stage.',
    features: ['Floating stage over the GA floor (documented)', 'Light grid above the platform (documented)', 'Crowd under and around the artist'],
    sources: [S('ArchDaily: Saint Pablo Tour', 'https://www.archdaily.com/798543/interiors-kanye-wests-saint-pablo-tour'), S('Complex: best Kanye stage designs', 'https://www.complex.com/style/a/mike-destefano/kanye-west-best-stage-designs-of-all-time')],
    make: () => {
      const objects = [O('floating', { pos: [0, 7, 16], size: [10, 0.6, 18], name: 'Floating Stage', material: 'matteBlack', motion: 'bob', motionSpeed: 0.3, tag: 'main' }), O('trussGrid', { pos: [0, 13, 16], size: [14, 0.8, 22], name: 'Light Grid', material: 'matteBlack' })];
      const fixtures: Fixture[] = [];
      for (let x = -6; x <= 6; x += 3) for (let z = 7; z <= 25; z += 4.5) fixtures.push(F('wash', { pos: [x, 12.6, z], tilt: 0, beamAngle: 26, color: '#ff7a1a', name: 'Grid Wash' }));
      fixtures.push(...fixtureRow('beam', 6, [-7, 12.6, 6], [7, 12.6, 26], { name: 'Grid Beam', color: '#ffd7a3', tilt: 10 }));
      return { objects: [...objects, ...pa(14, 14, 4, false)], fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  tour({
    id: 'ye-globe', artistId: 'ye', title: 'Ye Live — The Globe (Bully era)', year: 2026, era: 'current', accuracy: 'documented', designers: 'Ye & Aus Taylor', venueType: 'stadium', arenaId: 'football',
    palette: ['#2a7bff', '#ffffff', '#ff7a1a'],
    description: 'A huge globe in the middle of the stadium with Earth and moon visuals projected on it. Reviews describe Ye performing on top of the demi-globe, tethered at its apex.',
    features: ['Central globe / demi-globe (documented)', 'Earth & moon projections (documented)', 'Performer on the summit (documented)'],
    sources: [S('NME: 2026 world tour', 'https://www.nme.com/news/music/kanye-west-kicks-off-ambitious-2026-world-tour-in-la-amidst-wireless-booking-controversy-3938127'), S('CultureMap: Arlington show', 'https://fortworth.culturemap.com/news/entertainment/kanye-west-2026-tour-arlington/')],
    make: () => {
      const objects: StageObject[] = [O('circlePlatform', { pos: [0, 0, 40], size: [26, 1.2, 26], material: 'matteBlack', name: 'Globe Base', tag: 'main' }), D('globeStage', { pos: [0, 1.2, 40], size: [18, 18, 18], name: 'Globe', led: { visual: 'earth', resolution: 0 } }), D('round360', { pos: [0, 19.1, 40], size: [4, 0.3, 4], material: 'matteBlack', name: 'Summit Deck' })];
      const fixtures: Fixture[] = [...ringFixtures(16, 22, 40, 32, '#ffffff')];
      around(8, 15, 40, (x, z, a, i) => fixtures.push(F('laser', { pos: [x, 1.3, z], pan: deg(a), tilt: 75, color: i % 2 ? '#2a7bff' : '#1aff9c', name: `Laser ${i + 1}` })));
      around(4, 30, 40, (x, z, a) => objects.push(D('delayTower', { pos: [x, 0, z], rot: [0, a + Math.PI, 0] })));
      return { objects, fixtures, atmosphere: { haze: 0.9, fog: 0.6 } };
    },
  }),
];

/* =============================== DRAKE =============================== */
export const DRAKE: Tour[] = [
  tour({
    id: 'dr-paradise', artistId: 'drake', title: 'Club Paradise Tour', year: 2012, era: 'first', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#d9a740', '#1a5cff', '#ffffff'], description: 'Era concept for the Take Care tour: a moody owl-gold end stage with a wide screen. Not a recreation.', features: ['Gold and navy palette', 'Wide panoramic screen'], sources: [],
    make: () => {
      const objects = [...endStage(24, 11), screen(0, 1.6, -11.3, 24, 9, 'gradient', '#d9a740', '#0a1a40')];
      const r = rig(24, ['#d9a740', '#1a5cff', '#ffffff']);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'dr-wyl', artistId: 'drake', title: 'Would You Like a Tour?', year: 2013, yearLabel: '2013–14', era: 'world', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#9ec9ff', '#ffffff', '#202040'], description: 'Era concept for Nothing Was the Same: a minimalist skyline-blue stage with a thrust. Not a recreation.', features: ['Thrust stage', 'Skyline visuals'], sources: [],
    make: () => {
      const objects = [...endStage(24, 11), walk(0, 0, 0, 10), screen(0, 1.6, -11.3, 24, 9, 'skyline', '#9ec9ff', '#020210')];
      const r = rig(24, ['#9ec9ff', '#ffffff', '#202040']);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'dr-s16', artistId: 'drake', title: 'Summer Sixteen Tour', year: 2016, era: 'world', accuracy: 'documented', designers: 'Guy Pavelo & Steve Kidd (GP-SK Design & Production)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff2ad4', '#1ae0ff', '#ffffff'],
    description: 'With Future. An expansive stage, an 86 ft curved video wall and a kinetic system of close to 800 custom LED spheres that rose, fell and changed colour overhead — the orbs famously glowed magenta during “Hotline Bling”.',
    features: ['~800 kinetic LED spheres (documented)', '86 ft curved video wall (documented)', 'Expansive stage (documented)'],
    sources: [S('Live Design: Barco & High End on Summer Sixteen', 'https://www.livedesignonline.com/news/barco-and-high-end-systems-fuel-excitement-drake-s-summer-sixteen-tour'), S('Billboard: how Drake mastered touring', 'https://www.billboard.com/articles/columns/hip-hop/7469554/how-drake-mastered-the-art-of-touring-with-his-summer-sixteen-trek')],
    make: () => {
      const objects: StageObject[] = [...endStage(30, 14), O('ledCurved', { pos: [0, 1.6, -18], size: [26.2, 9, 6], name: '86 ft Curved Wall', led: { visual: 'plasma', color1: '#ff2ad4', color2: '#1ae0ff' } })];
      let i = 0;
      for (let x = -14; x <= 14; x += 2.4) for (let z = -12; z <= 8; z += 2.6) objects.push(O('sphere', { pos: [x, 8 + ((i * 37) % 7), z], size: [0.9, 0.9, 0.9], name: 'Kinetic Orb', material: { preset: 'neon', emissive: i % 2 ? '#ff2ad4' : '#1ae0ff', emissiveIntensity: 2 }, motion: 'bob', motionSpeed: 0.3 + ((i++ * 13) % 10) / 20 }));
      const r = rig(30, ['#ff2ad4', '#1ae0ff', '#ffffff'], { trussY: 18, beams: 10 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'dr-a3m', artistId: 'drake', title: 'Aubrey & the Three Migos Tour', year: 2018, era: 'world', accuracy: 'documented', designers: 'Willo Perron (creative director)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#1ae0ff', '#ffffff', '#ff7a1a'],
    description: 'Drake’s first full 360° in-the-round production: a lowered, almost floor-level stage that was itself a giant LED screen capable of 3D-like illusions, with drones and a famous flying Ferrari.',
    features: ['In-the-round, nearly floor-level LED stage (documented)', '3D-illusion floor content (documented)', 'Drones and a flying car (documented)'],
    sources: [S('Dezeen: Willo Perron set with drones & flying Ferrari', 'https://www.dezeen.com/2018/11/30/drake-migos-tour-willo-perron-set-design-drones-flying-ferrari/amp/'), S('Silva Sveta: Drake tour visuals', 'https://www.silasveta.com/projects/drakes-tour')],
    make: () => {
      const objects: StageObject[] = [O('ledFloor', { pos: [0, 0, 16], size: [34, 0.5, 14], name: 'LED Stage Floor', tag: 'main', led: { visual: 'tunnel', color1: '#1ae0ff', color2: '#000000' } }), O('cube', { pos: [6, 9, 14], size: [4.5, 1.3, 2], name: 'Flying Car', material: { preset: 'glossBlack', color: '#d01010' }, motion: 'bob', motionSpeed: 0.3 })];
      for (let i = 0; i < 12; i++) objects.push(O('sphere', { pos: [-12 + i * 2.2, 11 + (i % 3), 16 + Math.sin(i) * 4], size: [0.35, 0.15, 0.35], name: 'Drone', material: { preset: 'neon', emissive: '#ffffff', emissiveIntensity: 3 }, motion: 'bob', motionSpeed: 0.8 }));
      const fixtures = [...ringFixtures(16, 18, 16, 20, '#1ae0ff')];
      return { objects: [...objects, ...paRing(4, 16, 16, 16)], fixtures };
    },
  }),
  tour({
    id: 'dr-av', artistId: 'drake', title: 'Assassination Vacation Tour', year: 2019, era: 'world', accuracy: 'documented', designers: 'Willo Perron; visuals Silva Sveta', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#1a5cff'],
    description: 'The European leg reused the 2018 in-the-round design: the low LED stage in the middle of the arena with 3D-illusion visuals.',
    features: ['Same 360° design as 2018 (documented)', 'Red-tinted European content'],
    sources: [S('Silva Sveta: Drake tour visuals', 'https://www.silasveta.com/projects/drakes-tour')],
    make: () => {
      const objects: StageObject[] = [O('ledFloor', { pos: [0, 0, 16], size: [34, 0.5, 14], name: 'LED Stage Floor', tag: 'main', led: { visual: 'geometric', color1: '#ff1010', color2: '#000000' } })];
      return { objects: [...objects, ...paRing(4, 16, 16, 16)], fixtures: ringFixtures(16, 18, 16, 20, '#ff1010') };
    },
  }),
  tour({
    id: 'dr-blur', artistId: 'drake', title: 'It’s All a Blur Tour', year: 2023, era: 'recent', accuracy: 'documented', designers: 'TAIT (staging); Matte Babel (UK creative)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffc21a', '#ff2ad4', '#ffffff'],
    description: 'Maximalist arena show whose backbone was a gantry built from TAIT’s third-generation video track truss carrying moving elements; PRG’s coverage mentions flying saucers and floating sperm-shaped inflatables. The UK leg inverted it with a raised, illuminated track encircling the arena.',
    features: ['Video-track truss gantry (documented)', 'Flying saucer & inflatable props (documented)', 'Raised illuminated track (UK leg, documented)'],
    sources: [S('TAIT: It’s All a Blur', 'https://taittowers.com/work/its-all-a-blur-tour'), S('Pollstar: PRG on It’s All a Blur', 'https://news.pollstar.com/2023/12/07/floating-spermatozoa-flying-saucers-deep-fake-young-drake-how-prg-helped-bring-drakes-vision-for-its-all-a-blur-tour-to-life/')],
    make: () => {
      const objects: StageObject[] = [...endStage(26, 10), walk(0, 0, 0, 22), disc(0, 25, 8)];
      for (let i = 0; i < 4; i++) objects.push(O('truss', { pos: [0, 12 + i * 1.5, -4 + i * 8], size: [32, 0.9, 0.9], name: `Video Track Truss ${i + 1}` }), O('ledHanging', { pos: [-8 + i * 5, 6 + i, -4 + i * 8], size: [6, 3.5, 0.3], name: `Tracking Screen ${i + 1}`, motion: 'bob', motionSpeed: 0.3 + i * 0.1 }));
      objects.push(O('torus', { pos: [0, 15, 26], size: [8, 1.4, 8], name: 'Flying Saucer', material: 'chrome', motion: 'bob', motionSpeed: 0.4 }));
      const r = rig(26, ['#ffc21a', '#ff2ad4', '#ffffff'], { trussY: 20, beams: 14 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
];

/* =============================== KENDRICK =============================== */
export const KENDRICK: Tour[] = [
  tour({
    id: 'kl-gkmc', artistId: 'kendrick', title: 'good kid, m.A.A.d city World Tour', year: 2013, era: 'first', accuracy: 'inspired', venueType: 'arena', arenaId: 'warehouse',
    palette: ['#ffffff', '#ffc21a', '#1a5cff'], description: 'Era concept: a Compton street-corner set with a minivan silhouette and streetlights. Not a recreation.', features: ['Street-corner set dressing', 'Streetlight columns'], sources: [],
    make: () => {
      const objects = [...endStage(20, 9, 1.2, 'concrete'), O('cube', { pos: [-5, 1.2, -5], size: [5, 2, 2.2], name: 'Minivan', material: { preset: 'glossBlack', color: '#d8d2c8' } }), O('column', { pos: [7, 1.2, -6], size: [0.3, 7, 0.3], name: 'Streetlight', material: 'steel' })];
      const r = rig(20, ['#ffffff', '#ffc21a', '#1a5cff'], { beams: 4 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'kl-damn', artistId: 'kendrick', title: 'The DAMN. Tour', year: 2017, era: 'world', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#000000'], description: 'Era concept around the DAMN. visual language: a stark red-and-white box stage with a cinematic screen. Not a recreation.', features: ['Red-and-white box stage', 'Cinematic screen'], sources: [],
    make: () => {
      const objects = [...endStage(24, 12), O('cube', { pos: [0, 1.6, -6], size: [8, 5, 6], material: { preset: 'frosted', color: '#ff2a2a', emissive: '#ff1010', emissiveIntensity: 0.5 }, name: 'Light Box' }), screen(0, 8, -11.6, 24, 6, 'minimal', '#ff1010', '#000000')];
      const r = rig(24, ['#ff1010', '#ffffff', '#000000'], { strobes: 6 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'kl-gnt', artistId: 'kendrick', title: 'Grand National Tour (with SZA)', year: 2025, era: 'current', accuracy: 'documented', designers: 'Mike Carson, Dave Free, Kendrick Lamar', venueType: 'stadium', arenaId: 'football',
    palette: ['#ffffff', '#3ddc84', '#ff1010'],
    description: 'Continued the GNX visual language: an expansive stadium stage where Kendrick emerged from beneath the stage seated in a Buick Grand National Experimental car, a black-and-white screen backdrop, and garden/forest decor of vines, leaves, flowers and ivy for SZA’s sections.',
    features: ['Car rising from beneath the stage (documented)', 'Black-and-white screen backdrop (documented)', 'Garden & forest decor (documented)'],
    sources: [S('Grand National Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Grand_National_Tour'), S('Mike Carson: Grand National Tour', 'https://www.mikecarson.tv/projects/grand-national-tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(50, 16), walk(0, 0, 0, 30), O('lift', { pos: [0, 0, 4], size: [6, 1.6, 4], name: 'Car Lift', material: 'steelGrid' }), O('cube', { pos: [0, 1.6, 4], size: [4.8, 1.3, 1.9], name: 'GNX Car', material: { preset: 'glossBlack', color: '#050505' } }), screen(0, 2, -15.6, 50, 14, 'minimal', '#ffffff', '#000000')];
      for (let i = 0; i < 6; i++) objects.push(O('tree', { pos: [-22 + i * 8.8, 1.6, -11], size: [3.5, 6 + (i % 3), 3.5], material: { preset: 'white', color: '#2f5a2f' }, name: 'Garden Tree' }));
      const r = rig(50, ['#ffffff', '#3ddc84', '#ff1010'], { trussY: 26, beams: 14, spots: 10 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.6 } };
    },
  }),
];

/* =============================== TRAVIS =============================== */
export const TRAVIS: Tour[] = [
  tour({
    id: 'ts-astro', artistId: 'travis', title: 'Astroworld: Wish You Were Here Tour', year: 2018, yearLabel: '2018–19', era: 'world', accuracy: 'partial', venueType: 'arena', arenaId: 'megadome',
    palette: ['#ff7a1a', '#ff1010', '#ffc21a'],
    description: 'Theme-park concept: a giant loop track carried a ride car out over the floor toward a B-stage. The loop is widely reported; proportions here are approximated.',
    features: ['Loop-track ride over the floor (reported)', 'Fire-coloured light and lasers', 'B-stage at the far end'],
    sources: [S('Astroworld – Wish You Were Here Tour — Wikipedia', 'https://en.wikipedia.org/wiki/Astroworld_%E2%80%93_Wish_You_Were_Here_Tour')],
    make: () => {
      const objects = [...endStage(26, 12), walk(0, 0, 0, 24), disc(0, 27, 8), O('ring', { pos: [0, 4, 27], size: [22, 22, 1.2], rot: [0, Math.PI / 2, 0], name: 'Loop Track', material: 'aluminum' }), screen(0, 1.6, -12.3, 26, 12, 'fire', '#ff2a00', '#ffc21a')];
      const r = rig(26, ['#ff7a1a', '#ff1010', '#ffc21a'], { lasers: 6, strobes: 6, beams: 12 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 1, fog: 0.8 } };
    },
  }),
  tour({
    id: 'ts-circus', artistId: 'travis', title: 'Circus Maximus Tour', year: 2023, yearLabel: '2023–24', era: 'recent', accuracy: 'documented', venueType: 'arena', arenaId: 'megadome',
    palette: ['#ff7a1a', '#ffffff', '#5a1a6e'],
    description: 'A rock-trail mountain stage spread across the centre of the arena floor with different altitudes and platforms, Easter Island-style stone heads staring at the crowd, hidden tunnels, and a giant face-shaped rock that floated over the audience.',
    features: ['Mountain/rock-trail stage across the floor (documented)', 'Stone heads (documented)', 'Floating face-rock over the crowd (documented)'],
    sources: [S('Mix: mixing Circus Maximus', 'https://www.mixonline.com/live-sound/tours/mixing-the-mayhem-of-travis-scotts-circus-maximus'), S('Uproxx: the giant head', 'https://uproxx.com/music/travis-scott-giant-head-knocked-him-off-stage-tour')],
    make: () => {
      const objects: StageObject[] = [O('mountain', { pos: [0, 0, 22], size: [40, 4, 16], material: { preset: 'concrete', color: '#6a5d52' }, name: 'Rock Trail', tag: 'main' }), O('mountain', { pos: [-10, 0, 20], size: [12, 8, 9], material: { preset: 'concrete', color: '#5e544a' }, name: 'Summit' }), O('rock', { pos: [12, 2, 26], size: [6, 3, 5], material: 'concrete' })];
      [-16, -6, 6, 16].forEach((x, i) => objects.push(O('monolith', { pos: [x, 2.5, 28 + (i % 2)], size: [2.4, 4.5, 2], material: { preset: 'concrete', color: '#7a6e62' }, name: 'Stone Head' })));
      objects.push(O('rock', { pos: [0, 16, 30], size: [7, 6, 5], material: { preset: 'concrete', color: '#8a7c6e' }, name: 'Floating Face Rock', motion: 'bob', motionSpeed: 0.2 }), screen(0, 8, -6, 40, 12, 'fire', '#ff7a1a', '#200000', { kind: 'ledHorizontal' }));
      const fixtures = [...ringFixtures(16, 22, 22, 26, '#ff7a1a'), ...fixtureRow('laser', 6, [-18, 1, 22], [18, 1, 22], { name: 'Laser', color: '#ff2a00' })];
      return { objects: [...objects, ...paRing(4, 20, 22, 20)], fixtures, atmosphere: { haze: 1, fog: 0.9 } };
    },
  }),
];

/* =============================== BRUNO =============================== */
export const BRUNO: Tour[] = [
  tour({
    id: 'bm-dwh', artistId: 'bruno', title: 'Doo-Wops & Hooligans Tour', year: 2011, era: 'first', accuracy: 'inspired', venueType: 'theater', arenaId: 'theater',
    palette: ['#ffc21a', '#ff2a4a', '#ffffff'], description: 'Era concept: a retro club stage with band risers and a marquee-light arch. Not a recreation.', features: ['Marquee arch', 'Band risers'], sources: [],
    make: () => {
      const objects = [...endStage(18, 9, 1.2, 'wood'), O('arch', { pos: [0, 1.2, -6], size: [14, 8, 0.6], material: { preset: 'neon', emissive: '#ffc21a', emissiveIntensity: 1.5 } }), D('riser', { pos: [-5, 1.2, -6], size: [4, 0.6, 2.5] }), D('riser', { pos: [5, 1.2, -6], size: [4, 0.6, 2.5] })];
      const r = rig(18, ['#ffc21a', '#ff2a4a', '#ffffff'], { beams: 4 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bm-mj', artistId: 'bruno', title: 'Moonshine Jungle Tour', year: 2013, yearLabel: '2013–14', era: 'world', accuracy: 'partial', designers: 'LeRoy Bennett; lighting Cory FitzGerald; staging TAIT', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff2ad4', '#1ae0ff', '#ffc21a'],
    description: 'TAIT supplied a MagDeck main stage; the team set out to “create a world for Bruno and his band to inhabit”, and the tour was the first to use Elidy LED matrixes capable of volumetric graphics. Exact layout is approximated.',
    features: ['TAIT MagDeck main stage (documented)', 'Volumetric LED matrix walls (documented)', 'Retro jungle-club look (approximation)'],
    sources: [S('LSi: TAIT creates for Moonshine Jungle', 'https://lsionline.com/news/tait-creates-for-mars-moonshine-jungle-gwfiz3')],
    make: () => {
      const objects: StageObject[] = [...endStage(26, 12, 1.6, 'steelGrid')];
      for (let i = 0; i < 6; i++) objects.push(O('ledPillar', { pos: [-12 + i * 4.8, 1.6, -9], size: [1.6, 9, 1.6], name: 'Volumetric Matrix', led: { visual: 'particles', color1: i % 2 ? '#ff2ad4' : '#1ae0ff', color2: '#000000' } }));
      const r = rig(26, ['#ff2ad4', '#1ae0ff', '#ffc21a'], { beams: 10 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bm-24k', artistId: 'bruno', title: '24K Magic World Tour', year: 2017, yearLabel: '2017–18', era: 'world', accuracy: 'documented', designers: 'LeRoy Bennett (production), Cory FitzGerald (lighting), TAIT (staging)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffc21a', '#ff2ad4', '#ffffff'],
    description: 'An 80s/90s funk-and-soul look: a lit-up stage floor, eight elevating lifts, tower panels that changed colour with fireworks during “24K Magic”, and around 420 Robe Spikie fixtures in place of classic PAR cans.',
    features: ['Illuminated stage floor (documented)', 'Eight elevating lifts (documented)', 'Colour-changing tower panels (documented)'],
    sources: [S('24K Magic World Tour — Wikipedia', 'https://en.wikipedia.org/wiki/24K_Magic_World_Tour'), S('LeRoy Bennett: 24K Magic', 'https://www.leroybennett.com/post/24k-magic'), S('Robe: funks it up with Bruno Mars', 'https://robe.cz/news/robe-funks-it-up-with-bruno-mars')],
    make: () => {
      const objects: StageObject[] = [O('ledFloor', { pos: [0, 0, -6], size: [28, 1.6, 12], name: 'Lit Stage Floor', tag: 'main', led: { visual: 'checker', color1: '#ffc21a', color2: '#ff2ad4' } })];
      for (let i = 0; i < 8; i++) objects.push(O('lift', { pos: [-10.5 + i * 3, 1.6, -9], size: [2.4, 0.6, 2.4], name: `Lift ${i + 1}`, motionSpeed: 0.5 + i * 0.05 }));
      [-14, -9, 9, 14].forEach((x) => objects.push(O('ledPillar', { pos: [x, 1.6, -11], size: [2.5, 12, 1], name: 'Tower Panel', led: { visual: 'bars', color1: '#ffc21a', color2: '#ff2ad4' } })));
      const r = rig(28, ['#ffc21a', '#ff2ad4', '#ffffff'], { beams: 14, floor: 12 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bm-romantic', artistId: 'bruno', title: 'The Romantic Tour', year: 2026, era: 'current', accuracy: 'documented', designers: 'Whitney Hoversten with Joel Forman, TAIT and Bruno Mars', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff2a4a', '#ffc21a', '#ffffff'],
    description: 'A 190 ft wide stage (76 ft of main performance area) with ten rotating truss pillars full of moving lights — six that travel behind the band and four fixed at the sides — in front of a stained-glass style backdrop.',
    features: ['Ten rotating truss pillars (documented)', '190 ft wide stage (documented)', 'Stained-glass backdrop (documented)'],
    sources: [S('TPi: Whitney Hoversten on The Romantic Tour', 'https://www.tpimagazine.com/whitney-hoversten-utilises-ayrton-for-bruno-mars-the-romantic-tour/'), S('Blooloop: The Romantic Tour', 'https://blooloop.com/bruno-mars-romantic-tour/')],
    make: () => {
      const objects: StageObject[] = [...endStage(58, 16), screen(0, 1.6, -15.6, 46, 14, 'stained', '#ff2a4a', '#2a7bff', { led: { resolution: 0 } })];
      const fixtures: Fixture[] = [];
      [-24, -15, -9, -3, 3, 9, 15, 24, -28, 28].forEach((x, i) => {
        const behind = i < 8 && Math.abs(x) < 20;
        const z = behind ? -10 : -4;
        objects.push(O('trussTower', { pos: [x, 1.6, z], size: [1, 15, 1], name: `Rotating Pillar ${i + 1}`, motion: behind ? 'rotate' : 'none', motionSpeed: 0.6 }));
        for (let k = 0; k < 4; k++) fixtures.push(F(k % 2 ? 'beam' : 'spot', { pos: [x, 4 + k * 3.2, z + 0.7], tilt: 70 - k * 8, color: k % 2 ? '#ffc21a' : '#ff2a4a', movement: 'sweep', moveSpeed: 0.5, name: `Pillar ${i + 1}.${k + 1}` }));
      });
      const r = rig(58, ['#ff2a4a', '#ffc21a', '#ffffff'], { trussY: 22, spots: 8, beams: 0, floor: 10, wash: 6 }, 14);
      return { objects: [...objects, ...r.objects], fixtures: [...fixtures, ...r.fixtures], atmosphere: { haze: 0.75 } };
    },
  }),
];

/* =============================== THE WEEKND =============================== */
export const WEEKND: Tour[] = [
  tour({
    id: 'tw-kotf', artistId: 'weeknd', title: 'King of the Fall Tour', year: 2014, era: 'first', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#000000'], description: 'Era concept: a dark, red-lit club stage with smoke and a single strip screen. Not a recreation.', features: ['Red smoke stage', 'Strip screen'], sources: [],
    make: () => {
      const objects = [...endStage(20, 9, 1.4, 'matteBlack'), screen(0, 6, -9.3, 18, 2, 'minimal', '#ff1010', '#000000', { kind: 'ledHorizontal' })];
      const r = rig(20, ['#ff1010', '#ffffff', '#000000'], { beams: 8 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 1, fog: 1 } };
    },
  }),
  tour({
    id: 'tw-madness', artistId: 'weeknd', title: 'The Madness Fall Tour', year: 2015, era: 'world', accuracy: 'documented', designers: 'LeRoy Bennett (Seven Design Works)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#ff7a1a'],
    description: 'A massive overhead array of 264 IntelliPix-R panels rigged in five pods that broke apart to shape, texture and light the stage — a different configuration for every song.',
    features: ['264 LED panels in five moving pods (documented)', 'Overhead structures reshape the stage per song (documented)'],
    sources: [S('TPi: The Weeknd production', 'https://www.tpimagazine.com/?p=10293')],
    make: () => {
      const objects: StageObject[] = [...endStage(26, 12)];
      for (let p = 0; p < 5; p++) objects.push(O('ledCeiling', { pos: [-12 + p * 6, 9 + (p % 2) * 2, -5 + (p % 3)], size: [5, 0.25, 6], name: `Panel Pod ${p + 1}`, motion: 'bob', motionSpeed: 0.25 + p * 0.08, led: { visual: 'checker', color1: '#ff1010', color2: '#000000' } }));
      const r = rig(26, ['#ff1010', '#ffffff', '#ff7a1a'], { trussY: 18 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  tour({
    id: 'tw-starboy', artistId: 'weeknd', title: 'Starboy: Legend of the Fall Tour', year: 2017, era: 'world', accuracy: 'documented', designers: 'Es Devlin', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#ff1010', '#1ae0ff'],
    description: 'A huge flown triangle — about 120 ft long and 70 ft wide — made of ten triangular surfaces that folded, tilted and rotated like an aircraft, with projection from around 20 projectors on towers around the arena.',
    features: ['Folding flown triangle ~120×70 ft (documented)', 'Ten automated triangular surfaces (documented)', 'Projection towers (documented)'],
    sources: [S('Dezeen: Es Devlin’s folding star destroyer', 'https://www.dezeen.com/2017/02/22/es-devlin-folding-star-destroyer-looms-over-the-weeknds-world-tour/'), S('disguise case study: Starboy tour', 'https://www.disguise.one/en/insights/case-studies/the-weeknd-starboy-tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(24, 10), walk(0, 0, 0, 14)];
      for (let i = 0; i < 10; i++) {
        const row = i < 4 ? 0 : i < 7 ? 1 : i < 9 ? 2 : 3;
        const col = i < 4 ? i : i < 7 ? i - 4 : i < 9 ? i - 7 : 0;
        const n = 4 - row;
        objects.push(O('trianglePlatform', { pos: [(col - (n - 1) / 2) * 8, 13 + Math.sin(i) * 0.6, -6 + row * 7], rot: [0.12 * (i % 3 - 1), 0, 0], size: [7.6, 0.35, 6.6], name: `Triangle Panel ${i + 1}`, material: { preset: 'white', emissive: '#dfe8ff', emissiveIntensity: 0.25 }, motion: 'bob', motionSpeed: 0.25 + i * 0.03 }));
      }
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => objects.push(O('trussTower', { pos: [sx * 22, 0, 10 + sz * 14], size: [0.8, 10, 0.8], name: 'Projector Tower' }))));
      const r = rig(24, ['#ffffff', '#ff1010', '#1ae0ff'], { trussY: 20, beams: 12 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.9 } };
    },
  }),
  tour({
    id: 'tw-ahtd', artistId: 'weeknd', title: 'After Hours til Dawn Tour', year: 2022, yearLabel: '2022–24', era: 'stadium', accuracy: 'documented', designers: 'Production with Stageco structure', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff1010', '#ffffff', '#ff7a1a'],
    description: 'A dystopian city skyline of tower blocks along the stage, a long runway into the stadium and a giant glowing moon at the far end, drowned in haze and red light.',
    features: ['City skyline set (documented)', 'Long runway (documented)', 'Giant moon (documented)'],
    sources: [S('Stageco: After Hours til Dawn', 'https://stageco.com/references/the-weeknd-after-hours-til-dawn-2022/584')],
    make: () => {
      const objects: StageObject[] = [...endStage(50, 14, 1.6, 'concrete'), walk(0, 0, 0, 40), disc(0, 44, 9)];
      [14, 22, 10, 28, 16, 12, 24, 9, 18].forEach((h, i) => objects.push(O('monolith', { pos: [-24 + i * 6, 1.6, -10 - (i % 3) * 2], size: [4.5, h, 4], name: 'Tower', material: { preset: 'concrete', emissive: '#ff3b2a', emissiveIntensity: 0.08 } })));
      objects.push(O('ledCircle', { pos: [0, 10, 52], size: [16, 16, 0.4], name: 'Moon', led: { visual: 'eclipse', color1: '#ffe6c8', color2: '#100000' } }));
      const r = rig(50, ['#ff1010', '#ffffff', '#ff7a1a'], { trussY: 32, beams: 14, spots: 8, floor: 10, strobes: 4 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 1, fog: 0.9 } };
    },
  }),
];

/* =============================== TAYLOR SWIFT =============================== */
export const TAYLOR: Tour[] = [
  tour({
    id: 'tsw-fearless', artistId: 'taylor', title: 'Fearless Tour', year: 2009, yearLabel: '2009–10', era: 'first', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffd166', '#ffffff', '#c0a060'], description: 'Era concept: a fairytale castle backdrop with gold light and a small B-stage. Not a recreation.', features: ['Castle backdrop', 'Small acoustic B-stage'], sources: [],
    make: () => {
      const objects = [...endStage(24, 11), O('frame', { pos: [0, 1.6, -9], size: [16, 12, 1], material: 'white', name: 'Castle Gate' }), O('column', { pos: [-9, 1.6, -9], size: [3, 14, 3], material: 'white', name: 'Turret' }), O('column', { pos: [9, 1.6, -9], size: [3, 14, 3], material: 'white', name: 'Turret' }), disc(0, 22, 6)];
      const r = rig(24, ['#ffd166', '#ffffff', '#c0a060']);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'tsw-speaknow', artistId: 'taylor', title: 'Speak Now World Tour', year: 2011, yearLabel: '2011–12', era: 'world', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#9b2aff', '#ffd166', '#ffffff'], description: 'Era concept: a theatrical opera-house stage with balconies, a grand staircase and drapes. Not a recreation.', features: ['Balconies and grand staircase', 'Theatre drapes'], sources: [],
    make: () => {
      const objects = [...endStage(26, 12), D('decoStairs', { pos: [0, 1.6, -5], size: [10, 3.2, 5], material: 'white' }), O('platform', { pos: [-9, 5, -9], size: [6, 0.6, 3], material: 'gold', name: 'Balcony L' }), O('platform', { pos: [9, 5, -9], size: [6, 0.6, 3], material: 'gold', name: 'Balcony R' }), D('kabuki', { pos: [0, 1.6, -11.5], size: [26, 12, 0.5] })];
      const r = rig(26, ['#9b2aff', '#ffd166', '#ffffff']);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'tsw-red', artistId: 'taylor', title: 'The Red Tour', year: 2013, yearLabel: '2013–14', era: 'world', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ff1010', '#ffffff', '#ffd166'], description: 'Era concept: a red-curtain stage with a long runway and an elevated B-stage. Not a recreation.', features: ['Red curtain', 'Long runway', 'Elevated B-stage'], sources: [],
    make: () => {
      const objects = [...endStage(26, 12), D('kabuki', { pos: [0, 1.6, -11.5], size: [26, 12, 0.5] }), walk(0, 0, 0, 22), disc(0, 25, 7, 3)];
      const r = rig(26, ['#ff1010', '#ffffff', '#ffd166']);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'tsw-1989', artistId: 'taylor', title: 'The 1989 World Tour', year: 2015, era: 'stadium', accuracy: 'documented', designers: 'TAIT (runway fabrication)', venueType: 'stadium', arenaId: 'football',
    palette: ['#1ae0ff', '#ff6b9d', '#ffffff'],
    description: 'The signature gag was a massive 100 ft moving “propeller” runway that lifted 16 ft into the air and rotated 360° over the audience, connected to the main stage by a catwalk running to the middle of the stadium floor.',
    features: ['100 ft rotating propeller runway (documented)', 'Lifts 16 ft over the crowd (documented)', 'Catwalk to mid-floor (documented)'],
    sources: [S('Live Design: 1989 World Tour', 'https://www.livedesignonline.com/excellence-awards/taylor-swift-1989-world-tour'), S('B-stage — Wikipedia', 'https://en.wikipedia.org/wiki/B-stage')],
    make: () => {
      const objects: StageObject[] = [...endStage(44, 14), walk(0, 0, 0, 30), disc(0, 34, 8), O('rotatingPlatform', { pos: [0, 4.9, 34], size: [30.5, 0.6, 3], name: '100 ft Propeller Runway', material: 'glossBlack', motionSpeed: 0.5 }), screen(0, 1.6, -13.6, 40, 14, 'gradient', '#1ae0ff', '#ff6b9d')];
      const r = rig(44, ['#1ae0ff', '#ff6b9d', '#ffffff'], { trussY: 26, beams: 14, spots: 10 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'tsw-rep', artistId: 'taylor', title: 'Reputation Stadium Tour', year: 2018, era: 'stadium', accuracy: 'documented', designers: 'Stageco (main structure)', venueType: 'stadium', arenaId: 'football',
    palette: ['#3ddc84', '#ffffff', '#202020'],
    description: 'Three separate stages: a 110 ft tall main stage with a video wall that curves around the floor, plus two B-stages at the far left and right of the stadium — reached by a flying basket and by running through the crowd — and giant cobras.',
    features: ['110 ft main stage + curved video wall (documented)', 'Two side B-stages (documented)', 'Giant inflatable cobras (documented)', 'Flying basket (documented)'],
    sources: [S('Reputation Stadium Tour — Wikipedia', 'https://www.wikipedia.org/wiki/Reputation_Tour'), S('Stageco: Reputation World Tour', 'https://stageco.com/references/taylor-swift-reputation-world-tour-2018/568')],
    make: () => {
      const objects: StageObject[] = [...endStage(50, 16), O('ledCurved', { pos: [0, 1.6, -22], size: [60, 30, 10], name: 'Curved Video Wall (110 ft structure)', led: { visual: 'noise', color1: '#3ddc84', color2: '#000000' } }), walk(0, 0, 0, 14), O('tStage', { pos: [0, 0, 20], size: [24, 1.6, 12], name: 'T Runway', tag: 'main' }), disc(-30, 42, 9, 1.6, 'glossBlack', 'B-Stage Left'), disc(30, 42, 9, 1.6, 'glossBlack', 'B-Stage Right'), D('floatingRound', { pos: [-14, 10, 30], size: [3, 1.2, 3], name: 'Flying Basket', motion: 'bob', motionSpeed: 0.3 })];
      [-18, 18].forEach((x) => objects.push(O('sculpture', { pos: [x, 1.6, -8], size: [7, 12, 4], name: 'Giant Cobra', material: { preset: 'glossBlack', color: '#111a12', emissive: '#3ddc84', emissiveIntensity: 0.15 } })));
      const r = rig(50, ['#3ddc84', '#ffffff', '#202020'], { trussY: 30, beams: 16, spots: 10, strobes: 4 }, 18);
      r.fixtures.push(...ringFixtures(6, 6, 42, 14, '#ffffff', ['spot']).map((f) => ({ ...f, pos: [f.pos[0] - 30, f.pos[1], f.pos[2]] as [number, number, number] })), ...ringFixtures(6, 6, 42, 14, '#ffffff', ['spot']).map((f) => ({ ...f, pos: [f.pos[0] + 30, f.pos[1], f.pos[2]] as [number, number, number] })));
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures, atmosphere: { haze: 0.8 } };
    },
  }),
  tour({
    id: 'tsw-eras', artistId: 'taylor', title: 'The Eras Tour', year: 2023, yearLabel: '2023–24', era: 'stadium', accuracy: 'partial', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff6b9d', '#9b2aff', '#ffc21a'],
    description: 'A giant LED backdrop, a long catwalk running about halfway through the floor with the diamond-shaped stage in the middle, a massive LED floor and trapdoor lifts. The commonly quoted 130 ft runway length and exact dimensions are not confirmed by a primary source.',
    features: ['Main stage + catwalk + diamond stage (documented)', 'Massive LED floor (documented)', 'Trapdoor lifts (documented)', 'Exact sizes approximated'],
    sources: [S('ISE: AV technology behind the Eras Tour', 'https://www.iseurope.org/news/night-sparkling-enchanting-av-technology-behind-taylor-swifts-eras-tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(44, 14), walk(0, 0, 0, 40), O('diamond', { pos: [0, 0, 44], size: [14, 1.6, 14], name: 'Diamond Stage', tag: 'main' }), O('ledFloor', { pos: [0, 1.6, 44], size: [9, 0.12, 9], rot: [0, Math.PI / 4, 0], led: { visual: 'gradient', color1: '#ff6b9d', color2: '#9b2aff' } }), O('ledFloor', { pos: [0, 1.6, 20], size: [2.4, 0.12, 38], name: 'Runway LED' }), screen(0, 1.6, -13.6, 44, 14, 'clouds', '#ff6b9d', '#ffffff')];
      [-8, 0, 8].forEach((x) => objects.push(O('lift', { pos: [x, 1.6, -4], size: [2, 0.3, 2], name: 'Trapdoor Lift' })));
      const r = rig(44, ['#ff6b9d', '#9b2aff', '#ffc21a'], { trussY: 26, spots: 10, beams: 14 }, 16);
      r.fixtures.push(...fixtureRow('spot', 6, [-10, 18, 44], [10, 18, 44], { name: 'Diamond Spot', tilt: 10, color: '#ffffff' }));
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
];

/* =============================== BEYONCÉ =============================== */
export const BEYONCE: Tour[] = [
  tour({
    id: 'bey-dil', artistId: 'beyonce', title: 'Dangerously in Love Tour', year: 2004, era: 'first', accuracy: 'inspired', venueType: 'arena', arenaId: 'theater',
    palette: ['#d9a740', '#ffffff', '#ff6b9d'], description: 'Era concept: a gold-trimmed staircase stage with a horn section riser. Not a recreation.', features: ['Grand staircase', 'Horn riser'], sources: [],
    make: () => {
      const objects = [...endStage(18, 9, 1.4, 'glossBlack'), D('decoStairs', { pos: [0, 1.4, -5], size: [8, 2.8, 4], material: 'gold' }), D('riser', { pos: [-5.5, 1.4, -6], size: [4, 0.6, 2.5] })];
      const r = rig(18, ['#d9a740', '#ffffff', '#ff6b9d'], { beams: 4 });
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bey-exp', artistId: 'beyonce', title: 'The Beyoncé Experience', year: 2007, era: 'world', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#d9a740', '#ff1010'], description: 'Era concept: a big-band stage with two-level band platforms and a central catwalk. Not a recreation.', features: ['Two-level band platforms', 'Central catwalk'], sources: [],
    make: () => {
      const objects = [...endStage(26, 12), O('platform', { pos: [-8, 1.6, -9], size: [8, 2, 4], material: 'gold', name: 'Band Level L' }), O('platform', { pos: [8, 1.6, -9], size: [8, 2, 4], material: 'gold', name: 'Band Level R' }), walk(0, 0, 0, 12)];
      const r = rig(26, ['#ffffff', '#d9a740', '#ff1010']);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bey-iam', artistId: 'beyonce', title: 'I Am… World Tour', year: 2009, yearLabel: '2009–10', era: 'world', accuracy: 'inspired', venueType: 'arena', arenaId: 'basketball',
    palette: ['#ffffff', '#c0c0ff', '#ffc21a'], description: 'Era concept for the Sasha Fierce era: a split-personality stage with a mirrored half and a black half. The sources found did not describe the real set.', features: ['Split mirror/black stage', 'Overhead screen'], sources: [],
    make: () => {
      const objects = [O('platform', { pos: [-7, 0, -6], size: [14, 1.6, 12], material: 'mirror', name: 'Mirror Half', tag: 'main' }), O('platform', { pos: [7, 0, -6], size: [14, 1.6, 12], material: 'matteBlack', name: 'Black Half', tag: 'main' }), screen(0, 9, -11.7, 24, 5, 'gradient', '#ffffff', '#202040', { kind: 'ledHorizontal' })];
      const r = rig(28, ['#ffffff', '#c0c0ff', '#ffc21a']);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bey-carter', artistId: 'beyonce', title: 'The Mrs. Carter Show World Tour', year: 2013, yearLabel: '2013–14', era: 'world', accuracy: 'documented', designers: 'TAIT (staging)', venueType: 'arena', arenaId: 'basketball',
    palette: ['#d9a740', '#ffffff', '#ff1010'],
    description: 'TAIT built a 76 ft wide by 49 ft deep main stage from Mag Deck and a 51 by 50 ft B-stage — the “Bey Stage” — which Beyoncé reached on a flying rig over the audience.',
    features: ['76×49 ft main stage (documented)', '51×50 ft “Bey Stage” B-stage (documented)', 'Flying rig to the B-stage (documented)'],
    sources: [S('Live Design: staging the Mrs. Carter tour', 'https://www.livedesignonline.com/concerts/irreplaceably-beyonce-staging-mrs-carter-tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(23.2, 15), O('platform', { pos: [0, 0, 30], size: [15.5, 1.6, 15.2], name: '“Bey Stage” 51×50 ft', tag: 'main' }), screen(0, 1.6, -15.3, 23, 10, 'gradient', '#d9a740', '#000000'), D('floatingRound', { pos: [0, 12, 15], size: [2, 0.5, 2], name: 'Flying Rig', material: 'gold', motion: 'bob', motionSpeed: 0.3 })];
      const r = rig(24, ['#d9a740', '#ffffff', '#ff1010'], { trussY: 18 });
      r.fixtures.push(...ringFixtures(8, 9, 30, 16, '#ffffff', ['spot']));
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bey-formation', artistId: 'beyonce', title: 'The Formation World Tour', year: 2016, era: 'stadium', accuracy: 'documented', designers: 'Es Devlin; built by Stageco & TAIT', venueType: 'stadium', arenaId: 'football',
    palette: ['#ffffff', '#ff1010', '#d9a740'],
    description: 'The centrepiece was the “Monolith”: a revolving 60 ft tall box of video walls (about 22×16×9 m) that took about four minutes per rotation, set into a 62×35 m stage, with a runway that doubled as a treadmill leading to a B-stage that filled with water.',
    features: ['Revolving 60 ft LED monolith (documented)', '62×35 m stage (documented)', 'Treadmill runway (documented)', 'B-stage water pool (documented)'],
    sources: [S('Live Design: building the Formation tour', 'https://livedesignonline.com/concerts/building-beyonce-s-formation-tour'), S('Stageco technical drawings', 'https://www.livedesignonline.com/concerts/stageco-technical-drawings-for-beyonce-s-formation-world-tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(62, 35 * 0.5, 2), O('ledCube', { pos: [0, 2, -9], size: [22, 18.3, 9], name: 'The Monolith (revolving)', motion: 'rotate', motionSpeed: 0.07, led: { visual: 'noise', color1: '#ffffff', color2: '#000000' } }), walk(0, 0, 0, 36, 3, 2), O('ledFloor', { pos: [0, 2, 18], size: [2.6, 0.12, 34], name: 'Treadmill Runway' }), disc(0, 40, 10, 2, 'glossBlack', 'Pool B-Stage'), O('ledFloor', { pos: [0, 2, 40], size: [7, 0.1, 7], name: 'Water Pool', led: { visual: 'water', color1: '#0a3d91', color2: '#9ec9ff' } })];
      const r = rig(62, ['#ffffff', '#ff1010', '#d9a740'], { trussY: 30, beams: 16, spots: 10, strobes: 6 }, 18);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bey-ren', artistId: 'beyonce', title: 'Renaissance World Tour', year: 2023, era: 'stadium', accuracy: 'documented', designers: 'Stufish with Beyoncé & Parkwood', venueType: 'stadium', arenaId: 'football',
    palette: ['#c0c0ff', '#ffffff', '#d9a740'],
    description: 'Stufish-designed stadium show: an enormous widescreen LED wall with a central circular portal, chrome finishes and a long runway to a satellite stage.',
    features: ['Designer documented (Stufish)', 'Widescreen wall with circular portal', 'Long runway + satellite stage'],
    sources: [S('TAIT: Renaissance World Tour', 'https://taittowers.com/work/beyonce-renaissance-world-tour')],
    make: () => {
      const objects: StageObject[] = [...endStage(54, 16, 1.6, 'chrome'), screen(0, 1.6, -15.6, 60, 18, 'noise', '#d9d9d9', '#202226'), O('ring', { pos: [0, 2, -14.8], size: [14, 14, 1.5], material: 'chrome', name: 'Portal Ring' }), walk(0, 0, 0, 34, 3, 1.6, 'chrome'), disc(0, 38, 10, 1.6, 'chrome')];
      const r = rig(54, ['#c0c0ff', '#ffffff', '#d9a740'], { trussY: 28, beams: 16, spots: 10, strobes: 4 }, 18);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
  tour({
    id: 'bey-cc', artistId: 'beyonce', title: 'Cowboy Carter Tour', year: 2025, era: 'current', accuracy: 'partial', venueType: 'stadium', arenaId: 'football',
    palette: ['#ff1010', '#ffffff', '#1a5cff'],
    description: 'Previewed with a star-shaped stage leading into a runway. Further details of the set are approximated here.',
    features: ['Star-shaped stage into a runway (documented preview)', 'Americana palette (approximation)'],
    sources: [S('Soapcentral: first look at the stage', 'https://soapcentral.com/music/beyonce-teases-first-look-cowboy-carter-tour-new-stage-design')],
    make: () => {
      const star: [number, number][] = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? 0.2 : 0.5;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
      const objects: StageObject[] = [O('custom', { pos: [0, 0, -6], size: [30, 1.8, 28], outline: star, name: 'Star Stage', tag: 'main' }), walk(0, 0, 6, 34, 3, 1.8), screen(0, 2, -20, 50, 16, 'gradient', '#ff1010', '#1a5cff')];
      const r = rig(40, ['#ff1010', '#ffffff', '#1a5cff'], { trussY: 28, beams: 14 }, 16);
      return { objects: [...objects, ...r.objects], fixtures: r.fixtures };
    },
  }),
];

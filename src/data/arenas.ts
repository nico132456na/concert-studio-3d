export type ArenaKind = 'bowl' | 'stadium' | 'festival' | 'theater' | 'amphi' | 'warehouse' | 'empty';

export interface Rect {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

export interface ArenaDef {
  id: string;
  name: string;
  kind: ArenaKind;
  tagline: string;
  description: string;
  /** concert floor (stage at origin, audience toward +z) */
  floor: Rect;
  /** standing audience area */
  standing: Rect;
  ceiling: number | null;
  capacity: number;
  seating: string;
  lighting: string;
  structure: string;
  /** bowl params */
  bowl?: { cx: number; cz: number; a: number; b: number; n: number; tiers: number; rows: number; rowDepth: number; rise: number; gap: number; cut: number };
  floorColor: string;
  ambient: number;
  sky: 'indoor' | 'night' | 'dusk';
  camDist: number;
  /** recommended max stage width */
  stageWidth: number;
}

export const ARENAS: ArenaDef[] = [
  {
    id: 'basketball',
    name: 'Indoor Arena',
    kind: 'bowl',
    tagline: 'Classic 18,000-seat basketball arena',
    description: 'A tight oval bowl with two seating tiers and a steel roof grid. The standard for big indoor tours.',
    floor: { xMin: -20, xMax: 20, zMin: -14, zMax: 42 },
    standing: { xMin: -17, xMax: 17, zMin: 8, zMax: 39 },
    ceiling: 32,
    capacity: 18000,
    seating: '2 tiers, oval bowl + floor GA',
    lighting: 'Dark, enclosed',
    structure: 'Steel roof truss grid',
    bowl: { cx: 0, cz: 14, a: 21, b: 29, n: 3.2, tiers: 2, rows: 16, rowDepth: 0.9, rise: 0.48, gap: 4, cut: -6 },
    floorColor: '#2a2420',
    ambient: 0.16,
    sky: 'indoor',
    camDist: 62,
    stageWidth: 36,
  },
  {
    id: 'megadome',
    name: 'Mega Dome',
    kind: 'bowl',
    tagline: 'Massive 50,000-capacity indoor stadium',
    description: 'An enormous covered stadium with three steep tiers and a 62 m roof. Built for spectacle.',
    floor: { xMin: -38, xMax: 38, zMin: -22, zMax: 92 },
    standing: { xMin: -34, xMax: 34, zMin: 10, zMax: 86 },
    ceiling: 62,
    capacity: 50000,
    seating: '3 tiers, giant bowl + floor GA',
    lighting: 'Dark, enclosed',
    structure: 'Long-span roof ring',
    bowl: { cx: 0, cz: 35, a: 40, b: 60, n: 2.6, tiers: 3, rows: 20, rowDepth: 0.9, rise: 0.55, gap: 5, cut: -12 },
    floorColor: '#24211f',
    ambient: 0.14,
    sky: 'indoor',
    camDist: 120,
    stageWidth: 60,
  },
  {
    id: 'festival',
    name: 'Festival Field',
    kind: 'festival',
    tagline: 'Outdoor main stage for 90,000 fans',
    description: 'Open grass field under the night sky with delay towers, a mix tent and a tree line horizon.',
    floor: { xMin: -70, xMax: 70, zMin: -30, zMax: 150 },
    standing: { xMin: -55, xMax: 55, zMin: 9, zMax: 120 },
    ceiling: null,
    capacity: 90000,
    seating: 'Standing field',
    lighting: 'Night sky',
    structure: 'Open air, delay towers',
    floorColor: '#16200f',
    ambient: 0.22,
    sky: 'night',
    camDist: 130,
    stageWidth: 70,
  },
  {
    id: 'football',
    name: 'Football Stadium',
    kind: 'stadium',
    tagline: '70,000-seat open-air stadium',
    description: 'A rectangular bowl around a full pitch with floodlight masts and a ring of roof canopies.',
    floor: { xMin: -36, xMax: 36, zMin: -26, zMax: 106 },
    standing: { xMin: -32, xMax: 32, zMin: 10, zMax: 98 },
    ceiling: null,
    capacity: 70000,
    seating: '2 tiers around a pitch',
    lighting: 'Open sky + masts',
    structure: 'Cantilever roof canopy',
    bowl: { cx: 0, cz: 40, a: 40, b: 70, n: 8, tiers: 2, rows: 26, rowDepth: 0.85, rise: 0.55, gap: 6, cut: -14 },
    floorColor: '#1d3a17',
    ambient: 0.2,
    sky: 'dusk',
    camDist: 150,
    stageWidth: 70,
  },
  {
    id: 'theater',
    name: 'Concert Theater',
    kind: 'theater',
    tagline: 'Intimate 2,400-seat theater',
    description: 'A warm proscenium theater with raked stalls, a horseshoe balcony and an 18 m ceiling.',
    floor: { xMin: -16, xMax: 16, zMin: -10, zMax: 30 },
    standing: { xMin: -11, xMax: 11, zMin: 6, zMax: 12 },
    ceiling: 18,
    capacity: 2400,
    seating: 'Raked stalls + balcony',
    lighting: 'Warm house lights',
    structure: 'Proscenium arch',
    floorColor: '#2a1612',
    ambient: 0.22,
    sky: 'indoor',
    camDist: 38,
    stageWidth: 20,
  },
  {
    id: 'amphi',
    name: 'Amphitheater',
    kind: 'amphi',
    tagline: 'Open-air bowl for 15,000',
    description: 'A semicircular stone amphitheater carved into a hillside with a lawn at the top.',
    floor: { xMin: -26, xMax: 26, zMin: -14, zMax: 14 },
    standing: { xMin: -10, xMax: 10, zMin: 6, zMax: 12 },
    ceiling: null,
    capacity: 15000,
    seating: 'Stone tiers + lawn',
    lighting: 'Dusk sky',
    structure: 'Stage shell',
    floorColor: '#3a362f',
    ambient: 0.24,
    sky: 'dusk',
    camDist: 75,
    stageWidth: 30,
  },
  {
    id: 'warehouse',
    name: 'Industrial Warehouse',
    kind: 'warehouse',
    tagline: 'Raw concrete rave space for 4,000',
    description: 'Steel columns, roof trusses and a 14 m ceiling. Perfect for underground productions.',
    floor: { xMin: -22, xMax: 22, zMin: -14, zMax: 50 },
    standing: { xMin: -19, xMax: 19, zMin: 7, zMax: 46 },
    ceiling: 14,
    capacity: 4000,
    seating: 'Standing only',
    lighting: 'Dim industrial',
    structure: 'Steel columns + trusses',
    floorColor: '#4a4844',
    ambient: 0.18,
    sky: 'indoor',
    camDist: 55,
    stageWidth: 30,
  },
  {
    id: 'empty',
    name: 'Empty Space',
    kind: 'empty',
    tagline: 'Infinite blank canvas',
    description: 'No walls, no limits. A clean grid floor to design anything you can imagine.',
    floor: { xMin: -100, xMax: 100, zMin: -100, zMax: 100 },
    standing: { xMin: -30, xMax: 30, zMin: 10, zMax: 60 },
    ceiling: null,
    capacity: 0,
    seating: 'Custom',
    lighting: 'Studio void',
    structure: 'None',
    floorColor: '#121212',
    ambient: 0.22,
    sky: 'indoor',
    camDist: 60,
    stageWidth: 80,
  },
];

export const ARENA_BY_ID: Record<string, ArenaDef> = Object.fromEntries(ARENAS.map((a) => [a.id, a]));
export const getArena = (id: string) => ARENA_BY_ID[id] ?? ARENAS[0];

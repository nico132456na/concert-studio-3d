/** Static data for Career & Artist Life modes. All designs are original. */

export type TierId = 'emerging' | 'rising' | 'established' | 'superstar';
export type HomeId = 'apartment' | 'studioRes' | 'penthouse' | 'mansion' | 'estate';
export type VehicleId = 'sedan' | 'van' | 'suv' | 'ev' | 'sports' | 'limo';

export interface TierDef {
  id: TierId;
  label: string;
  xp: number;
  venues: string[];
  security: number;
  escorts: number;
  fans: number;
  paparazzi: number;
  crowdFill: number;
}

export const TIERS: TierDef[] = [
  { id: 'emerging', label: 'Emerging Artist', xp: 0, venues: ['theater', 'warehouse'], security: 0, escorts: 0, fans: 12, paparazzi: 1, crowdFill: 0.45 },
  { id: 'rising', label: 'Rising Star', xp: 1500, venues: ['theater', 'warehouse', 'hall', 'amphi', 'basketball'], security: 1, escorts: 1, fans: 28, paparazzi: 3, crowdFill: 0.7 },
  { id: 'established', label: 'Established Artist', xp: 5000, venues: ['hall', 'amphi', 'basketball', 'modern', 'megadome'], security: 2, escorts: 2, fans: 50, paparazzi: 5, crowdFill: 0.9 },
  { id: 'superstar', label: 'Global Superstar', xp: 15000, venues: ['theater', 'warehouse', 'hall', 'amphi', 'basketball', 'modern', 'megadome', 'football', 'festival'], security: 4, escorts: 3, fans: 80, paparazzi: 8, crowdFill: 1 },
];
export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t])) as Record<TierId, TierDef>;

export function tierFor(xp: number, sandbox = false): TierDef {
  if (sandbox) return TIERS[3];
  let t = TIERS[0];
  for (const d of TIERS) if (xp >= d.xp) t = d;
  return t;
}
export const tierIndex = (t: TierId) => TIERS.findIndex((d) => d.id === t);

export interface HomeDef {
  id: HomeId;
  label: string;
  tier: TierId;
  price: number;
  blurb: string;
  floor: string;
  wall: string;
  accent: string;
  view: 'city' | 'garden' | 'hills';
  /** room scale (1 = base layout) */
  scale: number;
}

export const HOMES: HomeDef[] = [
  { id: 'apartment', label: 'City Apartment', tier: 'emerging', price: 0, blurb: 'A small loft with a bedroom studio corner.', floor: '#6b4a32', wall: '#d8d2c8', accent: '#c0603a', view: 'city', scale: 0.85 },
  { id: 'studioRes', label: 'Studio Residence', tier: 'rising', price: 40000, blurb: 'Live-in recording studio with a proper live room.', floor: '#3a3a3e', wall: '#2a2c30', accent: '#4da3ff', view: 'city', scale: 0.95 },
  { id: 'penthouse', label: 'Skyline Penthouse', tier: 'established', price: 250000, blurb: 'Floor-to-ceiling glass over the city.', floor: '#e8e4dc', wall: '#f4f2ee', accent: '#d9a740', view: 'city', scale: 1.05 },
  { id: 'mansion', label: 'Hillside Mansion', tier: 'superstar', price: 1200000, blurb: 'Marble, gold and a garage for the whole fleet.', floor: '#f0ece4', wall: '#ece6da', accent: '#d9a740', view: 'hills', scale: 1.2 },
  { id: 'estate', label: 'Private Estate', tier: 'superstar', price: 3500000, blurb: 'Gated grounds, gardens and a private studio wing.', floor: '#5a4030', wall: '#e2dccf', accent: '#3a6b3a', view: 'garden', scale: 1.3 },
];
export const HOME_BY_ID = Object.fromEntries(HOMES.map((h) => [h.id, h])) as Record<HomeId, HomeDef>;

export interface VehicleDef {
  id: VehicleId;
  label: string;
  tier: TierId;
  price: number;
  /** body length, width, height, cabin height */
  dims: [number, number, number, number];
  top: number;
  accel: number;
  colors: string[];
}

export const VEHICLES: VehicleDef[] = [
  { id: 'sedan', label: 'Executive Sedan', tier: 'emerging', price: 0, dims: [4.9, 1.9, 0.75, 0.55], top: 22, accel: 6, colors: ['#111111', '#c0c0c0', '#20283a', '#f2f2f2'] },
  { id: 'van', label: 'Tour Van', tier: 'emerging', price: 0, dims: [5.4, 2.0, 1.1, 0.95], top: 18, accel: 4.5, colors: ['#f2f2f2', '#111111', '#3a3a3e'] },
  { id: 'suv', label: 'Armoured SUV', tier: 'rising', price: 90000, dims: [5.2, 2.05, 1.0, 0.75], top: 22, accel: 5.5, colors: ['#111111', '#20283a', '#3a3a3e', '#f2f2f2'] },
  { id: 'ev', label: 'Electric GT', tier: 'established', price: 130000, dims: [4.9, 1.95, 0.7, 0.5], top: 30, accel: 9, colors: ['#f2f2f2', '#2a7bff', '#111111', '#ff2a4a'] },
  { id: 'sports', label: 'Supercar', tier: 'established', price: 320000, dims: [4.6, 2.0, 0.55, 0.42], top: 36, accel: 11, colors: ['#ff2a4a', '#ffc21a', '#3ddc84', '#111111', '#f2f2f2', '#ff7a1a'] },
  { id: 'limo', label: 'Stretch Limousine', tier: 'superstar', price: 450000, dims: [8.4, 2.0, 0.8, 0.6], top: 20, accel: 4, colors: ['#111111', '#f2f2f2', '#d9a740'] },
];
export const VEHICLE_BY_ID = Object.fromEntries(VEHICLES.map((v) => [v.id, v])) as Record<VehicleId, VehicleDef>;

export const GENRES = ['Pop', 'Hip-hop', 'R&B', 'Rock', 'Latin', 'K-pop', 'Country', 'Electronic', 'Alternative'];

export const unlocked = (tier: TierId, current: TierDef) => tierIndex(tier) <= tierIndex(current.id);

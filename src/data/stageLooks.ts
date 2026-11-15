import type { AvatarLook, Project } from '../types';

/** Original performer outfits (generic styles, not copies of any real artist's costume). */
export const STAGE_LOOKS: { id: string; name: string; look: Partial<AvatarLook> }[] = [
  { id: 'pop', name: 'Stadium Pop', look: { top: 'jacket', topColor: '#d9a740', bottom: 'shorts', bottomColor: '#111111', shoes: '#f2f2f2', glasses: false, chain: false, cap: false, gloves: false } },
  { id: 'rap', name: 'Rap Superstar', look: { top: 'hoodie', topColor: '#111111', bottom: 'cargo', bottomColor: '#3a3a3e', shoes: '#f2f2f2', glasses: true, chain: true, cap: true, gloves: false } },
  { id: 'rock', name: 'Rock Frontman', look: { top: 'jacket', topColor: '#141414', bottom: 'jeans', bottomColor: '#1c2230', shoes: '#111111', glasses: false, chain: false, cap: false, gloves: true } },
  { id: 'idol', name: 'K-pop Idol', look: { top: 'suit', topColor: '#f2f2f2', bottom: 'suit', bottomColor: '#f2f2f2', shoes: '#f2f2f2', glasses: false, chain: false, cap: false, gloves: false } },
  { id: 'latin', name: 'Latin Heat', look: { top: 'tank', topColor: '#ff2a4a', bottom: 'jeans', bottomColor: '#e8e4dc', shoes: '#d9a740', glasses: true, chain: true, cap: false, gloves: false } },
  { id: 'indie', name: 'Indie Night', look: { top: 'tee', topColor: '#c8a040', bottom: 'jeans', bottomColor: '#2a4a7a', shoes: '#f2f2f2', glasses: false, chain: false, cap: false, gloves: false } },
  { id: 'black', name: 'All Black', look: { top: 'suit', topColor: '#0b0b0d', bottom: 'suit', bottomColor: '#0b0b0d', shoes: '#0b0b0d', glasses: true, chain: false, cap: false, gloves: false } },
  { id: 'festival', name: 'Festival Headliner', look: { top: 'jersey', topColor: '#7dff4d', bottom: 'shorts', bottomColor: '#111111', shoes: '#f2f2f2', glasses: true, chain: false, cap: true, gloves: false } },
];

function sat(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

/** The stage's signature colours, read from its lighting rig (most common saturated colours first). */
export function stageColours(p: Project | null): string[] {
  if (!p) return [];
  const count = new Map<string, number>();
  for (const f of p.fixtures) count.set(f.color.toLowerCase(), (count.get(f.color.toLowerCase()) ?? 0) + 1);
  const ranked = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const colourful = ranked.filter((c) => sat(c) > 0.35);
  return [...colourful, ...ranked.filter((c) => !colourful.includes(c))].slice(0, 3);
}

/** Dress the performer in the stage's colours, keeping their style choices. */
export function matchStage(look: AvatarLook, p: Project | null): Partial<AvatarLook> {
  const c = stageColours(p);
  if (!c.length) return {};
  return { topColor: c[0], bottomColor: c[2] && sat(c[2]) < 0.35 ? c[2] : '#111111', shoes: c[1] ?? look.shoes };
}

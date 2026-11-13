import type { MaterialSpec } from '../types';

export interface MaterialPreset extends MaterialSpec {
  label: string;
}

const m = (preset: string, label: string, p: Partial<MaterialSpec>): MaterialPreset => ({
  preset,
  label,
  color: '#222222',
  metalness: 0,
  roughness: 0.6,
  reflect: 0.3,
  opacity: 1,
  emissive: '#000000',
  emissiveIntensity: 0,
  texture: 'none',
  ...p,
});

export const MATERIAL_PRESETS: MaterialPreset[] = [
  m('matteBlack', 'Matte Black', { color: '#141414', roughness: 0.9, reflect: 0.1 }),
  m('glossBlack', 'Glossy Black', { color: '#0a0a0a', roughness: 0.12, metalness: 0.2, reflect: 0.9 }),
  m('white', 'White Paint', { color: '#e8e8e6', roughness: 0.55, reflect: 0.3 }),
  m('aluminum', 'Brushed Aluminum', { color: '#b9bcc0', metalness: 1, roughness: 0.38, reflect: 0.8, texture: 'brushed' }),
  m('steel', 'Stainless Steel', { color: '#8d9196', metalness: 1, roughness: 0.25, reflect: 0.8 }),
  m('chrome', 'Chrome', { color: '#f2f2f2', metalness: 1, roughness: 0.04, reflect: 1 }),
  m('concrete', 'Concrete', { color: '#77756f', roughness: 0.95, reflect: 0.05, texture: 'concrete' }),
  m('wood', 'Wood', { color: '#7a5233', roughness: 0.7, reflect: 0.15, texture: 'wood' }),
  m('glass', 'Clear Glass', { color: '#cfe8ff', metalness: 0.1, roughness: 0.03, reflect: 1, opacity: 0.22 }),
  m('frosted', 'Frosted Glass', { color: '#e6eef5', roughness: 0.5, reflect: 0.5, opacity: 0.55 }),
  m('mirror', 'Mirror', { color: '#ffffff', metalness: 1, roughness: 0, reflect: 1 }),
  m('fabric', 'Stage Fabric', { color: '#1d1d22', roughness: 1, reflect: 0.05, texture: 'fabric' }),
  m('rubber', 'Rubber', { color: '#1b1b1b', roughness: 0.85, reflect: 0.05, texture: 'diamond' }),
  m('led', 'LED Surface', { color: '#050505', roughness: 0.35, reflect: 0.3 }),
  m('gold', 'Polished Gold', { color: '#d9a740', metalness: 1, roughness: 0.2, reflect: 0.9 }),
  m('copper', 'Copper', { color: '#b8693d', metalness: 1, roughness: 0.3, reflect: 0.8 }),
  m('redVelvet', 'Red Velvet', { color: '#6b0d12', roughness: 1, reflect: 0.02, texture: 'fabric' }),
  m('carbon', 'Carbon Fiber', { color: '#202226', metalness: 0.3, roughness: 0.35, reflect: 0.5, texture: 'carbon' }),
  m('neon', 'Glow Paint', { color: '#ffffff', roughness: 0.6, emissive: '#7a3cff', emissiveIntensity: 2 }),
  m('steelGrid', 'Steel Grating', { color: '#5a5d61', metalness: 0.9, roughness: 0.5, reflect: 0.5, texture: 'grid' }),
];

export const MATERIAL_BY_ID: Record<string, MaterialPreset> = Object.fromEntries(MATERIAL_PRESETS.map((p) => [p.preset, p]));

export function mat(preset: string, overrides: Partial<MaterialSpec> = {}): MaterialSpec {
  const p = MATERIAL_BY_ID[preset] ?? MATERIAL_BY_ID.matteBlack;
  const { label: _label, ...spec } = p;
  return { ...spec, ...overrides };
}

export const COLOR_SWATCHES = [
  '#ffffff', '#d9d9d9', '#8c8c8c', '#3a3a3a', '#111111',
  '#ff2a2a', '#ff7a1a', '#ffc21a', '#f5e663', '#7dff4d',
  '#1aff9c', '#1ae0ff', '#2a7bff', '#3d2aff', '#9b2aff',
  '#ff2ad4', '#ff6b9d', '#c49a6c', '#d9a740', '#5a7a99',
];

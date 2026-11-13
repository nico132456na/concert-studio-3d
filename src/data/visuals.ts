import type { LedLook, LightPreset, VisualId } from '../types';

export interface VisualDef {
  id: VisualId;
  label: string;
  group: 'Abstract' | 'Geometric' | 'Nature' | 'Minimal' | 'Scenic' | 'Content';
  mode: number; // shader mode index
}

export const VISUALS: VisualDef[] = [
  { id: 'off', label: 'Off', group: 'Minimal', mode: 0 },
  { id: 'solid', label: 'Solid Color', group: 'Minimal', mode: 1 },
  { id: 'gradient', label: 'Gradient', group: 'Abstract', mode: 2 },
  { id: 'plasma', label: 'Plasma', group: 'Abstract', mode: 3 },
  { id: 'geometric', label: 'Geometry', group: 'Geometric', mode: 4 },
  { id: 'grid', label: 'Neon Grid', group: 'Geometric', mode: 5 },
  { id: 'particles', label: 'Particles', group: 'Abstract', mode: 6 },
  { id: 'fire', label: 'Fire', group: 'Nature', mode: 7 },
  { id: 'water', label: 'Water', group: 'Nature', mode: 8 },
  { id: 'bars', label: 'Spectrum', group: 'Geometric', mode: 9 },
  { id: 'minimal', label: 'Single Line', group: 'Minimal', mode: 10 },
  { id: 'noise', label: 'Moving Texture', group: 'Abstract', mode: 11 },
  { id: 'tunnel', label: 'Tunnel', group: 'Geometric', mode: 12 },
  { id: 'checker', label: 'Checker Flash', group: 'Geometric', mode: 13 },
  { id: 'skyline', label: 'Night City', group: 'Scenic', mode: 14 },
  { id: 'eclipse', label: 'Eclipse', group: 'Scenic', mode: 15 },
  { id: 'clouds', label: 'Clouds', group: 'Nature', mode: 16 },
  { id: 'text', label: 'Typography', group: 'Content', mode: 17 },
  { id: 'media', label: 'My Image / Video', group: 'Content', mode: 18 },
];

export const VISUAL_BY_ID: Record<string, VisualDef> = Object.fromEntries(VISUALS.map((v) => [v.id, v]));

export interface VisualPreset extends LedLook {
  name: string;
}

/** Curated looks, several inspired by artist aesthetics (original artwork, generated in real time). */
export const VISUAL_PRESETS: VisualPreset[] = [
  { name: 'Ocean Drift', visual: 'water', color1: '#0a3d91', color2: '#1ae0ff', brightness: 1, speed: 0.8 },
  { name: 'Inferno', visual: 'fire', color1: '#ff2a00', color2: '#ffc21a', brightness: 1.2, speed: 1.2 },
  { name: 'Red Eclipse', visual: 'eclipse', color1: '#ff1a1a', color2: '#200000', brightness: 1.1, speed: 0.5 },
  { name: 'After Dark City', visual: 'skyline', color1: '#ff2a4a', color2: '#140818', brightness: 1, speed: 0.6 },
  { name: 'Ultraviolet', visual: 'plasma', color1: '#3d2aff', color2: '#ff2ad4', brightness: 1, speed: 0.8 },
  { name: 'Synthwave Grid', visual: 'grid', color1: '#ff2ad4', color2: '#1a0640', brightness: 1, speed: 1 },
  { name: 'Mono Line', visual: 'minimal', color1: '#ffffff', color2: '#000000', brightness: 1, speed: 0.5 },
  { name: 'Heaven Clouds', visual: 'clouds', color1: '#9ec9ff', color2: '#ffffff', brightness: 0.9, speed: 0.4 },
  { name: 'Warp Tunnel', visual: 'tunnel', color1: '#1ae0ff', color2: '#3d2aff', brightness: 1, speed: 1.5 },
  { name: 'Star Field', visual: 'particles', color1: '#ffffff', color2: '#020210', brightness: 1, speed: 1 },
  { name: 'Bass Spectrum', visual: 'bars', color1: '#7dff4d', color2: '#1aff9c', brightness: 1, speed: 1.5 },
  { name: 'Hard Strobe', visual: 'checker', color1: '#ffffff', color2: '#000000', brightness: 1.2, speed: 2 },
  { name: 'Golden Hour', visual: 'gradient', color1: '#ff7a1a', color2: '#5a1a6e', brightness: 1, speed: 0.4 },
  { name: 'Liquid Chrome', visual: 'noise', color1: '#d9d9d9', color2: '#202226', brightness: 1, speed: 0.7 },
  { name: 'Crystal Shapes', visual: 'geometric', color1: '#ffffff', color2: '#2a7bff', brightness: 1, speed: 1 },
  { name: 'Blackout', visual: 'off', color1: '#000000', color2: '#000000', brightness: 0, speed: 1 },
];

export const LIGHT_PRESETS: LightPreset[] = [
  { id: 'warm', name: 'Warm White', colors: ['#ffd7a3'], intensity: 0.9 },
  { id: 'cold', name: 'Cold White', colors: ['#dce9ff'], intensity: 1 },
  { id: 'red', name: 'Deep Red', colors: ['#ff1010'], intensity: 1 },
  { id: 'blue', name: 'Electric Blue', colors: ['#1a5cff', '#1ae0ff'], intensity: 1 },
  { id: 'purple', name: 'Purple', colors: ['#8a2aff', '#c42aff'], intensity: 1 },
  { id: 'amber', name: 'Amber', colors: ['#ff9a1a'], intensity: 0.9 },
  { id: 'mono', name: 'Monochrome', colors: ['#ffffff', '#9a9a9a'], intensity: 0.85 },
  { id: 'rainbow', name: 'Rainbow', colors: ['#ff2a2a', '#ffc21a', '#7dff4d', '#1ae0ff', '#3d2aff', '#ff2ad4'], intensity: 1, effect: 'rainbow' },
  { id: 'blackout', name: 'Full Blackout', colors: ['#000000'], intensity: 0, blackout: true },
];

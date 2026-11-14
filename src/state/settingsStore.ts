import { create } from 'zustand';

export type Graphics = 'auto' | 'low' | 'medium' | 'high' | 'ultra';
export type Quality = 'low' | 'medium' | 'high' | 'ultra';

export interface Settings {
  graphics: Graphics;
  showStats: boolean;
  rotateSpeed: number;
  zoomSpeed: number;
  editorMode: 'beginner' | 'advanced';
  lightingMode: 'simple' | 'advanced';
  music: boolean;
  volume: number;
  tutorialDone: boolean;
  /** construction / viewing light controls */
  exposure: number;
  ambient: number;
  envBright: number;
  shadow: number;
  outlines: boolean;
}

const KEY = 'cs3d-settings';

const defaults: Settings = {
  graphics: 'auto',
  showStats: false,
  rotateSpeed: 0.8,
  zoomSpeed: 1,
  editorMode: 'beginner',
  lightingMode: 'simple',
  music: true,
  volume: 0.6,
  tutorialDone: false,
  exposure: 1,
  ambient: 1,
  envBright: 1,
  shadow: 0.7,
  outlines: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return defaults;
}

interface SettingsState extends Settings {
  /** quality actually in use (auto resolves to one of these) */
  effective: Quality;
  update: (p: Partial<Settings>) => void;
  setEffective: (q: Quality) => void;
}

function guessQuality(): Quality {
  const mem = (navigator as any).deviceMemory as number | undefined;
  const cores = navigator.hardwareConcurrency || 4;
  if ((mem && mem <= 2) || cores <= 2) return 'low';
  if (cores >= 8) return 'high';
  return 'medium';
}

export const useSettings = create<SettingsState>((set, get) => {
  const s = load();
  return {
    ...s,
    effective: s.graphics === 'auto' ? guessQuality() : s.graphics,
    update: (p) => {
      const next = { ...get(), ...p };
      const { update: _u, setEffective: _s, effective: _e, ...persist } = next;
      try {
        localStorage.setItem(KEY, JSON.stringify(persist));
      } catch {
        /* ignore */
      }
      set({ ...p, ...(p.graphics && p.graphics !== 'auto' ? { effective: p.graphics } : {}) });
    },
    setEffective: (q) => set({ effective: q }),
  };
});

export const QUALITY: Record<Quality, { dpr: number; lights: number; bloom: boolean; crowd: number; shadows: boolean; beamSegs: number; ao: boolean; smaa: boolean; seats: boolean; label: string }> = {
  low: { dpr: 1, lights: 4, bloom: false, crowd: 1500, shadows: false, beamSegs: 12, ao: false, smaa: false, seats: false, label: 'Performance' },
  medium: { dpr: 1.5, lights: 8, bloom: true, crowd: 4500, shadows: false, beamSegs: 18, ao: false, smaa: true, seats: false, label: 'Balanced' },
  high: { dpr: 2, lights: 12, bloom: true, crowd: 9000, shadows: true, beamSegs: 24, ao: true, smaa: true, seats: true, label: 'High Quality' },
  ultra: { dpr: 2, lights: 16, bloom: true, crowd: 15000, shadows: true, beamSegs: 32, ao: true, smaa: true, seats: true, label: 'Ultra' },
};

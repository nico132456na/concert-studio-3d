import { create } from 'zustand';

export type Graphics = 'auto' | 'low' | 'medium' | 'high';

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
  effective: 'low' | 'medium' | 'high';
  update: (p: Partial<Settings>) => void;
  setEffective: (q: 'low' | 'medium' | 'high') => void;
}

function guessQuality(): 'low' | 'medium' | 'high' {
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

export const QUALITY = {
  low: { dpr: 1, lights: 4, bloom: false, crowd: 1500, shadows: false, beamSegs: 12 },
  medium: { dpr: 1.5, lights: 8, bloom: true, crowd: 4500, shadows: false, beamSegs: 18 },
  high: { dpr: 2, lights: 12, bloom: true, crowd: 9000, shadows: true, beamSegs: 24 },
};

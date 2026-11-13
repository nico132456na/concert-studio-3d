import { create } from 'zustand';
import type { Atmosphere, FixtureLook, LedLook, LightScene } from '../types';

/**
 * Show / playback state. Scene playback writes an *override layer* here instead of
 * editing the project, so running a show never pollutes undo history or saved data.
 */
interface ShowState {
  playing: boolean;
  cueIndex: number;
  cueStart: number; // performance.now() seconds when current cue started
  pausedAt: number | null;
  activeSceneId: string | null;
  override: { fixtures: Record<string, FixtureLook>; screens: Record<string, LedLook>; atmosphere?: Partial<Atmosphere> } | null;
  fadeTime: number;
  blackout: boolean;
  master: number;
  liveColor: string | null;
  liveVisual: LedLook | null;
  liveEffect: 'none' | 'strobe' | 'pulse' | 'rainbow';
  fx: { type: 'confetti' | 'pyro' | 'smoke' | 'flash'; t: number }[];
  bpm: number;
  hype: number;
  phoneLights: boolean;
  set: (p: Partial<ShowState>) => void;
  activateScene: (scene: LightScene, fade?: number) => void;
  clearOverride: () => void;
  trigger: (type: ShowState['fx'][number]['type']) => void;
}

export const useShow = create<ShowState>((set, get) => ({
  playing: false,
  cueIndex: 0,
  cueStart: 0,
  pausedAt: null,
  activeSceneId: null,
  override: null,
  fadeTime: 1,
  blackout: false,
  master: 1,
  liveColor: null,
  liveVisual: null,
  liveEffect: 'none',
  fx: [],
  bpm: 124,
  hype: 0,
  phoneLights: false,
  set: (p) => set(p),
  activateScene: (scene, fade) =>
    set({
      activeSceneId: scene.id,
      override: { fixtures: scene.fixtures, screens: scene.screens, atmosphere: scene.atmosphere },
      fadeTime: fade ?? scene.fade,
      liveColor: null,
      liveVisual: null,
    }),
  clearOverride: () => set({ override: null, activeSceneId: null, playing: false, liveColor: null, liveVisual: null, liveEffect: 'none', blackout: false }),
  trigger: (type) => set({ fx: [...get().fx.filter((f) => performance.now() / 1000 - f.t < 6), { type, t: performance.now() / 1000 }] }),
}));

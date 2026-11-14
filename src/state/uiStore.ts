import { create } from 'zustand';
import type { Vec3 } from '../types';

export type Screen = 'menu' | 'arenas' | 'gallery' | 'projects' | 'editor' | 'live' | 'performer';
export type Tool = 'select' | 'move' | 'rotate' | 'scale';
export type LeftPanel = 'add' | 'layers' | null;
export type RightTab = 'object' | 'material' | 'led' | 'light';
export type ViewMode = 'persp' | 'top' | 'front' | 'side' | 'audience';
export type CameraPresetId =
  | 'front' | 'rear' | 'left' | 'right' | 'bird' | 'top' | 'side' | 'performer' | 'overview' | 'free' | 'audience' | 'reset' | 'cinematic' | 'custom';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

interface UIState {
  screen: Screen;
  selection: string[];
  tool: Tool;
  left: LeftPanel;
  rightOpen: boolean;
  rightTab: RightTab;
  deskOpen: boolean;
  cameraMenu: boolean;
  view: ViewMode;
  hideUI: boolean;
  multiSelect: boolean;
  snapGrid: boolean;
  gridSize: number;
  snapObjects: boolean;
  showGrid: boolean;
  showCrowd: boolean;
  camRequest: { id: CameraPresetId; n: number; focus?: Vec3; radius?: number; pose?: { pos: Vec3; target: Vec3 } } | null;
  toasts: Toast[];
  /** counters used by the tutorial */
  stats: { moves: number; materials: number; camera: number; saves: number; stage: number; led: number; light: number; audio: number; perform: number };
  tutorialStep: number | null;
  guides: { x?: number; z?: number } | null;
  dragging: boolean;
  settingsOpen: boolean;
  layersOpen: boolean;
  showCoverage: boolean;
  showFixtures: boolean;
  lightEnv: 'construction' | 'preview' | 'concert' | 'cinematic';
  set: (p: Partial<UIState>) => void;
  select: (ids: string[], additive?: boolean) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  requestCamera: (id: CameraPresetId, focus?: Vec3, radius?: number, pose?: { pos: Vec3; target: Vec3 }) => void;
  bump: (k: keyof UIState['stats']) => void;
}

let toastId = 1;

export const useUI = create<UIState>((set, get) => ({
  screen: 'menu',
  selection: [],
  tool: 'move',
  left: null,
  rightOpen: true,
  rightTab: 'object',
  deskOpen: false,
  cameraMenu: false,
  view: 'persp',
  hideUI: false,
  multiSelect: false,
  snapGrid: true,
  gridSize: 0.5,
  snapObjects: true,
  showGrid: true,
  showCrowd: false,
  camRequest: null,
  toasts: [],
  stats: { moves: 0, materials: 0, camera: 0, saves: 0, stage: 0, led: 0, light: 0, audio: 0, perform: 0 },
  tutorialStep: null,
  guides: null,
  dragging: false,
  settingsOpen: false,
  layersOpen: false,
  showCoverage: false,
  showFixtures: true,
  lightEnv: 'construction',
  set: (p) => set(p),
  select: (ids, additive) => {
    if (additive) {
      const cur = new Set(get().selection);
      const allIn = ids.every((id) => cur.has(id));
      ids.forEach((id) => (allIn ? cur.delete(id) : cur.add(id)));
      set({ selection: Array.from(cur) });
    } else set({ selection: ids });
  },
  toast: (text, kind = 'info') => {
    const t = { id: toastId++, text, kind };
    set({ toasts: [...get().toasts.slice(-2), t] });
    setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== t.id) }), kind === 'error' ? 6000 : 2600);
  },
  requestCamera: (id, focus, radius, pose) => set({ camRequest: { id, n: Date.now() + Math.random(), focus, radius, pose } }),
  bump: (k) => set({ stats: { ...get().stats, [k]: get().stats[k] + 1 } }),
}));

export const toast = (text: string, kind?: Toast['kind']) => useUI.getState().toast(text, kind);

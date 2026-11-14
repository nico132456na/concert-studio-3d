import * as THREE from 'three';
import { create } from 'zustand';

export type LifePhase = 'home' | 'drive' | 'arrival';
export type LifeCam = 'third' | 'first' | 'chase' | 'hood' | 'cinematic' | 'top';

export interface Interactable {
  id: string;
  x: number;
  z: number;
  r: number;
  label: string;
  actions: { label: string; run: () => void }[];
}

export interface Dialog {
  name: string;
  role: string;
  lines: string[];
  options: { label: string; run: () => void }[];
}

interface LifeUI {
  phase: LifePhase;
  cam: LifeCam;
  prompt: Interactable | null;
  dialog: Dialog | null;
  closet: boolean;
  showPicker: boolean;
  recording: number; // -1 idle, 0..1 progress
  autopilot: boolean;
  fade: number;
  speedKmh: number;
  distLeft: number;
  location: string;
  flashes: number;
  set: (p: Partial<LifeUI>) => void;
}

export const useLife = create<LifeUI>((set) => ({
  phase: 'home',
  cam: 'third',
  prompt: null,
  dialog: null,
  closet: false,
  showPicker: false,
  recording: -1,
  autopilot: true,
  fade: 0,
  speedKmh: 0,
  distLeft: 0,
  location: 'Bedroom',
  flashes: 0,
  set: (p) => set(p),
}));

/** Interactables registered by the active scene (read every frame by the rig). */
export const interactables: { list: Interactable[] } = { list: [] };

/** Hot vehicle state for the drive. */
export const car = {
  pos: new THREE.Vector3(),
  yaw: 0,
  speed: 0,
  steer: 0,
  trail: [] as THREE.Vector3[],
  trailDist: 0,
  wp: 0,
};

/** Walkable test for the active on-foot scene. */
export const walkArea: { test: (x: number, z: number) => boolean } = { test: () => true };

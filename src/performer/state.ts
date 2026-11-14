import * as THREE from 'three';
import { create } from 'zustand';
import type { AvatarLook, PerformerData } from '../types';
import { uid } from '../util/misc';

export type CamMode = 'third' | 'first' | 'crowd' | 'drone' | 'stagefront' | 'auto' | 'wardrobe';
export type Action = 'none' | 'dance' | 'wave' | 'handsUp' | 'point' | 'jump' | 'bow';

/** Hot, per-frame performer state (mutated in the render loop, never through React). */
export const player = {
  active: false,
  pos: new THREE.Vector3(-8, -8, -15),
  vel: new THREE.Vector3(),
  yaw: Math.PI / 2,
  camYaw: Math.PI / 2,
  camPitch: 0.12,
  speed: 0, // 0..1 walk, >1 run
  onGround: true,
  action: 'none' as Action,
  actionT: 0,
  phase: 0,
  hype: 0.3,
  hypeBoost: 0,
  liftT: -1, // entrance lift animation progress
  liftStart: 0,
  liftFrom: 0,
  liftTo: 0,
  /** seconds on stage & accumulated hype (career scoring) */
  stageTime: 0,
  hypeSum: 0,
};

/** Touch / keyboard input, written by the HUD and read by the controller. */
export const input = {
  moveX: 0,
  moveY: 0,
  lookDX: 0,
  lookDY: 0,
  run: false,
  jump: false,
};

export const DEFAULT_LOOK: AvatarLook = {
  skin: '#c68a5e',
  hair: 'short',
  hairColor: '#1a1410',
  top: 'jacket',
  topColor: '#111111',
  bottom: 'jeans',
  bottomColor: '#20283a',
  shoes: '#f2f2f2',
  glasses: true,
  chain: true,
  cap: false,
  gloves: false,
  height: 1,
};

export function defaultPerformer(): PerformerData {
  return { name: 'You', look: { ...DEFAULT_LOOK }, outfits: [{ id: uid('fit'), name: 'Main Look', look: { ...DEFAULT_LOOK } }] };
}

interface PerformerUI {
  cam: CamMode;
  location: string;
  nearLift: boolean;
  nearArenaDoor: boolean;
  entrance: 'none' | 'fade' | 'reveal';
  fade: number; // 0..1 overlay
  wardrobe: boolean;
  map: boolean;
  recording: boolean;
  onStage: boolean;
  set: (p: Partial<PerformerUI>) => void;
}

export const usePerformer = create<PerformerUI>((set) => ({
  cam: 'third',
  location: 'Artist Dressing Room',
  nearLift: false,
  nearArenaDoor: false,
  entrance: 'none',
  fade: 0,
  wardrobe: false,
  map: false,
  recording: false,
  onStage: false,
  set: (p) => set(p),
}));

export function doAction(a: Action) {
  player.action = a;
  player.actionT = 0;
  if (a === 'jump' && player.onGround) {
    player.vel.y = 5.2;
    player.onGround = false;
  }
  if (a !== 'none') player.hypeBoost = Math.min(1.5, player.hypeBoost + (a === 'dance' ? 0.5 : 0.35));
}

import { useUI, toast } from '../state/uiStore';
import { useProject, getProject } from '../state/projectStore';
import { useShow } from '../state/showStore';
import { player, usePerformer, defaultPerformer } from './state';
import { ROOM_BY_ID, BACKSTAGE_Y, type RoomId } from '../data/backstage';
import { stageArrival } from '../three/PerformerRig';
import { crowd } from '../audio/crowd';
import { beat } from '../audio/beat';
import { ensureShow } from '../ui/editor/actions';
import { show } from '../ui/showControl';
import { getArena } from '../data/arenas';
import { finishCareerShow } from '../life/actions';

let timers: number[] = [];
const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
const clearTimers = () => {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
};

export function teleportRoom(id: RoomId) {
  const r = ROOM_BY_ID[id];
  if (!r) return;
  player.pos.set(r.spawn[0], BACKSTAGE_Y, r.spawn[1]);
  player.vel.set(0, 0, 0);
  player.yaw = player.camYaw = r.facing;
  player.liftT = -1;
  usePerformer.getState().set({ map: false });
}

export function enterPerformer() {
  const p = getProject();
  if (!p) return;
  if (!p.performer) useProject.getState().mutate((pp) => ({ ...pp, performer: defaultPerformer() }), { history: false });
  ensureShow(getProject()!);
  clearTimers();
  useShow.getState().clearOverride();
  usePerformer.getState().set({ cam: 'third', entrance: 'none', fade: 0, wardrobe: false, map: false, recording: false });
  teleportRoom('dressing');
  useUI.getState().set({ screen: 'performer', selection: [], deskOpen: false, left: null, cameraMenu: false });
  useUI.getState().bump('perform');
  crowd.start();
}

export function exitPerformer() {
  clearTimers();
  crowd.stop();
  beat.stop();
  useShow.getState().clearOverride();
  useShow.getState().set({ hype: 0, phoneLights: false });
  if (finishCareerShow()) return;
  useUI.getState().set({ screen: 'editor' });
}

/** The entrance: arena goes dark, the performer rises on the lift, the stadium is revealed. */
export function goOnStage() {
  const p = getProject();
  if (!p) return;
  clearTimers();
  const ui = usePerformer.getState();
  ui.set({ entrance: 'fade', fade: 1 });
  crowd.roar(0.6);
  later(900, () => {
    const s = useShow.getState();
    s.set({ blackout: true });
    const [x, y, z] = stageArrival(p.objects);
    player.pos.set(x, y - 2.2, z);
    player.liftFrom = y - 2.2;
    player.liftTo = y;
    player.liftT = 0;
    player.liftStart = performance.now();
    player.yaw = 0;
    player.camYaw = 0;
    player.camPitch = 0.1;
    usePerformer.getState().set({ entrance: 'reveal', fade: 0 });
  });
  later(1700, () => {
    const pr = getProject();
    const intro = pr?.scenes[0];
    useShow.getState().set({ blackout: false });
    if (intro) useShow.getState().activateScene(intro, 2.5);
    crowd.roar(1);
  });
  later(4300, () => {
    usePerformer.getState().set({ entrance: 'none', cam: 'third' });
    show.play(true);
    crowd.roar(1.2);
    player.hypeBoost = 1;
  });
}

export function goBackstage() {
  clearTimers();
  usePerformer.getState().set({ entrance: 'none', fade: 0 });
  player.pos.set(0, BACKSTAGE_Y, -4.5);
  player.yaw = player.camYaw = Math.PI;
  player.liftT = -1;
}

export function toArenaFloor() {
  const p = getProject();
  if (!p) return;
  const arena = getArena(p.arenaId);
  const [x, , z] = stageArrival(p.objects);
  const main = p.objects.filter((o) => o.tag === 'main');
  const halfW = main.length ? Math.max(...main.map((o) => Math.abs(o.pos[0] - x) + o.size[0] / 2)) : 8;
  const nx = Math.min(arena.floor.xMax - 2, x + halfW + 3);
  player.pos.set(nx, 0, Math.max(arena.floor.zMin + 2, z + 4));
  player.yaw = player.camYaw = -Math.PI / 2;
  player.liftT = -1;
  usePerformer.getState().set({ map: false });
  toast('You are on the arena floor — find the stairs onto the stage');
}

export function teleportStage(where: 'stage' | 'runway') {
  const p = getProject();
  if (!p) return;
  if (where === 'stage') {
    const [x, y, z] = stageArrival(p.objects);
    player.pos.set(x, y, z);
  } else {
    // furthest deck toward the audience
    const decks = p.objects.filter((o) => o.tag === 'main' || ['runway', 'bstage', 'circlePlatform', 'diamond'].includes(o.kind));
    if (!decks.length) return teleportStage('stage');
    const far = decks.reduce((a, b) => (b.pos[2] + b.size[2] / 2 > a.pos[2] + a.size[2] / 2 ? b : a));
    const z = far.pos[2] + far.size[2] / 2 - 1.5;
    player.pos.set(far.pos[0], far.pos[1] + far.size[1], z);
  }
  player.yaw = player.camYaw = 0;
  player.liftT = -1;
  usePerformer.getState().set({ map: false });
}

import * as THREE from 'three';
import type { Fixture, FixtureLook, LedLook, StageObject } from '../types';
import { getProject } from '../state/projectStore';
import { useShow } from '../state/showStore';
import { rad } from '../util/misc';

/** Per-frame computed output of each fixture, read by renderers and the light pool. */
export interface FixtureOut {
  color: THREE.Color;
  intensity: number;
  dir: THREE.Vector3;
  beamAngle: number; // radians (full angle)
  focus: number;
  pos: THREE.Vector3;
  type: Fixture['type'];
  hidden: boolean;
  pan: number; // radians
  tilt: number; // radians
}

interface Smooth {
  color: THREE.Color;
  intensity: number;
  pan: number;
  tilt: number;
  beam: number;
  focus: number;
}

export const outputs = new Map<string, FixtureOut>();
const smooth = new Map<string, Smooth>();
const screenSmooth = new Map<string, { bright: number; c1: THREE.Color; c2: THREE.Color }>();

export const engine = {
  time: 0,
  haze: 0.6,
  fog: 0.3,
  house: 0.35,
  master: 1,
  blackout: 0,
  flash: 0,
  beat: 0,
  screenFactor: 1,
};

let lastFx = 0;
const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
const hsl = { h: 0, s: 0, l: 0 };

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function approach(cur: number, target: number, k: number) {
  return cur + (target - cur) * k;
}

export function dirFrom(panDeg: number, tiltDeg: number, out = new THREE.Vector3()) {
  const p = rad(panDeg), t = rad(tiltDeg);
  return out.set(Math.sin(t) * Math.sin(p), -Math.cos(t), Math.sin(t) * Math.cos(p)).normalize();
}

/** Look currently driving a fixture: scene override layer → fixture's own values. */
export function activeLook(f: Fixture): FixtureLook {
  const o = useShow.getState().override;
  return (o && o.fixtures[f.id]) || f;
}

export function activeScreenLook(o: StageObject): LedLook | undefined {
  const s = useShow.getState();
  if (!o.led) return undefined;
  if (s.liveVisual) return s.liveVisual;
  const ov = s.override?.screens[o.id];
  return ov ?? o.led;
}

export function stepEngine(dt: number) {
  const project = getProject();
  const show = useShow.getState();
  engine.time += dt;
  const t = engine.time;
  if (!project) return;

  const k = (tau: number) => 1 - Math.exp(-dt / Math.max(0.016, tau));
  const fadeTau = show.override ? Math.max(0.06, show.fadeTime / 3) : 0.07;
  const kf = k(fadeTau);

  // atmosphere
  const atmo = { ...project.atmosphere, ...(show.override?.atmosphere ?? {}) };
  engine.haze = approach(engine.haze, atmo.haze, k(0.6));
  engine.fog = approach(engine.fog, Math.max(atmo.fog, project.atmosphere.fog), k(1));
  engine.house = approach(engine.house, project.atmosphere.houseLights, k(0.4));
  engine.blackout = approach(engine.blackout, show.blackout ? 1 : 0, k(0.08));
  engine.master = show.master * project.atmosphere.master * (1 - engine.blackout);
  engine.flash = Math.max(0, engine.flash - dt * 3);
  for (const fx of show.fx) if (fx.t > lastFx) {
    lastFx = fx.t;
    if (fx.type === 'flash' || fx.type === 'pyro') engine.flash = 1;
  }
  engine.screenFactor = (1 - engine.blackout) * (0.35 + 0.65 * show.master);
  engine.beat = show.playing ? ((performance.now() / 1000) * show.bpm) / 60 : t * 2;
  const beatFrac = engine.beat % 1;

  const seen = new Set<string>();
  project.fixtures.forEach((f, i) => {
    seen.add(f.id);
    const look = activeLook(f);
    let s = smooth.get(f.id);
    if (!s) {
      s = { color: new THREE.Color(look.color), intensity: look.on ? look.intensity : 0, pan: look.pan, tilt: look.tilt, beam: look.beamAngle, focus: look.focus };
      smooth.set(f.id, s);
    }
    const colorHex = show.liveColor ?? look.color;
    tmpA.set(colorHex);
    s.color.lerp(tmpA, kf);
    s.intensity = approach(s.intensity, look.on ? look.intensity : 0, kf);
    s.pan = approach(s.pan, look.pan, kf);
    s.tilt = approach(s.tilt, look.tilt, kf);
    s.beam = approach(s.beam, look.beamAngle, kf);
    s.focus = approach(s.focus, look.focus, kf);

    // effects (computed live, not smoothed)
    const effect = show.liveEffect !== 'none' ? show.liveEffect : look.effect;
    const sp = Math.max(0.05, look.effectSpeed);
    let m = 1;
    tmpB.copy(s.color);
    switch (effect) {
      case 'pulse':
        m = show.playing ? 0.25 + 0.75 * Math.exp(-beatFrac * 5) : 0.5 + 0.5 * Math.sin(t * sp * 4 + i * 0.4);
        break;
      case 'strobe': {
        const rate = Math.max(1, look.strobeRate) * (show.liveEffect === 'strobe' ? 1.4 : 1);
        m = (t * rate + hash(i) * 0.3) % 1 < 0.18 ? 1.6 : 0;
        break;
      }
      case 'chase': {
        const ph = (show.playing ? engine.beat : t * sp * 2) - i * 0.25;
        m = Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 6);
        break;
      }
      case 'rainbow':
        tmpB.setHSL((t * 0.08 * sp + i * 0.07) % 1, 1, 0.5);
        break;
      case 'flicker':
        m = 0.45 + 0.55 * hash(Math.floor(t * 14 * sp) + i * 13.1);
        break;
      case 'fade':
        m = 0.5 + 0.5 * Math.sin(t * sp * 1.2 + i * 0.2);
        break;
      case 'colorchase': {
        s.color.getHSL(hsl);
        const step = Math.floor(t * sp * 2 + i * 0.5) % 3;
        tmpB.setHSL((hsl.h + step / 3) % 1, Math.max(0.6, hsl.s), Math.min(0.6, Math.max(0.4, hsl.l)));
        break;
      }
    }

    // movement
    const mv = look.movement;
    const ms = look.moveSpeed;
    const sz = look.moveSize;
    const side = f.pos[0] < 0 ? -1 : 1;
    let pan = s.pan, tilt = s.tilt;
    const tt = t * ms;
    switch (mv) {
      case 'sweep':
        pan += Math.sin(tt) * sz * side;
        break;
      case 'circle':
        pan += Math.sin(tt + i * 0.3) * sz;
        tilt += Math.cos(tt + i * 0.3) * sz * 0.5;
        break;
      case 'figure8':
        pan += Math.sin(tt) * sz * side;
        tilt += Math.sin(tt * 2) * sz * 0.4;
        break;
      case 'tilt':
        tilt += Math.sin(tt + i * 0.5) * sz;
        break;
      case 'random':
        pan += (Math.sin(tt * 1.3 + i * 2.1) * 0.7 + Math.sin(tt * 0.6 + i) * 0.3) * sz;
        tilt += Math.sin(tt * 0.9 + i * 1.7) * sz * 0.5;
        break;
      case 'ballyhoo':
        pan += Math.sin(tt * 2 + i) * sz * 1.5;
        tilt += Math.cos(tt * 1.7 + i) * sz;
        break;
      case 'fan':
        pan += Math.sin(tt + i * 0.6) * sz;
        break;
    }

    let out = outputs.get(f.id);
    if (!out) {
      out = { color: new THREE.Color(), intensity: 0, dir: new THREE.Vector3(), beamAngle: 0.3, focus: 0.5, pos: new THREE.Vector3(), type: f.type, hidden: false, pan: 0, tilt: 0 };
      outputs.set(f.id, out);
    }
    out.type = f.type;
    out.hidden = !!f.hidden;
    out.pos.set(f.pos[0], f.pos[1], f.pos[2]);
    out.color.copy(tmpB);
    out.intensity = Math.max(0, s.intensity * m * engine.master + engine.flash * 0.8 * (1 - engine.blackout));
    out.beamAngle = rad(Math.max(1, s.beam));
    out.focus = s.focus;
    out.pan = rad(pan);
    out.tilt = rad(tilt);
    dirFrom(pan, tilt, out.dir);
  });
  // forget deleted fixtures
  if (outputs.size !== seen.size) {
    for (const id of outputs.keys()) if (!seen.has(id)) {
      outputs.delete(id);
      smooth.delete(id);
    }
  }
}

/** Smoothed LED output used by screen renderers. */
export function screenOutput(o: StageObject, dt: number) {
  const look = activeScreenLook(o);
  let s = screenSmooth.get(o.id);
  if (!look) return null;
  if (!s) {
    s = { bright: look.brightness, c1: new THREE.Color(look.color1), c2: new THREE.Color(look.color2) };
    screenSmooth.set(o.id, s);
  }
  const show = useShow.getState();
  const kf = 1 - Math.exp(-dt / Math.max(0.05, show.override ? show.fadeTime / 3 : 0.08));
  s.bright += ((look.visual === 'off' ? 0 : look.brightness) - s.bright) * kf;
  s.c1.lerp(tmpA.set(look.color1), kf);
  s.c2.lerp(tmpB.set(look.color2), kf);
  return { look, bright: s.bright * engine.screenFactor, c1: s.c1, c2: s.c2 };
}

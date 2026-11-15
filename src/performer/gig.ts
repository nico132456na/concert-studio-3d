import { create } from 'zustand';
import type { CrowdMoment } from '../state/showStore';
import { useShow } from '../state/showStore';
import { getProject } from '../state/projectStore';
import { player, doAction, type Action } from './state';
import { engine } from '../three/lightingEngine';
import { crowd } from '../audio/crowd';
import type { StageObject } from '../types';

/**
 * A performance session: tracks what the artist does on stage, drives crowd moments and
 * interactions, evaluates optional challenges and produces the end-of-show report.
 */

export const gig = {
  active: false,
  stageTime: 0,
  hypeSum: 0,
  peaks: 0,
  inPeak: false,
  engaged: 0,
  actions: new Set<string>(),
  onBeat: 0,
  offBeat: 0,
  platforms: new Set<string>(),
  platformTotal: 1,
  moments: 0,
  momentKinds: new Set<string>(),
  highFives: 0,
  selfies: 0,
  signs: 0,
  scenes: new Set<string>(),
  sceneTotal: 1,
  lastScene: null as string | null,
  distance: 0,
  cooldown: {} as Record<string, number>,
  probeT: 0,
};

const isDeck = (o: StageObject) => o.tag === 'main' && o.kind !== 'stairs' && !o.hidden;

export function startGig() {
  const p = getProject();
  gig.active = true;
  gig.stageTime = gig.hypeSum = gig.peaks = gig.engaged = gig.onBeat = gig.offBeat = 0;
  gig.moments = gig.highFives = gig.selfies = gig.signs = gig.distance = 0;
  gig.inPeak = false;
  gig.actions = new Set();
  gig.platforms = new Set();
  gig.momentKinds = new Set();
  gig.scenes = new Set();
  gig.lastScene = null;
  gig.cooldown = {};
  gig.platformTotal = Math.max(1, (p?.objects ?? []).filter(isDeck).length);
  gig.sceneTotal = Math.max(1, p?.scenes.length ?? 1);
  useGig.getState().set({ report: null, tick: 0 });
}

/** Called from the performer controller every frame while on stage / in the venue. */
export function trackGig(dt: number, onStage: boolean, hype: number, moved: number) {
  if (!gig.active) return;
  if (onStage) {
    gig.stageTime += dt;
    gig.hypeSum += Math.min(1, hype) * dt;
    gig.distance += moved;
    if (hype > 0.4) gig.engaged += dt;
    if (hype > 0.92 && !gig.inPeak) {
      gig.inPeak = true;
      gig.peaks++;
    } else if (hype < 0.75) gig.inPeak = false;
    // which deck is underfoot (sampled a few times per second)
    gig.probeT -= dt;
    if (gig.probeT <= 0) {
      gig.probeT = 0.25;
      for (const o of getProject()?.objects ?? []) {
        if (!isDeck(o)) continue;
        const c = Math.cos(o.rot[1]), s = Math.sin(o.rot[1]);
        const dx = player.pos.x - o.pos[0], dz = player.pos.z - o.pos[2];
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        if (Math.abs(lx) <= o.size[0] / 2 + 0.2 && Math.abs(lz) <= o.size[2] / 2 + 0.2 && Math.abs(player.pos.y - (o.pos[1] + o.size[1])) < 0.6) gig.platforms.add(o.id);
      }
    }
  }
  const sc = useShow.getState().activeSceneId;
  if (sc && sc !== gig.lastScene) {
    gig.lastScene = sc;
    gig.scenes.add(sc);
  }
  // refresh the HUD a few times per second
  const g = useGig.getState();
  const n = Math.floor(gig.stageTime * 3);
  if (n !== g.tick) g.set({ tick: n });
}

/** Every performance move goes through here so variety and timing are scored. */
export function perform(a: Action | 'pose') {
  doAction(a as Action);
  if (!gig.active || a === 'none') return;
  gig.actions.add(a);
  // on the beat if close to a beat boundary
  const ph = engine.beat % 1;
  const onBeat = Math.min(ph, 1 - ph) < 0.18;
  if (onBeat) {
    gig.onBeat++;
    player.hypeBoost = Math.min(1.5, player.hypeBoost + 0.12);
  } else gig.offBeat++;
}

const MOMENT_ACTION: Record<CrowdMoment, Action> = { none: 'none', handsUp: 'handsUp', cheer: 'handsUp', wave: 'wave', sing: 'point', phones: 'handsUp', clap: 'dance' };

/** Lead the crowd. Works best when close to the audience and when they're already warmed up. */
export function leadCrowd(kind: CrowdMoment): { ok: boolean; msg: string } {
  const now = performance.now() / 1000;
  if ((gig.cooldown[kind] ?? 0) > now) return { ok: false, msg: 'Give the crowd a moment…' };
  if (player.pos.y < 0.3) return { ok: false, msg: 'Get on stage first' };
  gig.cooldown[kind] = now + 6;
  useShow.getState().set({ crowdMoment: { kind, t: now } });
  perform(MOMENT_ACTION[kind]);
  const close = closeness();
  const boost = 0.25 + close * 0.45 + (player.hype > 0.5 ? 0.15 : 0);
  player.hypeBoost = Math.min(1.6, player.hypeBoost + boost);
  crowd.roar(0.4 + close * 0.4);
  if (gig.active) {
    gig.moments++;
    gig.momentKinds.add(kind);
  }
  const label: Record<string, string> = { handsUp: 'Hands in the air!', sing: 'The whole venue sings along', wave: 'A wave rolls around the venue', phones: 'Thousands of phone lights', clap: 'Everyone claps on the beat', cheer: 'The crowd roars' };
  return { ok: true, msg: label[kind] ?? 'The crowd responds' };
}

/** 0..1 — how close the performer is to the audience (front edge, runway, B-stage). */
export function closeness() {
  return Math.max(0, Math.min(1, (player.pos.z + 4) / 30));
}

export type Interaction = 'highfive' | 'selfie' | 'sign';
export function interact(kind: Interaction): string {
  if (kind === 'highfive') {
    perform('point');
    gig.highFives++;
    player.hypeBoost = Math.min(1.6, player.hypeBoost + 0.35);
    crowd.roar(0.6);
    useShow.getState().trigger('flash');
    return 'High-fives down the front row';
  }
  if (kind === 'selfie') {
    perform('wave');
    gig.selfies++;
    player.hypeBoost = Math.min(1.6, player.hypeBoost + 0.3);
    useShow.getState().trigger('flash');
    return 'Selfie with a fan in the front row';
  }
  perform('point');
  gig.signs++;
  player.hypeBoost = Math.min(1.6, player.hypeBoost + 0.3);
  crowd.roar(0.5);
  return 'You read out a fan sign — they scream';
}

/* ---------------- challenges ---------------- */
export interface Challenge {
  id: string;
  label: string;
  progress: number;
  detail: string;
}

export function challenges(): Challenge[] {
  const c = (id: string, label: string, v: number, max: number, unit = '') => ({ id, label, progress: Math.min(1, v / max), detail: `${Math.min(v, max)}${unit} / ${max}${unit}` });
  return [
    c('energy', 'Reach 90% crowd energy', Math.round(Math.min(1, player.hype) * 100), 90, '%'),
    c('platforms', 'Visit every stage platform', gig.platforms.size, gig.platformTotal),
    c('variety', 'Perform 6 different moves', gig.actions.size, 6),
    c('lead', 'Lead 3 different crowd moments', gig.momentKinds.size, 3),
    c('beat', 'Hit 10 moves on the beat', gig.onBeat, 10),
    c('fans', 'Interact with 3 front-row fans', gig.highFives + gig.selfies + gig.signs, 3),
    c('scenes', 'Play through 3 lighting scenes', gig.scenes.size, Math.min(3, gig.sceneTotal)),
    c('engaged', 'Keep the crowd engaged for 90 s', Math.round(gig.engaged), 90, ' s'),
  ];
}

/* ---------------- report ---------------- */
export interface ReportLine {
  label: string;
  score: number;
  note: string;
}
export interface GigReport {
  grade: string;
  score: number;
  minutes: number;
  lines: ReportLine[];
  done: number;
  total: number;
  summary: string;
}

export function buildReport(): GigReport {
  const t = Math.max(1, gig.stageTime);
  const avgHype = gig.hypeSum / t;
  const beatPct = gig.onBeat + gig.offBeat ? gig.onBeat / (gig.onBeat + gig.offBeat) : 0;
  const ch = challenges();
  const done = ch.filter((c) => c.progress >= 1).length;
  const L = (label: string, score: number, note: string): ReportLine => ({ label, score: Math.round(Math.max(0, Math.min(100, score))), note });
  const lines = [
    L('Crowd energy', avgHype * 115, `Average energy ${Math.round(avgHype * 100)}%, ${gig.peaks} peak moment${gig.peaks === 1 ? '' : 's'}.`),
    L('Performance variety', (gig.actions.size / 7) * 100, `${gig.actions.size} different moves used.`),
    L('Stage movement', (gig.platforms.size / gig.platformTotal) * 80 + Math.min(20, gig.distance / 8), `Visited ${gig.platforms.size} of ${gig.platformTotal} platforms, covered ${Math.round(gig.distance)} m.`),
    L('Timing', beatPct * 100, gig.onBeat + gig.offBeat ? `${Math.round(beatPct * 100)}% of moves landed on the beat.` : 'No moves performed.'),
    L('Lighting coordination', (gig.scenes.size / Math.min(4, gig.sceneTotal)) * 100, `${gig.scenes.size} lighting scene${gig.scenes.size === 1 ? '' : 's'} used.`),
    L('Setlist', (gig.scenes.size / gig.sceneTotal) * 100, `Played ${gig.scenes.size} of ${gig.sceneTotal} show sections.`),
    L('Audience interaction', (gig.moments * 12 + (gig.highFives + gig.selfies + gig.signs) * 15), `${gig.moments} crowd moment${gig.moments === 1 ? '' : 's'}, ${gig.highFives + gig.selfies + gig.signs} fan interaction${gig.highFives + gig.selfies + gig.signs === 1 ? '' : 's'}.`),
    L('Special moments', gig.peaks * 25 + done * 5, `${done} of ${ch.length} challenges completed.`),
  ];
  const timeFactor = Math.min(1, gig.stageTime / 90);
  const score = Math.round((lines.reduce((a, l) => a + l.score, 0) / lines.length) * (0.4 + 0.6 * timeFactor));
  const grade = score >= 90 ? 'S' : score >= 78 ? 'A' : score >= 62 ? 'B' : score >= 45 ? 'C' : 'D';
  const best = [...lines].sort((a, b) => b.score - a.score)[0];
  const worst = [...lines].sort((a, b) => a.score - b.score)[0];
  const summary =
    gig.stageTime < 20
      ? 'The show barely started — spend more time on stage to get a full rating.'
      : `Strongest: ${best.label.toLowerCase()}. To improve, work on ${worst.label.toLowerCase()}${timeFactor < 1 ? ' and play a longer set' : ''}.`;
  return { grade, score, minutes: Math.round((gig.stageTime / 60) * 10) / 10, lines, done, total: ch.length, summary };
}

export function endGig() {
  if (!gig.active) return null;
  gig.active = false;
  const r = buildReport();
  useGig.getState().set({ report: r });
  return r;
}

export const useGig = create<{ report: GigReport | null; tick: number; set: (p: Partial<{ report: GigReport | null; tick: number }>) => void }>((set) => ({
  report: null,
  tick: 0,
  set: (p) => set(p),
}));

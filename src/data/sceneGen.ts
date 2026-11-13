import type { Cue, Fixture, FixtureLook, LedLook, LightScene, StageObject, VisualId } from '../types';
import { lookOf } from './library';
import { uid } from '../util/misc';

export type Palette = [string, string, string];

export const DEFAULT_PALETTE: Palette = ['#1a5cff', '#8a2aff', '#ffffff'];

function screenLooks(objects: StageObject[], fn: (o: StageObject, i: number) => LedLook | null) {
  const out: Record<string, LedLook> = {};
  objects.filter((o) => o.led).forEach((o, i) => {
    const l = fn(o, i);
    if (l) out[o.id] = l;
  });
  return out;
}

function fixtureLooks(fixtures: Fixture[], fn: (f: Fixture, i: number, base: FixtureLook) => Partial<FixtureLook>) {
  const out: Record<string, FixtureLook> = {};
  fixtures.forEach((f, i) => {
    const base = lookOf(f);
    out[f.id] = { ...base, ...fn(f, i, base) };
  });
  return out;
}

const moving = (f: Fixture) => f.type === 'spot' || f.type === 'beam' || f.type === 'pixel';

export function buildAutoShow(fixtures: Fixture[], objects: StageObject[], palette: Palette = DEFAULT_PALETTE) {
  const [c1, c2, c3] = palette;
  const vis = (v: VisualId, a: string, b: string, brightness: number, speed: number): LedLook => ({ visual: v, color1: a, color2: b, brightness, speed });

  const intro: LightScene = {
    id: uid('s'),
    name: 'Intro',
    fade: 4,
    atmosphere: { haze: 0.75, fog: 0.6 },
    fixtures: fixtureLooks(fixtures, (f) => ({
      on: f.type === 'spot' || f.type === 'follow' || f.type === 'ceiling',
      color: f.type === 'follow' ? '#dfe8ff' : c1,
      intensity: f.type === 'follow' ? 0.8 : 0.45,
      movement: moving(f) ? 'tilt' : 'none',
      moveSpeed: 0.25,
      moveSize: 12,
      effect: 'none',
    })),
    screens: screenLooks(objects, () => vis('particles', c1, '#000000', 0.7, 0.4)),
  };

  const verse: LightScene = {
    id: uid('s'),
    name: 'Verse',
    fade: 2.5,
    atmosphere: { haze: 0.6, fog: 0.3 },
    fixtures: fixtureLooks(fixtures, (f, i) => ({
      on: f.type !== 'strobe' && f.type !== 'blinder' && f.type !== 'laser',
      color: i % 2 ? c2 : c1,
      intensity: f.type === 'wash' ? 0.35 : 0.6,
      movement: moving(f) ? 'sweep' : 'none',
      moveSpeed: 0.5,
      moveSize: 25,
      effect: f.type === 'ledbar' || f.type === 'pixel' ? 'chase' : 'none',
      effectSpeed: 0.6,
    })),
    screens: screenLooks(objects, (_o, i) => vis(i % 2 ? 'gradient' : 'water', c2, c1, 0.9, 0.6)),
  };

  const chorus: LightScene = {
    id: uid('s'),
    name: 'Chorus',
    fade: 0.4,
    atmosphere: { haze: 0.85, fog: 0.4 },
    fixtures: fixtureLooks(fixtures, (f, i) => ({
      on: true,
      color: [c1, c2, c3][i % 3],
      intensity: 1,
      movement: moving(f) ? (i % 2 ? 'circle' : 'figure8') : f.type === 'laser' ? 'fan' : 'none',
      moveSpeed: 1.4,
      moveSize: 35,
      effect: f.type === 'strobe' ? 'strobe' : f.type === 'ledbar' || f.type === 'pixel' ? 'colorchase' : f.type === 'blinder' ? 'pulse' : 'none',
      effectSpeed: 1.5,
      strobeRate: 10,
    })),
    screens: screenLooks(objects, (_o, i) => vis(i % 2 ? 'tunnel' : 'plasma', c1, c2, 1.3, 1.6)),
  };

  const outro: LightScene = {
    id: uid('s'),
    name: 'Outro',
    fade: 6,
    atmosphere: { haze: 0.5, fog: 0.7 },
    fixtures: fixtureLooks(fixtures, (f) => ({
      on: f.type === 'spot' || f.type === 'wash' || f.type === 'follow',
      color: f.type === 'follow' ? '#ffe2b8' : c1,
      intensity: f.type === 'follow' ? 0.6 : 0.2,
      movement: 'none',
      effect: 'none',
    })),
    screens: screenLooks(objects, () => vis('clouds', c1, '#000000', 0.35, 0.3)),
  };

  const bridge: LightScene = {
    id: uid('s'),
    name: 'Bridge',
    fade: 3,
    atmosphere: { haze: 0.9, fog: 0.5 },
    fixtures: fixtureLooks(fixtures, (f, i) => ({
      on: f.type !== 'strobe' && f.type !== 'blinder',
      color: i % 3 === 0 ? c3 : c2,
      intensity: f.type === 'wash' ? 0.2 : 0.5,
      movement: moving(f) ? 'random' : f.type === 'laser' ? 'fan' : 'none',
      moveSpeed: 0.3,
      moveSize: 30,
      effect: f.type === 'ledbar' || f.type === 'pixel' ? 'fade' : 'none',
      effectSpeed: 0.5,
    })),
    screens: screenLooks(objects, () => vis('space', c2, c1, 0.8, 0.5)),
  };

  const scenes = [intro, verse, chorus, bridge, outro];
  const cues: Cue[] = [
    { id: uid('c'), sceneId: intro.id, duration: 10, fade: 4 },
    { id: uid('c'), sceneId: verse.id, duration: 14, fade: 2.5 },
    { id: uid('c'), sceneId: chorus.id, duration: 14, fade: 0.4 },
    { id: uid('c'), sceneId: verse.id, duration: 12, fade: 2 },
    { id: uid('c'), sceneId: bridge.id, duration: 12, fade: 3 },
    { id: uid('c'), sceneId: chorus.id, duration: 16, fade: 0.3 },
    { id: uid('c'), sceneId: outro.id, duration: 12, fade: 6 },
  ];
  return { scenes, cues };
}

import type { DesignSeed, Fixture, FixtureType, LightPreset, LightScene, ObjectKind, Project, StageObject, Vec3 } from '../../types';
import { edit, getProject, useProject } from '../../state/projectStore';
import { useUI, toast } from '../../state/uiStore';
import { useShow } from '../../state/showStore';
import { FIXTURE_DEF, makeFixture, makeObject, OBJECT_DEF, lookOf, defaultLed } from '../../data/library';
import { ctx } from '../../three/interaction';
import { buildMainStage, type StageParams } from '../../data/builders';
import { buildAutoShow, DEFAULT_PALETTE, type Palette } from '../../data/sceneGen';
import { VISUAL_PRESETS } from '../../data/visuals';
import { putMedia } from '../../storage/db';
import { rng, uid, clamp } from '../../util/misc';
import { mat } from '../../data/materials';

/** Where to drop new things: the point the camera is looking at, nudged so items don't stack exactly. */
function dropPoint(): [number, number] {
  const t = ctx.controls?.target;
  let x = t ? Math.round(t.x) : 0;
  let z = t ? Math.round(t.z) : 0;
  x = clamp(x, -40, 40);
  z = clamp(z, -30, 40);
  const p = getProject();
  let tries = 0;
  while (p && tries < 12 && p.objects.some((o) => Math.abs(o.pos[0] - x) < 1 && Math.abs(o.pos[2] - z) < 1)) {
    x += 2;
    tries++;
  }
  return [x, z];
}

function afterAdd(ids: string[], label: string) {
  const ui = useUI.getState();
  const small = window.innerWidth < 900 || window.innerHeight > window.innerWidth;
  ui.set({ selection: ids, tool: 'move', rightOpen: true, ...(small ? { left: null } : {}) });
  toast(`${label} added — drag it to position`);
}

export function addObject(kind: ObjectKind) {
  const def = OBJECT_DEF[kind];
  const [x, z] = dropPoint();
  const o = makeObject(kind, { pos: [x, def.y ?? 0, z] });
  edit.addObjects([o]);
  afterAdd([o.id], def.label);
  const ui = useUI.getState();
  ui.set({ rightTab: def.led ? 'led' : 'object' });
  if (def.category === 'stage') ui.bump('stage');
  if (def.led) ui.bump('led');
}

export function addFixture(type: FixtureType) {
  const def = FIXTURE_DEF[type];
  const [x, z] = dropPoint();
  const f = makeFixture(type, { pos: [x, def.y, z] });
  // aim lights hung in front of the stage back toward it
  if (z > 2 && def.y > 4) f.pan = 180;
  edit.addFixtures([f]);
  afterAdd([f.id], def.label);
  useUI.getState().set({ rightTab: 'light' });
  useUI.getState().bump('light');
}

export function rebuildMainStage(params: StageParams) {
  const parts = buildMainStage(params);
  useProject.getState().mutate((p) => ({ ...p, objects: [...p.objects.filter((o) => o.tag !== 'main'), ...parts] }), { key: 'stagegen' });
}

export function applyDesign(seed: DesignSeed) {
  useShow.getState().clearOverride();
  useProject.getState().mutate((p) => ({
    ...p,
    objects: seed.objects,
    fixtures: seed.fixtures,
    scenes: seed.scenes ?? [],
    cues: seed.cues ?? [],
    groups: seed.groups ?? [],
    atmosphere: { ...p.atmosphere, ...(seed.atmosphere ?? {}) },
  }));
  useUI.getState().set({ selection: [] });
}

/** Rearranges existing (non-main) objects into a new symmetric layout and recolors lights. Undoable. */
export function randomize() {
  const p = getProject();
  if (!p) return;
  const r = rng(Date.now() & 0xffffffff);
  const main = p.objects.filter((o) => o.tag === 'main');
  const W = main.length ? Math.max(...main.map((o) => o.size[0])) : 24;
  const D = main.length ? Math.max(...main.map((o) => o.size[2])) : 12;
  const others = p.objects.filter((o) => o.tag !== 'main');
  const palettes: Palette[] = [
    ['#1a5cff', '#8a2aff', '#ffffff'],
    ['#ff1010', '#ff7a1a', '#ffffff'],
    ['#1ae0ff', '#ff2ad4', '#ffffff'],
    ['#7dff4d', '#1ae0ff', '#ffffff'],
    ['#ffc21a', '#ff7a1a', '#ffffff'],
    ['#ffffff', '#dce9ff', '#ff1010'],
  ];
  const pal = palettes[Math.floor(r() * palettes.length)];
  const placed = new Map<string, StageObject>();
  for (let i = 0; i < others.length; i++) {
    const o = others[i];
    if (placed.has(o.id)) continue;
    const isLed = !!o.led;
    const back = -D * (0.6 + r() * 0.5);
    const center = r() < 0.35;
    const x = center ? 0 : (r() * 0.5 + 0.35) * (W / 2 + 6);
    const z = isLed ? back : -D * r() * 0.9;
    const ry = center ? 0 : (r() - 0.5) * 0.6;
    const led = o.led ? { ...o.led, ...(({ name: _n, ...v }) => v)(VISUAL_PRESETS[Math.floor(r() * (VISUAL_PRESETS.length - 1))]), color1: pal[0], color2: pal[1] } : undefined;
    placed.set(o.id, { ...o, pos: [center ? 0 : -x, o.pos[1], z], rot: [o.rot[0], center ? 0 : -ry, o.rot[2]], led });
    // mirror partner: next object of the same kind
    const partner = others.find((q, j) => j > i && q.kind === o.kind && !placed.has(q.id));
    if (partner && !center) placed.set(partner.id, { ...partner, pos: [x, partner.pos[1], z], rot: [partner.rot[0], ry, partner.rot[2]], led: partner.led ? { ...partner.led, ...(led ?? {}) } : undefined });
  }
  const fixtures = p.fixtures.map((f, i) => ({
    ...f,
    color: pal[i % 2],
    movement: (f.type === 'beam' || f.type === 'spot' ? ['sweep', 'circle', 'figure8', 'random'][Math.floor(r() * 4)] : f.movement) as Fixture['movement'],
  }));
  const { scenes, cues } = buildAutoShow(fixtures, p.objects.map((o) => placed.get(o.id) ?? o), pal);
  useShow.getState().clearOverride();
  useProject.getState().mutate((pp) => ({ ...pp, objects: pp.objects.map((o) => placed.get(o.id) ?? o), fixtures, scenes, cues }));
  toast('Randomized! Tap Undo to go back.');
}

/* --------------------------------- lighting --------------------------------- */

/** Fixtures the lighting controls act on: the selected fixtures, or all of them. */
export function targetFixtureIds(): string[] {
  const p = getProject();
  if (!p) return [];
  const sel = new Set(useUI.getState().selection);
  const chosen = p.fixtures.filter((f) => sel.has(f.id)).map((f) => f.id);
  return chosen.length ? chosen : p.fixtures.map((f) => f.id);
}

export function setFixtures(fn: (f: Fixture, i: number) => Partial<Fixture>, key?: string) {
  const ids = targetFixtureIds();
  edit.updateFixtures(ids, (f, i) => ({ ...f, ...fn(f, i) }), { key });
}

export function applyLightPreset(preset: LightPreset) {
  if (preset.blackout) {
    useShow.getState().set({ blackout: !useShow.getState().blackout });
    return;
  }
  useShow.getState().set({ blackout: false });
  setFixtures((_f, i) => ({ on: true, color: preset.colors[i % preset.colors.length], intensity: preset.intensity, effect: preset.effect ?? 'none' }));
}

export function sceneFromCurrent(name: string, fade = 2): LightScene {
  const p = getProject()!;
  const fixtures: LightScene['fixtures'] = {};
  p.fixtures.forEach((f) => (fixtures[f.id] = lookOf(f)));
  const screens: LightScene['screens'] = {};
  p.objects.forEach((o) => {
    if (o.led) screens[o.id] = { visual: o.led.visual, color1: o.led.color1, color2: o.led.color2, brightness: o.led.brightness, speed: o.led.speed };
  });
  return { id: uid('s'), name, fade, fixtures, screens, atmosphere: { haze: p.atmosphere.haze, fog: p.atmosphere.fog } };
}

/** Load a scene into the fixtures so it can be edited (programmer). Undoable. */
export function loadSceneForEditing(scene: LightScene) {
  useShow.getState().clearOverride();
  useProject.getState().mutate((p) => ({
    ...p,
    fixtures: p.fixtures.map((f) => (scene.fixtures[f.id] ? { ...f, ...scene.fixtures[f.id] } : f)),
    objects: p.objects.map((o) => (o.led && scene.screens[o.id] ? { ...o, led: { ...o.led, ...scene.screens[o.id] } } : o)),
    atmosphere: { ...p.atmosphere, ...(scene.atmosphere ?? {}) },
  }));
}

export function ensureShow(p: Project): Project {
  if (p.scenes.length && p.cues.length) return p;
  let scenes = p.scenes;
  let cues = p.cues;
  if (!scenes.length) {
    const auto = buildAutoShow(p.fixtures, p.objects, DEFAULT_PALETTE);
    scenes = auto.scenes;
    cues = auto.cues;
  } else if (!cues.length) {
    cues = scenes.map((s) => ({ id: uid('c'), sceneId: s.id, duration: 12, fade: s.fade }));
  }
  useProject.getState().mutate((pp) => ({ ...pp, scenes, cues }));
  return getProject()!;
}

/* ---------------------------------- media ---------------------------------- */

async function downscaleImage(file: File, max = 2048): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = Math.min(1, max / Math.max(img.width, img.height));
    if (s >= 1 && file.size < 4e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadScreenMedia(objectIds: string[], file: File) {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) {
    toast('Please choose an image or video file.', 'error');
    return;
  }
  if (isVideo && file.size > 150e6) {
    toast('That video is too large (max 150 MB).', 'error');
    return;
  }
  try {
    const blob = isImage ? await downscaleImage(file) : file;
    const id = uid('m');
    await putMedia(id, blob);
    edit.updateObjects(objectIds, (o) => ({ ...o, led: { ...(o.led ?? defaultLed()), visual: 'media', mediaId: id, mediaType: isVideo ? 'video' : 'image', brightness: Math.max(1, o.led?.brightness ?? 1) } }));
    toast(isVideo ? 'Video added to screen' : 'Image added to screen', 'success');
  } catch (e) {
    const q = (e as any)?.quota;
    toast(q ? 'Storage is full — could not store that file.' : `Upload failed: ${(e as Error).message}`, 'error');
  }
}

export function resetObject(o: StageObject): StageObject {
  const def = OBJECT_DEF[o.kind];
  return { ...o, rot: [0, 0, 0], size: [...def.size] as Vec3, material: mat(def.material), led: o.led ? defaultLed() : undefined };
}

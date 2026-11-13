import { create } from 'zustand';
import type { DesignSeed, Fixture, FixtureGroup, LightScene, Project, StageObject } from '../types';
import { uid, clone } from '../util/misc';

const HISTORY_LIMIT = 80;

interface ProjectState {
  project: Project | null;
  past: Project[];
  future: Project[];
  revision: number;
  lastKey: string | null;
  lastTime: number;
  setProject: (p: Project | null) => void;
  /** Push the current project into history (use before transient edits like drags). */
  checkpoint: () => void;
  /**
   * Apply an immutable change. `key` coalesces rapid edits (e.g. a slider) into one undo step;
   * `history: false` skips the undo stack (used during drags after a checkpoint).
   */
  mutate: (fn: (p: Project) => Project, opts?: { history?: boolean; key?: string }) => void;
  undo: () => void;
  redo: () => void;
}

export const useProject = create<ProjectState>((set, get) => ({
  project: null,
  past: [],
  future: [],
  revision: 0,
  lastKey: null,
  lastTime: 0,
  setProject: (p) => set({ project: p, past: [], future: [], revision: get().revision + 1, lastKey: null }),
  checkpoint: () => {
    const { project, past } = get();
    if (!project) return;
    set({ past: [...past.slice(-HISTORY_LIMIT + 1), project], future: [], lastKey: null });
  },
  mutate: (fn, opts = {}) => {
    const { project, past, lastKey, lastTime, revision } = get();
    if (!project) return;
    let next: Project;
    try {
      next = fn(project);
    } catch (e) {
      console.error('Edit failed', e);
      return;
    }
    if (next === project) return;
    next = { ...next, updatedAt: Date.now() };
    const now = performance.now();
    const history = opts.history !== false;
    const coalesce = history && opts.key && opts.key === lastKey && now - lastTime < 1200;
    if (history && !coalesce) {
      set({ project: next, past: [...past.slice(-HISTORY_LIMIT + 1), project], future: [], revision: revision + 1, lastKey: opts.key ?? null, lastTime: now });
    } else {
      set({ project: next, revision: revision + 1, lastTime: coalesce ? now : lastTime });
    }
  },
  undo: () => {
    const { project, past, future, revision } = get();
    if (!project || !past.length) return;
    const prev = past[past.length - 1];
    set({ project: prev, past: past.slice(0, -1), future: [project, ...future].slice(0, HISTORY_LIMIT), revision: revision + 1, lastKey: null });
  },
  redo: () => {
    const { project, past, future, revision } = get();
    if (!project || !future.length) return;
    const nxt = future[0];
    set({ project: nxt, past: [...past, project], future: future.slice(1), revision: revision + 1, lastKey: null });
  },
}));

export const getProject = () => useProject.getState().project;

export function newProject(arenaId: string, seed?: DesignSeed, name?: string, source?: string): Project {
  const now = Date.now();
  return {
    version: 1,
    id: uid('p'),
    name: name ?? 'Untitled Concert',
    arenaId,
    createdAt: now,
    updatedAt: now,
    source,
    objects: seed?.objects ?? [],
    fixtures: seed?.fixtures ?? [],
    groups: seed?.groups ?? [],
    scenes: seed?.scenes ?? [],
    cues: seed?.cues ?? [],
    atmosphere: { haze: 0.6, fog: 0.3, houseLights: 0.35, master: 1, ...(seed?.atmosphere ?? {}) },
    customMaterials: [],
    customPresets: [],
    savedColors: [],
  };
}

/** Make a project structurally valid (used for loads/imports so bad data never crashes the app). */
export function sanitizeProject(raw: any): Project {
  if (!raw || typeof raw !== 'object') throw new Error('Not a project file');
  const base = newProject(typeof raw.arenaId === 'string' ? raw.arenaId : 'basketball');
  const p: Project = {
    ...base,
    ...raw,
    version: 1,
    objects: Array.isArray(raw.objects) ? raw.objects.filter((o: any) => o && o.id && o.kind && Array.isArray(o.pos) && Array.isArray(o.size)) : [],
    fixtures: Array.isArray(raw.fixtures) ? raw.fixtures.filter((f: any) => f && f.id && f.type && Array.isArray(f.pos)) : [],
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    scenes: Array.isArray(raw.scenes) ? raw.scenes : [],
    cues: Array.isArray(raw.cues) ? raw.cues : [],
    atmosphere: { ...base.atmosphere, ...(raw.atmosphere ?? {}) },
    customMaterials: Array.isArray(raw.customMaterials) ? raw.customMaterials : [],
    customPresets: Array.isArray(raw.customPresets) ? raw.customPresets : [],
    savedColors: Array.isArray(raw.savedColors) ? raw.savedColors : [],
  };
  p.objects = p.objects.map((o) => ({ ...o, rot: Array.isArray(o.rot) ? o.rot : [0, 0, 0] }));
  return p;
}

/* ------------------------------- edit helpers ------------------------------- */

const M = () => useProject.getState().mutate;

export const edit = {
  addObjects(objs: StageObject[]) {
    M()((p) => ({ ...p, objects: [...p.objects, ...objs] }));
  },
  addFixtures(fx: Fixture[]) {
    M()((p) => ({ ...p, fixtures: [...p.fixtures, ...fx] }));
  },
  updateObject(id: string, patch: Partial<StageObject>, opts?: { history?: boolean; key?: string }) {
    M()((p) => ({ ...p, objects: p.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }), opts);
  },
  updateObjects(ids: string[], fn: (o: StageObject) => StageObject, opts?: { history?: boolean; key?: string }) {
    const set = new Set(ids);
    M()((p) => ({ ...p, objects: p.objects.map((o) => (set.has(o.id) ? fn(o) : o)) }), opts);
  },
  updateFixture(id: string, patch: Partial<Fixture>, opts?: { history?: boolean; key?: string }) {
    M()((p) => ({ ...p, fixtures: p.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)) }), opts);
  },
  updateFixtures(ids: string[], fn: (f: Fixture, i: number) => Fixture, opts?: { history?: boolean; key?: string }) {
    const set = new Set(ids);
    M()((p) => {
      let i = 0;
      return { ...p, fixtures: p.fixtures.map((f) => (set.has(f.id) ? fn(f, i++) : f)) };
    }, opts);
  },
  remove(ids: string[]) {
    const set = new Set(ids);
    M()((p) => ({
      ...p,
      objects: p.objects.filter((o) => !set.has(o.id)),
      fixtures: p.fixtures.filter((f) => !set.has(f.id)),
      groups: p.groups.map((g) => ({ ...g, fixtureIds: g.fixtureIds.filter((id) => !set.has(id)) })),
    }));
  },
  /** Duplicate items with an offset; returns new ids. */
  duplicate(ids: string[], offset: [number, number, number] = [2, 0, 2]): string[] {
    const p = getProject();
    if (!p) return [];
    const set = new Set(ids);
    const groupMap = new Map<string, string>();
    const newObjs = p.objects.filter((o) => set.has(o.id)).map((o) => {
      let groupId = o.groupId;
      if (groupId) {
        if (!groupMap.has(groupId)) groupMap.set(groupId, uid('g'));
        groupId = groupMap.get(groupId);
      }
      return { ...clone(o), id: uid('o'), name: o.name, groupId, locked: false, pos: [o.pos[0] + offset[0], o.pos[1] + offset[1], o.pos[2] + offset[2]] as StageObject['pos'] };
    });
    const newFx = p.fixtures.filter((f) => set.has(f.id)).map((f) => ({ ...clone(f), id: uid('f'), locked: false, pos: [f.pos[0] + offset[0], f.pos[1] + offset[1], f.pos[2] + offset[2]] as Fixture['pos'] }));
    M()((pp) => ({ ...pp, objects: [...pp.objects, ...newObjs], fixtures: [...pp.fixtures, ...newFx] }));
    return [...newObjs.map((o) => o.id), ...newFx.map((f) => f.id)];
  },
  /** Mirror copies across the center line (x = 0). */
  mirror(ids: string[]): string[] {
    const p = getProject();
    if (!p) return [];
    const set = new Set(ids);
    const newObjs = p.objects.filter((o) => set.has(o.id)).map((o) => ({ ...clone(o), id: uid('o'), groupId: undefined, name: `${o.name} (mirror)`, pos: [-o.pos[0], o.pos[1], o.pos[2]] as StageObject['pos'], rot: [o.rot[0], -o.rot[1], -o.rot[2]] as StageObject['rot'] }));
    const newFx = p.fixtures.filter((f) => set.has(f.id)).map((f) => ({ ...clone(f), id: uid('f'), name: `${f.name} (mirror)`, pos: [-f.pos[0], f.pos[1], f.pos[2]] as Fixture['pos'], pan: -f.pan, yaw: -f.yaw }));
    M()((pp) => ({ ...pp, objects: [...pp.objects, ...newObjs], fixtures: [...pp.fixtures, ...newFx] }));
    return [...newObjs.map((o) => o.id), ...newFx.map((f) => f.id)];
  },
  group(ids: string[]) {
    const gid = uid('g');
    const set = new Set(ids);
    M()((p) => ({ ...p, objects: p.objects.map((o) => (set.has(o.id) ? { ...o, groupId: gid } : o)) }));
  },
  ungroup(ids: string[]) {
    const p = getProject();
    if (!p) return;
    const gids = new Set(p.objects.filter((o) => ids.includes(o.id) && o.groupId).map((o) => o.groupId));
    M()((pp) => ({ ...pp, objects: pp.objects.map((o) => (o.groupId && gids.has(o.groupId) ? { ...o, groupId: undefined } : o)) }));
  },
  setAtmosphere(patch: Partial<Project['atmosphere']>, key = 'atmo') {
    M()((p) => ({ ...p, atmosphere: { ...p.atmosphere, ...patch } }), { key });
  },
  rename(name: string) {
    M()((p) => ({ ...p, name }));
  },
  /* fixture groups */
  addGroup(name: string, fixtureIds: string[]) {
    const g: FixtureGroup = { id: uid('fg'), name, fixtureIds };
    M()((p) => ({ ...p, groups: [...p.groups, g] }));
    return g.id;
  },
  updateGroup(id: string, patch: Partial<FixtureGroup>) {
    M()((p) => ({ ...p, groups: p.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  },
  removeGroup(id: string) {
    M()((p) => ({ ...p, groups: p.groups.filter((g) => g.id !== id) }));
  },
  /* scenes */
  setScenes(fn: (s: LightScene[]) => LightScene[]) {
    M()((p) => ({ ...p, scenes: fn(p.scenes) }));
  },
  setCues(fn: (c: Project['cues']) => Project['cues'], key?: string) {
    M()((p) => ({ ...p, cues: fn(p.cues) }), { key });
  },
};

/** Items selected together because they share a group id. */
export function expandGroups(ids: string[]): string[] {
  const p = getProject();
  if (!p) return ids;
  const gids = new Set(p.objects.filter((o) => ids.includes(o.id) && o.groupId).map((o) => o.groupId));
  if (!gids.size) return ids;
  const extra = p.objects.filter((o) => o.groupId && gids.has(o.groupId)).map((o) => o.id);
  return Array.from(new Set([...ids, ...extra]));
}

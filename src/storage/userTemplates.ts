import { create } from 'zustand';
import type { DesignSeed } from '../types';
import { getLibrary, setLibrary } from './db';
import { clone, uid } from '../util/misc';

export interface UserTemplate {
  id: string;
  name: string;
  createdAt: number;
  seed: DesignSeed;
  objectCount: number;
}

interface S {
  list: UserTemplate[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (name: string, seed: DesignSeed) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** Stage designs the user saved for reuse across projects (IndexedDB). */
export const useTemplates = create<S>((set, get) => ({
  list: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    const list = await getLibrary<UserTemplate[]>('templates', []);
    set({ list, loaded: true });
  },
  add: async (name, seed) => {
    const t: UserTemplate = { id: uid('t'), name, createdAt: Date.now(), seed: clone(seed), objectCount: seed.objects.length };
    const list = [t, ...get().list];
    await setLibrary('templates', list);
    set({ list });
  },
  remove: async (id) => {
    const list = get().list.filter((t) => t.id !== id);
    await setLibrary('templates', list);
    set({ list });
  },
}));

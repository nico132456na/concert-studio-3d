import { create } from 'zustand';
import { useProject } from '../state/projectStore';
import { saveProject, StorageError } from './db';
import type { Project } from '../types';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

interface SaveState {
  status: SaveStatus;
  error: string | null;
  lastSaved: number;
  set: (p: Partial<SaveState>) => void;
}

export const useSave = create<SaveState>((set) => ({ status: 'idle', error: null, lastSaved: 0, set: (p) => set(p) }));

const LAST_KEY = 'cs3d-last-project';
const RECOVERY_KEY = 'cs3d-recovery';

/** Hook for capturing a thumbnail from the active WebGL canvas. Set by the viewport. */
export const thumbnailSource: { capture: (() => string | undefined) | null } = { capture: null };

export const isPreview = (p: Project) => p.id.startsWith('preview');

let timer: number | undefined;
let savingPromise: Promise<boolean> | null = null;
let pendingAgain = false;

export function rememberLast(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_KEY, id);
    else localStorage.removeItem(LAST_KEY);
  } catch {
    /* ignore */
  }
}

export function lastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

/** Emergency copy kept in localStorage in case IndexedDB fails. */
function writeRecovery(p: Project) {
  try {
    const s = JSON.stringify(p);
    if (s.length < 2_500_000) localStorage.setItem(RECOVERY_KEY, s);
  } catch {
    /* quota — ignore */
  }
}

export function readRecovery(): Project | null {
  try {
    const s = localStorage.getItem(RECOVERY_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function clearRecovery() {
  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* ignore */
  }
}

export async function saveNow(withThumb = true): Promise<boolean> {
  const p = useProject.getState().project;
  if (!p || isPreview(p)) return false;
  if (savingPromise) {
    pendingAgain = true;
    return savingPromise;
  }
  window.clearTimeout(timer);
  useSave.getState().set({ status: 'saving' });
  savingPromise = (async () => {
    let thumb: string | undefined;
    if (withThumb) {
      try {
        thumb = thumbnailSource.capture?.() ?? undefined;
      } catch {
        thumb = undefined;
      }
    }
    try {
      await saveProject(p, thumb);
      rememberLast(p.id);
      clearRecovery();
      const stillSame = useProject.getState().project === p;
      useSave.getState().set({ status: stillSame ? 'saved' : 'unsaved', error: null, lastSaved: Date.now() });
      return true;
    } catch (e) {
      writeRecovery(p);
      const err = e as StorageError;
      const msg = err?.quota ? 'Storage is full. Export your project or delete old ones.' : `Could not save: ${err?.message ?? 'unknown error'}`;
      useSave.getState().set({ status: 'error', error: msg });
      return false;
    }
  })();
  const r = await savingPromise;
  savingPromise = null;
  if (pendingAgain) {
    pendingAgain = false;
    scheduleSave(400);
  }
  return r;
}

export function scheduleSave(delay = 1500) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => saveNow(false), delay);
}

let started = false;
export function startAutosave() {
  if (started) return;
  started = true;
  useProject.subscribe((s, prev) => {
    if (!s.project || isPreview(s.project)) return;
    if (prev.project && s.project.id !== prev.project.id) return; // project switch
    if (s.project !== prev.project && prev.project) {
      useSave.getState().set({ status: 'unsaved' });
      scheduleSave();
    }
  });
  const flush = () => {
    if (useSave.getState().status === 'unsaved') {
      const p = useProject.getState().project;
      if (p) writeRecovery(p);
      saveNow(false);
    }
  };
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('pagehide', flush);
}

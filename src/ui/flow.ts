import type { DesignSeed, Project } from '../types';
import { newProject, sanitizeProject, useProject } from '../state/projectStore';
import { useUI, toast } from '../state/uiStore';
import { useShow } from '../state/showStore';
import { useSave, saveNow, rememberLast, isPreview } from '../storage/autosave';
import { loadProject, requestPersistence } from '../storage/db';
import { beat } from '../audio/beat';

function resetUI() {
  useUI.getState().set({ selection: [], view: 'persp', left: null, deskOpen: false, cameraMenu: false, hideUI: false, guides: null, camRequest: null });
  useShow.getState().clearOverride();
}

export function openProject(p: Project) {
  resetUI();
  useProject.getState().setProject(p);
  useSave.getState().set({ status: 'saved', error: null });
  rememberLast(p.id);
  useUI.getState().set({ screen: 'editor' });
  requestPersistence();
}

export async function createProject(arenaId: string, seed?: DesignSeed, name?: string, source?: string) {
  const p = newProject(arenaId, seed, name, source);
  openProject(p);
  useSave.getState().set({ status: 'unsaved' });
  await saveNow(false);
  return p;
}

export async function openProjectById(id: string) {
  try {
    const raw = await loadProject(id);
    if (!raw) {
      toast('That project could not be found.', 'error');
      return false;
    }
    openProject(sanitizeProject(raw));
    return true;
  } catch (e) {
    toast(`Could not open project: ${(e as Error).message}`, 'error');
    return false;
  }
}

/** Load a design into the store for read-only 3D previews (never saved). */
export function setPreview(arenaId: string, seed?: DesignSeed) {
  const cur = useProject.getState().project;
  if (cur && !isPreview(cur) && useSave.getState().status !== 'saved') saveNow(false);
  const p = newProject(arenaId, seed, 'Preview');
  p.id = `preview-${p.id}`;
  useShow.getState().clearOverride();
  useProject.getState().setProject(p);
  return p;
}

export async function goHome() {
  const cur = useProject.getState().project;
  if (cur && !isPreview(cur)) await saveNow(true);
  stopLive();
  resetUI();
  useUI.getState().set({ screen: 'menu' });
}

export function enterLive() {
  const ui = useUI.getState();
  ui.set({ screen: 'live', selection: [], deskOpen: false, left: null, cameraMenu: false, view: 'persp' });
  ui.requestCamera('front');
}

export function stopLive() {
  beat.stop();
  useShow.getState().clearOverride();
}

export function exitLive() {
  stopLive();
  useUI.getState().set({ screen: 'editor' });
}

import type { Project, ProjectMeta } from '../types';

const DB_NAME = 'concert-studio-3d';
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;

export class StorageError extends Error {
  quota: boolean;
  constructor(msg: string, quota = false) {
    super(msg);
    this.quota = quota;
  }
}

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new StorageError('This browser has no IndexedDB (private mode?)'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
      if (!db.objectStoreNames.contains('library')) db.createObjectStore('library');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new StorageError(req.error?.message ?? 'Could not open storage'));
    req.onblocked = () => reject(new StorageError('Storage is blocked by another tab'));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onabort = () => {
      const e = tx.error;
      rej(new StorageError(e?.message ?? 'Save aborted', e?.name === 'QuotaExceededError'));
    };
    tx.onerror = () => {
      const e = tx.error;
      rej(new StorageError(e?.message ?? 'Save failed', e?.name === 'QuotaExceededError'));
    };
  });
}

export function metaOf(p: Project, thumbnail?: string): ProjectMeta {
  return {
    id: p.id,
    name: p.name,
    arenaId: p.arenaId,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
    thumbnail,
    objectCount: p.objects.length,
    fixtureCount: p.fixtures.length,
  };
}

export async function saveProject(p: Project, thumbnail?: string) {
  const db = await open();
  const tx = db.transaction(['projects', 'meta'], 'readwrite');
  let thumb = thumbnail;
  if (!thumb) {
    const old = await wrap(tx.objectStore('meta').get(p.id)).catch(() => undefined);
    thumb = (old as ProjectMeta | undefined)?.thumbnail;
  }
  tx.objectStore('projects').put(p);
  tx.objectStore('meta').put(metaOf(p, thumb));
  await txDone(tx);
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const db = await open();
  return wrap(db.transaction('projects').objectStore('projects').get(id));
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const db = await open();
  const all = (await wrap(db.transaction('meta').objectStore('meta').getAll())) as ProjectMeta[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string) {
  const db = await open();
  const tx = db.transaction(['projects', 'meta'], 'readwrite');
  tx.objectStore('projects').delete(id);
  tx.objectStore('meta').delete(id);
  await txDone(tx);
}

export async function putMedia(id: string, blob: Blob) {
  const db = await open();
  const tx = db.transaction('media', 'readwrite');
  tx.objectStore('media').put(blob, id);
  await txDone(tx);
}

export async function getMedia(id: string): Promise<Blob | undefined> {
  const db = await open();
  return wrap(db.transaction('media').objectStore('media').get(id));
}

export async function getLibrary<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await open();
    const v = await wrap(db.transaction('library').objectStore('library').get(key));
    return (v as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setLibrary(key: string, value: unknown) {
  const db = await open();
  const tx = db.transaction('library', 'readwrite');
  tx.objectStore('library').put(value, key);
  await txDone(tx);
}

export async function storageInfo(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    return { usage: e.usage ?? 0, quota: e.quota ?? 0, persisted };
  } catch {
    return null;
  }
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* ignore */
  }
}

/** Export with media embedded as data URLs so files are self-contained. */
export async function exportProject(p: Project): Promise<string> {
  const media: Record<string, string> = {};
  for (const o of p.objects) {
    if (o.led?.mediaId && !media[o.led.mediaId]) {
      const b = await getMedia(o.led.mediaId).catch(() => undefined);
      if (b && b.size < 25_000_000) media[o.led.mediaId] = await blobToDataUrl(b);
    }
  }
  return JSON.stringify({ format: 'concert-studio-3d', version: 1, project: p, media });
}

export async function importProjectFile(text: string): Promise<{ project: any; media: Record<string, string> }> {
  const data = JSON.parse(text);
  if (data?.format === 'concert-studio-3d') {
    for (const [id, url] of Object.entries((data.media ?? {}) as Record<string, string>)) {
      try {
        const blob = await (await fetch(url)).blob();
        await putMedia(id, blob);
      } catch {
        /* skip broken media */
      }
    }
    return { project: data.project, media: data.media ?? {} };
  }
  return { project: data, media: {} };
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

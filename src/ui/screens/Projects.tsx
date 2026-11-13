import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Download, Pencil, Plus, Trash2, Upload, Music } from 'lucide-react';
import { useUI, toast } from '../../state/uiStore';
import { deleteProject, exportProject, importProjectFile, listProjects, loadProject, saveProject, storageInfo } from '../../storage/db';
import { readRecovery, clearRecovery } from '../../storage/autosave';
import { sanitizeProject } from '../../state/projectStore';
import type { ProjectMeta } from '../../types';
import { getArena } from '../../data/arenas';
import { Confirm, PromptModal } from '../components';
import { openProjectById } from '../flow';
import { downloadText, timeAgo, uid } from '../../util/misc';

export function Projects() {
  const set = useUI((s) => s.set);
  const [list, setList] = useState<ProjectMeta[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<ProjectMeta | null>(null);
  const [deleting, setDeleting] = useState<ProjectMeta | null>(null);
  const [usage, setUsage] = useState<string>('');
  const [recovery, setRecovery] = useState(() => readRecovery());
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setList(await listProjects());
      setErr(null);
      const info = await storageInfo();
      if (info && info.quota) setUsage(`${(info.usage / 1e6).toFixed(1)} MB used of ${(info.quota / 1e6).toFixed(0)} MB${info.persisted ? ' · protected' : ''}`);
    } catch (e) {
      setErr(`Storage unavailable: ${(e as Error).message}. Projects can't be saved in this browser mode — use Export to keep your work.`);
      setList([]);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  const rename = async (m: ProjectMeta, name: string) => {
    const p = await loadProject(m.id);
    if (!p) return;
    await saveProject({ ...p, name, updatedAt: Date.now() }, m.thumbnail);
    setRenaming(null);
    refresh();
  };
  const duplicate = async (m: ProjectMeta) => {
    const p = await loadProject(m.id);
    if (!p) return;
    const now = Date.now();
    await saveProject({ ...p, id: uid('p'), name: `${p.name} copy`, createdAt: now, updatedAt: now }, m.thumbnail);
    toast('Project duplicated', 'success');
    refresh();
  };
  const exportOne = async (m: ProjectMeta) => {
    const p = await loadProject(m.id);
    if (!p) return;
    try {
      const text = await exportProject(p);
      downloadText(`${p.name.replace(/[^\w\- ]+/g, '').trim() || 'concert'}.concert.json`, text);
      toast('Export started', 'success');
    } catch (e) {
      toast(`Export failed: ${(e as Error).message}`, 'error');
    }
  };
  const doImport = async (f: File) => {
    try {
      const text = await f.text();
      const { project } = await importProjectFile(text);
      const p = sanitizeProject(project);
      const now = Date.now();
      p.id = uid('p');
      p.updatedAt = now;
      await saveProject(p);
      toast(`Imported “${p.name}”`, 'success');
      refresh();
    } catch (e) {
      toast(`Import failed: ${(e as Error).message}`, 'error');
    }
  };
  const restoreRecovery = async () => {
    if (!recovery) return;
    try {
      const p = sanitizeProject(recovery);
      await saveProject(p);
      clearRecovery();
      setRecovery(null);
      toast('Recovered unsaved project', 'success');
      refresh();
    } catch (e) {
      toast(`Recovery failed: ${(e as Error).message}`, 'error');
    }
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn boxed" onClick={() => set({ screen: 'menu' })} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="screen-title">My Projects</div>
          <div className="screen-sub">{usage || 'Saved on this device'}</div>
        </div>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={18} /> Import
        </button>
        <button className="btn primary" onClick={() => set({ screen: 'arenas' })}>
          <Plus size={18} /> New
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
      </div>
      {err && <div className="banner" style={{ position: 'relative', top: 0, left: 0, transform: 'none', margin: 12 }}>{err}</div>}
      {recovery && (
        <div className="banner" style={{ position: 'relative', top: 0, left: 0, transform: 'none', margin: 12, background: '#2a2410', borderColor: '#ffb547', color: '#ffe2a8' }}>
          An unsaved copy of “{recovery.name}” was recovered.
          <button className="btn small" onClick={restoreRecovery}>Restore</button>
          <button className="btn small ghost" onClick={() => { clearRecovery(); setRecovery(null); }}>Dismiss</button>
        </div>
      )}
      <div className="proj-grid">
        {list && list.length === 0 && !err && (
          <div className="empty-state">
            <Music size={40} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '12px 0 6px' }}>No saved concerts yet</div>
            <div>Create one and it will save automatically.</div>
          </div>
        )}
        {list?.map((m) => (
          <div key={m.id} className="proj-card">
            <div className="proj-thumb" style={{ backgroundImage: m.thumbnail ? `url(${m.thumbnail})` : undefined }} onClick={() => openProjectById(m.id)}>
              {!m.thumbnail && 'Open'}
            </div>
            <div className="proj-meta">
              <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
              <div className="card-sub">
                {getArena(m.arenaId).name} · {m.objectCount} elements · {m.fixtureCount} lights · {timeAgo(m.updatedAt)}
              </div>
            </div>
            <div className="proj-actions">
              <button className="btn small primary" onClick={() => openProjectById(m.id)}>Open</button>
              <span className="spacer" />
              <button className="icon-btn" onClick={() => setRenaming(m)} aria-label="Rename"><Pencil size={19} /></button>
              <button className="icon-btn" onClick={() => duplicate(m)} aria-label="Duplicate"><Copy size={19} /></button>
              <button className="icon-btn" onClick={() => exportOne(m)} aria-label="Export"><Download size={19} /></button>
              <button className="icon-btn" onClick={() => setDeleting(m)} aria-label="Delete"><Trash2 size={19} color="#ff6b6b" /></button>
            </div>
          </div>
        ))}
      </div>
      {renaming && <PromptModal title="Rename project" initial={renaming.name} onClose={() => setRenaming(null)} onDone={(v) => rename(renaming, v)} />}
      {deleting && (
        <Confirm
          text={`Delete “${deleting.name}”? This can't be undone. Export it first if you want a backup.`}
          onNo={() => setDeleting(null)}
          onYes={async () => {
            await deleteProject(deleting.id);
            setDeleting(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

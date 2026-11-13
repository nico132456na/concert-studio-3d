import { useEffect, useState } from 'react';
import { Plus, Building2, Star, FolderOpen, Settings, GraduationCap, Play } from 'lucide-react';
import { Viewport } from '../../three/Viewport';
import { ErrorBoundary } from '../components';
import { useUI } from '../../state/uiStore';
import { setPreview, openProjectById } from '../flow';
import { TEMPLATE_BY_ID } from '../../data/templates';
import { useAutoShow } from '../useAutoShow';
import { lastProjectId } from '../../storage/autosave';
import { listProjects } from '../../storage/db';
import type { ProjectMeta } from '../../types';

export function MainMenu() {
  const set = useUI((s) => s.set);
  const [ready, setReady] = useState(false);
  const [last, setLast] = useState<ProjectMeta | null>(null);

  useEffect(() => {
    setPreview('megadome', TEMPLATE_BY_ID.stadium.build());
    setReady(true);
    const id = lastProjectId();
    listProjects()
      .then((list) => setLast(list.find((p) => p.id === id) ?? list[0] ?? null))
      .catch(() => setLast(null));
  }, []);
  useAutoShow(ready, 6000, 2);

  const item = (icon: React.ReactNode, title: string, sub: string, onClick: () => void, primary = false, tut?: string) => (
    <button className={`menu-item ${primary ? 'primary' : ''}`} onClick={onClick} data-tut={tut}>
      {icon}
      <div>
        <div className="mi-title">{title}</div>
        <div className="mi-sub">{sub}</div>
      </div>
    </button>
  );

  return (
    <div className="fill">
      <ErrorBoundary label="3D preview">{ready && <Viewport mode="menu" arenaId="megadome" />}</ErrorBoundary>
      <div className="menu-shade" />
      <div className="menu">
        <div className="brand">Concert Studio</div>
        <div className="brand-title">
          Design the
          <br />
          show.
        </div>
        <div className="brand-sub">Build stages, rig lights, program the show, then run it live.</div>
        {last &&
          item(<Play size={26} />, 'CONTINUE', `${last.name}`, () => openProjectById(last.id), false)}
        {item(<Plus size={26} />, 'CREATE CONCERT', 'Start a new production', () => set({ screen: 'arenas' }), true, 'create')}
        {item(<Building2 size={26} />, 'EXPLORE ARENAS', 'Tour 8 venues in 3D', () => set({ screen: 'arenas' }))}
        {item(<Star size={26} />, 'ARTIST STAGES', 'Artist-inspired designs', () => set({ screen: 'gallery' }))}
        {item(<FolderOpen size={26} />, 'MY PROJECTS', 'Saved concerts', () => set({ screen: 'projects' }))}
        <div className="menu-foot">
          <button className="btn" onClick={() => set({ settingsOpen: true })}>
            <Settings size={18} /> Settings
          </button>
          <button className="btn" onClick={() => set({ tutorialStep: 0, screen: 'arenas' })}>
            <GraduationCap size={18} /> Tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

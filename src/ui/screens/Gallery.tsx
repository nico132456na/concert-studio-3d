import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, Pencil } from 'lucide-react';
import { ARTISTS } from '../../data/artists';
import { getArena } from '../../data/arenas';
import { MATERIAL_BY_ID } from '../../data/materials';
import { Viewport } from '../../three/Viewport';
import { ErrorBoundary } from '../components';
import { useUI } from '../../state/uiStore';
import { useProject } from '../../state/projectStore';
import { useShow } from '../../state/showStore';
import { createProject, setPreview } from '../flow';

export function Gallery() {
  const set = useUI((s) => s.set);
  const [infoOpen, setInfoOpen] = useState(window.innerWidth > 700);
  const requestCamera = useUI((s) => s.requestCamera);
  const [artistId, setArtistId] = useState(ARTISTS[0].id);
  const [designId, setDesignId] = useState(ARTISTS[0].designs[0].id);
  const artist = ARTISTS.find((a) => a.id === artistId)!;
  const design = artist.designs.find((d) => d.id === designId) ?? artist.designs[0];
  const project = useProject((s) => s.project);
  const activeScene = useShow((s) => s.activeSceneId);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    setPreview(design.arenaId, design.build());
  }, [design]);

  // cycle scenes while auto is on
  useEffect(() => {
    if (!auto || !project) return;
    let i = 2;
    const step = () => {
      const p = useProject.getState().project;
      if (!p?.scenes.length) return;
      const sc = p.scenes[i++ % p.scenes.length];
      useShow.getState().activateScene(sc, Math.min(2, sc.fade));
    };
    step();
    const t = window.setInterval(step, 7000);
    return () => window.clearInterval(t);
  }, [auto, project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mats = useMemo(() => {
    const ids = new Set(project?.objects.map((o) => o.material.preset));
    return Array.from(ids).map((id) => MATERIAL_BY_ID[id]?.label ?? id).slice(0, 5);
  }, [project]);

  const load = async () => {
    await createProject(design.arenaId, design.build(), `${design.title} (my version)`, design.accuracy === 'reference' ? `Based on ${artist.name} — ${design.tour} (${design.year})` : `Inspired by ${artist.name}`);
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn boxed" onClick={() => set({ screen: 'menu' })} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="screen-title">Artist Stages</div>
          <div className="screen-sub">30 artists · “Tour recreation” = simplified model of a real tour's reported stage · “Inspired” = original design in the artist's style</div>
        </div>
        <button className="btn primary" onClick={load}>
          <Pencil size={18} /> Edit this stage
        </button>
      </div>
      <div className="split">
        <div className="split-list">
          {ARTISTS.map((a) => (
            <div key={a.id} className={`card ${a.id === artistId ? 'on' : ''}`} onClick={() => { setArtistId(a.id); setDesignId(a.designs[0].id); }}>
              <div className="card-title">{a.name}</div>
              <div className="card-sub">{a.aesthetic}</div>
              {a.id === artistId && (
                <div className="row wrap" style={{ marginTop: 10 }}>
                  {a.designs.map((d) => (
                    <button key={d.id} className={`btn small ${d.id === design.id ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setDesignId(d.id); }}>
                      {d.title}{d.accuracy === 'reference' ? ` · ${d.year}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="split-view">
          <ErrorBoundary label="Stage preview">{project && <Viewport mode="preview" arenaId={design.arenaId} key={design.id} />}</ErrorBoundary>
          <div className="info-panel">
            {!infoOpen && (
              <button className="btn" onClick={() => setInfoOpen(true)}>
                Show details
              </button>
            )}
            {infoOpen && <div className="info-card" style={{ position: 'relative' }}>
              <button className="icon-btn" style={{ position: 'absolute', top: 4, right: 4 }} onClick={() => setInfoOpen(false)} aria-label="Hide details">
                <X size={20} />
              </button>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="badge" style={design.accuracy === 'reference' ? { background: '#2f7fe0', color: '#fff' } : undefined}>{design.accuracy === 'reference' ? 'Tour recreation · simplified' : 'Inspired design'}</span>
                <span className="badge">{artist.name}</span>
                {design.accuracy === 'reference' && <span className="badge">{design.tour} · {design.year}</span>}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{design.title}</div>
              <div className="hint" style={{ marginTop: 4 }}>{design.description}</div>
              <div className="stats">
                <div><div className="stat-k">Venue</div><div className="stat-v">{getArena(design.arenaId).name}</div></div>
                <div><div className="stat-k">Elements</div><div className="stat-v">{project?.objects.length ?? 0}</div></div>
                <div><div className="stat-k">Lights</div><div className="stat-v">{project?.fixtures.length ?? 0}</div></div>
                <div><div className="stat-k">Materials</div><div className="stat-v">{mats.join(', ')}</div></div>
              </div>
            </div>}
            <div className="info-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="cam-chips">
                {(
                  [
                    ['front', 'Front'],
                    ['audience', 'Crowd'],
                    ['performer', 'Performer'],
                    ['left', 'Stage left'],
                    ['right', 'Stage right'],
                    ['bird', "Bird's-eye"],
                    ['overview', 'Overview'],
                  ] as const
                ).map(([id, l]) => (
                  <button key={id} className="btn small" onClick={() => requestCamera(id)}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="cam-chips">
                {project?.scenes.map((s) => (
                  <button key={s.id} className={`btn small ${activeScene === s.id ? 'active' : ''}`} onClick={() => { setAuto(false); useShow.getState().activateScene(s, 1); }}>
                    {s.name}
                  </button>
                ))}
                <button className={`btn small ${auto ? 'active' : ''}`} onClick={() => setAuto(!auto)}>
                  Auto show
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

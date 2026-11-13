import { useEffect, useState } from 'react';
import { X, ArrowLeft, Check } from 'lucide-react';
import { ARENAS, getArena } from '../../data/arenas';
import { Viewport } from '../../three/Viewport';
import { ErrorBoundary, Modal } from '../components';
import { useUI } from '../../state/uiStore';
import { useProject } from '../../state/projectStore';
import { createProject, setPreview } from '../flow';
import { TEMPLATES } from '../../data/templates';
import { buildMainStage, DEFAULT_STAGE, finalize, standardRig, type StageParams } from '../../data/builders';
import type { DesignSeed } from '../../types';
import { makeObject } from '../../data/library';

const SHAPES: { id: string; name: string; hint: string; params: Partial<StageParams>; extra?: 'floating' }[] = [
  { id: 'rect', name: 'Rectangular', hint: 'Classic end stage', params: { shape: 'rect' } },
  { id: 'circle', name: 'Circular', hint: 'Round deck', params: { shape: 'circle', width: 16, depth: 16 } },
  { id: 'multi', name: 'Multi-Level', hint: 'Three tiers + stairs', params: { levels: 3, depth: 14 } },
  { id: 'runway', name: 'Extended Runway', hint: 'Runway + B-stage', params: { runway: 18, bstage: true } },
  { id: 'floating', name: 'Floating Platforms', hint: 'Deck + flown platforms', params: {}, extra: 'floating' },
  { id: 'custom', name: 'Custom', hint: 'Just a deck, build freely', params: { stairs: false, width: 16, depth: 8 } },
];

function shapeSeed(s: (typeof SHAPES)[number]): DesignSeed {
  const objects = buildMainStage({ ...DEFAULT_STAGE, ...s.params });
  if (s.extra === 'floating') {
    objects.push(
      makeObject('floating', { pos: [-8, 5, -3], size: [5, 0.5, 4] }),
      makeObject('floating', { pos: [8, 5, -3], size: [5, 0.5, 4] }),
      makeObject('floating', { pos: [0, 8, -7], size: [7, 0.5, 4] }),
    );
  }
  const rig = standardRig(s.params.width ?? DEFAULT_STAGE.width, ['#1a5cff', '#8a2aff', '#ffffff'], { spots: 4, beams: 6, wash: 2, floor: 4 });
  return finalize([...objects, ...rig.objects], rig.fixtures, ['#1a5cff', '#8a2aff', '#ffffff']);
}

export function ArenaSelect() {
  const set = useUI((s) => s.set);
  const [infoOpen, setInfoOpen] = useState(window.innerWidth > 700);
  const [sel, setSel] = useState(ARENAS[0].id);
  const [start, setStart] = useState(false);
  const arena = getArena(sel);
  const requestCamera = useUI((s) => s.requestCamera);
  const projectId = useProject((s) => s.project?.id);

  useEffect(() => {
    const p = setPreview(sel);
    useProject.getState().mutate((pp) => ({ ...pp, atmosphere: { ...pp.atmosphere, houseLights: 0.9, haze: 0.3, fog: 0 } }), { history: false });
    void p;
  }, [sel]);

  const begin = async (seed?: DesignSeed, label?: string) => {
    setStart(false);
    await createProject(sel, seed, label ? `${label} @ ${arena.name}` : `My ${arena.name} Show`);
    const ui = useUI.getState();
    if (ui.tutorialStep === 0) ui.set({ tutorialStep: 1 });
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn boxed" onClick={() => set({ screen: 'menu' })} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="screen-title">Choose an arena</div>
          <div className="screen-sub">Step 1 of 4 · Arena → Build → Light → Live</div>
        </div>
        <button className="btn primary" onClick={() => setStart(true)} data-tut="build-here">
          <Check size={18} /> Build here
        </button>
      </div>
      <div className="split">
        <div className="split-list">
          {ARENAS.map((a) => (
            <div key={a.id} className={`card ${a.id === sel ? 'on' : ''}`} onClick={() => setSel(a.id)}>
              <div className="card-title">{a.name}</div>
              <div className="card-sub">{a.tagline}</div>
            </div>
          ))}
        </div>
        <div className="split-view">
          <ErrorBoundary label="Arena preview">{projectId && <Viewport mode="preview" arenaId={sel} key={sel} />}</ErrorBoundary>
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
              <div style={{ fontSize: 20, fontWeight: 800 }}>{arena.name}</div>
              <div className="hint" style={{ marginTop: 4 }}>
                {arena.description}
              </div>
              <div className="stats">
                <div>
                  <div className="stat-k">Floor</div>
                  <div className="stat-v">
                    {arena.kind === 'empty' ? 'Unlimited' : `${Math.round(arena.floor.xMax - arena.floor.xMin)} × ${Math.round(arena.floor.zMax - arena.floor.zMin)} m`}
                  </div>
                </div>
                <div>
                  <div className="stat-k">Ceiling</div>
                  <div className="stat-v">{arena.ceiling ? `${arena.ceiling} m` : 'Open air'}</div>
                </div>
                <div>
                  <div className="stat-k">Capacity</div>
                  <div className="stat-v">{arena.capacity ? arena.capacity.toLocaleString() : 'Custom'}</div>
                </div>
                <div>
                  <div className="stat-k">Seating</div>
                  <div className="stat-v">{arena.seating}</div>
                </div>
                <div>
                  <div className="stat-k">Structure</div>
                  <div className="stat-v">{arena.structure}</div>
                </div>
                <div>
                  <div className="stat-k">Lighting</div>
                  <div className="stat-v">{arena.lighting}</div>
                </div>
              </div>
            </div>}
            <div className="info-card cam-chips">
              {(
                [
                  ['overview', 'Overview'],
                  ['front', 'Front'],
                  ['bird', "Bird's-eye"],
                  ['audience', 'Crowd view'],
                  ['performer', 'From stage'],
                ] as const
              ).map(([id, l]) => (
                <button key={id} className="btn small" onClick={() => requestCamera(id)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {start && (
        <Modal title={`Start in ${arena.name}`} onClose={() => setStart(false)} wide>
          <div className="section-title">Start empty</div>
          <div className="grid-3">
            <button className="tile" onClick={() => begin(undefined, 'Blank')} data-tut="start-empty">
              <span className="t-label">Empty floor</span>
              <span className="t-hint">Build from nothing</span>
            </button>
          </div>
          <div className="section-title">Start with a stage shape</div>
          <div className="grid-3">
            {SHAPES.map((s) => (
              <button key={s.id} className="tile" onClick={() => begin(shapeSeed(s), s.name)}>
                <span className="t-label">{s.name}</span>
                <span className="t-hint">{s.hint}</span>
              </button>
            ))}
          </div>
          <div className="section-title">Start from a full template</div>
          <div className="grid-3">
            {TEMPLATES.map((t) => (
              <button key={t.id} className="tile" onClick={() => begin(t.build(), t.name)}>
                <div className="row" style={{ gap: 4 }}>
                  {t.palette.map((c) => (
                    <span key={c} className="dot" style={{ background: c, width: 12, height: 12 }} />
                  ))}
                </div>
                <span className="t-label">{t.name}</span>
                <span className="t-hint">{t.blurb}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

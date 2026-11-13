import { useEffect, useState } from 'react';
import {
  X, Square, Circle, Hexagon, MoveVertical, Footprints, TrendingUp, Minus, Monitor, RectangleVertical, RectangleHorizontal, CircleDot, Tv, Columns2, Grid3x3,
  GalleryHorizontal, Grip, BetweenHorizontalStart, TowerControl, Frame, Rainbow, Construction, Theater, Square as Glass, Sailboat, Box, Globe, Torus, Triangle, Cylinder,
  Cone, ChevronRight, Lightbulb, Zap, Sun, Flashlight, Eye, EyeOff, Lock, Unlock, Shuffle, Layers,
  type LucideIcon, PenTool, Save, Trash2,
} from 'lucide-react';
import { useUI } from '../../state/uiStore';
import { useProject, edit, getProject } from '../../state/projectStore';
import { OBJECT_DEFS, FIXTURE_DEFS, CATEGORY_LABEL, type LibraryCategory, type ObjectDef } from '../../data/library';
import { useThumbnail } from '../../three/thumbnails';
import { useTemplates, type UserTemplate } from '../../storage/userTemplates';
import { CustomShapeModal } from './CustomShape';
import { toast } from '../../state/uiStore';
import { TEMPLATES } from '../../data/templates';
import { MATERIAL_PRESETS } from '../../data/materials';
import { DEFAULT_STAGE, type StageParams, type StageShape } from '../../data/builders';
import type { ObjectKind, FixtureType } from '../../types';
import { addFixture, addObject, applyDesign, randomize, rebuildMainStage, mergeDesign, freshIds } from './actions';
import { Seg, Slider, Toggle, Confirm, PromptModal } from '../components';
import { useSettings } from '../../state/settingsStore';

const ICONS: Partial<Record<ObjectKind, LucideIcon>> = {
  platform: Square, circlePlatform: Circle, hexPlatform: Hexagon, runway: MoveVertical, bstage: CircleDot, floating: Layers, stairs: Footprints, ramp: TrendingUp, catwalk: Minus,
  ledWall: Monitor, ledVertical: RectangleVertical, ledHorizontal: RectangleHorizontal, ledCircle: CircleDot, ledHanging: Tv, ledPillar: Columns2, ledFloor: Grid3x3, ledCurved: GalleryHorizontal,
  truss: Grip, trussTower: BetweenHorizontalStart, beam: Minus, lightTower: TowerControl, frame: Frame, arch: Rainbow, scaffold: Construction,
  curtain: Theater, glassPanel: Glass, fabric: Sailboat,
  monolith: RectangleVertical, cube: Box, sphere: Globe, ring: Circle, torus: Torus, pyramid: Triangle, column: Cylinder, cylinder: Cylinder, cone: Cone, wedge: TrendingUp,
};
const FX_ICONS: Partial<Record<FixtureType, LucideIcon>> = {
  spot: Flashlight, beam: Zap, wash: Sun, ledbar: Minus, ledtube: RectangleVertical, strobe: Zap, laser: ChevronRight, follow: Flashlight, floor: Lightbulb, ceiling: Lightbulb, blinder: Sun, pixel: Grid3x3,
};

type Tab = LibraryCategory | 'lights' | 'templates';
const TABS: { id: Tab; label: string }[] = [
  { id: 'stage', label: 'Stage' },
  { id: 'shapes', label: 'Advanced' },
  { id: 'structure', label: 'Architecture' },
  { id: 'rigging', label: 'Truss' },
  { id: 'led', label: 'LED' },
  { id: 'audio', label: 'Sound' },
  { id: 'lights', label: 'Lights' },
  { id: 'soft', label: 'Panels' },
  { id: 'decor', label: 'Decor' },
  { id: 'templates', label: 'Templates' },
];

function StageGenerator() {
  const [p, setP] = useState<StageParams>(DEFAULT_STAGE);
  const hasMain = useProject((st) => !!st.project?.objects.some((o) => o.tag === 'main'));
  const [active, setActive] = useState(false);
  // every change builds immediately — nothing to "confirm"
  const up = (patch: Partial<StageParams>) => {
    const n = { ...p, ...patch };
    setP(n);
    setActive(true);
    rebuildMainStage(n);
    if (!active && !hasMain) useUI.getState().bump('stage');
  };
  return (
    <div className="card" style={{ cursor: 'default' }}>
      <div className="card-title">Main stage builder</div>
      <div className="card-sub" style={{ marginBottom: 12 }}>Tap a shape — it appears instantly. Sliders reshape it live.</div>
      <div className="field">
        <Seg<StageShape>
          value={p.shape}
          onChange={(v) => up({ shape: v })}
          options={[
            { v: 'rect', label: 'Rect' },
            { v: 'circle', label: 'Round' },
            { v: 'hex', label: 'Hex' },
            { v: 'thrust', label: 'Thrust' },
            { v: 'tshape', label: 'T' },
            { v: 'wide', label: 'Wings' },
          ]}
        />
      </div>
      <Slider label="Width" value={p.width} min={4} max={80} step={0.5} onChange={(v) => up({ width: v })} format={(v) => `${v} m`} />
      <Slider label="Depth" value={p.depth} min={3} max={40} step={0.5} onChange={(v) => up({ depth: v })} format={(v) => `${v} m`} />
      <Slider label="Height" value={p.height} min={0.2} max={4} step={0.1} onChange={(v) => up({ height: v })} format={(v) => `${v} m`} />
      <Slider label="Levels" value={p.levels} min={1} max={4} step={1} onChange={(v) => up({ levels: v })} format={(v) => `${v}`} />
      <Slider label="Runway" value={p.runway} min={0} max={60} step={1} onChange={(v) => up({ runway: v })} format={(v) => (v ? `${v} m` : 'None')} />
      <Toggle label="B-stage" value={p.bstage} onChange={(v) => up({ bstage: v })} />
      <Toggle label="Stairs" value={p.stairs} onChange={(v) => up({ stairs: v })} />
      <div className="field">
        <div className="field-label">Deck material</div>
        <Seg value={p.material} onChange={(v) => up({ material: v })} options={['glossBlack', 'matteBlack', 'white', 'mirror', 'wood'].map((m) => ({ v: m, label: MATERIAL_PRESETS.find((x) => x.preset === m)!.label.split(' ')[0] }))} />
      </div>
      <button
        className="btn block primary"
        onClick={() => {
          setActive(true);
          rebuildMainStage(p);
          useUI.getState().bump('stage');
        }}
      >
        {active ? 'Rebuild main stage' : 'Build main stage'}
      </button>
      {(active || hasMain) && <div className="hint" style={{ marginTop: 8 }}>Main stage parts are tagged “Main” and rebuild as you change settings.</div>}
    </div>
  );
}

function ObjectTile({ def }: { def: ObjectDef }) {
  const thumb = useThumbnail(def.id);
  const I = ICONS[def.kind] ?? Box;
  return (
    <button className="tile" onClick={() => addObject(def.id)} data-tut={`add-${def.id}`}>
      {thumb ? <img src={thumb} alt="" width={56} height={56} style={{ width: 56, height: 56 }} /> : <I size={26} />}
      <span className="t-label">{def.label}</span>
      <span className="t-hint">{def.hint}</span>
    </button>
  );
}

function MyTemplates() {
  const { list, load, add, remove } = useTemplates();
  const [naming, setNaming] = useState(false);
  const [confirm, setConfirm] = useState<UserTemplate | null>(null);
  useEffect(() => {
    load().catch(() => {});
  }, [load]);
  const selection = useUI((s) => s.selection);
  const save = async (name: string) => {
    const p = getProject();
    if (!p) return;
    const sel = new Set(selection);
    const objects = selection.length ? p.objects.filter((o) => sel.has(o.id)) : p.objects;
    const fixtures = selection.length ? p.fixtures.filter((f) => sel.has(f.id)) : p.fixtures;
    try {
      await add(name, { objects, fixtures, scenes: selection.length ? [] : p.scenes, cues: selection.length ? [] : p.cues, groups: [] });
      toast('Design saved to My Designs', 'success');
    } catch (e) {
      toast(`Could not save: ${(e as Error).message}`, 'error');
    }
    setNaming(false);
  };
  return (
    <>
      <div className="section-title">My designs</div>
      <button className="btn block" onClick={() => setNaming(true)}>
        <Save size={16} /> {selection.length ? `Save ${selection.length} selected as a design` : 'Save whole stage as a design'}
      </button>
      {list.length === 0 && <div className="hint" style={{ marginTop: 8 }}>Saved designs can be reused in any project.</div>}
      {list.map((t) => (
        <div key={t.id} className="scene-row" style={{ marginTop: 8 }}>
          <div className="scene-go" style={{ cursor: 'default' }}>
            {t.name} <span className="hint">· {t.objectCount} parts</span>
          </div>
          <button className="btn small" onClick={() => mergeDesign(t.seed)}>Add</button>
          <button className="btn small" onClick={() => setConfirm(t)}>Use</button>
          <button className="icon-btn" onClick={() => remove(t.id)} aria-label="Delete"><Trash2 size={18} /></button>
        </div>
      ))}
      {naming && <PromptModal title="Name this design" initial="My stage design" onClose={() => setNaming(false)} onDone={save} />}
      {confirm && (
        <Confirm text={`Replace the current design with “${confirm.name}”? You can undo.`} yes="Replace" onNo={() => setConfirm(null)} onYes={() => { applyDesign(freshIds(confirm.seed)); setConfirm(null); }} />
      )}
    </>
  );
}

export function LibraryPanel() {
  const set = useUI((s) => s.set);
  const [tab, setTab] = useState<Tab>('stage');
  const [confirmT, setConfirmT] = useState<(typeof TEMPLATES)[number] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const beginner = useSettings((s) => s.editorMode) === 'beginner';
  return (
    <div className="panel left-panel" data-tut="library">
      <div className="panel-head">
        <div className="panel-title">Add to stage</div>
        <button className="btn small" onClick={randomize}>
          <Shuffle size={16} /> Randomize
        </button>
        <button className="icon-btn" onClick={() => set({ left: null })} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} data-tut={`lib-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="panel-body">
        {beginner && tab !== 'templates' && <div className="hint" style={{ marginBottom: 12 }}>Tap an item — it appears where the camera is looking. Then drag it into place.</div>}
        {tab === 'stage' && (
          <button className="btn block primary" style={{ marginBottom: 12 }} onClick={() => setDrawing(true)}>
            <PenTool size={18} /> Draw a custom stage shape
          </button>
        )}
        {tab === 'stage' && <StageGenerator />}
        {tab === 'stage' && <div className="section-title">Pieces</div>}
        {tab !== 'lights' && tab !== 'templates' && (
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
            {OBJECT_DEFS.filter((d) => d.category === tab).map((d) => {
              return <ObjectTile key={d.id} def={d} />;
            })}
          </div>
        )}
        {tab === 'lights' && (
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
            {FIXTURE_DEFS.map((d) => {
              const I = FX_ICONS[d.type] ?? Lightbulb;
              return (
                <button key={d.type} className="tile" onClick={() => addFixture(d.type)} data-tut={`add-${d.type}`}>
                  <I size={26} />
                  <span className="t-label">{d.label}</span>
                  <span className="t-hint">{d.hint}</span>
                </button>
              );
            })}
          </div>
        )}
        {tab === 'templates' && (
          <>
            <MyTemplates />
            <div className="section-title">Built-in templates</div>
            <div className="hint" style={{ marginBottom: 12 }}>Replaces the current stage, lights and scenes. You can undo.</div>
            <div className="grid-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} className="tile" onClick={() => setConfirmT(t)}>
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
          </>
        )}
      </div>
      {drawing && <CustomShapeModal onClose={() => setDrawing(false)} />}
      {confirmT && (
        <Confirm
          text={`Replace your current design with the “${confirmT.name}” template? You can undo this.`}
          yes="Use template"
          onNo={() => setConfirmT(null)}
          onYes={() => {
            applyDesign(confirmT.build());
            setConfirmT(null);
          }}
        />
      )}
    </div>
  );
}

export function LayersPanel() {
  const set = useUI((s) => s.set);
  const selection = useUI((s) => s.selection);
  const select = useUI((s) => s.select);
  const multi = useUI((s) => s.multiSelect);
  const objects = useProject((s) => s.project?.objects ?? []);
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  const sel = new Set(selection);
  const row = (id: string, name: string, sub: string, hidden?: boolean, locked?: boolean, isFx?: boolean) => (
    <div key={id} className={`list-row ${sel.has(id) ? 'on' : ''}`} onClick={() => { select([id], multi); set({ rightOpen: true, rightTab: isFx ? 'light' : 'object' }); }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="name" style={{ opacity: hidden ? 0.45 : 1 }}>{name}</div>
        <div className="sub">{sub}</div>
      </div>
      <button className="icon-btn" aria-label={hidden ? 'Show' : 'Hide'} onClick={(e) => { e.stopPropagation(); isFx ? edit.updateFixture(id, { hidden: !hidden }) : edit.updateObject(id, { hidden: !hidden }); }}>
        {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
      <button className="icon-btn" aria-label={locked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); isFx ? edit.updateFixture(id, { locked: !locked }) : edit.updateObject(id, { locked: !locked }); }}>
        {locked ? <Lock size={19} color="#ff9a3c" /> : <Unlock size={19} />}
      </button>
    </div>
  );
  return (
    <div className="panel left-panel">
      <div className="panel-head">
        <div className="panel-title">Layers ({objects.length + fixtures.length})</div>
        <button className={`btn small ${multi ? 'active' : ''}`} onClick={() => set({ multiSelect: !multi })}>Multi-select</button>
        <button className="icon-btn" onClick={() => set({ left: null })} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <div className="panel-body">
        <div className="section-title">Structures</div>
        {objects.length === 0 && <div className="hint">Nothing yet — tap ADD.</div>}
        {objects.map((o) => row(o.id, o.name, `${o.groupId ? 'Grouped · ' : ''}${o.size[0].toFixed(1)} × ${o.size[2].toFixed(1)} × ${o.size[1].toFixed(1)} m`, o.hidden, o.locked))}
        <div className="section-title">Lights</div>
        {fixtures.length === 0 && <div className="hint">No lights yet.</div>}
        {fixtures.map((f) => row(f.id, f.name, f.type, f.hidden, f.locked, true))}
      </div>
    </div>
  );
}

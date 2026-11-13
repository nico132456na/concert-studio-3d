import { useEffect, useState } from 'react';
import { X, Play, Pause, RotateCcw, Plus, Copy, Pencil, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle, Wand2, Square } from 'lucide-react';
import { useUI, toast } from '../../state/uiStore';
import { useProject, edit, getProject } from '../../state/projectStore';
import { useSettings } from '../../state/settingsStore';
import { useShow } from '../../state/showStore';
import { FIXTURE_DEF } from '../../data/library';
import { LIGHT_PRESETS } from '../../data/visuals';
import { buildAutoShow, DEFAULT_PALETTE } from '../../data/sceneGen';
import type { Cue, Fixture, LightPreset } from '../../types';
import { ColorPicker, Seg, Slider, Toggle, PromptModal, Confirm } from '../components';
import { FixtureControls, XYPad, MOVES, EFFECTS } from './FixtureControls';
import { applyLightPreset, loadSceneForEditing, sceneFromCurrent, setFixtures, targetFixtureIds } from './actions';
import { show, cueProgress } from '../showControl';
import { uid } from '../../util/misc';

type DeskTab = 'fixtures' | 'color' | 'intensity' | 'movement' | 'effects' | 'scenes' | 'timeline' | 'atmosphere';

/* -------------------------- fixture selection sidebar -------------------------- */

function FixtureSidebar() {
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  const groups = useProject((s) => s.project?.groups ?? []);
  const selection = useUI((s) => s.selection);
  const set = useUI((s) => s.set);
  const sel = new Set(selection);
  const selFx = fixtures.filter((f) => sel.has(f.id));
  const types = Array.from(new Set(fixtures.map((f) => f.type)));
  const toggle = (id: string) => set({ selection: sel.has(id) ? selection.filter((x) => x !== id) : [...selection.filter((x) => fixtures.some((f) => f.id === x)), id] });
  return (
    <div className="desk-side">
      <div className="hint" style={{ margin: '2px 4px 8px' }}>
        Controlling: <b style={{ color: '#fff' }}>{selFx.length ? `${selFx.length} selected` : `All lights (${fixtures.length})`}</b>
      </div>
      <button className={`list-row ${!selFx.length ? 'on' : ''}`} style={{ width: '100%', border: 'none', background: !selFx.length ? undefined : 'transparent' }} onClick={() => set({ selection: [] })}>
        <span className="name">All lights</span>
      </button>
      {groups.map((g) => (
        <button key={g.id} className="list-row" style={{ width: '100%', border: 'none', background: 'transparent' }} onClick={() => set({ selection: g.fixtureIds })}>
          <span className="name">▣ {g.name}</span>
          <span className="sub">{g.fixtureIds.length}</span>
        </button>
      ))}
      {types.map((t) => (
        <button key={t} className="list-row" style={{ width: '100%', border: 'none', background: 'transparent' }} onClick={() => set({ selection: fixtures.filter((f) => f.type === t).map((f) => f.id) })}>
          <span className="name">All {FIXTURE_DEF[t]?.label ?? t}s</span>
        </button>
      ))}
      <div className="divider" />
      {fixtures.map((f) => (
        <div key={f.id} className={`list-row ${sel.has(f.id) ? 'on' : ''}`} onClick={() => toggle(f.id)}>
          <span className="dot" style={{ background: f.on ? f.color : '#222' }} />
          <span className="name" style={{ fontSize: 14 }}>{f.name}</span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- tabs --------------------------------- */

function FixturesTab() {
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  const groups = useProject((s) => s.project?.groups ?? []);
  const selection = useUI((s) => s.selection);
  const set = useUI((s) => s.set);
  const [naming, setNaming] = useState<{ id?: string; name: string } | null>(null);
  const selFx = fixtures.filter((f) => selection.includes(f.id));
  return (
    <>
      <div className="row wrap">
        <button className="btn small" onClick={() => set({ selection: fixtures.map((f) => f.id) })}>Select all</button>
        <button className="btn small" onClick={() => set({ selection: [] })}>Select none</button>
        <button className="btn small" disabled={!selFx.length} onClick={() => setNaming({ name: `Group ${groups.length + 1}` })}>
          <Plus size={16} /> Group from selection
        </button>
      </div>
      <div className="section-title">Fixture groups</div>
      {!groups.length && <div className="hint">Select lights, then “Group from selection” to control them together.</div>}
      {groups.map((g) => (
        <div key={g.id} className="scene-row">
          <button className="scene-go" onClick={() => set({ selection: g.fixtureIds })}>
            {g.name} <span className="hint">· {g.fixtureIds.length} lights</span>
          </button>
          <button className="icon-btn" onClick={() => setNaming({ id: g.id, name: g.name })} aria-label="Rename"><Pencil size={18} /></button>
          <button className="icon-btn" onClick={() => edit.updateGroup(g.id, { fixtureIds: selFx.map((f) => f.id) })} disabled={!selFx.length} aria-label="Update">
            <Copy size={18} />
          </button>
          <button className="icon-btn" onClick={() => edit.removeGroup(g.id)} aria-label="Delete"><Trash2 size={18} /></button>
        </div>
      ))}
      <div className="hint">The copy icon replaces a group's lights with the current selection (saves a fixture arrangement).</div>
      {naming && (
        <PromptModal
          title={naming.id ? 'Rename group' : 'New group'}
          initial={naming.name}
          onClose={() => setNaming(null)}
          onDone={(name) => {
            if (naming.id) edit.updateGroup(naming.id, { name });
            else edit.addGroup(name, selFx.map((f) => f.id));
            setNaming(null);
          }}
        />
      )}
    </>
  );
}

function ColorTab() {
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  const saved = useProject((s) => s.project?.savedColors ?? []);
  const custom = useProject((s) => s.project?.customPresets ?? []);
  const selection = useUI((s) => s.selection);
  const [naming, setNaming] = useState(false);
  const target = fixtures.filter((f) => targetFixtureIds().includes(f.id));
  const cur = target[0]?.color ?? '#ffffff';
  void selection;
  const savePreset = (name: string) => {
    const colors = Array.from(new Set(target.map((f) => f.color))).slice(0, 8);
    const preset: LightPreset = { id: uid('lp'), name, colors, intensity: target[0]?.intensity ?? 1 };
    useProject.getState().mutate((p) => ({ ...p, customPresets: [...p.customPresets, preset] }));
    setNaming(false);
    toast('Preset saved', 'success');
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
      <div>
        <div className="section-title">Color</div>
        <ColorPicker
          value={cur}
          advanced
          onChange={(c) => setFixtures(() => ({ color: c, on: true }), 'desk-color')}
          saved={saved}
          onSave={(c) => useProject.getState().mutate((p) => ({ ...p, savedColors: Array.from(new Set([c, ...p.savedColors])).slice(0, 24) }))}
        />
      </div>
      <div>
        <div className="section-title">Presets</div>
        <div className="grid-2">
          {[...LIGHT_PRESETS, ...custom].map((p) => (
            <button key={p.id} className="preset-btn" onClick={() => applyLightPreset(p)}>
              {p.name}
              <span className="bar" style={{ background: p.colors.length > 1 ? `linear-gradient(90deg, ${p.colors.join(',')})` : p.colors[0] }} />
            </button>
          ))}
        </div>
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => setNaming(true)}>
          <Plus size={16} /> Save current colors as preset
        </button>
        {custom.length > 0 && (
          <button className="btn small ghost" style={{ marginTop: 6 }} onClick={() => useProject.getState().mutate((p) => ({ ...p, customPresets: [] }))}>
            Clear custom presets
          </button>
        )}
      </div>
      {naming && <PromptModal title="Preset name" initial="My look" onClose={() => setNaming(false)} onDone={savePreset} />}
    </div>
  );
}

function Fader({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color?: string }) {
  return (
    <div className="fader">
      <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.round(value * 100)}</div>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} aria-label={label} />
      {color && <span className="dot" style={{ background: color }} />}
      <div className="fader-label">{label}</div>
    </div>
  );
}

function IntensityTab() {
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  const groups = useProject((s) => s.project?.groups ?? []);
  const master = useProject((s) => s.project?.atmosphere.master ?? 1);
  const blackout = useShow((s) => s.blackout);
  const selection = useUI((s) => s.selection);
  const selFx = fixtures.filter((f) => selection.includes(f.id));
  const avg = (list: Fixture[]) => (list.length ? list.reduce((a, f) => a + (f.on ? f.intensity : 0), 0) / list.length : 0);
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`btn ${blackout ? 'live' : ''}`} onClick={() => useShow.getState().set({ blackout: !blackout })}>
          {blackout ? 'BLACKOUT ON' : 'Blackout'}
        </button>
        <span className="hint">Master and groups below. Individual faders follow.</span>
      </div>
      <div className="fader-bank">
        <Fader label="MASTER" value={master} onChange={(v) => edit.setAtmosphere({ master: v }, 'master')} color="#fff" />
        {selFx.length > 0 && <Fader label="Selection" value={avg(selFx)} onChange={(v) => edit.updateFixtures(selFx.map((f) => f.id), (f) => ({ ...f, intensity: v, on: true }), { key: 'fader-sel' })} />}
        {groups.map((g) => {
          const list = fixtures.filter((f) => g.fixtureIds.includes(f.id));
          return <Fader key={g.id} label={g.name} value={avg(list)} onChange={(v) => edit.updateFixtures(g.fixtureIds, (f) => ({ ...f, intensity: v, on: true }), { key: `fader-${g.id}` })} />;
        })}
        <div className="tool-sep" />
        {fixtures.map((f) => (
          <Fader key={f.id} label={f.name} color={f.color} value={f.on ? f.intensity : 0} onChange={(v) => edit.updateFixture(f.id, { intensity: v, on: v > 0 }, { key: `fader-${f.id}` })} />
        ))}
      </div>
    </>
  );
}

function MovementTab() {
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  useUI((s) => s.selection);
  const target = fixtures.filter((f) => targetFixtureIds().includes(f.id));
  const f = target[0];
  if (!f) return <div className="hint">Add lights first.</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
      <div>
        <div className="section-title">Pan & tilt</div>
        <XYPad pan={Math.round(f.pan)} tilt={Math.round(f.tilt)} onChange={(pan, tilt) => setFixtures(() => ({ pan, tilt }), 'desk-pt')} />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn small" onClick={() => setFixtures((x) => ({ pan: x.pos[2] > 0 ? 180 : 0, tilt: 25 }), 'desk-home')}>Aim at stage</button>
          <button className="btn small" onClick={() => setFixtures(() => ({ tilt: 0 }), 'desk-down')}>Straight down</button>
          <button className="btn small" onClick={() => setFixtures((x) => ({ pan: x.pos[0] < 0 ? 20 : -20, tilt: 160 }), 'desk-fanup')}>Fan up</button>
        </div>
      </div>
      <div>
        <div className="section-title">Pattern</div>
        <div className="row wrap">
          {MOVES.map((m) => (
            <button key={m.v} className={`fx-chip ${f.movement === m.v ? 'on' : ''}`} onClick={() => setFixtures(() => ({ movement: m.v }))}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ height: 12 }} />
        <Slider label="Speed" value={f.moveSpeed} min={0} max={3} onChange={(v) => setFixtures(() => ({ moveSpeed: v }), 'desk-ms')} format={(v) => `${v.toFixed(1)}×`} />
        <Slider label="Size" value={f.moveSize} min={0} max={90} step={1} onChange={(v) => setFixtures(() => ({ moveSize: v }), 'desk-mz')} format={(v) => `${v}°`} />
      </div>
    </div>
  );
}

function EffectsTab() {
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  useUI((s) => s.selection);
  const target = fixtures.filter((f) => targetFixtureIds().includes(f.id));
  const f = target[0];
  if (!f) return <div className="hint">Add lights first.</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
      <div>
        <div className="section-title">Effect</div>
        <div className="row wrap">
          {EFFECTS.map((m) => (
            <button key={m.v} className={`fx-chip ${f.effect === m.v ? 'on' : ''}`} onClick={() => setFixtures(() => ({ effect: m.v }))}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ height: 12 }} />
        <Slider label="Effect speed" value={f.effectSpeed} min={0} max={3} onChange={(v) => setFixtures(() => ({ effectSpeed: v }), 'desk-es')} format={(v) => `${v.toFixed(1)}×`} />
        <Slider label="Strobe rate" value={f.strobeRate} min={1} max={20} step={0.5} onChange={(v) => setFixtures(() => ({ strobeRate: v }), 'desk-sr')} format={(v) => `${v} Hz`} />
      </div>
      <div>
        <div className="section-title">Beam</div>
        <Slider label="Beam angle" value={f.beamAngle} min={1} max={90} step={1} onChange={(v) => setFixtures(() => ({ beamAngle: v }), 'desk-ba')} format={(v) => `${v}°`} />
        <Slider label="Focus" value={f.focus} min={0} max={1} onChange={(v) => setFixtures(() => ({ focus: v }), 'desk-fo')} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Intensity" value={f.intensity} min={0} max={1} onChange={(v) => setFixtures(() => ({ intensity: v, on: true }), 'desk-in')} format={(v) => `${Math.round(v * 100)}%`} />
      </div>
    </div>
  );
}

function ScenesTab() {
  const scenes = useProject((s) => s.project?.scenes ?? []);
  const activeId = useShow((s) => s.activeSceneId);
  const [naming, setNaming] = useState<{ id?: string; name: string } | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const move = (i: number, d: number) =>
    edit.setScenes((list) => {
      const a = [...list];
      const j = i + d;
      if (j < 0 || j >= a.length) return list;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  const autoBuild = () => {
    const p = getProject();
    if (!p) return;
    const { scenes: sc, cues } = buildAutoShow(p.fixtures, p.objects, [p.fixtures[0]?.color ?? DEFAULT_PALETTE[0], p.fixtures[1]?.color ?? DEFAULT_PALETTE[1], '#ffffff']);
    useProject.getState().mutate((pp) => ({ ...pp, scenes: [...pp.scenes, ...sc], cues: pp.cues.length ? pp.cues : cues }));
    toast('Added Intro, Verse, Chorus, Bridge & Outro');
  };
  return (
    <>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <button className="btn small primary" onClick={() => setNaming({ name: `Scene ${scenes.length + 1}` })}>
          <Circle size={14} fill="#ff3b4e" color="#ff3b4e" /> Record current look
        </button>
        <button className="btn small" onClick={autoBuild}>
          <Wand2 size={16} /> Auto-create song scenes
        </button>
        {activeId && (
          <button className="btn small" onClick={() => useShow.getState().clearOverride()}>
            <Square size={14} /> Stop preview
          </button>
        )}
      </div>
      {!scenes.length && <div className="hint">A scene stores every light's color, brightness, movement and the screen visuals. Set up a look, then Record.</div>}
      {scenes.map((s, i) => (
        <div key={s.id} className={`scene-row ${activeId === s.id ? 'on' : ''}`}>
          <button className="icon-btn boxed" onClick={() => useShow.getState().activateScene(s)} aria-label="Preview">
            <Play size={18} />
          </button>
          <button className="scene-go" onClick={() => useShow.getState().activateScene(s)}>
            {s.name} <span className="hint">· fade {s.fade}s</span>
          </button>
          <button className="btn small" onClick={() => { loadSceneForEditing(s); toast(`Loaded “${s.name}” for editing`); }}>Edit</button>
          <button className="btn small" onClick={() => { const n = sceneFromCurrent(s.name, s.fade); edit.setScenes((l) => l.map((x) => (x.id === s.id ? { ...n, id: s.id } : x))); toast(`Updated “${s.name}”`); }}>Update</button>
          <button className="icon-btn" onClick={() => edit.setScenes((l) => [...l.slice(0, i + 1), { ...s, id: uid('s'), name: `${s.name} copy` }, ...l.slice(i + 1)])} aria-label="Duplicate"><Copy size={18} /></button>
          <button className="icon-btn" onClick={() => setNaming({ id: s.id, name: s.name })} aria-label="Rename"><Pencil size={18} /></button>
          <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Up"><ChevronUp size={18} /></button>
          <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === scenes.length - 1} aria-label="Down"><ChevronDown size={18} /></button>
          <button className="icon-btn" onClick={() => setDel(s.id)} aria-label="Delete"><Trash2 size={18} /></button>
        </div>
      ))}
      {scenes.length > 0 && (
        <Slider
          label={`Fade time · ${scenes.find((x) => x.id === activeId)?.name ?? 'active scene'}`}
          value={scenes.find((x) => x.id === activeId)?.fade ?? 2}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => activeId && edit.setScenes((l) => l.map((x) => (x.id === activeId ? { ...x, fade: v } : x)))}
          format={(v) => `${v.toFixed(1)} s`}
        />
      )}
      {naming && (
        <PromptModal
          title={naming.id ? 'Rename scene' : 'Name this scene'}
          initial={naming.name}
          onClose={() => setNaming(null)}
          onDone={(name) => {
            if (naming.id) edit.setScenes((l) => l.map((x) => (x.id === naming.id ? { ...x, name } : x)));
            else {
              edit.setScenes((l) => [...l, sceneFromCurrent(name)]);
              toast(`Recorded “${name}”`, 'success');
            }
            setNaming(null);
          }}
        />
      )}
      {del && (
        <Confirm
          text="Delete this scene? Timeline cues using it are removed too."
          onNo={() => setDel(null)}
          onYes={() => {
            useProject.getState().mutate((p) => ({ ...p, scenes: p.scenes.filter((x) => x.id !== del), cues: p.cues.filter((c) => c.sceneId !== del) }));
            setDel(null);
          }}
        />
      )}
    </>
  );
}

function TimelineTab() {
  const scenes = useProject((s) => s.project?.scenes ?? []);
  const cues = useProject((s) => s.project?.cues ?? []);
  const playing = useShow((s) => s.playing);
  const cueIndex = useShow((s) => s.cueIndex);
  const [selId, setSelId] = useState<string | null>(null);
  const [prog, setProg] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setProg(cueProgress()), 120);
    return () => window.clearInterval(t);
  }, []);
  const total = cues.reduce((a, c) => a + c.duration, 0);
  const sel = cues.find((c) => c.id === selId) ?? null;
  const updCue = (id: string, patch: Partial<Cue>) => edit.setCues((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)), `cue-${id}`);
  const moveCue = (d: number) => {
    if (!sel) return;
    edit.setCues((l) => {
      const i = l.findIndex((c) => c.id === sel.id);
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const a = [...l];
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  };
  const sceneName = (id: string) => scenes.find((s) => s.id === id)?.name ?? '—';
  return (
    <>
      <div className="row wrap">
        <button className="btn primary" onClick={() => show.toggle(false)}>
          {playing ? <Pause size={18} /> : <Play size={18} />} {playing ? 'Pause' : 'Preview'}
        </button>
        <button className="btn" onClick={() => show.restart(false)}>
          <RotateCcw size={18} /> Restart
        </button>
        <button className="btn" onClick={() => show.stop()}>
          <Square size={16} /> Stop
        </button>
        <span className="hint">
          {cues.length} cues · {Math.round(total)} s total · loops in Live Mode
        </span>
      </div>
      <div className="timeline">
        {cues.map((c, i) => (
          <div
            key={c.id}
            className={`cue ${selId === c.id ? 'on' : ''} ${cueIndex === i && (playing || useShow.getState().override) ? 'playing' : ''}`}
            style={{ width: Math.max(90, c.duration * 9) }}
            onClick={() => setSelId(c.id)}
            onDoubleClick={() => show.goto(i)}
          >
            <div className="cue-name">{sceneName(c.sceneId)}</div>
            <div className="cue-time">{c.duration}s · fade {c.fade}s</div>
            {cueIndex === i && playing && <div className="cue-prog" style={{ width: `${prog * 100}%` }} />}
          </div>
        ))}
        {scenes.length > 0 && (
          <button
            className="cue"
            style={{ alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--line-2)', background: 'transparent' }}
            onClick={() => {
              const c: Cue = { id: uid('c'), sceneId: scenes[cues.length % scenes.length].id, duration: 12, fade: 2 };
              edit.setCues((l) => [...l, c]);
              setSelId(c.id);
            }}
          >
            <Plus size={20} /> Add cue
          </button>
        )}
      </div>
      {!scenes.length && <div className="hint">Record scenes first (Scenes tab), then arrange them here.</div>}
      {sel && (
        <div className="card" style={{ cursor: 'default' }}>
          <div className="row wrap" style={{ marginBottom: 10 }}>
            <b>Cue {cues.findIndex((c) => c.id === sel.id) + 1}</b>
            <span className="spacer" />
            <button className="btn small" onClick={() => show.goto(cues.findIndex((c) => c.id === sel.id))}>Go</button>
            <button className="icon-btn" onClick={() => moveCue(-1)} aria-label="Earlier"><ChevronLeft size={18} /></button>
            <button className="icon-btn" onClick={() => moveCue(1)} aria-label="Later"><ChevronRight size={18} /></button>
            <button className="icon-btn" onClick={() => { edit.setCues((l) => l.filter((c) => c.id !== sel.id)); setSelId(null); }} aria-label="Delete"><Trash2 size={18} /></button>
          </div>
          <div className="row wrap" style={{ marginBottom: 12 }}>
            {scenes.map((s) => (
              <button key={s.id} className={`btn small ${sel.sceneId === s.id ? 'active' : ''}`} onClick={() => updCue(sel.id, { sceneId: s.id })}>
                {s.name}
              </button>
            ))}
          </div>
          <Slider label="Scene duration" value={sel.duration} min={1} max={60} step={0.5} onChange={(v) => updCue(sel.id, { duration: v })} format={(v) => `${v} s`} />
          <Slider label="Transition / fade time" value={sel.fade} min={0} max={10} step={0.1} onChange={(v) => updCue(sel.id, { fade: v })} format={(v) => `${v.toFixed(1)} s`} />
        </div>
      )}
    </>
  );
}

function AtmosphereTab() {
  const a = useProject((s) => s.project?.atmosphere);
  if (!a) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
      <Slider label="Haze (beam visibility)" value={a.haze} min={0} max={1} onChange={(v) => edit.setAtmosphere({ haze: v }, 'haze')} format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Low fog" value={a.fog} min={0} max={1} onChange={(v) => edit.setAtmosphere({ fog: v }, 'fog')} format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="House lights" value={a.houseLights} min={0} max={1} onChange={(v) => edit.setAtmosphere({ houseLights: v }, 'house')} format={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Grand master" value={a.master} min={0} max={1} onChange={(v) => edit.setAtmosphere({ master: v }, 'master')} format={(v) => `${Math.round(v * 100)}%`} />
    </div>
  );
}

/* --------------------------------- desk --------------------------------- */

export function LightingDesk() {
  const set = useUI((s) => s.set);
  const mode = useSettings((s) => s.lightingMode);
  const update = useSettings((s) => s.update);
  const override = useShow((s) => s.override);
  const activeName = useProject((s) => s.project?.scenes.find((x) => x.id === useShow.getState().activeSceneId)?.name);
  const selection = useUI((s) => s.selection);
  const fixtures = useProject((s) => s.project?.fixtures ?? []);
  const [tab, setTab] = useState<DeskTab>('color');
  const selFx = fixtures.filter((f) => selection.includes(f.id)).map((f) => f.id);
  const TABS: { id: DeskTab; label: string }[] = [
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'color', label: 'Colors' },
    { id: 'intensity', label: 'Brightness' },
    { id: 'movement', label: 'Movement' },
    { id: 'effects', label: 'Effects' },
    { id: 'scenes', label: 'Scenes' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'atmosphere', label: 'Atmosphere' },
  ];
  return (
    <div className="panel desk-panel" data-tut="desk">
      <div className="panel-head">
        <div className="panel-title">Lighting</div>
        <div style={{ width: 280 }}>
          <Seg value={mode} onChange={(v) => update({ lightingMode: v })} options={[{ v: 'simple', label: 'Simple' }, { v: 'advanced', label: 'Console' }]} />
        </div>
        <button className="icon-btn" onClick={() => set({ deskOpen: false })} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      {override && (
        <div className="row" style={{ padding: '8px 18px', background: 'rgba(77,163,255,0.12)', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 14 }}>Previewing scene <b>{activeName ?? ''}</b> — edits show after you stop.</span>
          <span className="spacer" />
          <button className="btn small" onClick={() => useShow.getState().clearOverride()}>Stop preview</button>
        </div>
      )}
      {mode === 'simple' ? (
        <div className="desk-body">
          <FixtureSidebar />
          <div className="desk-main">
            <FixtureControls fixtureIds={selFx} simple />
          </div>
        </div>
      ) : (
        <>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="desk-body">
            <FixtureSidebar />
            <div className="desk-main">
              {tab === 'fixtures' && <FixturesTab />}
              {tab === 'color' && <ColorTab />}
              {tab === 'intensity' && <IntensityTab />}
              {tab === 'movement' && <MovementTab />}
              {tab === 'effects' && <EffectsTab />}
              {tab === 'scenes' && <ScenesTab />}
              {tab === 'timeline' && <TimelineTab />}
              {tab === 'atmosphere' && <AtmosphereTab />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { Toggle };

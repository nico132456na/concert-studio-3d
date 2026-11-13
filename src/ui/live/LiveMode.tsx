import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, X, Save, Moon, PersonStanding } from 'lucide-react';
import { enterPerformer } from '../../performer/flow';
import { Viewport } from '../../three/Viewport';
import { ErrorBoundary, Slider } from '../components';
import { useUI, type CameraPresetId } from '../../state/uiStore';
import { useProject, edit } from '../../state/projectStore';
import { useShow } from '../../state/showStore';
import { useSettings } from '../../state/settingsStore';
import { VISUAL_PRESETS } from '../../data/visuals';
import { show, cueProgress } from '../showControl';
import { exitLive } from '../flow';
import { manualSave } from '../editor/Chrome';
import { beat } from '../../audio/beat';

type Tray = 'scenes' | 'visuals' | 'camera' | 'lights' | 'fx';

const CAMS: { id: CameraPresetId; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'audience', label: 'In the crowd' },
  { id: 'performer', label: 'Performer' },
  { id: 'left', label: 'Stage left' },
  { id: 'right', label: 'Stage right' },
  { id: 'bird', label: "Bird's-eye" },
  { id: 'overview', label: 'Arena' },
  { id: 'rear', label: 'Rear' },
];

const LIVE_COLORS = ['#ffffff', '#ff1010', '#ff7a1a', '#ffc21a', '#7dff4d', '#1ae0ff', '#1a5cff', '#8a2aff', '#ff2ad4'];

export function LiveMode() {
  const project = useProject((s) => s.project);
  const s = useShow();
  const requestCamera = useUI((x) => x.requestCamera);
  const [tray, setTray] = useState<Tray>('scenes');
  const [autoCam, setAutoCam] = useState(false);
  const [prog, setProg] = useState(0);
  const [selFx, setSelFx] = useState<string | null>(null);
  const music = useSettings((x) => x.music);
  const lightEnv = useUI((x) => x.lightEnv);

  useEffect(() => {
    const t = window.setInterval(() => setProg(cueProgress()), 150);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!autoCam) return;
    let i = 0;
    const order: CameraPresetId[] = ['front', 'audience', 'left', 'performer', 'bird', 'right', 'overview'];
    requestCamera(order[0]);
    const t = window.setInterval(() => requestCamera(order[++i % order.length]), 7000);
    return () => window.clearInterval(t);
  }, [autoCam, requestCamera]);

  useEffect(() => () => beat.stop(), []);

  if (!project) return null;
  const cue = project.cues[s.cueIndex];
  const sceneName = cue ? project.scenes.find((x) => x.id === cue.sceneId)?.name : project.scenes.find((x) => x.id === s.activeSceneId)?.name;

  return (
    <div className="fill letterbox">
      <ErrorBoundary label="Live view">
        <Viewport mode="live" arenaId={project.arenaId} />
      </ErrorBoundary>
      <div className="live-top">
        <button className="btn" onClick={exitLive} aria-label="Exit live mode">
          <X size={18} /> Exit
        </button>
        <div className="live-badge">
          <span className="pulse" /> LIVE
        </div>
        <div className="live-title">{project.name}</div>
        <span className="spacer" />
        {sceneName && <div className="badge" style={{ fontSize: 13 }}>{s.playing ? '▶' : '❚❚'} {sceneName}</div>}
        <button className="btn" onClick={() => { exitLive(); enterPerformer(); }} style={{ borderColor: '#4da3ff' }} data-tut="perform-live">
          <PersonStanding size={18} /> Perform
        </button>
        <button className="btn" onClick={manualSave} data-tut="save-live">
          <Save size={18} /> Save
        </button>
      </div>

      <div className="live-master">
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em' }}>MASTER</div>
        <input type="range" min={0} max={1} step={0.01} value={s.master} onChange={(e) => s.set({ master: parseFloat(e.target.value) })} aria-label="Master" />
        <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.master * 100)}</div>
      </div>

      <div className="live-dock">
        <div className="live-transport">
          <button className="big-btn play" onClick={() => show.toggle(true)} data-tut="play">
            {s.playing ? <Pause size={26} /> : <Play size={26} />} {s.playing ? 'PAUSE' : 'PLAY'}
          </button>
          <button className="big-btn" onClick={() => show.restart(true)}>
            <RotateCcw size={22} /> RESTART
          </button>
          <button className="big-btn" onClick={() => show.next()}>
            <SkipForward size={22} /> NEXT
          </button>
          <button className={`big-btn blackout ${s.blackout ? 'on' : ''}`} onClick={() => s.set({ blackout: !s.blackout })}>
            <Moon size={22} /> BLACKOUT
          </button>
          {project.cues.length > 0 && (
            <div className="big-btn" style={{ flex: 1, minWidth: 200, flexDirection: 'column', alignItems: 'stretch', gap: 8, cursor: 'default' }}>
              <div style={{ fontSize: 12, letterSpacing: '0.1em', color: 'var(--text-2)' }}>
                CUE {s.cueIndex + 1}/{project.cues.length} · {s.bpm} BPM {music ? '' : '· music off'}
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {project.cues.map((c, i) => (
                  <div key={c.id} onClick={() => show.goto(i)} style={{ flex: c.duration, height: 8, borderRadius: 4, background: i < s.cueIndex ? '#888' : i === s.cueIndex ? `linear-gradient(90deg, #fff ${prog * 100}%, #555 ${prog * 100}%)` : '#333', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="live-tray">
          <div className="tabs">
            {(['scenes', 'visuals', 'camera', 'lights', 'fx'] as Tray[]).map((t) => (
              <button key={t} className={`tab ${tray === t ? 'on' : ''}`} onClick={() => setTray(t)}>
                {{ scenes: 'LIGHTING SCENES', visuals: 'LED VISUALS', camera: 'CAMERA', lights: 'LIGHTING CONTROL', fx: 'STAGE FX' }[t]}
              </button>
            ))}
          </div>
          {tray === 'scenes' && (
            <div className="pad-row">
              {project.scenes.length === 0 && <div className="hint" style={{ padding: 12 }}>Press PLAY to auto-create a show, or record scenes in the lighting console.</div>}
              {project.scenes.map((sc, i) => (
                <button key={sc.id} className={`pad ${s.activeSceneId === sc.id ? 'on' : ''}`} onClick={() => s.activateScene(sc)}>
                  {sc.name}
                  <small>Pad {i + 1} · fade {sc.fade}s</small>
                </button>
              ))}
            </div>
          )}
          {tray === 'visuals' && (
            <div className="pad-row">
              <button className={`pad ${!s.liveVisual ? 'on' : ''}`} onClick={() => s.set({ liveVisual: null })}>
                Programmed
                <small>Follow scenes</small>
              </button>
              {VISUAL_PRESETS.map((v) => (
                <button key={v.name} className={`pad ${s.liveVisual?.visual === v.visual && s.liveVisual?.color1 === v.color1 ? 'on' : ''}`} onClick={() => s.set({ liveVisual: v })} style={{ borderBottom: `4px solid ${v.color1}` }}>
                  {v.name}
                  <small>All screens</small>
                </button>
              ))}
            </div>
          )}
          {tray === 'camera' && (
            <div className="pad-row">
              <button className={`pad ${lightEnv === 'cinematic' ? 'on' : ''}`} onClick={() => useUI.getState().set({ lightEnv: lightEnv === 'cinematic' ? 'construction' : 'cinematic' })}>
                Cinematic
                <small>Depth of field</small>
              </button>
              <button className={`pad ${autoCam ? 'on' : ''}`} onClick={() => setAutoCam(!autoCam)}>
                Auto director
                <small>Cuts every 7s</small>
              </button>
              {CAMS.map((c) => (
                <button key={c.id} className="pad" onClick={() => { setAutoCam(false); requestCamera(c.id); }}>
                  {c.label}
                  <small>Camera</small>
                </button>
              ))}
            </div>
          )}
          {tray === 'lights' && (
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <div className="section-title">Color override</div>
                <div className="row wrap">
                  <button className={`fx-chip ${!s.liveColor ? 'on' : ''}`} onClick={() => s.set({ liveColor: null })}>Programmed</button>
                  {LIVE_COLORS.map((c) => (
                    <button key={c} className={`swatch ${s.liveColor === c ? 'on' : ''}`} style={{ background: c, width: 46, height: 46 }} onClick={() => s.set({ liveColor: c })} aria-label={c} />
                  ))}
                </div>
                <div className="section-title">Effect</div>
                <div className="row wrap">
                  {(['none', 'pulse', 'strobe', 'rainbow'] as const).map((e) => (
                    <button key={e} className={`fx-chip ${s.liveEffect === e ? 'on' : ''}`} onClick={() => s.set({ liveEffect: e })}>
                      {e === 'none' ? 'Programmed' : e[0].toUpperCase() + e.slice(1)}
                    </button>
                  ))}
                </div>
                <Slider label="Tempo" value={s.bpm} min={70} max={170} step={1} onChange={(v) => { s.set({ bpm: v }); if (beat.running) { beat.stop(); beat.start(useSettings.getState().volume, v); } }} format={(v) => `${v} BPM`} />
              </div>
              <div>
                <div className="section-title">Individual lights</div>
                <div className="row wrap" style={{ maxHeight: 110, overflowY: 'auto' }}>
                  {project.fixtures.map((f) => (
                    <button key={f.id} className={`fx-chip ${selFx === f.id ? 'on' : ''}`} onClick={() => setSelFx(selFx === f.id ? null : f.id)}>
                      <span className="dot" style={{ background: f.color }} /> {f.name}
                    </button>
                  ))}
                </div>
                {selFx && (() => {
                  const f = project.fixtures.find((x) => x.id === selFx);
                  if (!f) return null;
                  return (
                    <>
                      <div className="hint" style={{ margin: '8px 0' }}>Changes the light itself (shown when no scene overrides it).</div>
                      <Slider label="Intensity" value={f.intensity} min={0} max={1} onChange={(v) => edit.updateFixture(f.id, { intensity: v, on: true }, { key: `live-${f.id}` })} format={(v) => `${Math.round(v * 100)}%`} />
                      <div className="row wrap">
                        {LIVE_COLORS.map((c) => (
                          <button key={c} className="swatch" style={{ background: c, width: 40, height: 40 }} onClick={() => edit.updateFixture(f.id, { color: c, on: true })} aria-label={c} />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          {tray === 'fx' && (
            <div className="pad-row">
              <button className="pad" onClick={() => s.trigger('pyro')}>PYRO<small>Flame jets</small></button>
              <button className="pad" onClick={() => s.trigger('confetti')}>CONFETTI<small>Cannons</small></button>
              <button className="pad" onClick={() => s.trigger('smoke')}>CO₂ JETS<small>Smoke blast</small></button>
              <button className="pad" onClick={() => s.trigger('flash')}>FLASH<small>All lights hit</small></button>
              <button className={`pad ${s.liveEffect === 'strobe' ? 'on' : ''}`} onClick={() => s.set({ liveEffect: s.liveEffect === 'strobe' ? 'none' : 'strobe' })}>
                STROBE<small>Toggle</small>
              </button>
              <button className="pad" onClick={() => edit.setAtmosphere({ fog: Math.min(1, (project.atmosphere.fog ?? 0) + 0.3) }, 'live-fog')}>FOG +<small>Low fog</small></button>
              <button className="pad" onClick={() => edit.setAtmosphere({ fog: 0 }, 'live-fog')}>FOG OFF<small>Clear</small></button>
              <button className={`pad ${s.phoneLights ? 'on' : ''}`} onClick={() => s.set({ phoneLights: !s.phoneLights })}>PHONE LIGHTS<small>Crowd</small></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

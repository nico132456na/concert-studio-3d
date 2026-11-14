import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, Pencil, Search, GitCompare, ExternalLink, Mic2, Check } from 'lucide-react';
import { ARCHIVE_ARTISTS, ALL_TOURS, ARTIST_BY_ID, TOUR_BY_ID, ERA_LABEL, ACCURACY_LABEL, ACCURACY_HINT, toursFor, type Accuracy, type Era, type Tour } from '../../data/archive';
import { getArena } from '../../data/arenas';
import { Viewport } from '../../three/Viewport';
import { ErrorBoundary, Modal } from '../components';
import { useUI } from '../../state/uiStore';
import { useProject } from '../../state/projectStore';
import { useShow } from '../../state/showStore';
import { createProject, setPreview } from '../flow';
import { enterPerformer } from '../../performer/flow';
import type { DesignSeed, StageObject } from '../../types';

const ERA_ORDER: Era[] = ['early', 'first', 'breakthrough', 'world', 'stadium', 'festival', 'special', 'recent', 'current'];
const ACC_COLOR: Record<Accuracy, string> = { documented: '#2f9e5a', partial: '#d9a12a', inspired: '#7a6ad8' };
const VENUES = ['arena', 'stadium', 'festival', 'theater', 'club', 'special'] as const;
const DECADES = [2000, 2010, 2020];

function AccBadge({ a, short }: { a: Accuracy; short?: boolean }) {
  return (
    <span className="badge" style={{ background: ACC_COLOR[a], color: '#fff' }} title={ACCURACY_HINT[a]}>
      {short ? { documented: 'Documented', partial: 'Partial', inspired: 'Inspired' }[a] : ACCURACY_LABEL[a]}
    </span>
  );
}

/* ---------- metrics & plan used by compare ---------- */

const seedCache = new Map<string, DesignSeed>();
function seedOf(t: Tour) {
  let s = seedCache.get(t.id);
  if (!s) seedCache.set(t.id, (s = t.build()));
  return s;
}

const isLed = (o: StageObject) => o.kind.startsWith('led') || o.material.preset === 'led';
const ROUND = new Set(['circlePlatform', 'ringStage', 'ledCircle', 'rotatingPlatform', 'sphere', 'ledSphere', 'ledCylinder', 'cylinder', 'circleTruss', 'torus', 'ring', 'halfSphere', 'geoDome', 'octagon', 'ovalPlatform']);
const RUNWAY = new Set(['runway', 'catwalk', 'curvedRunway', 'spiralRunway']);

function metrics(t: Tour) {
  const s = seedOf(t);
  const main = s.objects.filter((o) => o.tag === 'main' && o.kind !== 'stairs' && o.pos[1] < 3);
  const area = main.reduce((a, o) => a + o.size[0] * o.size[2] * (ROUND.has(o.kind) ? Math.PI / 4 : 1), 0);
  const led = s.objects.filter(isLed).reduce((a, o) => a + (o.kind === 'ledFloor' ? o.size[0] * o.size[2] : o.size[0] * o.size[1]), 0);
  const runways = s.objects.filter((o) => RUNWAY.has(o.kind));
  const height = Math.max(...s.objects.map((o) => o.pos[1] + o.size[1]));
  const moving = s.objects.filter((o) => o.motion && o.motion !== 'none').length;
  return {
    elements: s.objects.length,
    fixtures: s.fixtures.length,
    area: Math.round(area),
    led: Math.round(led),
    runways: runways.length,
    runwayLen: Math.round(runways.reduce((a, o) => a + o.size[2], 0)),
    stages: main.filter((o) => !RUNWAY.has(o.kind)).length,
    height: Math.round(height),
    moving,
    pa: s.objects.filter((o) => o.kind === 'lineArray').length,
  };
}

function colorFor(o: StageObject) {
  if (isLed(o)) return '#4da3ff';
  if (o.kind === 'lineArray' || o.kind === 'delayTower' || o.kind === 'subwoofer') return '#8a8a92';
  if (o.tag === 'main') return '#f2f2f2';
  return '#c9a25a';
}

/** Top-down plan of a design (audience toward the bottom). */
function Plan({ t, size = 300 }: { t: Tour; size?: number }) {
  const s = seedOf(t);
  const objs = s.objects.filter((o) => o.size[0] * o.size[2] > 0.3);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const o of objs) {
    const r = Math.hypot(o.size[0], o.size[2]) / 2;
    x0 = Math.min(x0, o.pos[0] - r); x1 = Math.max(x1, o.pos[0] + r);
    z0 = Math.min(z0, o.pos[2] - r); z1 = Math.max(z1, o.pos[2] + r);
  }
  const span = Math.max(x1 - x0, z1 - z0, 20) * 1.08;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const sorted = [...objs].sort((a, b) => a.pos[1] - b.pos[1]);
  const grid = Math.pow(10, Math.floor(Math.log10(span / 2)));
  return (
    <svg viewBox={`${cx - span / 2} ${cz - span / 2} ${span} ${span}`} width="100%" style={{ maxWidth: size, aspectRatio: '1', background: '#0d0e12', borderRadius: 12, border: '1px solid var(--line)' }} role="img" aria-label={`Plan of ${t.title}`}>
      {sorted.map((o) => {
        const flown = o.pos[1] > 3;
        const c = colorFor(o);
        const common = { fill: flown ? 'none' : c, fillOpacity: flown ? 0 : 0.85, stroke: c, strokeWidth: span / 320, strokeDasharray: flown ? `${span / 120} ${span / 160}` : undefined, opacity: flown ? 0.7 : 1 };
        const deg = (-o.rot[1] * 180) / Math.PI;
        return ROUND.has(o.kind) ? (
          <ellipse key={o.id} cx={o.pos[0]} cy={o.pos[2]} rx={o.size[0] / 2} ry={o.size[2] / 2} transform={`rotate(${deg} ${o.pos[0]} ${o.pos[2]})`} {...common} />
        ) : (
          <rect key={o.id} x={o.pos[0] - o.size[0] / 2} y={o.pos[2] - o.size[2] / 2} width={o.size[0]} height={o.size[2]} transform={`rotate(${deg} ${o.pos[0]} ${o.pos[2]})`} {...common} />
        );
      })}
      <line x1={cx - span * 0.44} x2={cx - span * 0.44 + grid} y1={cz + span * 0.45} y2={cz + span * 0.45} stroke="#fff" strokeWidth={span / 200} />
      <text x={cx - span * 0.44} y={cz + span * 0.43} fill="#fff" fontSize={span / 28}>{grid} m</text>
      <text x={cx + span * 0.44} y={cz + span * 0.45} fill="#9a9aa2" fontSize={span / 30} textAnchor="end">audience ↓</text>
    </svg>
  );
}

function Compare({ ids, onClose, onRemove }: { ids: string[]; onClose: () => void; onRemove: (id: string) => void }) {
  const tours = ids.map((id) => TOUR_BY_ID.get(id)!).filter(Boolean);
  const ms = tours.map(metrics);
  const rows: [string, (t: Tour, i: number) => React.ReactNode][] = [
    ['Artist', (t) => ARTIST_BY_ID.get(t.artistId)?.name],
    ['Year', (t) => t.yearLabel ?? t.year],
    ['Accuracy', (t) => <AccBadge a={t.accuracy} short />],
    ['Venue', (t) => `${t.venueType} · ${getArena(t.arenaId).name}`],
    ['Designers', (t) => t.designers ?? '—'],
    ['Stage deck area', (_, i) => `${ms[i].area} m²`],
    ['Performance areas', (_, i) => ms[i].stages],
    ['Runways', (_, i) => (ms[i].runways ? `${ms[i].runways} · ${ms[i].runwayLen} m` : 'none')],
    ['LED surface', (_, i) => `${ms[i].led} m²`],
    ['Tallest point', (_, i) => `${ms[i].height} m`],
    ['Moving pieces', (_, i) => ms[i].moving],
    ['PA hangs', (_, i) => ms[i].pa],
    ['Lighting fixtures', (_, i) => ms[i].fixtures],
    ['Elements', (_, i) => ms[i].elements],
  ];
  return (
    <Modal title="Compare stages" onClose={onClose} wide>
      {tours.length < 2 && <div className="hint" style={{ marginBottom: 12 }}>Add one more tour with “Compare” to see them side by side.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tours.length}, minmax(0, 1fr))`, gap: 14 }}>
        {tours.map((t) => (
          <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 800, textAlign: 'center' }}>{t.title}</div>
            <Plan t={t} />
            <button className="btn small" onClick={() => onRemove(t.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="hint" style={{ margin: '10px 0' }}>
        Plans are drawn from the 3D model. Solid = floor-level decks, dashed = flown or raised. White = performance areas, blue = LED, grey = PA, gold = scenery. Figures are measured from the simplified model, not from production drawings.
      </div>
      <table className="cmp-table">
        <tbody>
          {rows.map(([k, f]) => (
            <tr key={k}>
              <th>{k}</th>
              {tours.map((t, i) => <td key={t.id}>{f(t, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

/* ---------- search ---------- */

function haystack(t: Tour) {
  const a = ARTIST_BY_ID.get(t.artistId);
  const dec = Math.floor(t.year / 10) * 10;
  return [a?.name, a?.genre, t.title, t.year, t.yearLabel, `${dec}s`, `${String(dec).slice(2)}s`, t.venueType, getArena(t.arenaId).name, t.designers, ERA_LABEL[t.era], ACCURACY_LABEL[t.accuracy], ...t.features].join(' ').toLowerCase();
}
const HAY = new Map(ALL_TOURS.map((t) => [t.id, haystack(t)]));

export function Archive() {
  const set = useUI((s) => s.set);
  const requestCamera = useUI((s) => s.requestCamera);
  const [infoOpen, setInfoOpen] = useState(window.innerWidth > 700);
  const [artistId, setArtistId] = useState('beyonce');
  const [tourId, setTourId] = useState(() => toursFor('beyonce').slice(-2)[0]?.id ?? ALL_TOURS[0].id);
  const [q, setQ] = useState('');
  const [venue, setVenue] = useState<string | null>(null);
  const [decade, setDecade] = useState<number | null>(null);
  const [acc, setAcc] = useState<Accuracy | null>(null);
  const [cmp, setCmp] = useState<string[]>([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const project = useProject((s) => s.project);
  const activeScene = useShow((s) => s.activeSceneId);
  const [auto, setAuto] = useState(true);

  const tour = TOUR_BY_ID.get(tourId) ?? ALL_TOURS[0];
  const artist = ARTIST_BY_ID.get(tour.artistId)!;

  useEffect(() => {
    setPreview(tour.arenaId, tour.build());
  }, [tour]);

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

  const filtering = q.trim() !== '' || venue || decade || acc;
  const results = useMemo(() => {
    if (!filtering) return [];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return ALL_TOURS.filter((t) => {
      if (venue && t.venueType !== venue) return false;
      if (decade && Math.floor(t.year / 10) * 10 !== decade) return false;
      if (acc && t.accuracy !== acc) return false;
      const h = HAY.get(t.id)!;
      return words.every((w) => h.includes(w));
    }).sort((a, b) => a.year - b.year);
  }, [q, venue, decade, acc, filtering]);

  const counts = useMemo(() => {
    const c: Record<Accuracy, number> = { documented: 0, partial: 0, inspired: 0 };
    ALL_TOURS.forEach((t) => c[t.accuracy]++);
    return c;
  }, []);

  const pick = (t: Tour) => {
    setTourId(t.id);
    setArtistId(t.artistId);
  };
  const toggleCmp = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));

  const credit = tour.accuracy === 'inspired' ? `Inspired by ${artist.name} — original concept` : `Based on ${artist.name} — ${tour.title} (${tour.yearLabel ?? tour.year}). ${ACCURACY_LABEL[tour.accuracy]}. Sources: ${tour.sources.map((s) => s.url).join(' ')}`;
  const load = () => createProject(tour.arenaId, tour.build(), `${tour.title} (my version)`, credit);
  const perform = async () => {
    await createProject(tour.arenaId, tour.build(), `${tour.title} (performance)`, credit);
    enterPerformer();
  };

  const tourButton = (t: Tour, showArtist = false) => (
    <button key={t.id} className={`tour-row ${t.id === tour.id ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); pick(t); }}>
      <span className="tour-year">{t.yearLabel ?? t.year}</span>
      <span className="tour-name">
        {showArtist && <b>{ARTIST_BY_ID.get(t.artistId)?.name} · </b>}
        {t.title}
      </span>
      <span className="acc-dot" style={{ background: ACC_COLOR[t.accuracy] }} title={ACCURACY_LABEL[t.accuracy]} />
    </button>
  );

  return (
    <div className="screen">
      <div className="screen-head">
        <button className="icon-btn boxed" onClick={() => set({ screen: 'menu' })} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="screen-title">Artist Archive</div>
          <div className="screen-sub">
            {ARCHIVE_ARTISTS.length} artists · {ALL_TOURS.length} stages · <span style={{ color: ACC_COLOR.documented }}>●</span> {counts.documented} documented · <span style={{ color: ACC_COLOR.partial }}>●</span> {counts.partial} partial · <span style={{ color: ACC_COLOR.inspired }}>●</span> {counts.inspired} inspired
          </div>
        </div>
        <button className="btn" onClick={() => setCmpOpen(true)} disabled={!cmp.length}>
          <GitCompare size={18} /> Compare{cmp.length ? ` (${cmp.length})` : ''}
        </button>
        <button className="btn" onClick={perform}>
          <Mic2 size={18} /> Perform
        </button>
        <button className="btn primary" onClick={load}>
          <Pencil size={18} /> Edit this stage
        </button>
      </div>
      <div className="split">
        <div className="split-list">
          <div className="search-box">
            <Search size={18} />
            <input className="text-input" placeholder="Artist, tour, year, venue, designer…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the archive" />
            {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Clear search"><X size={18} /></button>}
          </div>
          <div className="row wrap" style={{ gap: 6, margin: '8px 0 4px' }}>
            {DECADES.map((d) => <button key={d} className={`btn small ${decade === d ? 'active' : ''}`} onClick={() => setDecade(decade === d ? null : d)}>{d}s</button>)}
            {VENUES.slice(0, 3).map((v) => <button key={v} className={`btn small ${venue === v ? 'active' : ''}`} onClick={() => setVenue(venue === v ? null : v)}>{v}</button>)}
          </div>
          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            {(['documented', 'partial', 'inspired'] as Accuracy[]).map((a) => (
              <button key={a} className={`btn small ${acc === a ? 'active' : ''}`} onClick={() => setAcc(acc === a ? null : a)}>
                <span className="acc-dot" style={{ background: ACC_COLOR[a] }} /> {a}
              </button>
            ))}
          </div>
          {filtering ? (
            <>
              <div className="hint" style={{ margin: '4px 0 8px' }}>{results.length} result{results.length === 1 ? '' : 's'}</div>
              <div className="card" style={{ cursor: 'default', padding: 8 }}>{results.map((t) => tourButton(t, true))}</div>
            </>
          ) : (
            ARCHIVE_ARTISTS.map((a) => {
              const ts = toursFor(a.id);
              const open = a.id === artistId;
              return (
                <div key={a.id} className={`card ${open ? 'on' : ''}`} onClick={() => { setArtistId(a.id); if (!open && ts[0]) setTourId(ts[ts.length - 1].id); }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div className="card-title">{a.name}</div>
                    <div className="row" style={{ gap: 3 }}>{ts.map((t) => <span key={t.id} className="acc-dot" style={{ background: ACC_COLOR[t.accuracy] }} />)}</div>
                  </div>
                  <div className="card-sub">{a.genre} · {a.origin} · {a.aesthetic}</div>
                  {open && (
                    <div style={{ marginTop: 10 }}>
                      {ERA_ORDER.filter((e) => ts.some((t) => t.era === e)).map((e) => (
                        <div key={e} className="era-group">
                          <div className="era-label">{ERA_LABEL[e]}</div>
                          {ts.filter((t) => t.era === e).map((t) => tourButton(t))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="split-view">
          <ErrorBoundary label="Stage preview">{project && <Viewport mode="preview" arenaId={tour.arenaId} key={tour.id} />}</ErrorBoundary>
          <div className="info-panel">
            {!infoOpen && (
              <button className="btn" onClick={() => setInfoOpen(true)}>
                Show details
              </button>
            )}
            {infoOpen && (
              <div className="info-card archive-info" style={{ position: 'relative' }}>
                <button className="icon-btn" style={{ position: 'absolute', top: 4, right: 4 }} onClick={() => setInfoOpen(false)} aria-label="Hide details">
                  <X size={20} />
                </button>
                <div className="row wrap" style={{ gap: 6, paddingRight: 36 }}>
                  <AccBadge a={tour.accuracy} />
                  <span className="badge">{artist.name}</span>
                  <span className="badge">{tour.yearLabel ?? tour.year}</span>
                  <span className="badge">{ERA_LABEL[tour.era]}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{tour.title}</div>
                {tour.designers && <div className="hint" style={{ marginTop: 2 }}>Design: {tour.designers}</div>}
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>{tour.description}</div>
                <ul className="feat-list">
                  {tour.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <div className="hint" style={{ fontSize: 12 }}>{ACCURACY_HINT[tour.accuracy]}</div>
                {tour.sources.length > 0 && (
                  <div className="src-list">
                    <div className="stat-k">Sources</div>
                    {tour.sources.map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={13} /> {s.label}
                      </a>
                    ))}
                  </div>
                )}
                <div className="stats">
                  <div><div className="stat-k">Venue</div><div className="stat-v">{getArena(tour.arenaId).name}</div></div>
                  <div><div className="stat-k">Elements</div><div className="stat-v">{project?.objects.length ?? 0}</div></div>
                  <div><div className="stat-k">Lights</div><div className="stat-v">{project?.fixtures.length ?? 0}</div></div>
                </div>
                <button className={`btn small ${cmp.includes(tour.id) ? 'active' : ''}`} style={{ marginTop: 10 }} onClick={() => toggleCmp(tour.id)}>
                  {cmp.includes(tour.id) ? <Check size={16} /> : <GitCompare size={16} />} {cmp.includes(tour.id) ? 'In comparison' : 'Compare'}
                </button>
              </div>
            )}
            <div className="info-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="cam-chips">
                {(
                  [
                    ['front', 'Front'],
                    ['audience', 'Crowd'],
                    ['performer', 'Performer'],
                    ['cinematic', 'Cinematic'],
                    ['rear', 'Rear'],
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
      {cmpOpen && <Compare ids={cmp} onClose={() => setCmpOpen(false)} onRemove={(id) => setCmp((c) => c.filter((x) => x !== id))} />}
    </div>
  );
}

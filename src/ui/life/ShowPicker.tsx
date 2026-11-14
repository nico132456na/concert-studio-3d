import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '../components';
import { useCareer, currentTier } from '../../life/careerStore';
import { ARENAS, getArena } from '../../data/arenas';
import { ALL_TOURS, ARTIST_BY_ID, ACCURACY_LABEL } from '../../data/archive';
import { listProjects } from '../../storage/db';
import type { ProjectMeta } from '../../types';

/** Choose tonight's venue and stage (auto, archive reconstruction, or one of your projects). */
export function ShowPicker({ onClose }: { onClose: () => void }) {
  const career = useCareer((s) => s.career);
  const update = useCareer((s) => s.update);
  const tier = currentTier();
  const [venue, setVenue] = useState(career.venue);
  const [mine, setMine] = useState<ProjectMeta[]>([]);
  useEffect(() => {
    listProjects().then(setMine).catch(() => setMine([]));
  }, []);
  const tours = useMemo(() => ALL_TOURS.filter((t) => t.arenaId === venue), [venue]);
  const projects = mine.filter((p) => p.arenaId === venue);
  const venues = ARENAS.filter((a) => a.id !== 'empty');
  const choose = (p: { stageProjectId?: string; stageArchiveId?: string }) => {
    update({ venue, stageProjectId: p.stageProjectId, stageArchiveId: p.stageArchiveId });
    onClose();
  };
  const isSel = (p: { stageProjectId?: string; stageArchiveId?: string }) => career.venue === venue && career.stageProjectId === p.stageProjectId && career.stageArchiveId === p.stageArchiveId;
  return (
    <Modal title="Plan tonight’s show" onClose={onClose} wide>
      <div className="section-title" style={{ marginTop: 0 }}>Venue</div>
      <div className="row wrap" style={{ gap: 6 }}>
        {venues.map((a) => {
          const ok = tier.venues.includes(a.id);
          return (
            <button key={a.id} className={`btn small ${venue === a.id ? 'active' : ''}`} disabled={!ok} onClick={() => setVenue(a.id)} title={ok ? '' : 'Unlocks at a higher career tier'}>
              {!ok && <Lock size={13} />} {a.name} · {a.capacity.toLocaleString()}
            </button>
          );
        })}
      </div>
      <div className="hint" style={{ margin: '8px 0 4px' }}>{getArena(venue).tagline}</div>
      <div className="section-title">Stage</div>
      <div className="pick-list">
        <button className={`tour-row ${isSel({}) ? 'on' : ''}`} onClick={() => choose({})}>
          <span className="tour-year">Auto</span>
          <span className="tour-name">Auto-designed stage for {getArena(venue).name}</span>
        </button>
        {projects.map((p) => (
          <button key={p.id} className={`tour-row ${isSel({ stageProjectId: p.id }) ? 'on' : ''}`} onClick={() => choose({ stageProjectId: p.id })}>
            <span className="tour-year">Mine</span>
            <span className="tour-name">{p.name}</span>
          </button>
        ))}
        {tours.map((t) => (
          <button key={t.id} className={`tour-row ${isSel({ stageArchiveId: t.id }) ? 'on' : ''}`} onClick={() => choose({ stageArchiveId: t.id })}>
            <span className="tour-year">{t.yearLabel ?? t.year}</span>
            <span className="tour-name">
              <b>{ARTIST_BY_ID.get(t.artistId)?.name}</b> · {t.title} <span className="hint">({ACCURACY_LABEL[t.accuracy]})</span>
            </span>
          </button>
        ))}
      </div>
      <div className="hint" style={{ marginTop: 10 }}>Archive stages are performed as you — the original artists are only credited as the source of the stage design.</div>
    </Modal>
  );
}

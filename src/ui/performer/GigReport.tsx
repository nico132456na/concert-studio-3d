import { Modal } from '../components';
import { useGig } from '../../performer/gig';
import { useCareer } from '../../life/careerStore';
import { getArena } from '../../data/arenas';

const GRADE_COLOR: Record<string, string> = { S: '#ffd24a', A: '#7dff9c', B: '#4da3ff', C: '#c0c4cc', D: '#ff6b6b' };

/** End-of-show performance report (and career rewards when the show was part of a career). */
export function GigReportModal() {
  const report = useGig((s) => s.report);
  const result = useCareer((s) => s.lastResult);
  if (!report) return null;
  const close = () => {
    useGig.getState().set({ report: null });
    useCareer.getState().set({ lastResult: null });
  };
  return (
    <Modal title="Show report" onClose={close} wide footer={<button className="btn primary" onClick={close}>Continue</button>}>
      <div className="row" style={{ gap: 20, alignItems: 'center', marginBottom: 12 }}>
        <div className="report-grade" style={{ color: GRADE_COLOR[report.grade] }}>{report.grade}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{report.score} / 100</div>
          <div className="hint">{report.minutes} min on stage · {report.done}/{report.total} challenges</div>
          {result && (
            <div style={{ marginTop: 6 }}>
              <b>{getArena(result.venue).name}</b> · {result.crowd.toLocaleString()} fans · <b>+{result.xp.toLocaleString()} XP</b> · <b>+${result.money.toLocaleString()}</b>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 10, lineHeight: 1.45 }}>{report.summary}</div>
      {report.lines.map((l) => (
        <div key={l.label} className="report-line">
          <b>{l.label}</b>
          <div>
            <div className="progress"><div style={{ width: `${l.score}%` }} /></div>
            <div className="hint" style={{ marginTop: 3 }}>{l.note}</div>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 800 }}>{l.score}</div>
        </div>
      ))}
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { useUI } from '../state/uiStore';
import { useProject } from '../state/projectStore';
import { useSettings } from '../state/settingsStore';

interface Step {
  title: string;
  text: string;
  target?: string;
  anim?: 'tap' | 'swipe';
  /** returns true when the step is done */
  done?: (ctx: Ctx) => boolean;
}
interface Ctx {
  screen: string;
  stats: ReturnType<typeof useUI.getState>['stats'];
  base: ReturnType<typeof useUI.getState>['stats'];
  selection: number;
}

const STEPS: Step[] = [
  { title: 'Pick an arena', text: 'Tap a venue on the left to preview it, then tap “Build here” and choose “Empty floor”.', target: '[data-tut="build-here"]', anim: 'tap', done: (c) => c.screen === 'editor' },
  { title: 'Add a stage', text: 'Tap ADD, then tap any stage shape in the Stage tab — it appears instantly.', target: '[data-tut="tool-add"]', anim: 'tap', done: (c) => c.stats.stage > c.base.stage },
  { title: 'Add an LED screen', text: 'In the LED tab, tap “LED Wall”. It appears in the 3D view.', target: '[data-tut="lib-led"]', anim: 'tap', done: (c) => c.stats.led > c.base.led },
  { title: 'Add speakers', text: 'Open the Sound tab and tap “Line Array”. The shaded floor shows where it reaches.', target: '[data-tut="lib-audio"]', anim: 'tap', done: (c) => c.stats.audio > c.base.audio },
  { title: 'Add lighting', text: 'Open the Lights tab and tap “Moving Spot”. Real light hits the stage.', target: '[data-tut="lib-lights"]', anim: 'tap', done: (c) => c.stats.light > c.base.light },
  { title: 'Change materials', text: 'Tap any object, then MATERIAL, and pick a finish like Brushed Aluminum.', target: '[data-tut="tool-materials"]', anim: 'tap', done: (c) => c.stats.materials > c.base.materials },
  { title: 'Move objects', text: 'With MOVE selected, tap an object, then drag it with one finger.', target: '[data-tut="tool-move"]', anim: 'swipe', done: (c) => c.stats.moves > c.base.moves },
  { title: 'Rotate the camera', text: 'Drag empty space with one finger to orbit. Pinch to zoom, two fingers to pan.', anim: 'swipe', done: (c) => c.stats.camera > c.base.camera },
  { title: 'Go live', text: 'Tap LIVE to run your concert, then press PLAY.', target: '[data-tut="live"]', anim: 'tap', done: (c) => c.screen === 'live' },
  { title: 'Become the performer', text: 'Tap Perform. You start in your dressing room — walk to the tunnel and take the lift onto the stage.', target: '[data-tut="perform-live"]', anim: 'tap', done: (c) => c.stats.perform > c.base.perform },
  { title: 'Save your show', text: 'Tap Save (top right). Your work also auto-saves; reopen it from My Projects.', target: '[data-tut="save-perf"]', anim: 'tap', done: (c) => c.stats.saves > c.base.saves },
];

export function Tutorial() {
  const step = useUI((s) => s.tutorialStep);
  const screen = useUI((s) => s.screen);
  const stats = useUI((s) => s.stats);
  const selection = useUI((s) => s.selection.length);
  const set = useUI((s) => s.set);
  const hasProject = useProject((s) => !!s.project);
  const [base, setBase] = useState(stats);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // reset the baseline whenever the step changes
  useEffect(() => {
    setBase(useUI.getState().stats);
  }, [step]);

  const cur = step !== null ? STEPS[step] : null;

  useEffect(() => {
    if (!cur) return;
    const find = () => {
      const el = cur.target ? (document.querySelector(cur.target) as HTMLElement | null) : null;
      setRect(el && el.offsetParent !== null ? el.getBoundingClientRect() : null);
    };
    find();
    const t = window.setInterval(find, 300);
    return () => window.clearInterval(t);
  }, [cur, screen]);

  useEffect(() => {
    if (step === null || !cur?.done) return;
    if (cur.done({ screen, stats, base, selection })) {
      const next = step + 1;
      if (next >= STEPS.length) finish();
      else set({ tutorialStep: next });
    }
  });

  // step 1 lives in the library: open it automatically for steps 2–4
  useEffect(() => {
    if (step !== null && step >= 2 && step <= 4 && screen === 'editor' && useUI.getState().left !== 'add') set({ left: 'add' });
  }, [step, screen, set]);

  const finish = () => {
    set({ tutorialStep: null });
    useSettings.getState().update({ tutorialDone: true });
  };

  if (!cur) return null;
  if (screen === 'menu' || screen === 'projects' || screen === 'gallery') return null;
  if (step! > 0 && !hasProject) return null;

  const pad = 6;
  const cardW = Math.min(380, window.innerWidth - 24);
  let cardStyle: React.CSSProperties = { left: 12, bottom: 100 };
  if (rect) {
    const below = rect.bottom + 200 < window.innerHeight;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 12);
    cardStyle = below ? { left, top: rect.bottom + 14 } : { left, bottom: window.innerHeight - rect.top + 14 };
  } else {
    cardStyle = { left: (window.innerWidth - cardW) / 2, top: 90 };
  }

  return (
    <>
      {rect && <div className="tut-ring" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />}
      <div className="tut-card" style={cardStyle}>
        <div className="tut-step">
          STEP {step! + 1} OF {STEPS.length}
        </div>
        <div className="tut-title">{cur.title}</div>
        <div className="tut-text">{cur.text}</div>
        {cur.anim && <div className="tut-anim">{cur.anim === 'tap' ? <div className="tapper" /> : <div className="finger" />}</div>}
        <div className="tut-actions">
          <button className="btn small" onClick={finish}>
            Skip tutorial
          </button>
          <div className="row">
            {step! > 0 && (
              <button className="btn small" onClick={() => set({ tutorialStep: step! - 1 })}>
                Back
              </button>
            )}
            <button className="btn small primary" onClick={() => (step! + 1 >= STEPS.length ? finish() : set({ tutorialStep: step! + 1 }))}>
              {step! + 1 >= STEPS.length ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

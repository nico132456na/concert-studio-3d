import { useEffect } from 'react';
import { useShow } from '../state/showStore';
import { getProject } from '../state/projectStore';
import { useSettings } from '../state/settingsStore';
import { beat } from '../audio/beat';
import { ensureShow } from './editor/actions';

const now = () => performance.now() / 1000;

function startCue(i: number) {
  const p = getProject();
  if (!p || !p.cues.length) return;
  const idx = ((i % p.cues.length) + p.cues.length) % p.cues.length;
  const cue = p.cues[idx];
  const scene = p.scenes.find((s) => s.id === cue.sceneId);
  if (scene) useShow.getState().activateScene(scene, cue.fade);
  useShow.getState().set({ cueIndex: idx, cueStart: now(), pausedAt: null });
}

export const show = {
  play(withMusic = true) {
    let p = getProject();
    if (!p) return;
    p = ensureShow(p);
    const s = useShow.getState();
    if (s.pausedAt !== null && s.override) {
      s.set({ playing: true, cueStart: now() - s.pausedAt, pausedAt: null, blackout: false });
    } else {
      s.set({ playing: true, blackout: false });
      startCue(s.cueIndex < p.cues.length ? s.cueIndex : 0);
    }
    const st = useSettings.getState();
    if (withMusic && st.music) beat.start(st.volume, useShow.getState().bpm);
  },
  pause() {
    const s = useShow.getState();
    if (!s.playing) return;
    s.set({ playing: false, pausedAt: now() - s.cueStart });
    beat.stop();
  },
  toggle(withMusic = true) {
    if (useShow.getState().playing) show.pause();
    else show.play(withMusic);
  },
  restart(withMusic = true) {
    useShow.getState().set({ cueIndex: 0, pausedAt: null });
    show.play(withMusic);
    startCue(0);
  },
  next() {
    startCue(useShow.getState().cueIndex + 1);
  },
  prev() {
    startCue(useShow.getState().cueIndex - 1);
  },
  goto(i: number) {
    startCue(i);
  },
  stop() {
    beat.stop();
    useShow.getState().clearOverride();
    useShow.getState().set({ cueIndex: 0, pausedAt: null });
  },
};

/** Advances timeline cues while playing. Mounted once at the app root. */
export function useTimelinePlayer() {
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = useShow.getState();
      if (!s.playing) return;
      const p = getProject();
      if (!p || !p.cues.length) return;
      const cue = p.cues[s.cueIndex];
      if (!cue) return startCue(0);
      if (now() - s.cueStart >= cue.duration) startCue(s.cueIndex + 1);
    }, 100);
    return () => window.clearInterval(t);
  }, []);
}

export function cueProgress() {
  const s = useShow.getState();
  const p = getProject();
  const cue = p?.cues[s.cueIndex];
  if (!cue) return 0;
  const el = s.playing ? now() - s.cueStart : s.pausedAt ?? 0;
  return Math.min(1, el / cue.duration);
}

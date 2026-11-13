import { useEffect } from 'react';
import { useProject } from '../state/projectStore';
import { useShow } from '../state/showStore';

/** Cycles through a project's scenes (used for menu / gallery previews). */
export function useAutoShow(enabled: boolean, interval = 7000, startIndex = 0) {
  const pid = useProject((s) => s.project?.id);
  useEffect(() => {
    if (!enabled) return;
    let i = startIndex;
    const step = () => {
      const p = useProject.getState().project;
      if (!p || !p.scenes.length) return;
      const sc = p.scenes[i % p.scenes.length];
      useShow.getState().activateScene(sc, Math.min(sc.fade, 2));
      i++;
    };
    step();
    const t = window.setInterval(step, interval);
    return () => {
      window.clearInterval(t);
      useShow.getState().clearOverride();
    };
  }, [enabled, pid, interval, startIndex]);
}

import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Prevent iOS Safari page zoom / bounce from fighting with 3D gestures.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

createRoot(document.getElementById('root')!).render(<App />);

// Test hooks (development only)
if (import.meta.env.DEV) {
  Promise.all([import('./three/Viewport'), import('./state/uiStore'), import('./state/projectStore'), import('./state/showStore'), import('./state/settingsStore'), import('./three/interaction'), import('three'), import('./ui/editor/actions'), import('./data/library'), import('./performer/state'), import('./three/PerformerRig'), import('./life/state'), import('./life/careerStore'), import('./life/actions')]).then(([v, u, p, s, st, it, THREE, act, lib, perf, rig, lifeState, career, lifeAct]) => {
    (window as any).__cs = {
      perf: v.perf, performer: perf, rig, actions: act, library: lib, ui: u.useUI, project: p.useProject, show: s.useShow, settings: st.useSettings, life: lifeState, career: career.useCareer, lifeActions: lifeAct.lifeActions,
      /** world → client pixel coordinates using the active camera */
      toScreen: (x: number, y: number, z: number) => {
        const cam = it.ctx.camera, dom = it.ctx.dom;
        if (!cam || !dom) return null;
        const r = dom.getBoundingClientRect();
        const vv = new THREE.Vector3(x, y, z).project(cam);
        return { x: r.left + ((vv.x + 1) / 2) * r.width, y: r.top + ((1 - vv.y) / 2) * r.height };
      },
    };
  });
}

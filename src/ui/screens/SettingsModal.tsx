import { useEffect, useState } from 'react';
import { Modal, Seg, Slider, Toggle } from '../components';
import { useSettings, type Graphics } from '../../state/settingsStore';
import { useUI } from '../../state/uiStore';
import { perf } from '../../three/Viewport';
import { storageInfo } from '../../storage/db';
import { beat } from '../../audio/beat';

export function SettingsModal() {
  const s = useSettings();
  const set = useUI((x) => x.set);
  const [p, setP] = useState({ ...perf });
  const [store, setStore] = useState('');
  useEffect(() => {
    const t = window.setInterval(() => setP({ ...perf }), 500);
    storageInfo().then((i) => i && setStore(`${(i.usage / 1e6).toFixed(1)} MB of ${(i.quota / 1e6).toFixed(0)} MB · ${i.persisted ? 'protected from cleanup' : 'may be cleared by the browser if space runs low'}`));
    return () => window.clearInterval(t);
  }, []);
  return (
    <Modal title="Settings" onClose={() => set({ settingsOpen: false })}>
      <div className="section-title">Graphics</div>
      <Seg<Graphics>
        value={s.graphics}
        onChange={(g) => s.update({ graphics: g })}
        options={[
          { v: 'auto', label: 'Auto' },
          { v: 'low', label: 'Low' },
          { v: 'medium', label: 'Medium' },
          { v: 'high', label: 'High' },
        ]}
      />
      <div className="hint" style={{ marginTop: 8 }}>
        Now using <b style={{ color: '#fff' }}>{s.effective}</b>. Auto lowers quality if the frame rate drops. High adds shadows and more real lights.
      </div>
      <Toggle label="Show performance monitor" value={s.showStats} onChange={(v) => s.update({ showStats: v })} />
      <div className="hint">
        {p.fps} FPS · {p.frameMs} ms/frame · {p.calls} draw calls · {(p.tris / 1000).toFixed(0)}k triangles
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>Controls</div>
      <Seg
        value={s.editorMode}
        onChange={(v) => s.update({ editorMode: v })}
        options={[
          { v: 'beginner', label: 'Beginner mode' },
          { v: 'advanced', label: 'Advanced mode' },
        ]}
      />
      <div style={{ height: 10 }} />
      <Seg
        value={s.lightingMode}
        onChange={(v) => s.update({ lightingMode: v })}
        options={[
          { v: 'simple', label: 'Simple lighting' },
          { v: 'advanced', label: 'Lighting console' },
        ]}
      />
      <div style={{ height: 10 }} />
      <Slider label="Rotate sensitivity" value={s.rotateSpeed} min={0.2} max={2} onChange={(v) => s.update({ rotateSpeed: v })} />
      <Slider label="Zoom sensitivity" value={s.zoomSpeed} min={0.3} max={2.5} onChange={(v) => s.update({ zoomSpeed: v })} />
      <div className="hint">One finger rotates · two fingers pan · pinch zooms · double-tap an object to focus.</div>

      <div className="section-title" style={{ marginTop: 24 }}>Audio</div>
      <Toggle label="Backing beat in Live Mode" value={s.music} onChange={(v) => { s.update({ music: v }); if (!v) beat.stop(); }} />
      <Slider label="Volume" value={s.volume} min={0} max={1} onChange={(v) => { s.update({ volume: v }); beat.setVolume(v); }} format={(v) => `${Math.round(v * 100)}%`} />

      <div className="section-title" style={{ marginTop: 24 }}>Help & storage</div>
      <button className="btn block" onClick={() => { set({ settingsOpen: false, tutorialStep: 0, screen: 'arenas' }); }}>
        Replay tutorial
      </button>
      <div className="hint" style={{ marginTop: 10 }}>{store || 'Projects are stored on this device (IndexedDB).'}</div>
    </Modal>
  );
}

export function StatsOverlay() {
  const show = useSettings((s) => s.showStats);
  const [p, setP] = useState({ ...perf });
  useEffect(() => {
    if (!show) return;
    const t = window.setInterval(() => setP({ ...perf }), 500);
    return () => window.clearInterval(t);
  }, [show]);
  if (!show) return null;
  return (
    <div className="stats-overlay">
      {p.fps} fps · {p.frameMs}ms
      <br />
      {p.calls} calls · {(p.tris / 1000).toFixed(0)}k tris
    </div>
  );
}

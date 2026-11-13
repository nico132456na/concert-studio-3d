import { useState } from 'react';
import {
  ArrowLeft, Undo2, Redo2, EyeOff, Radio, MousePointer2, Move, RotateCw, Scaling, Plus, Palette, Lightbulb, Video, Save, Layers, Shuffle, Settings,
} from 'lucide-react';
import { useUI, type CameraPresetId, type ViewMode } from '../../state/uiStore';
import { useProject, edit } from '../../state/projectStore';
import { useSave, saveNow } from '../../storage/autosave';
import { useSettings } from '../../state/settingsStore';
import { goHome, enterLive } from '../flow';
import { PromptModal, Toggle, Seg } from '../components';
import { randomize } from './actions';

export function SaveIndicator() {
  const status = useSave((s) => s.status);
  const label = { idle: 'Ready', unsaved: 'Unsaved', saving: 'Saving…', saved: 'Saved', error: 'Save failed' }[status];
  return (
    <div className={`save-ind ${status}`}>
      <span className="led" />
      <span className="hide-sm">{label}</span>
    </div>
  );
}

export async function manualSave() {
  const ok = await saveNow(true);
  useUI.getState().toast(ok ? 'Project saved' : useSave.getState().error ?? 'Save failed', ok ? 'success' : 'error');
  if (ok) useUI.getState().bump('saves');
}

const VIEWS: { v: ViewMode; label: string }[] = [
  { v: 'persp', label: '3D' },
  { v: 'top', label: 'Top' },
  { v: 'front', label: 'Front' },
  { v: 'side', label: 'Side' },
  { v: 'audience', label: 'Crowd' },
];

export function TopBar() {
  const name = useProject((s) => s.project?.name ?? '');
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const undo = useProject((s) => s.undo);
  const redo = useProject((s) => s.redo);
  const view = useUI((s) => s.view);
  const set = useUI((s) => s.set);
  const left = useUI((s) => s.left);
  const mode = useSettings((s) => s.editorMode);
  const update = useSettings((s) => s.update);
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="topbar">
      <button className="icon-btn" onClick={() => goHome()} aria-label="Back to menu">
        <ArrowLeft size={22} />
      </button>
      <button className="proj-name" onClick={() => setRenaming(true)}>
        {name}
      </button>
      <SaveIndicator />
      <span className="spacer" />
      <button className="icon-btn" disabled={!canUndo} onClick={undo} aria-label="Undo">
        <Undo2 size={21} />
      </button>
      <button className="icon-btn" disabled={!canRedo} onClick={redo} aria-label="Redo">
        <Redo2 size={21} />
      </button>
      <div className="view-seg" data-tut="views">
        {VIEWS.map((v) => (
          <button key={v.v} className={view === v.v ? 'on' : ''} onClick={() => set({ view: v.v })}>
            {v.label}
          </button>
        ))}
      </div>
      <button className={`icon-btn hide-sm ${left === 'layers' ? 'active' : ''}`} onClick={() => set({ left: left === 'layers' ? null : 'layers' })} aria-label="Layers">
        <Layers size={21} />
      </button>
      <button className="icon-btn hide-md" onClick={randomize} aria-label="Randomize">
        <Shuffle size={21} />
      </button>
      <button className="btn small hide-md" onClick={() => update({ editorMode: mode === 'beginner' ? 'advanced' : 'beginner' })}>
        {mode === 'beginner' ? 'Beginner' : 'Advanced'}
      </button>
      <button className="icon-btn hide-sm" onClick={manualSave} aria-label="Save" data-tut="save">
        <Save size={21} />
      </button>
      <button className="icon-btn" onClick={() => set({ hideUI: true })} aria-label="Hide panels">
        <EyeOff size={21} />
      </button>
      <button className="btn live small" onClick={enterLive} data-tut="live">
        <Radio size={18} /> LIVE
      </button>
      {renaming && <PromptModal title="Rename project" initial={name} onClose={() => setRenaming(false)} onDone={(v) => { edit.rename(v); setRenaming(false); }} />}
    </div>
  );
}

export function Toolbar() {
  const tool = useUI((s) => s.tool);
  const left = useUI((s) => s.left);
  const rightOpen = useUI((s) => s.rightOpen);
  const rightTab = useUI((s) => s.rightTab);
  const deskOpen = useUI((s) => s.deskOpen);
  const cameraMenu = useUI((s) => s.cameraMenu);
  const set = useUI((s) => s.set);
  const small = () => window.innerWidth < 900 || window.innerHeight > window.innerWidth;
  const t = (id: typeof tool, icon: React.ReactNode, label: string) => (
    <button className={`tool ${tool === id ? 'on' : ''}`} onClick={() => set({ tool: id })} data-tut={`tool-${id}`}>
      {icon}
      {label}
    </button>
  );
  return (
    <div className="toolbar">
      {t('select', <MousePointer2 size={22} />, 'SELECT')}
      {t('move', <Move size={22} />, 'MOVE')}
      {t('rotate', <RotateCw size={22} />, 'ROTATE')}
      {t('scale', <Scaling size={22} />, 'SCALE')}
      <div className="tool-sep" />
      <button className={`tool ${left === 'add' ? 'on' : ''}`} data-tut="tool-add" onClick={() => set({ left: left === 'add' ? null : 'add', deskOpen: false, cameraMenu: false, ...(small() ? { rightOpen: false } : {}) })}>
        <Plus size={22} />
        ADD
      </button>
      <button
        className={`tool ${rightOpen && rightTab === 'material' ? 'on' : ''}`}
        data-tut="tool-materials"
        onClick={() => set({ rightOpen: !(rightOpen && rightTab === 'material'), rightTab: 'material', deskOpen: false, cameraMenu: false, ...(small() ? { left: null } : {}) })}
      >
        <Palette size={22} />
        MATERIAL
      </button>
      <button className={`tool ${deskOpen ? 'on' : ''}`} data-tut="tool-lighting" onClick={() => set({ deskOpen: !deskOpen, cameraMenu: false, ...(small() || !deskOpen ? { left: null, rightOpen: false } : {}) })}>
        <Lightbulb size={22} />
        LIGHTING
      </button>
      <button className={`tool ${cameraMenu ? 'on' : ''}`} data-tut="tool-camera" onClick={() => set({ cameraMenu: !cameraMenu, deskOpen: false })}>
        <Video size={22} />
        CAMERA
      </button>
    </div>
  );
}

const PRESETS: { id: CameraPresetId; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
  { id: 'left', label: 'Stage Left' },
  { id: 'right', label: 'Stage Right' },
  { id: 'bird', label: "Bird's-eye" },
  { id: 'top', label: 'Top-down' },
  { id: 'side', label: 'Side' },
  { id: 'performer', label: 'Performer' },
  { id: 'overview', label: 'Full Arena' },
  { id: 'audience', label: 'Audience' },
];

export function CameraMenu() {
  const set = useUI((s) => s.set);
  const requestCamera = useUI((s) => s.requestCamera);
  const ui = useUI();
  return (
    <div className="panel cam-pop">
      <div className="panel-head">
        <div className="panel-title">Camera</div>
        <button className="btn small primary" onClick={() => { set({ view: 'persp' }); requestCamera('reset'); }}>
          Reset camera
        </button>
      </div>
      <div className="panel-body">
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
          {PRESETS.map((p) => (
            <button key={p.id} className="btn" onClick={() => requestCamera(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="hint" style={{ margin: '12px 0' }}>Free camera: one finger rotates, two fingers pan, pinch zooms. Double-tap an object to focus on it.</div>
        <Toggle label="Show grid" value={ui.showGrid} onChange={(v) => set({ showGrid: v })} />
        <Toggle label="Show crowd while editing" value={ui.showCrowd} onChange={(v) => set({ showCrowd: v })} />
        <Toggle label="Snap to grid" value={ui.snapGrid} onChange={(v) => set({ snapGrid: v })} />
        <Toggle label="Snap to objects & guides" value={ui.snapObjects} onChange={(v) => set({ snapObjects: v })} />
        <div className="field" style={{ marginTop: 8 }}>
          <div className="field-label">Grid size</div>
          <Seg
            value={String(ui.gridSize)}
            onChange={(v) => set({ gridSize: parseFloat(v) })}
            options={['0.25', '0.5', '1', '2'].map((v) => ({ v, label: `${v} m` }))}
          />
        </div>
        <button className="btn block" onClick={() => set({ settingsOpen: true })}>
          <Settings size={18} /> Graphics & controls
        </button>
      </div>
    </div>
  );
}

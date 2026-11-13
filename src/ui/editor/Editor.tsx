import { useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Viewport } from '../../three/Viewport';
import { ErrorBoundary } from '../components';
import { useUI } from '../../state/uiStore';
import { useProject, edit } from '../../state/projectStore';
import { useSave } from '../../storage/autosave';
import { TopBar, Toolbar, CameraMenu, manualSave } from './Chrome';
import { LibraryPanel, LayersPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { LightingDesk } from './LightingDesk';

const HINTS: Record<string, string> = {
  select: 'Tap to select · drag empty space to look around',
  move: 'Tap an item, then drag it to move',
  rotate: 'Tap an item, then drag sideways to rotate',
  scale: 'Tap an item, then drag up/down to resize',
};

export function Editor() {
  const arenaId = useProject((s) => s.project?.arenaId);
  const ui = useUI();
  const saveErr = useSave((s) => s.error);
  const saveStatus = useSave((s) => s.status);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const mod = e.metaKey || e.ctrlKey;
      const ps = useProject.getState();
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ps.redo();
        else ps.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        ps.redo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        manualSave();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const sel = useUI.getState().selection;
        if (sel.length) useUI.getState().set({ selection: edit.duplicate(sel) });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useUI.getState().selection;
        if (sel.length) {
          edit.remove(sel);
          useUI.getState().set({ selection: [] });
        }
      } else if (e.key === 'Escape') useUI.getState().set({ selection: [] });
      else if (!mod && ['1', '2', '3', '4'].includes(e.key)) useUI.getState().set({ tool: (['select', 'move', 'rotate', 'scale'] as const)[+e.key - 1] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!arenaId) return null;
  const hasSel = ui.selection.length > 0;
  const small = typeof window !== 'undefined' && (window.innerWidth < 900 || window.innerHeight > window.innerWidth);
  const showRight = !ui.deskOpen && ui.rightOpen && (hasSel || ui.rightTab === 'material') && !(small && ui.left);

  return (
    <div className="fill">
      <ErrorBoundary label="3D view">
        <Viewport mode="editor" arenaId={arenaId} />
      </ErrorBoundary>
      {ui.hideUI ? (
        <button className="btn unhide-btn" onClick={() => ui.set({ hideUI: false })}>
          <Eye size={18} /> Show panels
        </button>
      ) : (
        <>
          <TopBar />
          {!hasSel && !ui.left && !ui.deskOpen && <div className="float-hint">{HINTS[ui.tool]}</div>}
          {saveStatus === 'error' && saveErr && (
            <div className="banner">
              {saveErr}
              <button className="btn small" onClick={manualSave}>Retry</button>
            </div>
          )}
          <ErrorBoundary label="Panel">
            {!ui.deskOpen && ui.left === 'add' && <LibraryPanel />}
            {!ui.deskOpen && ui.left === 'layers' && <LayersPanel />}
            {showRight && <RightPanel />}
            {ui.deskOpen && <LightingDesk />}
            {ui.cameraMenu && <CameraMenu />}
          </ErrorBoundary>
          <Toolbar />
        </>
      )}
    </div>
  );
}

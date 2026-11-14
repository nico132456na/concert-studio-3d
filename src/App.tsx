import { useEffect, useState } from 'react';
import { useUI } from './state/uiStore';
import { useSettings } from './state/settingsStore';
import { startAutosave } from './storage/autosave';
import { MainMenu } from './ui/screens/MainMenu';
import { ArenaSelect } from './ui/screens/ArenaSelect';
import { Archive } from './ui/screens/Archive';
import { Projects } from './ui/screens/Projects';
import { SettingsModal, StatsOverlay } from './ui/screens/SettingsModal';
import { Editor } from './ui/editor/Editor';
import { LiveMode } from './ui/live/LiveMode';
import { PerformerMode } from './ui/performer/PerformerMode';
import { Tutorial } from './ui/Tutorial';
import { ErrorBoundary, Modal, Toasts } from './ui/components';
import { useTimelinePlayer } from './ui/showControl';
import { goHome } from './ui/flow';

function Welcome() {
  const done = useSettings((s) => s.tutorialDone);
  const update = useSettings((s) => s.update);
  const set = useUI((s) => s.set);
  const [open, setOpen] = useState(!done);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    update({ tutorialDone: true });
  };
  return (
    <Modal
      title="Welcome to Concert Studio 3D"
      onClose={close}
      footer={
        <>
          <button className="btn" onClick={close}>Explore on my own</button>
          <button className="btn primary" onClick={() => { setOpen(false); set({ tutorialStep: 0, screen: 'arenas' }); }}>Start the 2-minute tutorial</button>
        </>
      }
    >
      <div style={{ fontSize: 16, lineHeight: 1.5 }}>
        You're the creative director. Pick an arena, build a stage, rig the lights, program the show, then run it live.
        <br />
        <br />
        <b>Touch controls:</b> one finger rotates · two fingers pan · pinch zooms · double-tap an object to focus.
      </div>
    </Modal>
  );
}

export default function App() {
  const screen = useUI((s) => s.screen);
  const settingsOpen = useUI((s) => s.settingsOpen);
  useTimelinePlayer();
  useEffect(() => {
    startAutosave();
  }, []);
  return (
    <div className="app">
      <ErrorBoundary label="Concert Studio" onReset={() => goHome()}>
        {screen === 'menu' && <MainMenu />}
        {screen === 'arenas' && <ArenaSelect />}
        {screen === 'gallery' && <Archive />}
        {screen === 'projects' && <Projects />}
        {screen === 'editor' && <Editor />}
        {screen === 'live' && <LiveMode />}
        {screen === 'performer' && <PerformerMode />}
      </ErrorBoundary>
      {screen === 'menu' && <Welcome />}
      <Tutorial />
      {settingsOpen && <SettingsModal />}
      <StatsOverlay />
      <Toasts />
    </div>
  );
}

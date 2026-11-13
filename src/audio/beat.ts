/**
 * A tiny synthesized backing beat for Live Mode (no audio files needed).
 * Kick / hat / bass loop scheduled with the Web Audio clock.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | undefined;
let nextTime = 0;
let step = 0;
let bpm = 124;
let running = false;

const BASS = [55, 55, 65.4, 49, 55, 55, 73.4, 65.4];

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  return ctx;
}

function kick(t: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.4);
}

let noiseBuf: AudioBuffer | null = null;
function hat(t: number, open = false) {
  const c = ctx!;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(open ? 0.18 : 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.22 : 0.05));
  s.connect(f).connect(g).connect(master!);
  s.start(t);
  s.stop(t + 0.3);
}

function bass(t: number, freq: number, len: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(200, t + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f).connect(g).connect(master!);
  o.start(t);
  o.stop(t + len + 0.05);
}

function schedule() {
  if (!ctx || !running) return;
  const spb = 60 / bpm / 4; // 16th notes
  while (nextTime < ctx.currentTime + 0.12) {
    const s = step % 16;
    if (s % 4 === 0) kick(nextTime);
    if (s % 4 === 2) hat(nextTime, s === 14);
    else if (s % 2 === 1) hat(nextTime);
    if (s % 2 === 0) bass(nextTime, BASS[Math.floor(step / 8) % BASS.length], spb * 1.6);
    nextTime += spb;
    step++;
  }
}

export const beat = {
  start(volume: number, tempo: number) {
    const c = ensure();
    if (!c) return;
    bpm = tempo;
    c.resume().catch(() => {});
    if (master) master.gain.value = volume;
    if (running) return;
    running = true;
    nextTime = c.currentTime + 0.05;
    step = 0;
    timer = window.setInterval(schedule, 25);
  },
  stop() {
    running = false;
    window.clearInterval(timer);
  },
  setVolume(v: number) {
    if (master) master.gain.value = v;
  },
  get running() {
    return running;
  },
};

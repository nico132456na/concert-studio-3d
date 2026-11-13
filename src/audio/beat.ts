/**
 * A tiny synthesized backing beat for Live Mode (no audio files needed).
 * Kick / hat / bass loop scheduled with the Web Audio clock.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let streamOut: MediaStreamAudioDestinationNode | null = null;
export const beatStream = () => streamOut?.stream ?? null;
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
    streamOut = ctx.createMediaStreamDestination();
    master.connect(streamOut);
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


/** Short pink-noise burst shaped like the chosen speaker, panned by its position. */
export function testSpeaker(kind: string, x: number) {
  const c = ensure();
  if (!c || !master) return;
  c.resume().catch(() => {});
  const len = 1.4;
  const buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099;
    b1 = 0.963 * b1 + w * 0.2965;
    b2 = 0.57 * b2 + w * 1.0526;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  if (kind === 'subwoofer') {
    f.type = 'lowpass';
    f.frequency.value = 110;
  } else if (kind === 'wedgeMonitor' || kind === 'speakerCab') {
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.6;
  } else {
    f.type = 'highpass';
    f.frequency.value = 60;
  }
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(kind === 'subwoofer' ? 1.6 : 0.8, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const pan = c.createStereoPanner ? c.createStereoPanner() : null;
  if (pan) pan.pan.value = Math.max(-1, Math.min(1, x / 25));
  src.connect(f).connect(g);
  if (pan) g.connect(pan).connect(master);
  else g.connect(master);
  src.start(t);
  src.stop(t + len);
}

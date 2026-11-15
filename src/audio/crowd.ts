/**
 * Synthesized crowd ambience (no audio files): filtered noise beds whose level follows
 * the crowd's excitement, with short "roar" swells for big moments.
 */
let ctx: AudioContext | null = null;
let bed: GainNode | null = null;
let roarGain: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let started = false;
let out: MediaStreamAudioDestinationNode | null = null;

function noise(c: AudioContext, seconds = 4) {
  const buf = c.createBuffer(2, c.sampleRate * seconds, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = last * 0.97 + w * 0.03;
      // add sparse "voices"
      const v = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.6 : 0;
      d[i] = last * 6 + v;
    }
  }
  return buf;
}

export const crowd = {
  start() {
    if (started) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    src.loop = true;
    filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.5;
    bed = ctx.createGain();
    bed.gain.value = 0;
    roarGain = ctx.createGain();
    roarGain.gain.value = 0;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    src.connect(filter).connect(bed).connect(master);
    const src2 = ctx.createBufferSource();
    src2.buffer = noise(ctx, 3);
    src2.loop = true;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'highpass';
    f2.frequency.value = 900;
    src2.connect(f2).connect(roarGain).connect(master);
    master.connect(ctx.destination);
    out = ctx.createMediaStreamDestination();
    master.connect(out);
    src.start();
    src2.start();
    started = true;
  },
  setLevel(level: number, muffled: boolean, proximity = 0.5) {
    if (!ctx || !bed || !filter) return;
    const t = ctx.currentTime;
    bed.gain.setTargetAtTime((0.03 + Math.min(1.4, level) * 0.32) * (0.6 + proximity * 0.7), t, 0.4);
    filter.frequency.setTargetAtTime(muffled ? 260 : 700 + level * 500, t, 0.5);
  },
  roar(amount = 1) {
    if (!ctx || !roarGain) return;
    const t = ctx.currentTime;
    roarGain.gain.cancelScheduledValues(t);
    roarGain.gain.setValueAtTime(roarGain.gain.value, t);
    roarGain.gain.linearRampToValueAtTime(0.35 * amount, t + 0.6);
    roarGain.gain.linearRampToValueAtTime(0.0, t + 4.5);
  },
  /** Synthesized footstep: hollow knock on a stage deck, dull thud on concrete, softer backstage. */
  footstep(surface: 'deck' | 'floor' | 'backstage', strength = 1) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = 0.09;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = surface === 'deck' ? 380 : surface === 'floor' ? 220 : 600;
    f.Q.value = surface === 'deck' ? 4 : 1.2;
    const g = ctx.createGain();
    g.gain.value = (surface === 'backstage' ? 0.35 : 0.5) * strength;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  },
  /** Production cues: lift motor rumble, pyro / flash impact, section riser. */
  cue(kind: 'lift' | 'impact' | 'riser') {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    if (kind === 'lift') {
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(42, t);
      o.frequency.linearRampToValueAtTime(58, t + 3);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 160;
      o.connect(lp).connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 3.4);
      return;
    }
    if (kind === 'impact') {
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    } else {
      o.type = 'triangle';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 1.6);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 1.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    }
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 2);
  },
  stop() {
    if (!ctx) return;
    ctx.close().catch(() => {});
    ctx = null;
    started = false;
    bed = roarGain = filter = null;
    out = null;
  },
  stream(): MediaStream | null {
    return out?.stream ?? null;
  },
};

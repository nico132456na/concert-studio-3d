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
  setLevel(level: number, muffled: boolean) {
    if (!ctx || !bed || !filter) return;
    const t = ctx.currentTime;
    bed.gain.setTargetAtTime(0.03 + Math.min(1.4, level) * 0.32, t, 0.4);
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

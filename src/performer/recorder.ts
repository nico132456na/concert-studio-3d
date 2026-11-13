import { capture } from '../three/PerformerRig';
import { crowd } from '../audio/crowd';
import { beatStream } from '../audio/beat';

let rec: MediaRecorder | null = null;
let chunks: Blob[] = [];

export function canRecord() {
  return typeof MediaRecorder !== 'undefined' && !!capture.gl && typeof (capture.gl.domElement as any).captureStream === 'function';
}

function pickType() {
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return types.find((t) => (MediaRecorder as any).isTypeSupported?.(t)) ?? '';
}

/** Records the 3D view (plus crowd and beat audio where available). */
export function startRecording(): boolean {
  if (!canRecord() || rec) return false;
  const canvas = capture.gl!.domElement as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream };
  const stream = canvas.captureStream(30);
  for (const s of [crowd.stream(), beatStream()]) s?.getAudioTracks().forEach((t) => stream.addTrack(t));
  const type = pickType();
  try {
    rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 6_000_000 } : undefined);
  } catch {
    rec = new MediaRecorder(stream);
  }
  chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(500);
  return true;
}

export function stopRecording(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!rec) return resolve(null);
    const r = rec;
    r.onstop = () => {
      const blob = new Blob(chunks, { type: r.mimeType || 'video/webm' });
      rec = null;
      chunks = [];
      resolve(blob.size ? blob : null);
    };
    r.stop();
  });
}

export function screenshot(): string | null {
  try {
    return capture.still?.() ?? null;
  } catch {
    return null;
  }
}

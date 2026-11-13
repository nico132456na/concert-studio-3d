import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../state/uiStore';
import { clamp, hexToHsv, hexToRgb, hsvToHex, isHex, normHex, rgbToHex } from '../util/misc';
import { COLOR_SWATCHES } from '../data/materials';

export function Slider({ label, value, min, max, step = 0.01, onChange, format, onStart }: { label?: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; onStart?: () => void }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="field">
      {label && (
        <div className="field-label">
          <span>{label}</span>
          <span className="val">{format ? format(value) : Math.round(value * 100) / 100}</span>
        </div>
      )}
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--p' as any]: `${clamp(p, 0, 100)}%` }}
        onPointerDown={onStart}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, value, onChange }: { label: ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle" role="switch" aria-checked={value} onClick={() => onChange(!value)}>
      <span>{label}</span>
      <div className={`switch ${value ? 'on' : ''}`} />
    </div>
  );
}

export function NumberField({ label, value, onChange, step = 0.1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  const [text, setText] = useState(String(Math.round(value * 100) / 100));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(Math.round(value * 100) / 100));
  }, [value]);
  const commit = () => {
    const v = parseFloat(text);
    if (!Number.isNaN(v)) onChange(v);
    else setText(String(Math.round(value * 100) / 100));
  };
  return (
    <label className="num">
      <span>{label}</span>
      <input
        inputMode="decimal"
        step={step}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="panel-head">
          <div className="panel-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Hue/saturation wheel; brightness handled by a slider below it. */
function Wheel({ color, onChange, onStart }: { color: string; onChange: (hex: string) => void; onStart?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [h, s, v] = hexToHsv(color);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const size = 220;
    cv.width = cv.height = size;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(size, size);
    const r = size / 2;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = x - r, dy = y - r;
        const d = Math.sqrt(dx * dx + dy * dy) / r;
        const i = (y * size + x) * 4;
        if (d > 1) {
          img.data[i + 3] = 0;
          continue;
        }
        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const [rr, gg, bb] = hexToRgb(hsvToHex(hue, d, 1));
        img.data[i] = rr;
        img.data[i + 1] = gg;
        img.data[i + 2] = bb;
        img.data[i + 3] = 255;
      }
    c.putImageData(img, 0, 0);
  }, []);
  const pick = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    onChange(hsvToHex(hue, d, Math.max(0.05, v)));
  };
  const a = (h * Math.PI) / 180;
  return (
    <div
      className="color-wheel"
      onPointerDown={(e) => {
        onStart?.();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => e.buttons && pick(e)}
    >
      <canvas ref={ref} />
      <div className="xy-dot" style={{ left: `${50 + Math.cos(a) * s * 50}%`, top: `${50 + Math.sin(a) * s * 50}%`, background: color, boxShadow: '0 0 0 3px #fff' }} />
    </div>
  );
}

export function ColorPicker({ value, onChange, saved, onSave, advanced, onStart }: { value: string; onChange: (hex: string) => void; saved?: string[]; onSave?: (hex: string) => void; advanced?: boolean; onStart?: () => void }) {
  const [hexText, setHexText] = useState(value);
  useEffect(() => setHexText(value), [value]);
  const [r, g, b] = hexToRgb(value);
  const [h, s, v] = hexToHsv(value);
  const [showMore, setShowMore] = useState(!!advanced);
  return (
    <div>
      <div className="swatches">
        {COLOR_SWATCHES.map((c) => (
          <div key={c} className={`swatch ${normHex(c) === normHex(value) ? 'on' : ''}`} style={{ background: c }} onClick={() => onChange(c)} />
        ))}
      </div>
      {saved && saved.length > 0 && (
        <>
          <div className="section-title">Saved colors</div>
          <div className="swatches">
            {saved.map((c) => (
              <div key={c} className={`swatch ${normHex(c) === normHex(value) ? 'on' : ''}`} style={{ background: c }} onClick={() => onChange(c)} />
            ))}
          </div>
        </>
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn small" onClick={() => setShowMore(!showMore)}>
          {showMore ? 'Hide color wheel' : 'Color wheel & HEX'}
        </button>
        {onSave && (
          <button className="btn small" onClick={() => onSave(value)}>
            Save color
          </button>
        )}
      </div>
      {showMore && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Wheel color={value} onChange={onChange} onStart={onStart} />
          </div>
          <Slider label="Brightness" value={v} min={0.02} max={1} onStart={onStart} onChange={(nv) => onChange(hsvToHex(h, s, nv))} format={(x) => `${Math.round(x * 100)}%`} />
          <Slider label="Red" value={r} min={0} max={255} step={1} onStart={onStart} onChange={(x) => onChange(rgbToHex(x, g, b))} format={(x) => String(Math.round(x))} />
          <Slider label="Green" value={g} min={0} max={255} step={1} onStart={onStart} onChange={(x) => onChange(rgbToHex(r, x, b))} format={(x) => String(Math.round(x))} />
          <Slider label="Blue" value={b} min={0} max={255} step={1} onStart={onStart} onChange={(x) => onChange(rgbToHex(r, g, x))} format={(x) => String(Math.round(x))} />
          <div className="field">
            <div className="field-label">HEX</div>
            <div className="row">
              <div className="dot" style={{ width: 44, height: 44, borderRadius: 10, background: value }} />
              <input
                className="text-input"
                value={hexText}
                onChange={(e) => {
                  setHexText(e.target.value);
                  if (isHex(e.target.value) && e.target.value.replace('#', '').length === 6) onChange(normHex(e.target.value));
                }}
                onBlur={() => (isHex(hexText) ? onChange(normHex(hexText)) : setHexText(value))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode; label?: string; onReset?: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(this.props.label ?? 'UI error', error);
  }
  render() {
    if (this.state.error)
      return (
        <div className="err-box">
          <div style={{ fontWeight: 700, color: '#fff' }}>{this.props.label ?? 'This part'} hit a problem</div>
          <div className="hint">{String(this.state.error.message).slice(0, 200)}</div>
          <button
            className="btn"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            Try again
          </button>
        </div>
      );
    return this.props.children;
  }
}

export function Confirm({ text, onYes, onNo, yes = 'Delete' }: { text: string; onYes: () => void; onNo: () => void; yes?: string }) {
  return (
    <Modal
      title="Are you sure?"
      onClose={onNo}
      footer={
        <>
          <button className="btn" onClick={onNo}>
            Cancel
          </button>
          <button className="btn danger" onClick={onYes}>
            {yes}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 16, lineHeight: 1.4 }}>{text}</div>
    </Modal>
  );
}

export function PromptModal({ title, initial, onDone, onClose }: { title: string; initial: string; onDone: (v: string) => void; onClose: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => v.trim() && onDone(v.trim())}>
            Save
          </button>
        </>
      }
    >
      <input className="text-input" autoFocus value={v} maxLength={60} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && v.trim() && onDone(v.trim())} />
    </Modal>
  );
}

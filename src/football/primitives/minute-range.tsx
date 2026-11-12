import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { cn } from '#/lib/utils';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import type { MinuteWindow } from '#/football/lib/selection';

/** A labelled tick on the {@link MinuteRange} track, e.g. a goal. */
export interface MinuteRangeMark {
  /** Match minute the mark sits at. */
  minute: number;
  /** Tick colour. Defaults to a quiet white. */
  color?: string;
  /** What happened, e.g. "Messi 23'". Shown on hover and read by screen readers. */
  label: string;
}

export interface MinuteRangeProps {
  /** The selected range (controlled). */
  value: MinuteWindow;
  /** Fires on every movement: each drag step, key press or track click. */
  onChange: (value: MinuteWindow) => void;
  /**
   * Fires when a movement settles: a thumb is released, a key moves a thumb, or
   * the track is clicked. Use it for expensive work such as refetching.
   */
  onCommit?: (value: MinuteWindow) => void;
  /** First minute on the track. Defaults to 0. */
  min?: number;
  /** Last minute on the track. Defaults to 90; use 120 for extra time. */
  max?: number;
  /** Arrow-key and drag step, in minutes. Defaults to 1. */
  step?: number;
  /** Page Up / Page Down step, in minutes. Defaults to 5. */
  pageStep?: number;
  /** Smallest allowed gap between `from` and `to`, in minutes. Defaults to 1. */
  minGap?: number;
  /** Ticks drawn on the track, e.g. goals. */
  marks?: MinuteRangeMark[];
  /** Accessible name of the control as a whole. Defaults to "Minute range". */
  label?: string;
  /** Colour of the selected stretch of track. Defaults to a soft white. */
  color?: string;
  /** Hide the "20'–45'" readout above the track. */
  hideReadout?: boolean;
  /** Disables both thumbs. */
  disabled?: boolean;
  /** Additional classes on the outer element. */
  className?: string;
}

/**
 * Scoped styles. Self-contained CSS rather than Tailwind utilities because the
 * native range input is styled through vendor pseudo-elements, and so the
 * control renders the same in a host that doesn't scan this package.
 *
 * Thumbs are 14px squares with a 4px radius (24px under a coarse pointer, with
 * a 44px tall hit row). The only motion is the thumb growing 10% while
 * pressed, over 140ms ease-out, and none under `prefers-reduced-motion`.
 */
const CSS = `
.btl-mr{--mr-thumb:14px;--mr-row:28px;position:relative;width:100%;min-width:160px;color:#fff;font-size:11px;line-height:1.3}
.btl-mr-head{display:flex;justify-content:flex-end;margin-bottom:4px;color:rgba(255,255,255,0.7)}
.btl-mr-row{position:relative;height:var(--mr-row);cursor:pointer}
.btl-mr-track,.btl-mr-fill{position:absolute;top:50%;height:4px;margin-top:-2px;border-radius:2px;pointer-events:none}
.btl-mr-track{left:calc(var(--mr-thumb) / 2);right:calc(var(--mr-thumb) / 2);background:rgba(255,255,255,0.12)}
.btl-mr-mark{position:absolute;top:50%;width:2px;height:12px;margin:-6px 0 0 -1px;pointer-events:auto}
.btl-mr-input{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;background:none;-webkit-appearance:none;appearance:none;pointer-events:none;outline:none}
.btl-mr-input::-webkit-slider-runnable-track{background:none;border:0;height:var(--mr-row)}
.btl-mr-input::-moz-range-track{background:none;border:0}
.btl-mr-input::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;pointer-events:auto;cursor:grab;width:var(--mr-thumb);height:var(--mr-thumb);margin-top:calc((var(--mr-row) - var(--mr-thumb)) / 2);border-radius:4px;border:1px solid rgba(0,0,0,0.45);background:#fff;transition:transform 140ms ease-out}
.btl-mr-input::-moz-range-thumb{pointer-events:auto;cursor:grab;width:var(--mr-thumb);height:var(--mr-thumb);box-sizing:border-box;border-radius:4px;border:1px solid rgba(0,0,0,0.45);background:#fff;transition:transform 140ms ease-out}
.btl-mr-input:active::-webkit-slider-thumb{cursor:grabbing;transform:scale(1.1)}
.btl-mr-input:active::-moz-range-thumb{cursor:grabbing;transform:scale(1.1)}
.btl-mr-input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 2px #0a0a0a,0 0 0 4px rgba(255,255,255,0.85)}
.btl-mr-input:focus-visible::-moz-range-thumb{box-shadow:0 0 0 2px #0a0a0a,0 0 0 4px rgba(255,255,255,0.85)}
.btl-mr-input:disabled::-webkit-slider-thumb{cursor:default;background:rgba(255,255,255,0.4)}
.btl-mr-input:disabled::-moz-range-thumb{cursor:default;background:rgba(255,255,255,0.4)}
.btl-mr-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (pointer:coarse){.btl-mr{--mr-thumb:24px;--mr-row:44px}}
@media (prefers-reduced-motion:reduce){
.btl-mr-input::-webkit-slider-thumb{transition:none}
.btl-mr-input::-moz-range-thumb{transition:none}
.btl-mr-input:active::-webkit-slider-thumb{transform:none}
.btl-mr-input:active::-moz-range-thumb{transform:none}
}
`;

type Thumb = 'from' | 'to';

/** Clamp to [lo, hi], snapping to `step` from `base`. */
function snap(v: number, lo: number, hi: number, step: number, base: number): number {
  const stepped = step > 0 ? base + Math.round((v - base) / step) * step : v;
  return Math.min(hi, Math.max(lo, stepped));
}

/** Position along the track as a CSS length, centred on the thumb's travel. */
function trackPos(minute: number, min: number, max: number): string {
  const span = max - min;
  const t = span > 0 ? Math.min(1, Math.max(0, (minute - min) / span)) : 0;
  return `calc(var(--mr-thumb) / 2 + (100% - var(--mr-thumb)) * ${t.toFixed(5)})`;
}

const fmt = (m: number) => `${m}'`;

/**
 * A two-thumb match-minute range: pick the stretch of a match a block shows
 * (pass the value straight to a block's `window` prop). Controlled.
 *
 * Built on two native range inputs, so each thumb is a real slider for
 * assistive tech ("From minute", "To minute") with its value read as a minute.
 * Keys: arrows move one `step`, Page Up / Page Down move `pageStep`, Home / End
 * jump to the thumb's limit. The thumbs never cross and stay `minGap` apart.
 * Clicking the track moves the nearer thumb there. Optional `marks` (goals,
 * red cards) sit on the track as coloured ticks.
 */
export function MinuteRange({
  value,
  onChange,
  onCommit,
  min = 0,
  max = 90,
  step = 1,
  pageStep = 5,
  minGap = 1,
  marks,
  label = 'Minute range',
  color = 'rgba(255,255,255,0.6)',
  hideReadout = false,
  disabled = false,
  className,
}: MinuteRangeProps) {
  const fromRef = useRef<HTMLInputElement | null>(null);
  const toRef = useRef<HTMLInputElement | null>(null);
  // The last value handed to onChange, so a drag's commit reports exactly what
  // the host was last told, even before the host re-renders.
  const latest = useRef<MinuteWindow>(value);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    latest.current = value;
    onCommitRef.current = onCommit;
  });

  const gap = Math.max(0, Math.min(minGap, max - min));
  const from = snap(value.from, min, max - gap, step, min);
  const to = snap(value.to, from + gap, max, step, min);

  /** Move one thumb to `minute`, keeping the gap. Returns the new range. */
  const move = (thumb: Thumb, minute: number): MinuteWindow =>
    thumb === 'from'
      ? { from: snap(minute, min, to - gap, step, min), to }
      : { from, to: snap(minute, from + gap, max, step, min) };

  const emit = (next: MinuteWindow, commit: boolean) => {
    if (next.from !== latest.current.from || next.to !== latest.current.to) {
      latest.current = next;
      onChange(next);
    }
    if (commit) onCommitRef.current?.(next);
  };

  // A drag settles on the native `change` event (pointer released). React's
  // onChange maps to `input`, so listen for `change` directly.
  useEffect(() => {
    const inputs = [fromRef.current, toRef.current].filter(
      (el): el is HTMLInputElement => el !== null
    );
    const commit = () => onCommitRef.current?.(latest.current);
    for (const el of inputs) el.addEventListener('change', commit);
    return () => {
      for (const el of inputs) el.removeEventListener('change', commit);
    };
  }, []);

  const onKeyDown = (thumb: Thumb) => (e: KeyboardEvent<HTMLInputElement>) => {
    const current = thumb === 'from' ? from : to;
    let target: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        target = current + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        target = current - step;
        break;
      case 'PageUp':
        target = current + pageStep;
        break;
      case 'PageDown':
        target = current - pageStep;
        break;
      case 'Home':
        target = min;
        break;
      case 'End':
        target = max;
        break;
      default:
        return;
    }
    // Handled here so every browser steps the same way and the step commits.
    e.preventDefault();
    emit(move(thumb, target), true);
  };

  const onTrackPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // A press on a thumb is the input's own drag.
    if (disabled || e.target instanceof HTMLInputElement) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const thumbPx =
      Number.parseFloat(getComputedStyle(e.currentTarget).getPropertyValue('--mr-thumb')) || 14;
    const usable = rect.width - thumbPx;
    if (usable <= 0) return;
    const t = Math.min(1, Math.max(0, (e.clientX - rect.left - thumbPx / 2) / usable));
    const minute = min + t * (max - min);
    const thumb: Thumb = Math.abs(minute - from) <= Math.abs(minute - to) ? 'from' : 'to';
    // Stop the compatibility mousedown from blurring the thumb focused below.
    e.preventDefault();
    emit(move(thumb, minute), true);
    (thumb === 'from' ? fromRef : toRef).current?.focus();
  };

  // Overlapping thumbs: the one that can still move inward goes on top.
  const fromOnTop = from > (min + max) / 2;
  const fillStyle: CSSProperties = {
    left: trackPos(from, min, max),
    width: `calc((100% - var(--mr-thumb)) * ${((to - from) / (max - min || 1)).toFixed(5)})`,
    background: color,
  };
  const visibleMarks = (marks ?? []).filter(
    (m) => Number.isFinite(m.minute) && m.minute >= min && m.minute <= max
  );

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="minute-range"
      className={cn('btl-mr', className)}
      style={{ fontFamily: BLOCK_FONT_STACK }}
    >
      <style>{CSS}</style>
      {!hideReadout && (
        <div className="btl-mr-head" aria-hidden>
          <span style={{ fontFeatureSettings: "'tnum' 1" }}>
            {fmt(from)}–{fmt(to)}
          </span>
        </div>
      )}
      <div className="btl-mr-row" onPointerDown={onTrackPointerDown}>
        <div className="btl-mr-track" />
        <div className="btl-mr-fill" style={fillStyle} data-slot="minute-range-fill" />
        {visibleMarks.map((m, i) => (
          <span
            key={`${m.minute}-${i}`}
            className="btl-mr-mark"
            title={m.label}
            aria-hidden
            style={{
              left: trackPos(m.minute, min, max),
              background: m.color ?? 'rgba(255,255,255,0.7)',
            }}
          />
        ))}
        <input
          ref={fromRef}
          type="range"
          className="btl-mr-input"
          aria-label="From minute"
          aria-valuetext={`Minute ${from}`}
          min={min}
          max={max}
          step={step}
          value={from}
          disabled={disabled}
          style={{ zIndex: fromOnTop ? 3 : 2 }}
          onChange={(e) => emit(move('from', Number(e.currentTarget.value)), false)}
          onKeyDown={onKeyDown('from')}
        />
        <input
          ref={toRef}
          type="range"
          className="btl-mr-input"
          aria-label="To minute"
          aria-valuetext={`Minute ${to}`}
          min={min}
          max={max}
          step={step}
          value={to}
          disabled={disabled}
          style={{ zIndex: fromOnTop ? 2 : 3 }}
          onChange={(e) => emit(move('to', Number(e.currentTarget.value)), false)}
          onKeyDown={onKeyDown('to')}
        />
      </div>
      {visibleMarks.length > 0 && (
        <ul className="btl-mr-sr">
          {visibleMarks.map((m, i) => (
            <li key={`${m.minute}-${i}`}>{m.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ramp } from '../brand/colour';
import { MARK_L, MARK_R, MARK_WIDTH } from '../brand/mark';
import {
  HIT_OVERREACH,
  INNER_RADIUS,
  OUTER_RADIUS,
  WHEEL_CX,
  WHEEL_CY,
  WHEEL_HEIGHT,
  WHEEL_WIDTH,
  layoutWheel,
  radiusFor,
  tipPosition,
  wedgePath,
} from './percentile-wheel-geometry';
import type { StatMetric } from './stat-metric';

export type { MetricState, StatMetric } from './stat-metric';

/**
 * Percentile wheel (spec §4.1, §4.3, §4.4), drawn to the approved mock
 * (`scratchpad/prof/wheel2.py`, `wheel()`, its CSS and JS).
 *
 * One wedge per metric, its length and colour set by the percentile, on a
 * faint full-length track, with a dashed median ring and the BTL mark in the
 * centre. A comparison player draws as an outline wedge per metric, ramping
 * toward white. Pending and locked event metrics draw as dashed outlines with
 * no number.
 *
 * Pure SVG with a scoped stylesheet: the server render is complete, and the
 * narrow-width labels, grow-in and reduced-motion handling are CSS, so no
 * effect runs before first paint. Hover, tap and keyboard focus are client
 * state; the readout belongs to the caller through `onFocus`.
 */

export interface PercentileWheelComparison {
  name: string;
  /** Keyed by `StatMetric.key`. */
  percentiles: Record<string, number | null>;
}

export interface PercentileWheelProps {
  metrics: StatMetric[];
  /** Group order around the wheel, clockwise from the top. Every group counts toward the gaps. */
  groupOrder: string[];
  ariaLabel: string;
  comparison?: PercentileWheelComparison | null;
  /**
   * Wheel metric keys to highlight, for example an archetype's
   * `ListArchetypeFits.focus_keys`. These must already be resolved through
   * the registry's `focus_key` (`tkl_padj` and `int_padj` arrive as `tkl`
   * and `int`): a key matches a metric whose `key` or `focusKey` equals it,
   * and an unresolved `tkl_padj` matches nothing on the wheel. When no key
   * matches, nothing dims. Hover, tap and keyboard focus take over while
   * active.
   */
  focusKeys?: string[] | null;
  /** Called with the metric `key` on hover, tap or keyboard focus, and with `null` when it ends. */
  onFocus?: (key: string | null) => void;
  /**
   * Announce the focused metric from the wheel's own polite live region.
   * Pass `false` when the caller's readout is the live region (the Stats
   * panel, spec §4.2), so a screen reader does not hear each move twice.
   */
  announce?: boolean;
  /** `social` is the export card: static, long labels, no interaction. */
  variant?: 'web' | 'social';
  /** Grow-in on mount. Always off under reduced motion. */
  animate?: boolean;
  /** `auto` switches to short labels at 760 px and below. */
  labels?: 'auto' | 'long' | 'short';
  /** Panel colour behind the wheel: the centre disc and the number halos use it. */
  surface?: string;
  /**
   * In-wedge percentile number size, in SVG user units at the wheel's full
   * (desktop/`web`) width. Default 11 (down from 13, ~15% smaller, PF-polish
   * wheel numbers). Weight is always 700; this only scales the digits.
   *
   * The narrow-screen size (`labels="short"`, or `auto` at 760 px and below)
   * follows the same ratio to this prop as the shipped default (22:13) but
   * never drops under `NARROW_TIP_FLOOR`: at the smallest supported wheel
   * (a 316 px rendered width, the Stats tab at 390 px phone width) that
   * floor is the smallest size that still renders at or above 10 px
   * effective, so a caller cannot shrink the narrow number past legibility
   * by passing a smaller `tipSize`.
   */
  tipSize?: number;
}

/** The shipped default before PF-polish's 15% cut (kept for the narrow ratio below). */
const DEFAULT_TIP_SIZE = 11;
const SHIPPED_BASE_TIP_SIZE = 13;
const SHIPPED_NARROW_TIP_SIZE = 22;
/** Ratio the narrow (<=760 px viewport) tip size keeps to the base tip size. */
const NARROW_TIP_RATIO = SHIPPED_NARROW_TIP_SIZE / SHIPPED_BASE_TIP_SIZE;
/**
 * Narrow tip size never goes below this. 22 (today's shipped value) measures
 * ~9.7 px effective at the Stats tab's narrowest wheel (390 px phone width,
 * a 316 px rendered wheel): already at the 10 px legibility floor, so it is
 * the floor itself, not just today's default.
 */
const NARROW_TIP_FLOOR = SHIPPED_NARROW_TIP_SIZE;

/** The narrow-screen (`short`/`auto`<=760px) tip size for a given base `tipSize`. */
function narrowTipSize(tipSize: number): number {
  return Math.max(NARROW_TIP_FLOOR, tipSize * NARROW_TIP_RATIO);
}

const WHITE = '#ffffff';
const LIGHT = '#d9d6d6';
const MUTED = '#a29e9e';
const MARK_RED = '#E20613';
const TRACK = 'rgba(255,255,255,0.035)';
const DASHED = 'rgba(255,255,255,0.3)';
const MEDIAN = 'rgba(255,255,255,0.28)';

/** `narrowTip` is the narrow-screen tip size (`narrowTipSize(tipSize)`). */
function cssFor(narrowTip: number): string {
  return `
@keyframes btl-pw-grow{from{transform:scale(0.35);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes btl-pw-tipin{from{opacity:0}to{opacity:1}}
.btl-pw .btl-pw-slc{transform-box:view-box;transform-origin:${WHEEL_CX}px ${WHEEL_CY}px;animation:btl-pw-grow .7s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(var(--i)*40ms)}
.btl-pw .btl-pw-slc.btl-pw-solo{transition:d .4s cubic-bezier(.2,.8,.2,1),fill .3s,opacity .18s}
.btl-pw .btl-pw-tip{animation:btl-pw-tipin .4s ease-out backwards;animation-delay:calc(var(--i)*40ms + .5s)}
.btl-pw .btl-pw-dm{transition:opacity .18s}
.btl-pw .btl-pw-ovl{fill:none;stroke-width:2;stroke-linejoin:round;pointer-events:none;transition:d .45s cubic-bezier(.2,.8,.2,1),opacity .18s}
.btl-pw.btl-pw-focus .btl-pw-ovl:not(.btl-pw-on){opacity:.22}
.btl-pw.btl-pw-focus .btl-pw-dm:not(.btl-pw-on){opacity:.22}
.btl-pw .btl-pw-lab{transition:fill .18s,opacity .18s}
.btl-pw.btl-pw-focus .btl-pw-lab:not(.btl-pw-on){opacity:.45}
.btl-pw .btl-pw-lab.btl-pw-on{fill:#fff;font-weight:600}
.btl-pw .btl-pw-hit{cursor:pointer}
.btl-pw .btl-pw-labs{display:none}
.btl-pw.btl-pw-short .btl-pw-lab{display:none}
.btl-pw.btl-pw-short .btl-pw-labs{display:inline}
.btl-pw.btl-pw-short .btl-pw-tip{font-size:${narrowTip}px}
@media (max-width:760px){
.btl-pw.btl-pw-auto .btl-pw-lab{display:none}
.btl-pw.btl-pw-auto .btl-pw-labs{display:inline}
.btl-pw.btl-pw-auto .btl-pw-tip{font-size:${narrowTip}px}
}
.btl-pw.btl-pw-static .btl-pw-slc,.btl-pw.btl-pw-static .btl-pw-tip{animation:none}
.btl-pw:focus{outline:none}
.btl-pw:focus-visible{outline:2px solid rgba(255,255,255,0.6);outline-offset:2px;border-radius:4px}
@media (prefers-reduced-motion:reduce){
.btl-pw .btl-pw-slc,.btl-pw .btl-pw-tip{animation:none!important}
.btl-pw .btl-pw-slc.btl-pw-solo,.btl-pw .btl-pw-ovl{transition:none}
}
`;
}

const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

function ordinal(n: number): string {
  const r100 = n % 100;
  const suffix =
    r100 >= 10 && r100 <= 20 ? 'th' : (({ 1: 'st', 2: 'nd', 3: 'rd' } as const)[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

function hasValue(m: StatMetric): m is StatMetric & { percentile: number } {
  return m.state === 'value' && m.percentile !== null && Number.isFinite(m.percentile);
}

function isEvent(m: StatMetric): boolean {
  return m.state === 'pending' || m.state === 'locked';
}

function cmpPercentile(
  comparison: PercentileWheelComparison | null | undefined,
  key: string
): number | null {
  const p = comparison?.percentiles[key];
  return p !== null && p !== undefined && Number.isFinite(p) ? Math.round(p) : null;
}

/** A value as the readout shows it: two decimals per 90, a whole number with % for a rate. */
function formatMetricValue(v: number, unit: StatMetric['unit']): string {
  return unit === 'percent' ? `${Math.round(v)}%` : v.toFixed(2);
}

const finite = (v: number | null): v is number => v !== null && Number.isFinite(v);

function describe(m: StatMetric, comparison: PercentileWheelComparison | null | undefined): string {
  if (isEvent(m)) return `${m.label}, event data`;
  let text = m.label;
  if (hasValue(m)) {
    if (finite(m.value)) text += `, ${formatMetricValue(m.value, m.unit)}`;
    text += `, ${ordinal(Math.round(m.percentile))} percentile`;
    if (finite(m.median)) text += `, median ${formatMetricValue(m.median, m.unit)}`;
  } else {
    text += ', no data';
  }
  const c = cmpPercentile(comparison, m.key);
  if (comparison && c !== null) text += `; ${comparison.name}, ${ordinal(c)}`;
  return text;
}

export function PercentileWheel({
  metrics,
  groupOrder,
  ariaLabel,
  comparison = null,
  focusKeys = null,
  onFocus,
  variant = 'web',
  animate = true,
  labels = 'auto',
  surface = '#151515',
  announce = true,
  tipSize = DEFAULT_TIP_SIZE,
}: PercentileWheelProps) {
  const interactive = variant === 'web';
  const css = useMemo(() => cssFor(narrowTipSize(tipSize)), [tipSize]);
  const layout = useMemo(() => layoutWheel(metrics, groupOrder), [metrics, groupOrder]);
  const [active, setActive] = useState<string | null>(null);
  const [liveText, setLiveText] = useState('');
  const lastPointer = useRef<string>('mouse');

  const activate = useCallback(
    (key: string | null) => {
      setActive(key);
      onFocus?.(key);
    },
    [onFocus]
  );

  // Hover, tap or keyboard focus wins over the caller's focus (an archetype
  // pinned in the list); when it ends, the caller's focus shows again.
  const onKeys = useMemo(() => {
    if (active) return new Set([active]);
    if (!focusKeys || focusKeys.length === 0) return null;
    const wanted = new Set(focusKeys);
    const lit = new Set(
      metrics.filter((m) => wanted.has(m.key) || wanted.has(m.focusKey ?? m.key)).map((m) => m.key)
    );
    // Keys that are all off the wheel (an archetype built on event metrics
    // this league lacks, say) must not dim every wedge.
    return lit.size > 0 ? lit : null;
  }, [active, focusKeys, metrics]);
  const on = (key: string) => (onKeys?.has(key) ? ' btl-pw-on' : '');

  const order = layout.slices.map((s) => s.metric);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || order.length === 0) return;
    const at = active ? order.findIndex((m) => m.key === active) : -1;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (at + 1) % order.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = at <= 0 ? order.length - 1 : at - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    else if (e.key === 'Escape' && active) {
      e.preventDefault();
      activate(null);
      setLiveText('');
      return;
    }
    if (next === null) return;
    e.preventDefault();
    const m = order[next];
    activate(m.key);
    setLiveText(describe(m, comparison));
  };

  const onHitEnter = (key: string) => (e: PointerEvent<SVGPathElement>) => {
    lastPointer.current = e.pointerType;
    if (e.pointerType === 'mouse') activate(key);
  };
  const onHitClick = (key: string) => () => {
    // A second tap on the same wedge clears it; a mouse click keeps it.
    if (lastPointer.current !== 'mouse' && active === key) activate(null);
    else activate(key);
  };
  const onLeave = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && active) activate(null);
  };

  const rootClass = [
    'btl-pw',
    `btl-pw-${variant === 'social' ? 'long' : labels}`,
    onKeys ? 'btl-pw-focus' : '',
    animate && variant === 'web' ? '' : 'btl-pw-static',
  ]
    .filter(Boolean)
    .join(' ');

  const markScale = 30 / MARK_WIDTH;

  const svg = (
    <svg
      viewBox={`0 0 ${WHEEL_WIDTH} ${WHEEL_HEIGHT}`}
      role={interactive ? undefined : 'img'}
      aria-label={interactive ? undefined : ariaLabel}
      aria-hidden={interactive ? true : undefined}
      focusable="false"
      onPointerLeave={interactive ? onLeave : undefined}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        fontFamily: 'Inter, sans-serif',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {layout.slices.map((s) => (
        <path
          key={`t-${s.metric.key}`}
          d={wedgePath(INNER_RADIUS, OUTER_RADIUS, s.a0, s.a1)}
          fill={TRACK}
        />
      ))}
      {layout.slices.map((s) => {
        const m = s.metric;
        const style = { '--i': s.index } as CSSProperties;
        if (isEvent(m)) {
          return (
            <path
              key={`s-${m.key}`}
              className={`btl-pw-slc btl-pw-dm${on(m.key)}`}
              data-k={m.key}
              data-state={m.state}
              style={style}
              d={wedgePath(INNER_RADIUS, OUTER_RADIUS, s.a0, s.a1)}
              fill="none"
              stroke={DASHED}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          );
        }
        if (!hasValue(m)) return null;
        const p = Math.round(m.percentile);
        return (
          <path
            key={`s-${m.key}`}
            className={`btl-pw-slc btl-pw-solo btl-pw-dm${on(m.key)}`}
            data-k={m.key}
            data-state={m.state}
            style={style}
            d={wedgePath(INNER_RADIUS, radiusFor(p), s.a0, s.a1)}
            fill={ramp(p, 'subject')}
          />
        );
      })}
      <g data-overlay={comparison ? comparison.name : undefined}>
        {layout.slices
          .filter((s) => !isEvent(s.metric))
          .map((s) => {
            const c = cmpPercentile(comparison, s.metric.key);
            return (
              <path
                key={`o-${s.metric.key}`}
                className={`btl-pw-ovl${on(s.metric.key)}`}
                data-k={s.metric.key}
                d={wedgePath(
                  INNER_RADIUS,
                  c !== null ? radiusFor(c) : INNER_RADIUS + 0.5,
                  s.a0,
                  s.a1
                )}
                style={{ stroke: c !== null ? ramp(c, 'comparison') : 'transparent' }}
              />
            );
          })}
      </g>
      <circle
        cx={WHEEL_CX}
        cy={WHEEL_CY}
        r={radiusFor(50)}
        fill="none"
        stroke={MEDIAN}
        strokeWidth={1}
        strokeDasharray="2 4"
        pointerEvents="none"
        data-median=""
      />
      {layout.slices.map((s) => {
        const m = s.metric;
        if (!hasValue(m)) return null;
        const p = Math.round(m.percentile);
        const t = tipPosition(p, s.am);
        return (
          <text
            key={`n-${m.key}`}
            className={`btl-pw-tip btl-pw-dm${on(m.key)}`}
            data-k={m.key}
            style={{ '--i': s.index } as CSSProperties}
            x={t.x.toFixed(1)}
            y={t.y.toFixed(1)}
            textAnchor="middle"
            fontSize={tipSize}
            fontWeight={700}
            fill={WHITE}
            stroke={t.inside ? undefined : surface}
            strokeWidth={t.inside ? undefined : 4}
            paintOrder={t.inside ? undefined : 'stroke'}
            strokeLinejoin={t.inside ? undefined : 'round'}
            pointerEvents="none"
          >
            {p}
          </text>
        );
      })}
      {interactive &&
        layout.slices.map((s) => (
          <path
            key={`h-${s.metric.key}`}
            className="btl-pw-hit"
            data-k={s.metric.key}
            d={wedgePath(INNER_RADIUS, OUTER_RADIUS + HIT_OVERREACH, s.h0, s.h1)}
            fill="transparent"
            onPointerEnter={onHitEnter(s.metric.key)}
            onPointerDown={(e) => {
              lastPointer.current = e.pointerType;
            }}
            onClick={onHitClick(s.metric.key)}
          />
        ))}
      {layout.labels.map((L, i) => {
        const m = layout.slices[i].metric;
        return (
          <text
            key={`l-${L.key}`}
            className={`btl-pw-lab${on(L.key)}`}
            data-k={L.key}
            x={L.x.toFixed(1)}
            y={L.y.toFixed(1)}
            textAnchor={L.anchor}
            fontSize={12.5}
            fill={hasValue(m) ? LIGHT : MUTED}
            pointerEvents="none"
          >
            {m.label}
          </text>
        );
      })}
      {layout.shortLabels.map((L, i) => {
        const m = layout.slices[i].metric;
        return (
          <text
            key={`ls-${L.key}`}
            className={`btl-pw-labs${on(L.key)}`}
            data-k={L.key}
            x={L.x.toFixed(1)}
            y={L.y.toFixed(1)}
            textAnchor={L.anchor}
            fontSize={22}
            fontWeight={600}
            fill={hasValue(m) ? LIGHT : MUTED}
            pointerEvents="none"
          >
            {m.shortLabel}
          </text>
        );
      })}
      <circle
        cx={WHEEL_CX}
        cy={WHEEL_CY}
        r={INNER_RADIUS - 3}
        fill={surface}
        pointerEvents="none"
      />
      <g
        data-mark=""
        transform={`translate(${(WHEEL_CX - 15).toFixed(1)},${(WHEEL_CY - 14.45).toFixed(1)}) scale(${markScale.toFixed(4)})`}
        fill={MARK_RED}
        pointerEvents="none"
      >
        <path d={MARK_L} />
        <path d={MARK_R} />
      </g>
    </svg>
  );

  return (
    <div
      className={rootClass}
      data-variant={variant}
      data-cmp={comparison ? comparison.name : undefined}
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      onBlur={
        interactive
          ? () => {
              if (active) activate(null);
              setLiveText('');
            }
          : undefined
      }
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: variant === 'social' ? 952 : WHEEL_WIDTH,
        margin: '0 auto',
      }}
    >
      <style>{css}</style>
      {svg}
      {interactive && (
        <>
          <ul style={SR_ONLY}>
            {order.map((m) => (
              <li key={m.key}>{describe(m, comparison)}</li>
            ))}
          </ul>
          {announce && (
            <span aria-live="polite" style={SR_ONLY}>
              {liveText}
            </span>
          )}
        </>
      )}
    </div>
  );
}

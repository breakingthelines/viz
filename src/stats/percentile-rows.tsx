import { useId, useMemo } from 'react';
import { ramp } from '../brand/colour';
import { formatMetricValue, formatPercentile } from './format';
import type { StatMetric } from './stat-metric';

/**
 * The per-90 table rows, grouped (Shooting, Creating, Passing, Carrying,
 * Defending, Discipline), each with a value, a ramp bar, a fixed median
 * tick and an ordinal (spec §4.2 "Per-90 rows by group", mock
 * `scratchpad/prof/wheel2.py` `per90_table`). `pending`/`locked` rows (an
 * event-only metric with no values yet) render muted and dashed with no
 * number, plus the muted "Event data" state label (spec §4.1, verdict P-D5
 * "Wheel and per-90 rows use the same states with 'Event data'", mock
 * `per90_table`) — an approved state label, not banned hint copy: without
 * it a screen reader gets only the metric name and no indication the row
 * is in a different state from a value row.
 *
 * Hovering or focusing a row reports its metric key through `onFocus`, the
 * same mechanism a hover on the wheel or {@link ComparisonBars} would use,
 * so all three can highlight the same metric together; `focusKeys` lights
 * this component's own rows up when another block focused them first. A
 * row is keyboard-reachable (`tabIndex`, `onFocus`/`onBlur`, `onClick`)
 * whenever the caller passes `onFocus` — spec §4.3's "tap replaces hover"
 * depends on a real focus path, not a browser emulating mouse events.
 */

export interface PercentileRowsProps {
  groups: { name: string; metrics: StatMetric[] }[];
  focusKeys?: string[] | null;
  onFocus?: (key: string | null) => void;
}

const WHITE = '#ffffff';
const MUTED = '#a29e9e';
const LIGHT = '#d9d6d6';
const LINE = 'rgba(255, 255, 255, 0.08)';
const TRACK = '#2b2b2b';
const MEDIAN_TICK = 'rgba(255, 255, 255, 0.35)';
const FOCUS_BG = 'rgba(255, 255, 255, 0.05)';

function PendingRow({ metric }: { metric: StatMetric }) {
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 10,
        alignItems: 'center',
        padding: '9px 0',
        borderTop: `1px solid ${LINE}`,
      }}
    >
      <span style={{ fontSize: 13, color: MUTED }}>{metric.label}</span>
      <span style={{ fontSize: 12, color: MUTED }}>Event data</span>
      <span
        aria-hidden
        style={{
          gridColumn: '1 / 3',
          height: 6,
          border: '1px dashed rgba(255, 255, 255, 0.3)',
          borderRadius: 3,
        }}
      />
    </li>
  );
}

interface ValueRowProps {
  metric: StatMetric;
  focused: boolean;
  onFocus?: (key: string | null) => void;
}

function ValueRow({ metric, focused, onFocus }: ValueRowProps) {
  const percentile = metric.percentile;
  const width = percentile === null || !Number.isFinite(percentile) ? 0 : Math.max(percentile, 0);
  const colour = ramp(percentile, 'subject');
  const focusKey = metric.focusKey ?? metric.key;
  return (
    <li
      className="btl-pr-row"
      tabIndex={onFocus ? 0 : undefined}
      onMouseEnter={onFocus ? () => onFocus(focusKey) : undefined}
      onMouseLeave={onFocus ? () => onFocus(null) : undefined}
      onFocus={onFocus ? () => onFocus(focusKey) : undefined}
      onBlur={onFocus ? () => onFocus(null) : undefined}
      onClick={onFocus ? () => onFocus(focusKey) : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '4px 10px',
        alignItems: 'baseline',
        padding: '9px 0',
        borderTop: `1px solid ${LINE}`,
        background: focused ? FOCUS_BG : 'transparent',
        boxShadow: focused ? '-8px 0 0 ' + FOCUS_BG + ', 8px 0 0 ' + FOCUS_BG : 'none',
      }}
    >
      <span style={{ fontSize: 13, color: LIGHT }}>{metric.label}</span>
      <span
        style={{ fontSize: 16, fontWeight: 600, color: WHITE, fontVariantNumeric: 'tabular-nums' }}
      >
        {formatMetricValue(metric.value, metric.unit)}
      </span>
      <span
        style={{
          gridColumn: '1 / 3',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 34px',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <span style={{ height: 4, background: TRACK, borderRadius: 2, position: 'relative' }}>
          <span
            className="btl-pr-fill"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${width}%`,
              background: colour,
              borderRadius: 2,
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: -3,
              bottom: -3,
              width: 1,
              background: MEDIAN_TICK,
            }}
          />
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: percentile !== null && percentile >= 90 ? '#ff3b3b' : MUTED,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatPercentile(percentile)}
        </span>
      </span>
    </li>
  );
}

export function PercentileRows({ groups, focusKeys, onFocus }: PercentileRowsProps) {
  const focusSet = useMemo(() => new Set(focusKeys ?? []), [focusKeys]);
  const scopeClass = `btl-pr-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div
      className={scopeClass}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '24px 28px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <style>{`
        .${scopeClass} .btl-pr-fill {
          transition: width 0.35s, background 0.35s;
        }
        .${scopeClass} .btl-pr-row {
          transition: background 150ms, box-shadow 150ms;
        }
        @media (prefers-reduced-motion: reduce) {
          .${scopeClass} .btl-pr-fill,
          .${scopeClass} .btl-pr-row {
            transition: none;
          }
        }
      `}</style>
      {groups.map((group) => (
        <div key={group.name} style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: WHITE }}>
            {group.name}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.metrics.map((metric) =>
              metric.state === 'pending' || metric.state === 'locked' ? (
                <PendingRow key={metric.key} metric={metric} />
              ) : (
                <ValueRow
                  key={metric.key}
                  metric={metric}
                  focused={focusSet.has(metric.focusKey ?? metric.key)}
                  onFocus={onFocus}
                />
              )
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

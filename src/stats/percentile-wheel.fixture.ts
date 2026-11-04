import type { PercentileWheelComparison } from './percentile-wheel';
import type { StatMetric } from './stat-metric';

/**
 * The approved mock's wheel (`scratchpad/prof/wheel2.py`, `data()`), as
 * plain props: an Eredivisie midfielder's 2026 per-90 percentiles, a
 * comparison player's percentiles against his own peers, and the event
 * metrics the EventTier board adds. Used by the stories and by the golden
 * test that checks the geometry against the mock's own SVG.
 */

/** The mock's full group list. Discipline is not on the wheel but counts toward the gaps. */
export const GROUP_ORDER = [
  'Shooting',
  'Creating',
  'Passing',
  'Carrying',
  'Defending',
  'Discipline',
];

type Row = [
  key: string,
  label: string,
  shortLabel: string,
  group: string,
  unit: 'per90' | 'percent',
  value: number,
  percentile: number,
  median: number,
];

const ROWS: Row[] = [
  ['npg', 'Non-penalty goals', 'npG', 'Shooting', 'per90', 0.57, 85, 0.3],
  ['shots', 'Shots', 'Shots', 'Shooting', 'per90', 1.36, 11, 2.02],
  ['sotp', 'Shots on target %', 'SoT %', 'Shooting', 'percent', 58, 83, 46],
  ['ast', 'Assists', 'Ast', 'Creating', 'per90', 0.11, 54, 0],
  ['key', 'Key passes', 'KP', 'Creating', 'per90', 1.93, 89, 1.02],
  ['passes', 'Passes', 'Passes', 'Passing', 'per90', 29.96, 76, 20.13],
  ['acc', 'Pass accuracy %', 'Pass %', 'Passing', 'percent', 78, 67, 75],
  ['drs', 'Successful dribbles', 'Drb', 'Carrying', 'per90', 1.7, 89, 1.02],
  ['drp', 'Dribble success %', 'Drb %', 'Carrying', 'percent', 58, 76, 50],
  ['fd', 'Fouls won', 'Fouled', 'Carrying', 'per90', 1.7, 67, 1.35],
  ['tkl', 'Tackles', 'Tkl', 'Defending', 'per90', 1.59, 80, 0.61],
  ['int', 'Interceptions', 'Int', 'Defending', 'per90', 0.11, 24, 0.15],
  ['dw', 'Duels won', 'Duels', 'Defending', 'per90', 6.36, 67, 5.34],
  ['dwp', 'Duel win %', 'Duel %', 'Defending', 'percent', 47, 76, 45],
];

export const SUBJECT_METRICS: StatMetric[] = ROWS.map(
  ([key, label, shortLabel, group, unit, value, percentile, median]) => ({
    key,
    label,
    shortLabel,
    group,
    unit,
    value,
    percentile,
    median,
    state: 'value',
  })
);

type EventRow = [key: string, label: string, shortLabel: string, group: string, after: string];

/** Event metrics, each placed after the metric the mock lists it after. */
const EVENT_ROWS: EventRow[] = [
  ['npxg', 'npxG', 'npxG', 'Shooting', 'sotp'],
  ['tib', 'Touches in box', 'Box tch', 'Shooting', 'npxg'],
  ['xa', 'xA', 'xA', 'Creating', 'key'],
  ['sca', 'Shot-creating actions', 'SCA', 'Creating', 'xa'],
  ['ppa', 'Passes into box', 'PPA', 'Creating', 'sca'],
  ['prgp', 'Progressive passes', 'PrgP', 'Passing', 'acc'],
  ['f3', 'Passes into final third', 'F3', 'Passing', 'prgp'],
  ['prgc', 'Progressive carries', 'PrgC', 'Carrying', 'fd'],
];

/** Subject metrics plus the event metrics, in the mock's order, all in one state. */
export function withEventMetrics(state: 'pending' | 'locked'): StatMetric[] {
  const out = [...SUBJECT_METRICS];
  for (const [key, label, shortLabel, group, after] of EVENT_ROWS) {
    const at = out.findIndex((m) => m.key === after);
    out.splice(at + 1, 0, {
      key,
      label,
      shortLabel,
      group,
      unit: 'per90',
      value: null,
      percentile: null,
      median: null,
      state,
    });
  }
  return out;
}

export const COMPARISON: PercentileWheelComparison = {
  name: 'Comparison Player',
  percentiles: {
    npg: 87,
    shots: 66,
    sotp: 97,
    ast: 11,
    key: 76,
    passes: 59,
    acc: 47,
    drs: 96,
    drp: 75,
    fd: 80,
    tkl: 66,
    int: 48,
    dw: 94,
    dwp: 80,
  },
};

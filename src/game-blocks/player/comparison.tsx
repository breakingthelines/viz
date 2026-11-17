import type { CSSProperties } from 'react';
import { PercentileWheel } from '../../stats/percentile-wheel';
import type { StatMetric } from '../../stats/stat-metric';
import type { GameBlockComponentProps } from '../block-props';
import { PlayerScaleKey, PlayerScaleRows, type PlayerScaleRow } from '../parts/player-scale-rows';
import { MirrorRows } from '../parts/comparison-mirror';
import {
  BlockFrame,
  BlockScale,
  Section,
  Sections,
  GatedValue,
  TABULAR,
  useBlockLayout,
  useBlockSkin,
  usePairArtStatus,
  type BlockHero,
  type BlockMedia,
} from '../skin/index';
import type { GameBlockConfig } from '../types';
import { useGatedCell } from '../values';
import type { GameBlockComparisonMetricJson, PlayerComparisonDataJson } from './data';
import { groupLabel, lowerFirst } from './percentile-wheel';
import { baseFrame, pctOf, surname } from './shared';

/**
 * Player › Comparison. Two players in one position group, each against his
 * own group. Percentiles are public; per 90 values are cells.
 *
 * Views (`options.view`):
 * - `wheel` (default): one wheel, the subject in red, the second player as
 *   outlines.
 * - `differ`: the annotated look on the four widest gaps, the crayon ringing
 *   the widest.
 * - `bars`: side by side, the Stats tab's mirrored bars, eight widest gaps.
 * - `strip`: three stats across, one scale each, small enough for chat.
 * - `two_wheels`: each player on his own wheel, the second in white.
 * - `duel`: the poster, both cut-outs facing each other and three figures
 *   mirrored under them. Only when both players have a picture; otherwise
 *   the wheel. The poster look on any view draws the duel.
 * - `scales`: rows of scales with a hero; `rows`: figures only.
 *
 * Two players the cards cannot rank together (different leagues or position
 * groups) come as season totals and per 90 with no percentiles (schema 2,
 * families `season_totals` and `per_90`). They draw as two plain tables, or
 * as the duel on per 90 figures.
 *
 * The context line is the scope the figures cover: "Bundesliga 2026/27" for
 * a ranked pair, "All competitions 2026/27" for totals.
 */

export const COMPARISON_VIEWS = [
  'wheel',
  'differ',
  'bars',
  'strip',
  'two_wheels',
  'duel',
  'scales',
  'rows',
] as const;
export type ComparisonView = (typeof COMPARISON_VIEWS)[number];

/** The view to draw: the asked one when known, else the wheel. */
export function comparisonView(view: string | undefined): ComparisonView {
  return (COMPARISON_VIEWS as readonly string[]).includes(view ?? '')
    ? (view as ComparisonView)
    : 'wheel';
}

/** "Bundesliga 2026/27": the competition and season the figures cover. */
export function comparisonScope(config: GameBlockConfig<unknown>): string {
  const parts = [config.scope.competitionLabel, config.scope.seasonLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : config.context;
}

/** Families of a totals comparison. */
const SEASON_TOTALS = 'season_totals';
const PER_90 = 'per_90';

/** True for a totals comparison: season totals and per 90, no percentiles. */
export function isTotalsComparison(metrics: GameBlockComparisonMetricJson[]): boolean {
  return (
    metrics.some((m) => m.family === SEASON_TOTALS) &&
    metrics.every((m) => m.subjectPercentile == null && m.comparisonPercentile == null)
  );
}

function subjectPct(m: GameBlockComparisonMetricJson): number | null {
  return m.subjectState === 'METRIC_STATE_VALUE' ? pctOf(m.subjectPercentile) : null;
}

function comparisonPct(m: GameBlockComparisonMetricJson): number | null {
  return m.comparisonState === 'METRIC_STATE_VALUE' ? pctOf(m.comparisonPercentile) : null;
}

/** The author's highlight, else the metric where the subject leads most. */
export function pickComparisonHighlight(
  metrics: GameBlockComparisonMetricJson[],
  highlight: string | undefined
): GameBlockComparisonMetricJson | undefined {
  const chosen = highlight ? metrics.find((m) => m.key === highlight) : undefined;
  if (chosen) return chosen;
  let best: GameBlockComparisonMetricJson | undefined;
  let gap = -Infinity;
  for (const m of metrics) {
    const a = subjectPct(m);
    if (a === null) continue;
    const g = a - (comparisonPct(m) ?? 0);
    if (g > gap) {
      gap = g;
      best = m;
    }
  }
  return best ?? metrics[0];
}

/**
 * A comparison's hero: the subject's per 90 value of one metric, with the
 * second player's value beside it. No ordinal: the scales show the rank.
 */
function valueHero(
  m: GameBlockComparisonMetricJson | undefined,
  bName: string
): BlockHero | undefined {
  if (!m?.subjectValueCell) return undefined;
  return {
    figure: <GatedValue cell={m.subjectValueCell} width={40} />,
    label: `${lowerFirst(m.label ?? '')} per 90`,
    baseline: m.comparisonValueCell
      ? [
          <>
            {bName} <GatedValue cell={m.comparisonValueCell} width={28} />
          </>,
        ]
      : [],
  };
}

interface ComparisonProps extends GameBlockComponentProps<PlayerComparisonDataJson> {
  aName: string;
  bName: string;
  view: ComparisonView;
  media: BlockMedia;
  /** The frame look this view draws in. */
  look: 'editorial' | 'annotated' | 'poster';
}

export function PlayerComparisonBlock(props: GameBlockComponentProps<PlayerComparisonDataJson>) {
  const { config } = props;
  const metrics = config.data?.metrics ?? [];
  const a = config.subject;
  const b = config.comparison;
  const aName = surname(a.name);
  const bName = surname(b?.name) || 'Comparison';
  // Players carry their ids, so the poster draws their cut-outs and never a
  // headshot where a crest goes.
  const media: BlockMedia = {
    kind: 'pair',
    src: a.imageUrl,
    pairSrc: b?.imageUrl,
    personId: a.kind === 'player' ? a.id : undefined,
    pairPersonId: b?.kind === 'player' ? b.id : undefined,
  };
  const asked = comparisonView(config.options.view);
  const look = config.look ?? 'editorial';
  const wantsDuel = asked === 'duel' || look === 'poster';
  const art = usePairArtStatus(wantsDuel ? media : undefined);
  const totals = isTotalsComparison(metrics);
  // The duel needs both pictures; without them the wheel, or the tables for
  // a totals pair.
  const view: ComparisonView = wantsDuel
    ? art === 'none'
      ? totals
        ? 'rows'
        : 'wheel'
      : 'duel'
    : asked;
  const frameLook =
    view === 'duel'
      ? 'poster'
      : view === 'differ'
        ? 'annotated'
        : look === 'poster'
          ? 'editorial'
          : look;
  const shared = { ...props, aName, bName, view, media, look: frameLook } as ComparisonProps;
  if (view === 'duel') return <DuelComparison {...shared} />;
  if (totals) return <TotalsComparison {...shared} />;
  switch (view) {
    case 'differ':
      return <DifferComparison {...shared} />;
    case 'bars':
      return <BarsComparison {...shared} />;
    case 'strip':
      return <StripComparison {...shared} />;
    case 'two_wheels':
      return <TwoWheelsComparison {...shared} />;
    case 'scales':
    case 'rows':
      return <ScalesComparison {...shared} />;
    default:
      return <WheelComparison {...shared} />;
  }
}

/** Both percentiles known. */
function ranked(m: GameBlockComparisonMetricJson): boolean {
  return subjectPct(m) !== null && comparisonPct(m) !== null;
}

function gapOf(m: GameBlockComparisonMetricJson): number {
  return Math.abs((subjectPct(m) ?? 0) - (comparisonPct(m) ?? 0));
}

/**
 * The metrics the two differ on most: the widest gap in each family, the
 * `n` widest of those, widest first. When all of them lean one way and the
 * other player leads somewhere, his widest lead takes the last place, so
 * both players show.
 */
export function widestGaps(
  metrics: GameBlockComparisonMetricJson[],
  n: number
): GameBlockComparisonMetricJson[] {
  const best = new Map<string, GameBlockComparisonMetricJson>();
  for (const m of metrics) {
    if (!ranked(m)) continue;
    const f = m.family ?? '';
    const cur = best.get(f);
    if (!cur || gapOf(m) > gapOf(cur)) best.set(f, m);
  }
  const picks = [...best.values()].sort((x, y) => gapOf(y) - gapOf(x)).slice(0, n);
  const leads = (m: GameBlockComparisonMetricJson) =>
    (subjectPct(m) ?? 0) > (comparisonPct(m) ?? 0);
  if (picks.length === n && picks.length > 1) {
    const way = leads(picks[0]);
    if (picks.every((m) => leads(m) === way)) {
      const other = metrics
        .filter((m) => ranked(m) && leads(m) !== way && gapOf(m) > 0 && !picks.includes(m))
        .sort((x, y) => gapOf(y) - gapOf(x))[0];
      if (other) picks[picks.length - 1] = other;
    }
  }
  return picks;
}

function familyLabels(data: PlayerComparisonDataJson): Map<string, string> {
  return new Map((data.families ?? []).map((f) => [f.key ?? '', f.label ?? f.key ?? '']));
}

function wheelMetrics(
  metrics: GameBlockComparisonMetricJson[],
  families: Map<string, string>,
  side: 'subject' | 'comparison'
): StatMetric[] {
  return metrics.map((m) => {
    const p = side === 'subject' ? subjectPct(m) : comparisonPct(m);
    return {
      key: m.key ?? '',
      label: m.label ?? '',
      shortLabel: m.shortLabel || m.label || '',
      group: families.get(m.family ?? '') ?? m.family ?? '',
      unit: 'per90',
      value: null,
      percentile: p,
      median: null,
      state: p === null ? 'no-data' : 'value',
    };
  });
}

function groupOrder(data: PlayerComparisonDataJson, metrics: StatMetric[]): string[] {
  const out = (data.families ?? []).map((f) => f.label ?? f.key ?? '');
  for (const m of metrics) if (!out.includes(m.group)) out.push(m.group);
  return out.filter((g) => metrics.some((m) => m.group === g));
}

function WheelComparison(props: ComparisonProps) {
  const { config, aName, bName, media } = props;
  const skin = useBlockSkin();
  const data = config.data ?? {};
  const metrics = data.metrics ?? [];
  const families = familyLabels(data);
  const wheel = wheelMetrics(metrics, families, 'subject');
  const percentiles: Record<string, number | null> = {};
  for (const m of metrics) percentiles[m.key ?? ''] = comparisonPct(m);
  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', media)}
      look={props.look}
      context={comparisonScope(config)}
    >
      <div data-comparison-view="wheel" style={{ marginTop: 10 }}>
        <PlayerScaleKey subject={aName} comparator={bName} />
        <PercentileWheel
          metrics={wheel}
          groupOrder={groupOrder(data, wheel)}
          ariaLabel={`${config.subject.name} and ${config.comparison?.name ?? bName}, percentiles`}
          comparison={{ name: config.comparison?.name ?? bName, percentiles }}
          variant="social"
          animate={false}
          labels="short"
          surface={skin.surface}
          announce={false}
        />
      </div>
    </BlockFrame>
  );
}

function TwoWheelsComparison(props: ComparisonProps) {
  const { config, aName, bName, media } = props;
  const skin = useBlockSkin();
  const data = config.data ?? {};
  const metrics = data.metrics ?? [];
  const families = familyLabels(data);
  const wheel = (side: 'subject' | 'comparison', name: string) => {
    const ms = wheelMetrics(metrics, families, side);
    return (
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 -4px',
            fontFamily: skin.fontSans,
            fontSize: 15,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {name}
        </p>
        <PercentileWheel
          metrics={ms}
          groupOrder={groupOrder(data, ms)}
          ariaLabel={`${name}, percentiles`}
          variant="social"
          animate={false}
          labels="short"
          surface={skin.surface}
          announce={false}
          tone={side}
        />
      </div>
    );
  };
  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', media)}
      look={props.look}
      context={comparisonScope(config)}
    >
      <div
        data-comparison-view="two_wheels"
        style={{
          display: 'grid',
          // Side by side from about 480 px, one above the other on a phone.
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 4,
          marginTop: 12,
        }}
      >
        {wheel('subject', aName)}
        {wheel('comparison', bName)}
      </div>
    </BlockFrame>
  );
}

function DifferComparison(props: ComparisonProps) {
  const { config, aName, bName, media } = props;
  const metrics = config.data?.metrics ?? [];
  const top = widestGaps(metrics, 4);
  const lead = top[0];
  const hero = valueHero(lead, bName);
  const rows: PlayerScaleRow[] = top.map((m) => ({
    key: m.key ?? '',
    label: m.label ?? '',
    value: subjectPct(m),
    comparator: comparisonPct(m),
    cells: [cellOrDash(m.subjectValueCell), cellOrDash(m.comparisonValueCell)],
  }));
  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', media)}
      look={props.look}
      context={comparisonScope(config)}
      hero={hero}
      annotate={lead?.key ? { target: `[data-k="${lead.key}"] [data-anchor="figure"]` } : undefined}
    >
      <div data-comparison-view="differ" style={{ marginTop: 6 }}>
        <PlayerScaleKey subject={aName} comparator={bName} />
        <PlayerScaleRows rows={rows} />
      </div>
    </BlockFrame>
  );
}

/** The eight widest gaps, in the families' order, as the Stats tab draws them. */
function BarsComparison(props: ComparisonProps) {
  return <ScalesComparison {...props} />;
}

/** "Shots p90"; a percentage stat keeps its own label. */
function statLabel(label: string, display: string | undefined): string {
  return display?.includes('%') ? label : `${label} p90`;
}

function StripColumn({ m }: { m: GameBlockComparisonMetricJson }) {
  const skin = useBlockSkin();
  const { narrow } = useBlockLayout();
  const read = useGatedCell(m.subjectValueCell);
  const display = read.state === 'value' ? read.display : undefined;
  return (
    <div data-k={m.key} style={{ minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: 'var(--btl-block-ink-3)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {statLabel(m.label ?? '', display)}
      </p>
      <p style={{ margin: '4px 0 2px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          data-anchor="figure"
          style={{
            fontFamily: skin.fontSans,
            fontWeight: 700,
            fontSize: narrow ? 20 : 24,
            letterSpacing: '-0.02em',
          }}
        >
          {cellOrDash(m.subjectValueCell)}
        </span>
        <span style={{ fontSize: narrow ? 13 : 14, color: 'var(--btl-block-ink-3)' }}>
          {cellOrDash(m.comparisonValueCell)}
        </span>
      </p>
      <BlockScale
        size="row"
        value={subjectPct(m) ?? 0}
        comparator={comparisonPct(m) ?? undefined}
        state={subjectPct(m) === null ? 'pending' : 'value'}
      />
    </div>
  );
}

function StripComparison(props: ComparisonProps) {
  const { config, aName, bName, media } = props;
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const top = widestGaps(config.data?.metrics ?? [], 3);
  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', media)}
      look={props.look === 'annotated' ? 'editorial' : props.look}
      context={comparisonScope(config)}
    >
      <div data-comparison-view="strip" style={{ marginTop: 12, fontFamily: skin.fontSans }}>
        <div
          style={{
            ...TABULAR,
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(top.length, 1)}, minmax(0, 1fr))`,
            columnGap: narrow ? 14 : 22,
          }}
        >
          {top.map((m) => (
            <StripColumn key={m.key} m={m} />
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <PlayerScaleKey subject={aName} comparator={bName} />
        </div>
      </div>
    </BlockFrame>
  );
}

/** Three figures for the duel: the widest gaps, or the leading per 90 rows of a totals pair. */
function duelMetrics(metrics: GameBlockComparisonMetricJson[]): GameBlockComparisonMetricJson[] {
  if (isTotalsComparison(metrics)) return metrics.filter((m) => m.family === PER_90).slice(0, 3);
  return widestGaps(metrics, 3);
}

function DuelRow({ m, first }: { m: GameBlockComparisonMetricJson; first: boolean }) {
  const skin = useBlockSkin();
  const { narrow } = useBlockLayout();
  const a = useGatedCell(m.subjectValueCell);
  const b = useGatedCell(m.comparisonValueCell);
  const av = a.state === 'value' ? (a.value ?? 0) : null;
  const bv = b.state === 'value' ? (b.value ?? 0) : null;
  // The larger figure is white, the smaller quiet; level or unknown, both white.
  const aWins = av === null || bv === null || av >= bv;
  const bWins = av === null || bv === null || bv >= av;
  const size = narrow ? 40 : 54;
  const figure = (strong: boolean, align: 'left' | 'right'): CSSProperties => ({
    fontFamily: skin.fontCondensed,
    fontWeight: 700,
    fontSize: size,
    lineHeight: 1,
    textAlign: align,
    color: strong ? 'var(--btl-block-ink-1)' : 'var(--btl-block-ink-4)',
  });
  const display = a.state === 'value' ? a.display : undefined;
  const label = isTotalsLabel(m) ? (m.label ?? '') : statLabel(m.label ?? '', display);
  return (
    <div
      role="row"
      data-k={m.key}
      style={{
        ...TABULAR,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
        padding: narrow ? '6px 2px' : '6px 8px',
        borderTop: first ? 'none' : '1px solid var(--btl-block-line)',
      }}
    >
      <span role="cell" data-anchor="figure" style={figure(aWins, 'left')}>
        {cellOrDash(m.subjectValueCell)}
      </span>
      <span
        role="rowheader"
        style={{
          fontFamily: skin.fontSans,
          fontSize: narrow ? 13 : 14,
          color: 'var(--btl-block-ink-2)',
          textAlign: 'center',
        }}
      >
        {label}
      </span>
      <span role="cell" style={figure(bWins, 'right')}>
        {cellOrDash(m.comparisonValueCell)}
      </span>
    </div>
  );
}

/** A totals pair's per 90 rows already read "per 90" in their family. */
function isTotalsLabel(m: GameBlockComparisonMetricJson): boolean {
  return m.family === PER_90;
}

function DuelComparison(props: ComparisonProps) {
  const { config, media } = props;
  const rows = duelMetrics(config.data?.metrics ?? []);
  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', media)}
      look="poster"
      context={comparisonScope(config)}
    >
      <div role="table" data-comparison-view="duel">
        {rows.map((m, i) => (
          <DuelRow key={m.key} m={m} first={i === 0} />
        ))}
      </div>
    </BlockFrame>
  );
}

function ScalesComparison(props: ComparisonProps) {
  const { config, aName, bName, media } = props;
  const data = config.data ?? {};
  const metrics = data.metrics ?? [];
  const top = pickComparisonHighlight(metrics, config.options.highlight);
  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', media)}
      look={props.look}
      annotate={top?.key ? { target: `[data-k="${top.key}"] [data-num]` } : undefined}
    >
      {metrics.length > 0 ? (
        <Section heading={pairHeading(data)}>
          <MirrorRows metrics={metrics} subject={aName} comparison={bName} mode="percentile" />
        </Section>
      ) : null}
    </BlockFrame>
  );
}

/** "Per 90, vs Premier League strikers", or each player against his own pool. */
function pairHeading(data: PlayerComparisonDataJson): string {
  const a = groupLabel(data.subjectGroupPhrase, undefined);
  const b = groupLabel(data.comparisonGroupPhrase, undefined);
  return a && a === b ? `Per 90, ${a}` : 'Per 90, each vs own league and position';
}

function cellOrDash(cell: string | undefined) {
  return cell ? <GatedValue cell={cell} /> : '–';
}

/** Season totals, then per 90: the same bars from a shared centre, drawn to the larger value. */
function TotalsComparison(props: ComparisonProps) {
  const { config, aName, bName, media } = props;
  const data = config.data ?? {};
  const metrics = data.metrics ?? [];
  const totals = metrics.filter((m) => m.family === SEASON_TOTALS);
  const per90 = metrics.filter((m) => m.family === PER_90);
  const minutes = (n: number | undefined) => (n ? n.toLocaleString('en-GB') : '–');
  const familyLabel = (key: string, fallback: string) =>
    data.families?.find((f) => f.key === key)?.label || fallback;
  return (
    <BlockFrame {...baseFrame(props, 'comparison', media)} look={props.look}>
      <div data-comparison-totals="">
        <Sections>
          <Section heading={familyLabel(SEASON_TOTALS, 'Season totals')}>
            <MirrorRows
              metrics={totals}
              subject={aName}
              comparison={bName}
              mode="value"
              extra={{
                label: 'Minutes',
                a: minutes(data.subjectMinutes),
                b: minutes(data.comparisonMinutes),
              }}
            />
          </Section>
          {per90.length > 0 ? (
            <Section heading={familyLabel(PER_90, 'Per 90')}>
              <MirrorRows metrics={per90} subject={aName} comparison={bName} mode="value" />
            </Section>
          ) : null}
        </Sections>
      </div>
    </BlockFrame>
  );
}

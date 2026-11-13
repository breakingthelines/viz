import type { GameBlockComponentProps } from '../block-props';
import { PlayerScaleKey, PlayerScaleRows, type PlayerScaleRow } from '../parts/player-scale-rows';
import { BlockGrid, SectionLabel } from '../parts/team-league-match-ui';
import { BlockFrame, GatedValue, type BlockHero } from '../skin/index';
import type { GameBlockComparisonMetricJson, PlayerComparisonDataJson } from './data';
import { groupLabel, lowerFirst, ordinal } from './percentile-wheel';
import { baseFrame, pctOf, surname } from './shared';

/**
 * Player › Comparison. Two players in one position group, each against his
 * own group. Percentiles are public and drawn as scales: the subject the red
 * fill, the second player the ring. Per 90 values are cells. The hero is the
 * highlighted metric's percentile for the subject, the second player's
 * beside it.
 *
 * Views: `scales` (default) and `rows` (figures only).
 *
 * Two players the cards cannot rank together (different leagues or position
 * groups) come as season totals and per 90 with no percentiles (schema 2,
 * families `season_totals` and `per_90`). They draw as two plain tables, and
 * the hero is the highlighted total.
 */

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

function pctText(p: number | null): string {
  return p === null ? '–' : ordinal(p);
}

export function PlayerComparisonBlock(props: GameBlockComponentProps<PlayerComparisonDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const metrics = data.metrics ?? [];
  const a = config.subject;
  const b = config.comparison;
  const aName = surname(a.name);
  const bName = surname(b?.name) || 'Comparison';
  const view = config.options.view || 'scales';
  if (isTotalsComparison(metrics)) {
    return <TotalsComparison {...props} aName={aName} bName={bName} />;
  }
  const top = pickComparisonHighlight(metrics, config.options.highlight);

  let hero: BlockHero | undefined;
  const topA = top ? subjectPct(top) : null;
  if (top && topA !== null) {
    hero = {
      figure: ordinal(topA),
      label: `${lowerFirst(top.label ?? '')} percentile`,
      baseline: [`${bName} ${pctText(comparisonPct(top))}`],
    };
  }

  const groups = [
    groupLabel(data.subjectGroupPhrase, undefined),
    groupLabel(data.comparisonGroupPhrase, undefined),
  ];
  const groupNote =
    groups[0] && groups[0] === groups[1]
      ? [groups[0]]
      : [
          groups[0] ? `${aName} ${groups[0]}` : null,
          groups[1] ? `${bName} ${groups[1]}` : null,
        ].filter(Boolean);

  const rows: PlayerScaleRow[] = metrics.map((m) => ({
    key: m.key ?? '',
    label: m.label ?? '',
    value: subjectPct(m),
    comparator: comparisonPct(m),
    cells:
      view === 'rows'
        ? [
            pctText(subjectPct(m)),
            m.subjectValueCell ? <GatedValue cell={m.subjectValueCell} /> : '–',
            pctText(comparisonPct(m)),
            m.comparisonValueCell ? <GatedValue cell={m.comparisonValueCell} /> : '–',
          ]
        : [
            m.subjectValueCell ? <GatedValue cell={m.subjectValueCell} /> : '–',
            m.comparisonValueCell ? <GatedValue cell={m.comparisonValueCell} /> : '–',
          ],
  }));

  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', {
        kind: 'pair',
        src: a.imageUrl,
        crestSrc: a.crestUrl,
        pairSrc: b?.imageUrl,
      })}
      context={pairContext(props)}
      hero={hero}
      annotate={top?.key ? { target: `[data-k="${top.key}"] [data-anchor="figure"]` } : undefined}
      aside={
        groupNote.length > 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--btl-block-ink-3)' }}>
            {groupNote.map((g, i) => (
              <span key={i} style={{ display: 'block' }}>
                {g}
              </span>
            ))}
          </p>
        ) : null
      }
    >
      {rows.length > 0 ? (
        <div>
          <PlayerScaleKey subject={aName} comparator={bName} />
          <PlayerScaleRows
            rows={rows}
            columns={
              view === 'rows'
                ? [aName, 'Per 90', bName, 'Per 90']
                : [`${aName} p90`, `${bName} p90`]
            }
          />
        </div>
      ) : null}
    </BlockFrame>
  );
}

function pairContext(props: GameBlockComponentProps<PlayerComparisonDataJson>): string {
  const { config } = props;
  const a = config.subject;
  const b = config.comparison;
  return (
    [
      a.subtitle && b?.subtitle ? `${a.subtitle} and ${b.subtitle}` : a.subtitle,
      config.scope.seasonLabel,
    ]
      .filter(Boolean)
      .join(', ') || config.context
  );
}

function cellOrDash(cell: string | undefined) {
  return cell ? <GatedValue cell={cell} /> : '–';
}

/** Season totals and per 90 side by side: two plain tables, no scales. */
function TotalsComparison(
  props: GameBlockComponentProps<PlayerComparisonDataJson> & { aName: string; bName: string }
) {
  const { config, aName, bName } = props;
  const data = config.data ?? {};
  const metrics = data.metrics ?? [];
  const a = config.subject;
  const b = config.comparison;
  const totals = metrics.filter((m) => m.family === SEASON_TOTALS);
  const per90 = metrics.filter((m) => m.family === PER_90);
  const top =
    totals.find((m) => m.key === config.options.highlight) ??
    (totals.length ? totals[0] : undefined);
  const hero: BlockHero | undefined = top?.subjectValueCell
    ? {
        figure: <GatedValue cell={top.subjectValueCell} />,
        label: lowerFirst(top.label ?? ''),
        baseline: [
          <>
            {bName} {cellOrDash(top.comparisonValueCell)}
          </>,
        ],
      }
    : undefined;
  const columns = [{ label: '' }, { label: aName, strong: true }, { label: bName }];
  const minutes = (n: number | undefined) => (n ? n.toLocaleString('en-GB') : '–');
  const familyLabel = (key: string, fallback: string) =>
    data.families?.find((f) => f.key === key)?.label || fallback;
  return (
    <BlockFrame
      {...baseFrame(props, 'comparison', {
        kind: 'pair',
        src: a.imageUrl,
        crestSrc: a.crestUrl,
        pairSrc: b?.imageUrl,
      })}
      context={pairContext(props)}
      hero={hero}
      aside={
        config.scope.competitionLabel ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--btl-block-ink-3)' }}>
            {config.scope.competitionLabel}
          </p>
        ) : null
      }
    >
      <div data-comparison-totals="">
        <SectionLabel first>{familyLabel(SEASON_TOTALS, 'Season totals')}</SectionLabel>
        <BlockGrid
          label={familyLabel(SEASON_TOTALS, 'Season totals')}
          columns={columns}
          rows={[
            {
              key: 'minutes',
              muted: true,
              cells: ['Minutes', minutes(data.subjectMinutes), minutes(data.comparisonMinutes)],
            },
            ...totals.map((m) => ({
              key: m.key ?? '',
              cells: [
                m.label ?? '',
                cellOrDash(m.subjectValueCell),
                cellOrDash(m.comparisonValueCell),
              ],
            })),
          ]}
        />
        {per90.length > 0 ? (
          <>
            <SectionLabel>{familyLabel(PER_90, 'Per 90')}</SectionLabel>
            <BlockGrid
              label={familyLabel(PER_90, 'Per 90')}
              columns={columns}
              rows={per90.map((m) => ({
                key: m.key ?? '',
                cells: [
                  m.label ?? '',
                  cellOrDash(m.subjectValueCell),
                  cellOrDash(m.comparisonValueCell),
                ],
              }))}
            />
          </>
        ) : null}
      </div>
    </BlockFrame>
  );
}

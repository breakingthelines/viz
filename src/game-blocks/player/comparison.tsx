import type { GameBlockComponentProps } from '../block-props';
import { PlayerScaleKey, PlayerScaleRows, type PlayerScaleRow } from '../parts/player-scale-rows';
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
 */

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
      context={
        [
          a.subtitle && b?.subtitle ? `${a.subtitle} and ${b.subtitle}` : a.subtitle,
          config.scope.seasonLabel,
        ]
          .filter(Boolean)
          .join(', ') || config.context
      }
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

import type { GameBlockComponentProps } from '../block-props';
import { PlayerTrendChart } from '../parts/player-trend-chart';
import { BlockFrame, BlockRows, GatedValue, type BlockHero } from '../skin/index';
import type { GameBlockTrendMetricJson, PlayerSeasonTrendDataJson } from './data';
import { groupLabel, lowerFirst, ordinal } from './percentile-wheel';
import { baseFrame, pctOf } from './shared';

/**
 * Player › Season trend. Up to 4 metrics over up to 5 seasons, each season
 * against his group that season. Percentiles are public; per 90 values are
 * cells. The hero is the highlighted metric's latest percentile and the change
 * since the first season.
 *
 * Views: `chart` (default) and `rows` (a season-by-season table).
 */

/** Percentiles aligned to `seasonIds`, null where there is none. */
export function alignPoints(m: GameBlockTrendMetricJson, seasonIds: string[]): (number | null)[] {
  const by = new Map((m.points ?? []).map((p) => [p.seasonId ?? '', p]));
  return seasonIds.map((id) => {
    const p = by.get(id);
    return p && p.state === 'METRIC_STATE_VALUE' ? pctOf(p.percentile) : null;
  });
}

/** "Up 12", "Down 4", "Level". Null with fewer than two seasons. */
export function changeLabel(points: (number | null)[]): string | null {
  const vals = points.filter((p): p is number => p !== null);
  if (vals.length < 2) return null;
  const d = Math.round(vals[vals.length - 1] - vals[0]);
  if (d === 0) return 'Level';
  return d > 0 ? `Up ${d}` : `Down ${-d}`;
}

export function PlayerSeasonTrendBlock(props: GameBlockComponentProps<PlayerSeasonTrendDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const seasons = data.seasons ?? [];
  const ids = seasons.map((s) => s.seasonId ?? '');
  const metrics = data.metrics ?? [];
  const view = config.options.view || 'chart';
  const top =
    (config.options.highlight
      ? metrics.find((m) => m.key === config.options.highlight)
      : undefined) ?? metrics[0];
  const topPoints = top ? alignPoints(top, ids) : [];
  let lastIdx = -1;
  topPoints.forEach((p, i) => {
    if (p !== null) lastIdx = i;
  });
  const firstIdx = topPoints.findIndex((p) => p !== null);

  let hero: BlockHero | undefined;
  if (top && lastIdx >= 0) {
    const lastPoint = (top.points ?? []).find((p) => p.seasonId === ids[lastIdx]);
    const change = changeLabel(topPoints);
    hero = {
      figure: ordinal(topPoints[lastIdx] as number),
      label: `${lowerFirst(top.label ?? '')} percentile, ${seasons[lastIdx]?.label ?? ''}`,
      baseline: [
        change && firstIdx >= 0 && firstIdx !== lastIdx
          ? `${change} since ${seasons[firstIdx]?.label ?? ''}`
          : null,
        lastPoint?.valueCell ? (
          <span key="p90">
            Per 90 <GatedValue cell={lastPoint.valueCell} width={28} />
          </span>
        ) : null,
      ].filter(Boolean),
    };
  }

  const groups = [...new Set(seasons.map((s) => s.groupPhrase).filter(Boolean))];

  const visual =
    view === 'rows' ? (
      <BlockRows
        columns={['', ...seasons.map((s) => s.label ?? '')]}
        rows={metrics.map((m) => ({
          key: m.key ?? '',
          label: m.label ?? '',
          cells: alignPoints(m, ids).map((p) => (p === null ? '–' : ordinal(p))),
        }))}
      />
    ) : (
      <PlayerTrendChart
        seasons={seasons.map((s) => s.label ?? '')}
        lines={metrics.map((m) => ({
          key: m.key ?? '',
          label: m.label ?? '',
          points: alignPoints(m, ids),
          highlight: m === top,
        }))}
        ariaLabel={`${config.subject.name}, percentiles by season`}
      />
    );

  return (
    <BlockFrame
      {...baseFrame(props, 'seasons')}
      context={config.subject.subtitle || config.context}
      hero={hero}
      annotate={
        view === 'chart' && top?.key
          ? { target: `[data-trend-line="${top.key}"] [data-trend-point="last"]` }
          : undefined
      }
      aside={
        groups.length === 1 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--btl-block-ink-3)' }}>
            {groupLabel(groups[0], undefined)}
          </p>
        ) : null
      }
    >
      {metrics.length > 0 ? visual : null}
    </BlockFrame>
  );
}

import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  GatedValue,
  InFrame,
  LabelCell,
  Num,
  Row,
  Rows,
  Section,
  StatCell,
} from '../skin/index';
import type { GameBlockTrendMetricJson, PlayerSeasonTrendDataJson } from './data';
import { groupLabel } from './percentile-wheel';
import { baseFrame, pctOf } from './shared';

/**
 * Player › Season trend (block style): under "Per 90, vs Premier League
 * strikers each season", a column per season and a row per metric; each
 * cell the per 90 value (bold from the 50th percentile up) over a bar to
 * the percentile. Percentiles are public, values are cells. No ordinals.
 * Both views (`chart`, `rows`) draw the table.
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
  const data = props.config.data ?? {};
  const seasons = data.seasons ?? [];
  const ids = seasons.map((s) => s.seasonId ?? '');
  const metrics = (data.metrics ?? []).slice(0, 8);
  const groups = [...new Set(seasons.map((s) => s.groupPhrase).filter(Boolean))];
  const pool = groups.length === 1 ? groupLabel(groups[0], undefined) : null;
  const heading = pool
    ? `Per 90, ${pool} each season`
    : 'Per 90, each season vs the position group';
  return (
    <BlockFrame
      {...baseFrame(props, 'seasons')}
      annotate={{ target: '[data-trend-row="0"] [data-trend-cell]:last-child [data-num]' }}
    >
      {metrics.length > 0 && seasons.length > 0 ? (
        <InFrame>
          {({ narrow }) => {
            const cw = narrow ? 46 : 92;
            const cols = `minmax(0, 1fr) ${seasons.map(() => `${cw}px`).join(' ')}`;
            return (
              <Section heading={heading}>
                <Rows label="Season trend">
                  <Row cols={cols} head style={{ columnGap: 8 }}>
                    <span />
                    {seasons.map((s) => (
                      <LabelCell key={s.seasonId} small align="right">
                        {narrow ? (s.label ?? '').slice(2) : s.label}
                      </LabelCell>
                    ))}
                  </Row>
                  {metrics.map((m, i) => (
                    <Row
                      key={m.key || i}
                      cols={cols}
                      last={i === metrics.length - 1}
                      style={{ columnGap: 8 }}
                      data-trend-row={String(i)}
                    >
                      <StatCell>{m.label}</StatCell>
                      {ids.map((id) => {
                        const p = (m.points ?? []).find((x) => x.seasonId === id);
                        const pct =
                          p && p.state === 'METRIC_STATE_VALUE' ? pctOf(p.percentile) : null;
                        const high = pct !== null && pct >= 50;
                        return (
                          <span key={id} data-trend-cell="" style={{ display: 'grid', rowGap: 4 }}>
                            <span style={{ textAlign: 'right' }}>
                              <Num dim={!high} style={{ fontSize: 13.5 }}>
                                {p?.valueCell ? <GatedValue cell={p.valueCell} width={24} /> : '–'}
                              </Num>
                            </span>
                            {pct !== null ? <Bar frac={pct / 100} dim={!high} /> : <span />}
                          </span>
                        );
                      })}
                    </Row>
                  ))}
                </Rows>
              </Section>
            );
          }}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}

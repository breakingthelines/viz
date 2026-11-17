import type { CSSProperties } from 'react';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  FactRows,
  Num,
  TABULAR,
  useBlockLayout,
  useBlockScale,
  useBlockSkin,
} from '../skin/index';
import { periodShort } from '../parts/team-goal-timing';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockPeriodJson, TeamGoalTimingDataJson } from './types';

/** The period with the most goals scored; the later one on a tie. */
export function peakPeriod(periods: GameBlockPeriodJson[]): GameBlockPeriodJson | undefined {
  let best: GameBlockPeriodJson | undefined;
  for (const p of periods) {
    if ((p.goalsFor ?? 0) > 0 && (!best || (p.goalsFor ?? 0) >= (best.goalsFor ?? 0))) best = p;
  }
  return best;
}

/**
 * Team › Goal timing: goals by 15 minute period this season, scored above
 * the line in red and conceded below in ink 4, each bar with its count. The
 * side labels carry the totals ("Scored 24", "Conceded 9"): in the label
 * column on a wide block, as fact rows above the chart on a narrow one.
 */
export function TeamGoalTimingBlock(props: GameBlockComponentProps<TeamGoalTimingDataJson>) {
  const { config } = props;
  const periods = config.data?.periods ?? [];
  const peak = peakPeriod(periods);
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'goal-timing' })}
      annotate={{ target: '[data-peak] [data-goals-for]' }}
    >
      {periods.length > 0 ? <TimingChart periods={periods} peak={peak} /> : null}
    </BlockFrame>
  );
}

function TimingChart({
  periods,
  peak,
}: {
  periods: GameBlockPeriodJson[];
  peak: GameBlockPeriodJson | undefined;
}) {
  const { narrow } = useBlockLayout();
  const scale = useBlockScale();
  const skin = useBlockSkin();
  const scored = periods.reduce((n, p) => n + (p.goalsFor ?? 0), 0);
  const conceded = periods.reduce((n, p) => n + (p.goalsAgainst ?? 0), 0);
  const max = Math.max(1, ...periods.flatMap((p) => [p.goalsFor ?? 0, p.goalsAgainst ?? 0]));
  const unit = narrow ? 12 : 16;
  const H = max * unit;
  const gap = 30;
  const count: CSSProperties = {
    ...TABULAR,
    fontFamily: skin.fontSans,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center',
  };
  const side = (label: string, n: number, top: number) => (
    <div
      style={{
        position: 'absolute',
        top,
        fontFamily: skin.fontSans,
        fontSize: scale.label,
        color: 'var(--btl-block-ink-3)',
        whiteSpace: 'nowrap',
      }}
    >
      {label} <Num style={{ fontSize: scale.label }}>{n}</Num>
    </div>
  );
  return (
    <>
      {narrow ? (
        <div style={{ marginBottom: 18 }}>
          <FactRows
            rows={[
              ['Scored', <Num>{scored}</Num>],
              ['Conceded', <Num>{conceded}</Num>],
            ]}
          />
        </div>
      ) : null}
      <div style={{ display: 'flex' }}>
        {narrow ? null : (
          <div style={{ position: 'relative', width: scale.labelCol, flex: 'none' }}>
            {side('Scored', scored, H - 22)}
            {side('Conceded', conceded, H + gap + 6)}
          </div>
        )}
        <div
          role="img"
          aria-label={periods
            .map(
              (p) =>
                `${periodShort(p.label)}: ${p.goalsFor ?? 0} scored, ${p.goalsAgainst ?? 0} conceded`
            )
            .join('; ')}
          style={{ flex: 1, minWidth: 0, display: 'flex', position: 'relative' }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: H,
              height: 1,
              background: 'var(--btl-block-line-strong)',
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: H + gap,
              height: 1,
              background: 'var(--btl-block-line-strong)',
            }}
          />
          {periods.map((p, i) => {
            const f = p.goalsFor ?? 0;
            const a = p.goalsAgainst ?? 0;
            return (
              <div
                key={p.label || i}
                aria-hidden
                data-peak={p === peak ? '' : undefined}
                style={{ flex: 1, position: 'relative', height: 2 * H + gap + 24 }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '22%',
                    right: '22%',
                    top: H - f * unit - 20,
                  }}
                >
                  <div data-goals-for="" style={{ ...count, color: 'var(--btl-block-ink-1)' }}>
                    {f}
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '22%',
                    right: '22%',
                    top: H - f * unit,
                    height: f * unit,
                    background: 'var(--btl-block-subject)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: H + 7,
                    textAlign: 'center',
                    fontFamily: skin.fontSans,
                    fontSize: 12,
                    color: 'var(--btl-block-ink-4)',
                  }}
                >
                  {periodShort(p.label)}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '22%',
                    right: '22%',
                    top: H + gap,
                    height: a * unit,
                    background: 'var(--btl-block-ink-4)',
                  }}
                />
                <div
                  style={{
                    ...count,
                    position: 'absolute',
                    left: '22%',
                    right: '22%',
                    top: H + gap + a * unit + 3,
                    color: 'var(--btl-block-ink-2)',
                  }}
                >
                  {a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

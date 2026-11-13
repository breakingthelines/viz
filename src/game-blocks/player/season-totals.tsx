import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, BlockScale, GatedValue, type BlockHero } from '../skin/index';
import { useGatedCell } from '../values';
import type { GameBlockSeasonStatJson, PlayerSeasonTotalsDataJson } from './data';
import { groupLabel, lowerFirst, ordinal } from './percentile-wheel';
import { baseFrame, surname, thousands } from './shared';

/**
 * Player › Season totals. Totals, appearances, minutes and the team rank are
 * public; per 90, percentile and median are cells, drawn as the viewer's plan
 * allows. The hero is the highlighted stat's total, then his place among
 * team-mates and the next team-mate. The other stats are rows.
 */

export function pickStat(
  stats: GameBlockSeasonStatJson[],
  highlight: string | undefined
): GameBlockSeasonStatJson | undefined {
  return (highlight ? stats.find((s) => s.key === highlight) : undefined) ?? stats[0];
}

/** "Most at Arsenal", "2nd at Arsenal". Null when unranked. */
export function teamRankLabel(rank: number | undefined, team: string | undefined): string | null {
  if (!rank || !team) return null;
  return rank === 1 ? `Most at ${team}` : `${ordinal(rank)} at ${team}`;
}

function total(s: GameBlockSeasonStatJson): string {
  return s.total?.display || (typeof s.total?.value === 'number' ? String(s.total.value) : '–');
}

function cell(key: string | undefined) {
  return key ? <GatedValue cell={key} /> : '–';
}

/** The highlighted stat's percentile as a scale, median at 50 by definition. */
function PercentileScale({ cellKey }: { cellKey: string }) {
  const read = useGatedCell(cellKey);
  if (read.state === 'no-data') return null;
  if (read.state === 'value' && typeof read.value === 'number') {
    return <BlockScale size="hero" value={read.value} median={50} />;
  }
  return (
    <BlockScale
      size="hero"
      value={0}
      state={read.state === 'value' || read.state === 'pending' ? 'pending' : 'locked'}
    />
  );
}

export function PlayerSeasonTotalsBlock(
  props: GameBlockComponentProps<PlayerSeasonTotalsDataJson>
) {
  const { config } = props;
  const data = config.data ?? {};
  const stats = data.stats ?? [];
  const top = pickStat(stats, config.options.highlight);
  const rest = stats.filter((s) => s !== top);
  const hasPer90 = stats.some((s) => s.per90Cell);
  const hasPct = stats.some((s) => s.percentileCell);
  const group = groupLabel(
    config.baseline.replace(/^Against\s+/i, '').replace(/\.$/, ''),
    undefined
  );
  const teamName = data.team?.shortName || data.team?.name;

  let hero: BlockHero | undefined;
  if (top) {
    const next = data.nextTeamMate?.name
      ? `${data.nextTeamMate.shortName || surname(data.nextTeamMate.name)} ${data.nextTeamMateTotal?.display ?? ''}`.trim()
      : null;
    hero = {
      figure: total(top),
      label: lowerFirst(top.label ?? ''),
      baseline: [
        teamRankLabel(data.highlightTeamRank, teamName),
        next,
        top.percentileCell ? <GatedValue key="pct" cell={top.percentileCell} width={28} /> : null,
        top.per90Cell ? (
          <span key="p90">
            Per 90 <GatedValue cell={top.per90Cell} width={28} />
          </span>
        ) : null,
        top.medianCell ? (
          <span key="med">
            Median <GatedValue cell={top.medianCell} width={28} />
          </span>
        ) : null,
      ].filter(Boolean),
    };
  }

  const apps = [
    data.appearances ? `${data.appearances} apps` : null,
    data.minutes ? `${thousands(data.minutes)} mins` : null,
  ].filter(Boolean);

  const columns = ['', 'Total', ...(hasPer90 ? ['Per 90'] : []), ...(hasPct ? ['Pct'] : [])];
  const rows = rest.map((s) => ({
    key: s.key ?? s.label ?? '',
    label: s.label ?? '',
    cells: [
      total(s),
      ...(hasPer90 ? [cell(s.per90Cell)] : []),
      ...(hasPct ? [cell(s.percentileCell)] : []),
    ],
  }));

  return (
    <BlockFrame
      {...baseFrame(props, 'season')}
      hero={hero}
      aside={
        <>
          {top?.percentileCell ? (
            <div style={{ maxWidth: 300 }}>
              {group ? (
                <p style={{ margin: '0 0 4px', fontSize: 12.5, color: 'var(--btl-block-ink-3)' }}>
                  Percentile {group}
                </p>
              ) : null}
              <PercentileScale cellKey={top.percentileCell} />
            </div>
          ) : null}
          {apps.length > 0 ? (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 13,
                color: 'var(--btl-block-ink-3)',
                display: 'flex',
                columnGap: 14,
              }}
            >
              {apps.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </p>
          ) : null}
        </>
      }
    >
      {rows.length > 0 ? <BlockRows columns={columns} rows={rows} /> : null}
    </BlockFrame>
  );
}

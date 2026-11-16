import type { ReactNode } from 'react';
import { PercentileWheel } from '../../stats/percentile-wheel';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  BlockScale,
  GatedValue,
  TABULAR,
  useBlockLayout,
  useBlockSkin,
  useBodyFont,
  usePersonArtStatus,
  type BlockHero,
} from '../skin/index';
import type { GameBlockLook } from '../types';
import { useGatedCell } from '../values';
import type { GameBlockSeasonStatJson, PlayerSeasonTotalsDataJson } from './data';
import { lowerFirst, toStatMetric } from './percentile-wheel';
import { baseFrame } from './shared';

/**
 * Player › Season totals, the season card. One stat leads: its total, then
 * "1.02 per 90". The other stats are bars headed by the group they are
 * ranked in ("vs Serie A strikers"): the stat, its per 90 value and a bar
 * whose fill is the percentile. No ordinals, no medians, no counts, no
 * appearances line: the fill shows the standing.
 *
 * The default look is the poster. A player with no cut-out draws his wheel
 * for the same season instead, and the editorial look when there is no
 * wheel either. The `wheel` view draws the wheel whatever the look.
 */

export function pickStat(
  stats: GameBlockSeasonStatJson[],
  highlight: string | undefined
): GameBlockSeasonStatJson | undefined {
  return (highlight ? stats.find((s) => s.key === highlight) : undefined) ?? stats[0];
}

/** "Most at Arsenal", "2nd at Arsenal". Null when unranked. Kept for hosts. */
export function teamRankLabel(rank: number | undefined, team: string | undefined): string | null {
  if (!rank || !team) return null;
  if (rank === 1) return `Most at ${team}`;
  const t = rank % 100;
  const suffix =
    t >= 11 && t <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[rank % 10] ?? 'th');
  return `${rank}${suffix} at ${team}`;
}

/** The season stat each wheel metric stands for, to light the lead's slice. */
const WHEEL_KEY: Record<string, string> = {
  goals: 'npg',
  assists: 'ast',
  shots: 'shots',
  key_passes: 'key',
  dribbles: 'drs',
  tackles: 'tkl',
  interceptions: 'int',
  blocks: 'blk',
  passes: 'passes',
  pass_accuracy: 'acc',
  duels_won: 'dw',
};

/** "1.02 per 90", or "90%" for a rate. Never "Per 90 1.02". */
function Per90({ cell }: { cell: string }) {
  const read = useGatedCell(cell);
  const rate = read.state === 'value' && (read.display ?? '').endsWith('%');
  return (
    <>
      <GatedValue cell={cell} width={28} />
      {rate ? null : ' per 90'}
    </>
  );
}

/** A rate keeps no decimal ("90%"), a count two ("1.02"), a big count one ("72.7"). */
function shortValue(display: string | undefined, value: number | undefined): string {
  if (typeof value !== 'number') return display ?? '–';
  if ((display ?? '').endsWith('%')) return `${Math.round(value)}%`;
  return value >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function BarValue({ cell }: { cell: string }) {
  const read = useGatedCell(cell);
  if (read.state === 'value') return <>{shortValue(read.display, read.value)}</>;
  return <GatedValue cell={cell} width={28} />;
}

function BarFill({ cell }: { cell: string }) {
  const read = useGatedCell(cell);
  if (read.state === 'no-data') return <span />;
  if (read.state === 'value' && typeof read.value === 'number') {
    return (
      <BlockScale size="row" value={read.value} label={`${Math.round(read.value)} out of 100`} />
    );
  }
  return <BlockScale size="row" value={0} state={read.state === 'locked' ? 'locked' : 'pending'} />;
}

/** The other stats as bars: label, per 90 value, the fill. */
export function SeasonBars({
  stats,
  group,
}: {
  stats: GameBlockSeasonStatJson[];
  group: string | undefined;
}) {
  const skin = useBlockSkin();
  const { narrow, look } = useBlockLayout();
  const font = useBodyFont();
  const ranked = stats.some((s) => s.percentileCell);
  const grid = ranked
    ? `minmax(0, ${narrow ? 120 : 128}px) 52px minmax(0, 1fr)`
    : 'minmax(0, 1fr) auto';
  return (
    <div data-season-bars="" style={{ ...TABULAR, fontFamily: skin.fontSans }}>
      {ranked && group ? (
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--btl-block-ink-3)' }}>
          vs {group}
        </p>
      ) : null}
      {stats.map((s, i) => (
        <div
          key={s.key ?? s.label}
          data-season-bar={s.key}
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            columnGap: 12,
            alignItems: 'center',
            padding: look === 'editorial' ? '7px 0' : '8px 0',
            borderTop: `1px solid ${i === 0 ? 'var(--btl-block-line-strong)' : 'var(--btl-block-line)'}`,
            fontSize: 14,
            lineHeight: 1.2,
          }}
        >
          <span
            style={{
              color: 'var(--btl-block-ink-2)',
              fontFamily: look === 'editorial' ? font : undefined,
              fontSize: look === 'editorial' ? 15 : 14,
            }}
          >
            {s.label}
          </span>
          <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--btl-block-ink-1)' }}>
            {s.per90Cell ? <BarValue cell={s.per90Cell} /> : '–'}
          </span>
          {ranked ? s.percentileCell ? <BarFill cell={s.percentileCell} /> : <span /> : null}
        </div>
      ))}
    </div>
  );
}

function total(s: GameBlockSeasonStatJson): string | null {
  if (s.total?.display) return s.total.display;
  return typeof s.total?.value === 'number' ? String(s.total.value) : null;
}

export function PlayerSeasonTotalsBlock(
  props: GameBlockComponentProps<PlayerSeasonTotalsDataJson>
) {
  const { config } = props;
  const data = config.data ?? {};
  const stats = data.stats ?? [];
  const top = pickStat(stats, config.options.highlight);
  const rest = stats.filter((s) => s !== top);
  const skin = useBlockSkin();

  let hero: BlockHero | undefined;
  if (top) {
    const figure = total(top);
    hero = figure
      ? {
          figure,
          label: lowerFirst(top.label ?? ''),
          baseline: top.per90Cell ? [<Per90 key="p90" cell={top.per90Cell} />] : [],
        }
      : top.per90Cell
        ? {
            figure: <GatedValue cell={top.per90Cell} width={40} />,
            label: `${lowerFirst(top.label ?? '')} per 90`,
          }
        : undefined;
  }

  // The scope is part of the card: "Inter Milan, Serie A 2026/27".
  const base = baseFrame(props, 'season');
  // "All competitions" reads mid-line: "Inter Milan, all competitions 2026/27".
  const comp =
    config.scope.competitionLabel === 'All competitions'
      ? 'all competitions'
      : config.scope.competitionLabel;
  const scope = [comp, config.scope.seasonLabel].filter(Boolean).join(' ');
  const frame = {
    ...base,
    context: [config.subject.subtitle, scope].filter(Boolean).join(', ') || base.context,
  };
  const asked: GameBlockLook = config.look ?? 'poster';
  const art = usePersonArtStatus(asked === 'poster' ? frame.media : undefined);
  const wheel = data.wheel;
  const wheelMetrics = wheel?.metrics ?? [];

  // The wheel view (Regista's "show it as a wheel"), or a poster with no
  // cut-out: the wheel for the same season.
  const wheelView = config.options.view === 'wheel';
  if (wheelMetrics.length > 0 && (wheelView || (asked === 'poster' && art === 'none'))) {
    const families = wheel?.families ?? [];
    const familyLabel = new Map(families.map((f) => [f.key ?? '', f.label ?? f.key ?? '']));
    const focus = top?.key ? WHEEL_KEY[top.key] : undefined;
    return (
      <BlockFrame {...frame} look="editorial" hero={hero} titleFace>
        <div data-season-fallback="wheel">
          <PercentileWheel
            metrics={wheelMetrics.map((m) => toStatMetric(m, familyLabel))}
            groupOrder={families.map((f) => f.label ?? f.key ?? '')}
            ariaLabel={`${config.subject.name}, percentiles${data.groupPhrase ? ` vs ${data.groupPhrase}` : ''}`}
            focusKeys={focus ? [focus] : null}
            variant="social"
            animate={false}
            labels="short"
            surface={skin.surface}
            announce={false}
            marks={false}
          />
        </div>
      </BlockFrame>
    );
  }

  // A poster with no cut-out and no wheel draws editorial, not a crest.
  const look: GameBlockLook = asked === 'poster' && art === 'none' ? 'editorial' : asked;
  const bars: ReactNode =
    rest.length > 0 ? <SeasonBars stats={rest} group={data.groupPhrase} /> : null;
  return (
    <BlockFrame
      {...frame}
      look={look}
      media={frame.media}
      titleFace={look !== 'poster'}
      hero={hero}
    >
      {bars}
    </BlockFrame>
  );
}

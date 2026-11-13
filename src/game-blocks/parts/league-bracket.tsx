import { TABULAR, useBlockLayout, useBlockSkin, useBodyFont } from '../skin/index';
import type { GameBlockRoundJson, GameBlockTieJson } from '../league/types';
import { matchScore, refName, type GameBlockRefJson } from './team-league-match-common';
import { RefName, SectionLabel } from './team-league-match-ui';

/** Each side's goals across the legs, from the home side of the tie: [home, away]. */
function legScores(tie: GameBlockTieJson): [string, string] {
  const homeId = tie.home?.id;
  const h: string[] = [];
  const a: string[] = [];
  for (const leg of tie.legs ?? []) {
    if (!matchScore(leg)) continue;
    const flipped = !!homeId && leg.away?.team?.id === homeId;
    const hs = flipped ? leg.away?.score : leg.home?.score;
    const as = flipped ? leg.home?.score : leg.away?.score;
    h.push(String(hs ?? ''));
    a.push(String(as ?? ''));
  }
  return [h.join(' '), a.join(' ')];
}

function TieSide({
  team,
  goals,
  winner,
  decided,
}: {
  team: GameBlockRefJson | undefined;
  goals: string;
  winner: boolean;
  decided: boolean;
}) {
  return (
    <div
      data-tie-winner={winner ? '' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        columnGap: 8,
        alignItems: 'baseline',
        paddingLeft: 8,
        boxShadow: winner ? 'inset 2px 0 0 var(--btl-block-subject)' : undefined,
        fontWeight: winner ? 700 : 400,
        color: winner
          ? 'var(--btl-block-ink-1)'
          : decided
            ? 'var(--btl-block-ink-3)'
            : 'var(--btl-block-ink-2)',
      }}
    >
      <span
        style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {team ? <RefName value={team} short /> : 'To be decided'}
      </span>
      <span>{goals}</span>
    </div>
  );
}

function Tie({ tie }: { tie: GameBlockTieJson }) {
  const skin = useBlockSkin();
  const [h, a] = legScores(tie);
  const winnerId = tie.winner?.id || refName(tie.winner);
  const decided = !!winnerId;
  const is = (t: GameBlockRefJson | undefined) =>
    decided && !!t && (t.id ? t.id === tie.winner?.id : refName(t) === refName(tie.winner));
  return (
    <div role="listitem" style={{ padding: '6px 0', borderTop: '1px solid var(--btl-block-line)' }}>
      <TieSide team={tie.home} goals={h} winner={is(tie.home)} decided={decided} />
      <TieSide team={tie.away} goals={a} winner={is(tie.away)} decided={decided} />
      {tie.aggregate ? (
        <p
          style={{
            margin: '2px 0 0 8px',
            fontFamily: skin.fontSans,
            fontSize: 12,
            color: 'var(--btl-block-ink-3)',
          }}
        >
          {tie.aggregate}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Knockout rounds from the chosen one: side by side on a wide block, stacked
 * at phone width, never a scroller (a saved image has to show every round).
 * The side that went through carries the red rule.
 */
export function KnockoutBracket({ rounds }: { rounds: GameBlockRoundJson[] }) {
  const { narrow } = useBlockLayout();
  const font = useBodyFont();
  const cols = Math.min(4, Math.max(1, rounds.length));
  return (
    <div
      style={{
        ...TABULAR,
        fontFamily: font,
        fontSize: 14,
        lineHeight: 1.35,
        display: narrow ? 'block' : 'grid',
        gridTemplateColumns: narrow ? undefined : `repeat(${cols}, minmax(0, 1fr))`,
        columnGap: 18,
        rowGap: 8,
      }}
    >
      {rounds.map((r, i) => (
        <section key={r.label ?? i} aria-label={r.label}>
          <SectionLabel first={!narrow || i === 0}>{r.label}</SectionLabel>
          <div role="list">
            {(r.ties ?? []).map((t, j) => (
              <Tie key={j} tie={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

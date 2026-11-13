import {
  formatDay,
  isPlayed,
  kickoffParts,
  matchScore,
  penaltiesNote,
  statusLabel,
  type GameBlockMatchJson,
} from './team-league-match-common';
import { BlockGrid, RefName, SectionLabel } from './team-league-match-ui';

/** The middle of a fixture row: the score once played, else the kick-off time or status. */
export function fixtureMiddle(m: GameBlockMatchJson): string {
  if (isPlayed(m.status)) {
    const score = matchScore(m);
    const pens = penaltiesNote(m);
    return pens ? `${score} (${pens})` : score;
  }
  const status = statusLabel(m.status);
  if (status) return status;
  return kickoffParts(m.kickoff)?.time ?? '';
}

/** Games grouped by London day, in the order given. */
export function groupByDay(games: GameBlockMatchJson[]): [string, GameBlockMatchJson[]][] {
  const out = new Map<string, GameBlockMatchJson[]>();
  for (const g of games) {
    const day = kickoffParts(g.kickoff)?.day ?? '';
    out.set(day, [...(out.get(day) ?? []), g]);
  }
  return [...out.entries()];
}

/** Fixtures or results under each day: home, score or time, away. */
export function FixtureList({ games }: { games: GameBlockMatchJson[] }) {
  const days = groupByDay(games);
  return (
    <div>
      {days.map(([day, list], di) => (
        <section key={day || di}>
          {day ? <SectionLabel first={di === 0}>{formatDay(day)}</SectionLabel> : null}
          <BlockGrid
            label={day ? formatDay(day) : 'Fixtures'}
            columns={[
              { label: '', align: 'right', width: 'minmax(0, 1fr)' },
              { label: '', align: 'center', width: 'minmax(48px, auto)', strong: true },
              { label: '', align: 'left', width: 'minmax(0, 1fr)' },
            ]}
            rows={list.map((g, i) => ({
              key: g.gameId || String(i),
              cells: [
                <RefName value={g.home?.team} short />,
                fixtureMiddle(g),
                <RefName value={g.away?.team} short />,
              ],
            }))}
          />
        </section>
      ))}
    </div>
  );
}

import {
  RESULT_LETTER,
  formatDay,
  venueLetter,
  type GameBlockTeamMatchJson,
} from './team-league-match-common';
import { BlockGrid, RefName, ResultStrip } from './team-league-match-ui';

/** A team's recent matches, newest first, with the result strip oldest first above. */
export function TeamFormRows({ matches }: { matches: GameBlockTeamMatchJson[] }) {
  const letters = [...matches]
    .reverse()
    .map((m) => RESULT_LETTER[m.result ?? 'GAME_BLOCK_RESULT_UNSPECIFIED'] ?? '');
  return (
    <div>
      <ResultStrip results={letters} />
      <div style={{ marginTop: 12 }}>
        <BlockGrid
          label="Recent matches"
          columns={[
            { label: '' },
            { label: '', align: 'center', width: '20px' },
            { label: 'Score', strong: true },
            { label: '', align: 'center', width: '18px' },
            { label: 'Date', wide: true },
          ]}
          rows={matches.map((m, i) => ({
            key: m.gameId || String(i),
            cells: [
              <RefName value={m.opponent} short />,
              venueLetter(m.venue),
              m.score ?? '',
              RESULT_LETTER[m.result ?? 'GAME_BLOCK_RESULT_UNSPECIFIED'] ?? '',
              formatDay(m.date),
            ],
          }))}
        />
      </div>
    </div>
  );
}

import type { GameBlockMatchEventJson, GameBlockMatchEventKindJson } from '../match/types';
import { refName, type GameBlockMatchJson } from './team-league-match-common';
import { BlockGrid } from './team-league-match-ui';

export const EVENT_LABEL: Record<GameBlockMatchEventKindJson, string> = {
  KIND_UNSPECIFIED: '',
  KIND_GOAL: 'Goal',
  KIND_OWN_GOAL: 'Own goal',
  KIND_PENALTY_GOAL: 'Penalty',
  KIND_MISSED_PENALTY: 'Missed penalty',
  KIND_YELLOW_CARD: 'Yellow card',
  KIND_RED_CARD: 'Red card',
  KIND_SUBSTITUTION: 'Substitution',
  KIND_VAR: 'VAR',
};

const GOALS = new Set<GameBlockMatchEventKindJson | undefined>([
  'KIND_GOAL',
  'KIND_OWN_GOAL',
  'KIND_PENALTY_GOAL',
]);

/** "Saka", "Martinelli for Trossard", "Saka, assist Ødegaard". */
export function eventWho(e: GameBlockMatchEventJson): string {
  const who = refName(e.player, true) || refName(e.player);
  const other = refName(e.relatedPlayer, true) || refName(e.relatedPlayer);
  if (!other) return who;
  if (e.kind === 'KIND_SUBSTITUTION') return `${who} for ${other}`;
  if (GOALS.has(e.kind)) return `${who}, assist ${other}`;
  return who;
}

/**
 * Events in order: minute, what happened, who, and the side. Goals carry the
 * red rule, the subject of a match.
 */
export function TimelineRows({
  events,
  match,
}: {
  events: GameBlockMatchEventJson[];
  match?: GameBlockMatchJson;
}) {
  const home = refName(match?.home?.team, true);
  const away = refName(match?.away?.team, true);
  return (
    <BlockGrid
      label="Timeline"
      columns={[
        { label: '', align: 'right', width: '40px' },
        { label: '', align: 'left', width: 'minmax(0, auto)' },
        { label: '', align: 'left', width: 'minmax(0, 1fr)' },
        { label: '', align: 'right', wide: true },
      ]}
      rows={events.map((e, i) => {
        const goal = GOALS.has(e.kind);
        const what = EVENT_LABEL[e.kind ?? 'KIND_UNSPECIFIED'] ?? '';
        return {
          key: `${e.minute ?? ''}-${i}`,
          subject: goal,
          cells: [
            `${e.minute ?? ''}'`,
            e.detail && !goal ? `${what}, ${e.detail.toLowerCase()}` : what,
            eventWho(e),
            e.side === 'GAME_BLOCK_SIDE_HOME'
              ? home
              : e.side === 'GAME_BLOCK_SIDE_AWAY'
                ? away
                : '',
          ],
        };
      })}
    />
  );
}

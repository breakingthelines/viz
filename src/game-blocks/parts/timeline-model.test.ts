import { describe, expect, it } from 'vitest';
import type { GameBlockMatchEventJson, MatchTimelineDataJson } from '../match/types';
import { howLine, parseMinute, timelineModel } from './timeline-model';

const H = 'GAME_BLOCK_SIDE_HOME' as const;
const A = 'GAME_BLOCK_SIDE_AWAY' as const;
const ev = (
  minute: string,
  kind: GameBlockMatchEventJson['kind'],
  side: typeof H | typeof A,
  player?: string,
  related?: string,
  detail?: string
): GameBlockMatchEventJson => ({
  minute,
  kind,
  side,
  player: player ? { id: player, name: player } : undefined,
  relatedPlayer: related ? { id: related, name: related } : undefined,
  detail,
});
const data = (events: GameBlockMatchEventJson[], h: number, a: number): MatchTimelineDataJson => ({
  match: {
    home: { team: { id: 'h', name: 'Brentford F.C.' }, score: h },
    away: { team: { id: 'a', name: 'Liverpool F.C.' }, score: a },
  },
  events,
});

describe('timeline model', () => {
  it('sorts stoppage time by its added minute and keeps the running score', () => {
    const m = timelineModel(
      data(
        [
          ev('90+6', 'KIND_GOAL', H, 'Patrick Dorgu', 'Bruno Fernandes'),
          ev('90+2', 'KIND_GOAL', H, 'Joshua Zirkzee', 'Patrick Dorgu'),
          ev('1', 'KIND_GOAL', A, 'Alysson'),
        ],
        2,
        1
      )
    );
    expect(m.rows.map((r) => r.minute)).toEqual(['1', '90+2', '90+6']);
    expect(m.rows.map((r) => r.score?.join('-'))).toEqual(['0-1', '1-1', '2-1']);
    expect(m.reach).toEqual([0, 6]);
    expect(parseMinute('45+8')).toEqual({ base: 45, added: 8 });
  });

  it('keeps goals and red cards only; folds a yellow and a red into a second yellow', () => {
    const m = timelineModel(
      data(
        [
          ev('30', 'KIND_YELLOW_CARD', H, 'Kevin Schade'),
          ev('60', 'KIND_SUBSTITUTION', A, 'Isak', 'Ekitike'),
          ev('62', 'KIND_VAR', A),
          ev('90+2', 'KIND_YELLOW_CARD', H, 'Vitaly Janelt'),
          ev('90+2', 'KIND_RED_CARD', H, 'Vitaly Janelt'),
          ev('45+8', 'KIND_RED_CARD', H, 'Mikkel Damsgaard', undefined, 'Second yellow'),
        ],
        0,
        0
      )
    );
    expect(m.rows.map((r) => `${r.kind} ${howLine(r)}`)).toEqual([
      'red Second yellow',
      'red Second yellow',
    ]);
  });

  it('drops bench cards, duplicates, self-assists and assists on own goals', () => {
    const m = timelineModel(
      data(
        [
          ev('20', 'KIND_RED_CARD', H, 'Brentford F.C.'),
          ev('34', 'KIND_OWN_GOAL', A, 'Jair Cunha', 'Morato'),
          ev('50', 'KIND_GOAL', H, 'Nicolas Jackson', 'Nicolas Jackson'),
          ev('50', 'KIND_GOAL', H, 'Nicolas Jackson', 'Nicolas Jackson'),
        ],
        1,
        1
      )
    );
    expect(m.rows).toHaveLength(2);
    expect(howLine(m.rows[0]!)).toBe('Own goal');
    expect(m.rows[0]!.assist).toBeUndefined();
    expect(howLine(m.rows[1]!)).toBe('');
  });

  it('drops a scorer-less goal ruled out by VAR when the goals outrun the score', () => {
    const m = timelineModel(
      data(
        [
          ev('41', 'KIND_GOAL', A, 'Liverpool F.C.'),
          ev('41', 'KIND_VAR', A),
          ev('62', 'KIND_GOAL', A, 'Hugo Ekitike', 'Florian Wirtz'),
        ],
        0,
        1
      )
    );
    expect(m.rows).toHaveLength(1);
    expect(m.rows[0]!.score).toEqual([0, 1]);
    expect(howLine(m.rows[0]!)).toBe('Assist Wirtz');
  });

  it('names a player by the short name identity gives', () => {
    const m = timelineModel(
      data(
        [
          {
            ...ev('40', 'KIND_RED_CARD', H, 'João Victor Gomes da Silva'),
            player: { id: 'j', name: 'João Victor Gomes da Silva', shortName: 'João Gomes' },
          },
        ],
        0,
        0
      )
    );
    expect(m.rows[0]!.player?.shortName).toBe('João Gomes');
  });
});

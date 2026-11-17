import { describe, expect, it } from 'vitest';
import type { GameBlockMatchEventJson, MatchTimelineDataJson } from '../match/types';
import { SHOOTOUT_DETAIL, howLine, parseMinute, shortName, timelineModel } from './timeline-model';

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

/**
 * Argentina 3-3 France, the 2022 World Cup final, won 4-2 on penalties, as
 * game-service stores it: the kicks are penalty goals and missed penalties
 * stamped 120+1' to 120+8', Montiel's winner (120+8') fed first.
 */
const WORLD_CUP_FINAL: MatchTimelineDataJson = {
  match: {
    home: { team: { id: 'arg', name: 'Argentina' }, score: 3, penalties: 4 },
    away: { team: { id: 'fra', name: 'France' }, score: 3, penalties: 2 },
  },
  events: [
    ev('23', 'KIND_PENALTY_GOAL', H, 'Lionel Messi'),
    ev('36', 'KIND_GOAL', H, 'Ángel Di María', 'Alexis Mac Allister'),
    ev('80', 'KIND_PENALTY_GOAL', A, 'Kylian Mbappé'),
    ev('81', 'KIND_GOAL', A, 'Kylian Mbappé', 'Marcus Thuram'),
    ev('108', 'KIND_GOAL', H, 'Lionel Messi'),
    ev('118', 'KIND_PENALTY_GOAL', A, 'Kylian Mbappé'),
    ev('120+8', 'KIND_PENALTY_GOAL', H, 'Gonzalo Montiel'),
    ev('120+1', 'KIND_PENALTY_GOAL', A, 'Kylian Mbappé'),
    ev('120+2', 'KIND_PENALTY_GOAL', H, 'Lionel Messi'),
    ev('120+3', 'KIND_MISSED_PENALTY', A, 'Kingsley Coman'),
    ev('120+4', 'KIND_PENALTY_GOAL', H, 'Paulo Dybala'),
    ev('120+5', 'KIND_MISSED_PENALTY', A, 'Aurélien Tchouaméni'),
    ev('120+6', 'KIND_PENALTY_GOAL', H, 'Leandro Paredes'),
    ev('120+7', 'KIND_PENALTY_GOAL', A, 'Randal Kolo Muani'),
  ],
};

describe('penalty shootout', () => {
  it('lists the kicks in order with the running shootout score', () => {
    const m = timelineModel(WORLD_CUP_FINAL);
    expect(m.shootout.map((k) => [k.order, k.player?.name, k.scored, k.score.join('-')])).toEqual([
      [1, 'Kylian Mbappé', true, '0-1'],
      [2, 'Lionel Messi', true, '1-1'],
      [3, 'Kingsley Coman', false, '1-1'],
      [4, 'Paulo Dybala', true, '2-1'],
      [5, 'Aurélien Tchouaméni', false, '2-1'],
      [6, 'Leandro Paredes', true, '3-1'],
      [7, 'Randal Kolo Muani', true, '3-2'],
      [8, 'Gonzalo Montiel', true, '4-2'],
    ]);
  });

  it('keeps the kicks out of the rows, the match score and the stoppage reach', () => {
    const m = timelineModel(WORLD_CUP_FINAL);
    expect(m.rows.map((r) => r.minute)).toEqual(['23', '36', '80', '81', '108', '118']);
    expect(m.rows.map((r) => r.score?.join('-'))).toEqual([
      '1-0',
      '2-0',
      '2-1',
      '2-2',
      '3-2',
      '3-3',
    ]);
    expect(m.reach).toEqual([0, 0]);
    expect(m.extraTime).toBe(true);
  });

  it('keeps an extra time penalty at 118 a goal', () => {
    const m = timelineModel(WORLD_CUP_FINAL);
    expect(m.rows[5]).toMatchObject({ kind: 'pen', minute: '118', phase: 4 });
  });

  it('reads kicks the feed marks as shootout, whatever the minute', () => {
    const m = timelineModel(
      data(
        [
          ev('120', 'KIND_PENALTY_GOAL', H, 'A', undefined, 'Penalty shootout'),
          ev('120', 'KIND_MISSED_PENALTY', A, 'B', undefined, 'Penalty shootout'),
          ev('120', 'KIND_PENALTY_GOAL', A, 'C'),
        ],
        0,
        1
      )
    );
    expect(m.shootout.map((k) => k.player?.name)).toEqual(['A', 'B']);
    expect(m.rows.map((r) => r.score?.join('-'))).toEqual(['0-1']);
  });

  it('reads the final as game-service now marks it, kicks by the mark', () => {
    const marked: MatchTimelineDataJson = {
      ...WORLD_CUP_FINAL,
      events: WORLD_CUP_FINAL.events!.map((e) =>
        e.minute?.startsWith('120+') ? { ...e, detail: SHOOTOUT_DETAIL } : e
      ),
    };
    const m = timelineModel(marked);
    expect(m.shootout.map((k) => [k.player?.name, k.score.join('-')])).toEqual(
      timelineModel(WORLD_CUP_FINAL).shootout.map((k) => [k.player?.name, k.score.join('-')])
    );
    expect(m.rows.map((r) => r.score?.join('-'))).toEqual([
      '1-0',
      '2-0',
      '2-1',
      '2-2',
      '3-2',
      '3-3',
    ]);
  });

  it('keeps an unmarked penalty a goal once kicks carry the mark', () => {
    const m = timelineModel({
      match: {
        home: { team: { id: 'h', name: 'Home' }, score: 1, penalties: 1 },
        away: { team: { id: 'a', name: 'Away' }, score: 0, penalties: 0 },
      },
      events: [
        ev('120+1', 'KIND_PENALTY_GOAL', H, 'In play'),
        ev('120+3', 'KIND_PENALTY_GOAL', H, 'Kick', undefined, SHOOTOUT_DETAIL),
      ],
    });
    expect(m.rows.map((r) => r.player?.name)).toEqual(['In play']);
    expect(m.shootout.map((k) => k.player?.name)).toEqual(['Kick']);
  });

  it('never takes a marked card or goal kind as a kick', () => {
    const m = timelineModel(
      data([ev('120+2', 'KIND_YELLOW_CARD', H, 'Booked', undefined, SHOOTOUT_DETAIL)], 0, 0)
    );
    expect(m.shootout).toEqual([]);
  });

  it('has no shootout without a shootout score', () => {
    const m = timelineModel(data([ev('120+1', 'KIND_PENALTY_GOAL', H, 'A')], 1, 0));
    expect(m.shootout).toEqual([]);
    expect(m.rows).toHaveLength(1);
  });

  it('names compound surnames whole, the assist line too', () => {
    const m = timelineModel(WORLD_CUP_FINAL);
    expect(shortName(m.rows[1]!.player)).toBe('Di María');
    expect(howLine(m.rows[1]!)).toBe('Assist Mac Allister');
  });
});

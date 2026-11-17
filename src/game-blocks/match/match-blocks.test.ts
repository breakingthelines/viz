import { askedLook } from '../fixtures/look';
import { describe, expect, it } from 'vitest';
import { gameBlockEntry } from '../registry';
import type { GameBlockLook, GameBlockTypeId } from '../types';
import { matchHero } from '../parts/match-common';
import { scorerRuns } from '../parts/match-board';
import { eventWho } from '../parts/match-timeline';
import { topGraded } from '../parts/match-fan-grades';
import {
  formatDay,
  gradeToScale,
  kickoffParts,
  matchTitle,
} from '../parts/team-league-match-common';
import type { GameBlockPlayerGradeJson } from '../parts/team-league-match-common';
import { config, copyProblems, render, text } from '../parts/team-league-match-test-kit';
import type { MatchFanGradesDataJson, MatchPlayerOfTheMatchDataJson } from './types';

const MATCH_TYPES: GameBlockTypeId[] = [
  'match-stats',
  'match-result',
  'match-timeline',
  'match-fan-grades',
  'match-player-of-the-match',
  'match-predictions',
  'match-missing-players',
];

describe('match blocks', () => {
  it('registers a component for every type', () => {
    for (const id of MATCH_TYPES) expect(gameBlockEntry(id)?.component, id).toBeDefined();
  });

  it('draws every type in every look with the BTL colophon and clean copy', () => {
    for (const id of MATCH_TYPES) {
      for (const look of ['editorial', 'poster', 'annotated'] as GameBlockLook[]) {
        const html = render(config(id, { look }));
        expect(askedLook(html), id).toBe(look);
        expect(html, id).toContain('aria-label="Breaking The Lines"');
        expect(copyProblems(html), `${id} ${look}`).toEqual([]);
        expect(text(html), id).not.toContain('BTL readers');
      }
    }
  });

  it('titles a match "Home v Away" with the competition and date as context', () => {
    const t = text(render(config('match-stats')));
    expect(t).toContain('Arsenal v Liverpool');
  });

  it('stats: each stat as two bars from the centre under the clubs, no score', () => {
    const html = render(config('match-stats'));
    const t = text(html);
    expect(t).not.toContain('full time');
    expect(t).toContain('Expected goals');
    expect(html.match(/data-stat-row=/g)?.length).toBe(6);
  });

  it('result: the score, scorers mirrored under their side, two quiet lines', () => {
    const html = render(config('match-result'));
    const t = text(html);
    expect(html).toContain('data-score-board');
    expect(t).toContain("Saka 23', 67' pen");
    expect(t).toContain("Salah 88'");
    expect(html.match(/data-quiet-lines/g)?.length).toBe(1);
    expect(t).not.toContain('Premier League:');
    expect(
      scorerRuns(
        [
          {
            player: { name: 'Jair Cunha' },
            side: 'GAME_BLOCK_SIDE_AWAY',
            minute: '34',
            detail: 'og',
          },
          { player: { name: 'Tom Barry' }, side: 'GAME_BLOCK_SIDE_AWAY', minute: '56' },
          { player: { name: 'Tom Barry' }, side: 'GAME_BLOCK_SIDE_AWAY', minute: '61' },
        ],
        'GAME_BLOCK_SIDE_AWAY'
      )
    ).toEqual(["Cunha 34' og", "Barry 56', 61'"]);
  });

  it('timeline: events in order with assists and substitutions named', () => {
    const html = render(config('match-timeline'));
    const t = text(html);
    expect(t).toContain('Saka, assist Ødegaard');
    expect(t).toContain('Martinelli for Trossard');
    expect(t).toContain("90+3'");
    expect(t).toContain('Yellow card, foul');
    expect(html.match(/data-grid-subject/g)?.length).toBe(3);
    expect(
      eventWho({ kind: 'KIND_RED_CARD', player: { name: 'X' }, relatedPlayer: { name: 'Y' } })
    ).toBe('X');
  });

  it('fan grades: each side a section of rows on the 1 to 6 scale, no hero or tick', () => {
    for (const view of ['pitch', 'list']) {
      const html = render(config('match-fan-grades', { options: { view } }));
      const t = text(html);
      expect(t, view).toContain('Arsenal, fan grade, 1 is best');
      expect(t, view).toContain('Liverpool, fan grade, 1 is best');
      expect(t, view).not.toContain('best grade');
      expect(html, view).toContain('aria-label="Grade 1.3 of 6, 1 is best"');
      expect(html, view).not.toContain('data-scale-median');
    }
  });

  it('fan grades: lower is better on the scale and in the ranking', () => {
    expect(gradeToScale(1)).toBe(100);
    expect(gradeToScale(6)).toBe(0);
    expect(gradeToScale(3.5)).toBe(50);
    expect(gradeToScale(1.5)).toBeGreaterThan(gradeToScale(2.5));
    const p = (name: string, grade?: number) => ({ player: { name }, grade });
    expect(topGraded([p('A', 2.4), p('B', 1.6), p('C'), p('D', 4.8)])?.player?.name).toBe('B');
    expect(topGraded([p('A', 2), p('B', 2)])?.player?.name).toBe('A');
    expect(topGraded([p('A')])).toBeUndefined();
  });

  it('fan grades, one vote: "1 vote", and a side nobody graded has no header', () => {
    for (const view of ['pitch', 'list']) {
      const c = config('match-fan-grades', { options: { view } });
      const data = c.data as MatchFanGradesDataJson;
      const ungraded = (p: GameBlockPlayerGradeJson) => ({ ...p, grade: undefined, votes: 0 });
      const t = text(
        render({
          ...c,
          data: {
            ...data,
            home: (data.home ?? []).map(ungraded),
            away: (data.away ?? []).map((p, i) =>
              i === 0 ? { ...p, grade: 3, votes: 1 } : ungraded(p)
            ),
            homeAverage: undefined,
            awayAverage: 3,
          },
        })
      );
      expect(t, view).not.toContain('1 votes');
      expect(t, view).not.toContain('Arsenal, fan grade');
      expect(t, view).toContain('Liverpool, fan grade, 1 is best');
    }
  });

  it('player of the match, one vote: "1 vote"', () => {
    const c = config('match-player-of-the-match');
    const data = c.data as MatchPlayerOfTheMatchDataJson;
    const t = text(render({ ...c, data: { ...data, winner: { ...data.winner, votes: 1 } } }));
    expect(t).not.toContain('1 votes');
  });

  it('player of the match: titled by name, the grade on the scale, club and votes', () => {
    const html = render(config('match-player-of-the-match'));
    const t = text(html);
    expect(t).toMatch(/^Bukayo Saka 1\.3 fan grade, 1 is best/);
    expect(t).toContain('Club: Arsenal');
    expect(t).toContain('Votes: 1,204');
    expect(html).toContain('aria-label="Grade 1.3 of 6, 1 is best"');
  });

  it('predictions: the most backed outcome and the result once played', () => {
    const t = text(render(config('match-predictions')));
    expect(t).toContain('Arsenal win 58%');
    expect(t).toContain('Draw');
    expect(t).toMatch(/Most picked: 2-1 ?, 17%/);
    expect(t).toContain('Readers: 3,410');
    expect(t).toContain('Result: 2-1');
  });

  it('missing players: each side as a section, reasons, doubtful noted', () => {
    const t = text(render(config('match-missing-players')));
    expect(t).toContain('Arsenal v Brentford');
    expect(t).not.toContain('2 out');
    expect(t).toContain('Calf, doubtful');
  });

  it('formats kick-offs in London time and the hero before kick-off', () => {
    expect(kickoffParts('2026-07-01T14:00:00Z')).toEqual({ day: '2026-07-01', time: '15:00' });
    expect(kickoffParts('2026-11-21T15:00:00Z')?.time).toBe('15:00');
    expect(formatDay('2026-10-25')).toBe('25 Oct 2026');
    expect(formatDay('2019-12')).toBe('Dec 2019');
    expect(
      matchHero({ status: 'GAME_BLOCK_MATCH_STATUS_SCHEDULED', kickoff: '2026-11-21T15:00:00Z' })
    ).toEqual({ figure: '15:00', label: 'kick-off' });
    expect(matchHero({ status: 'GAME_BLOCK_MATCH_STATUS_POSTPONED' })).toBeUndefined();
    expect(matchTitle({ home: { team: { name: 'A' } }, away: { team: { name: 'B' } } })).toBe(
      'A v B'
    );
  });
});

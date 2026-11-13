import { describe, expect, it } from 'vitest';
import { gameBlockEntry } from '../registry';
import type { GameBlockLook, GameBlockTypeId } from '../types';
import { matchHero } from '../parts/match-common';
import { scorerLines } from '../parts/match-scorers';
import { eventWho } from '../parts/match-timeline';
import { topGraded } from '../parts/match-fan-grades';
import {
  formatDay,
  gradeToScale,
  kickoffParts,
  matchTitle,
} from '../parts/team-league-match-common';
import { config, copyProblems, render, text } from '../parts/team-league-match-test-kit';

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
        expect(html, id).toContain(`data-game-block-look="${look}"`);
        expect(html, id).toContain('aria-label="Breaking The Lines"');
        expect(copyProblems(html), `${id} ${look}`).toEqual([]);
        expect(text(html), id).not.toContain('BTL readers');
      }
    }
  });

  it('titles a match "Home v Away" with the competition and date as context', () => {
    const t = text(render(config('match-stats')));
    expect(t).toContain('Arsenal v Liverpool');
    expect(t).toContain('Premier League, Matchday 9, 25 Oct 2026');
  });

  it('stats: the score as the hero, each stat as a split bar', () => {
    const html = render(config('match-stats'));
    const t = text(html);
    expect(t).toContain('2-1 full time');
    expect(t).toContain('Expected goals');
    expect(html).toContain('data-split="73"');
    expect(html.match(/data-split=/g)?.length).toBe(6);
  });

  it('result: scorers grouped per player under their side', () => {
    const t = text(render(config('match-result')));
    expect(t).toContain("Saka 23', 67' pen");
    expect(t).toContain("Salah 88'");
    expect(
      scorerLines(
        [{ player: { name: 'A' }, side: 'GAME_BLOCK_SIDE_AWAY', minute: '5', detail: 'og' }],
        'GAME_BLOCK_SIDE_AWAY'
      )
    ).toEqual(["A 5' og"]);
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

  it('fan grades: the best (lowest) grade as the hero, both sides in formation', () => {
    const html = render(config('match-fan-grades'));
    const t = text(html);
    expect(t).toContain('1.3 best grade, Saka');
    expect(t).toContain('Arsenal, 4-3-3, average 2.2');
    expect(t).toContain('Liverpool, 4-2-3-1, average 2.9');
    expect(html.match(/data-top-grade/g)?.length).toBe(1);
    expect(t).toContain('Martinelli 2.5');
  });

  it('fan grades, list view: best grade first, on the 1 to 6 scale with the average as the tick', () => {
    const html = render(config('match-fan-grades', { options: { view: 'list' } }));
    expect(html).not.toContain('data-top-grade');
    expect(html.match(/data-scale-median/g)?.length).toBe(23);
    expect(html).toContain('aria-label="Grade 1.3 of 6, 1 is best"');
    expect(html).not.toContain('out of 100');
    const t = text(html);
    const list = t.slice(t.indexOf('average 2.2'));
    expect(list.indexOf('Saka')).toBeGreaterThan(-1);
    expect(list.indexOf('Saka')).toBeLessThan(list.indexOf('Rice'));
    expect(list.indexOf('Salah')).toBeLessThan(list.indexOf('Kerkez'));
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

  it('player of the match: his grade, name and the runner-up as the comparator', () => {
    const html = render(config('match-player-of-the-match'));
    const t = text(html);
    expect(t).toContain('1.3 Bukayo Saka');
    expect(t).toContain('912 votes');
    expect(t).toContain('Runner-up Rice 1.8');
    expect(html).toContain('data-scale-comparator');
    expect(html).toContain('aria-label="Grade 1.3 of 6, 1 is best"');
  });

  it('predictions: the most backed outcome and the result once played', () => {
    const t = text(render(config('match-predictions')));
    expect(t).toContain('58% backed Arsenal');
    expect(t).toContain('Most picked 2-1, 17%');
    expect(t).toContain('3,410 readers');
    expect(t).toContain('Result 2-1');
    expect(t).toContain('Draw');
  });

  it('missing players: each side with its count, reasons, doubtful noted', () => {
    const t = text(render(config('match-missing-players')));
    expect(t).toContain('Arsenal v Brentford');
    expect(t).toContain('Arsenal, 2 out');
    expect(t).toContain('Brentford, 3 out');
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

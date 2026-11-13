import { describe, expect, it } from 'vitest';
import { gameBlockEntry } from '../registry';
import type { GameBlockLook, GameBlockTypeId } from '../types';
import { periodShort } from '../parts/team-goal-timing';
import { groupHonours } from '../parts/team-honours';
import { tenureYears } from '../parts/team-manager-tenures';
import { pickTeamStat } from '../parts/team-season-stats';
import { config, copyProblems, render, text } from '../parts/team-league-match-test-kit';
import { peakPeriod } from './goal-timing';
import type { GameBlockTeamStatJson } from './types';
import { askedLook } from '../fixtures/look';

const TEAM_TYPES: GameBlockTypeId[] = [
  'team-season-totals',
  'team-form',
  'team-goal-timing',
  'team-squad',
  'team-out-and-doubtful',
  'team-transfers',
  'team-honours',
  'manager-record',
];

describe('team and manager blocks', () => {
  it('registers a component for every type', () => {
    for (const id of TEAM_TYPES) expect(gameBlockEntry(id)?.component, id).toBeDefined();
  });

  it('draws every type in every look with the BTL colophon and clean copy', () => {
    for (const id of TEAM_TYPES) {
      for (const look of ['editorial', 'poster', 'annotated'] as GameBlockLook[]) {
        const html = render(config(id, { look }));
        expect(askedLook(html), id).toBe(look);
        expect(html, id).toContain('aria-label="Breaking The Lines"');
        expect(copyProblems(html), `${id} ${look}`).toEqual([]);
        expect(html, id).not.toContain('data-block-locked-note');
        expect(html, id).not.toContain('Update to see this block');
      }
    }
  });

  it('titles the block with the subject name by default, and the author title when set', () => {
    expect(text(render(config('team-form')))).toContain('Arsenal');
    const t = text(render(config('team-form', { title: 'Arsenal go top', titleOrigin: 'author' })));
    expect(t).toContain('Arsenal go top');
  });

  it('season totals: the highlight as the hero with rank and median labels', () => {
    const t = text(render(config('team-season-totals')));
    expect(t).toContain('9 goals conceded');
    expect(t).toContain('1st of 20');
    expect(t).toContain('Median 17');
    expect(t).toContain('Premier League, 2025/26, 12 played');
    expect(t).toContain('Clean sheets');
  });

  it('season totals: without a highlight, the first stat the team leads', () => {
    const stats: GameBlockTeamStatJson[] = [
      { key: 'a', leagueRank: 3 },
      { key: 'b', leagueRank: 1 },
    ];
    expect(pickTeamStat(stats, undefined)?.key).toBe('b');
    expect(pickTeamStat(stats, 'a')?.key).toBe('a');
    expect(pickTeamStat([], undefined)).toBeUndefined();
  });

  it('form: points per game over the window and the result strip oldest first', () => {
    const html = render(config('team-form'));
    const t = text(html);
    expect(t).toContain('2.3 points per game, last 6');
    expect(t).toContain('Season 2.4');
    const strip = [...html.matchAll(/data-result="([WDL])"/g)].map((m) => m[1]).join('');
    expect(strip).toBe('LWDWWW');
  });

  it('goal timing: the peak period as the hero, both columns per period', () => {
    const html = render(config('team-goal-timing'));
    const t = text(html);
    expect(t).toContain('goals scored, minutes 76-90');
    expect(t).toContain('Conceded 1');
    expect(html.match(/data-goal-bar="for"/g)?.length).toBe(6);
    expect(html.match(/data-goal-bar="against"/g)?.length).toBe(6);
    expect(periodShort('0 to 15')).toBe('0-15');
    expect(peakPeriod([{ goalsFor: 2 }, { goalsFor: 2, label: 'late' }])?.label).toBe('late');
    expect(peakPeriod([{ goalsFor: 0 }])).toBeUndefined();
  });

  it('squad: grouped by position with a count in the context', () => {
    const t = text(render(config('team-squad')));
    expect(t).toContain('Goalkeepers');
    expect(t).toContain('Forwards');
    expect(t).toContain('15 players');
  });

  it('out and doubtful: counts out and doubtful, dated context', () => {
    const t = text(render(config('team-out-and-doubtful')));
    expect(t).toContain('2 out');
    expect(t).toContain('1 doubtful');
    expect(t).toContain('Late November');
    expect(t).toContain('13 Nov 2026');
  });

  it('transfers: ins then outs, fee or move type', () => {
    const t = text(render(config('team-transfers')));
    expect(t.indexOf('Ins')).toBeLessThan(t.indexOf('Outs'));
    expect(t).toContain('£63.5m');
    expect(t).toContain('Loan');
    expect(t).toContain('Summer 2025');
  });

  it('honours: trophies counted and grouped by competition', () => {
    const t = text(render(config('team-honours')));
    expect(t).toContain('7 trophies');
    expect(t).toContain('Champions League, runner-up');
    const groups = groupHonours([
      { competition: { id: '45', name: 'FA Cup' }, seasonLabel: '2019/20' },
      { competition: { id: '45', name: 'FA Cup' }, seasonLabel: '2016/17' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].seasons).toEqual(['2019/20', '2016/17']);
  });

  it('manager record: career win rate as the hero and the current post as the subject row', () => {
    const html = render(config('manager-record'));
    const t = text(html);
    expect(t).toContain('54% career win rate');
    expect(t).toContain('Unai Emery');
    expect(html.match(/data-grid-subject/g)?.length).toBe(1);
    expect(html).toContain('data-scale-median');
    expect(tenureYears({ from: '2022-11' })).toBe('2022 to now');
    expect(tenureYears({ from: '2016-07', to: '2018-05' })).toBe('2016 to 2018');
  });

  it('has no prose sentences in any team block', () => {
    for (const id of TEAM_TYPES) {
      const t = text(render(config(id)));
      expect(t, id).not.toMatch(/\b(the most|is in the|among|where the median)\b/);
    }
  });
});

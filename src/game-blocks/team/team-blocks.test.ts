import { describe, expect, it } from 'vitest';
import { gameBlockEntry } from '../registry';
import type { GameBlockLook, GameBlockTypeId } from '../types';
import { periodShort } from '../parts/team-goal-timing';
import { tenureLength } from './manager-record';
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

  it('season totals: the stats under the league, a bar for each club place, no ordinals', () => {
    const html = render(config('team-season-totals'));
    const t = text(html);
    expect(t).toContain('vs Premier League clubs');
    expect(t).toContain('Clean sheets');
    expect(t).not.toMatch(/\b\d+(st|nd|rd|th)\b|Median/);
    expect(html).toContain('data-bar=');
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

  it('form: fact rows for the window and the season, then the matches with H or A', () => {
    const html = render(config('team-form'));
    const t = text(html);
    expect(t).toContain('Last 6: 2.3 points per game');
    expect(t).toMatch(/Season: \d\.\d points per game/);
    expect(t).toMatch(/\((H|A)\)/);
    expect(html.match(/data-form-row=/g)?.length).toBe(6);
    expect(html).not.toContain('data-points-line');
  });

  it('goal timing: scored and conceded totals, both bars per period', () => {
    const html = render(config('team-goal-timing'));
    const t = text(html);
    expect(t).toMatch(/Scored:? \d+/);
    expect(t).toMatch(/Conceded:? \d+/);
    expect(html.match(/data-goals-for/g)?.length).toBe(6);
    expect(periodShort('0 to 15')).toBe('0-15');
    expect(peakPeriod([{ goalsFor: 2 }, { goalsFor: 2, label: 'late' }])?.label).toBe('late');
    expect(peakPeriod([{ goalsFor: 0 }])).toBeUndefined();
  });

  it('squad: grouped by position', () => {
    const t = text(render(config('team-squad')));
    expect(t).toContain('Goalkeepers');
    expect(t).toContain('Forwards');
  });

  it('out and doubtful: Out and Doubtful sections, reasons, no counts', () => {
    const t = text(render(config('team-out-and-doubtful')));
    expect(t).toContain('Out');
    expect(t).not.toContain('2 out');
  });

  it('transfers: permanent ins then outs, fee or move type, loans left out', () => {
    const t = text(render(config('team-transfers')));
    expect(t.indexOf('In, ')).toBeLessThan(t.indexOf('Out'));
    expect(t).toContain('£63.5m');
    expect(t).not.toContain('Loan');
  });

  it('honours: one row per competition with seasons won and the count', () => {
    const t = text(render(config('team-honours')));
    expect(t).toContain('FA Cup');
    expect(t).toMatch(/Won \d{4}\/\d{2}/);
    expect(t).not.toContain('trophies');
  });

  it('manager record: titled by the manager, Club and Since, spans on one axis', () => {
    const html = render(config('manager-record'));
    const t = text(html);
    expect(t).toContain('Unai Emery');
    expect(t).toContain('Club: Aston Villa');
    expect(t).toContain('Win rate: 54% of games');
    expect(html).toContain('data-tenure-span');
    expect(html).not.toContain('data-scale-median');
    expect(tenureLength(Date.UTC(2022, 10, 1), Date.UTC(2025, 4, 1))).toBe('2.5 years');
  });

  it('has no prose sentences in any team block', () => {
    for (const id of TEAM_TYPES) {
      const t = text(render(config(id)));
      expect(t, id).not.toMatch(/\b(the most|is in the|among|where the median)\b/);
    }
  });
});

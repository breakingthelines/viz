import { describe, expect, it } from 'vitest';
import { gameBlockEntry } from '../registry';
import type { GameBlockLook, GameBlockTypeId } from '../types';
import { fixtureMiddle, groupByDay } from '../parts/league-fixtures';
import { config, copyProblems, render, text } from '../parts/team-league-match-test-kit';
import type { LeaguePlayerRankingsDataJson } from './types';
import { askedLook } from '../fixtures/look';

const LEAGUE_TYPES: GameBlockTypeId[] = [
  'league-table',
  'league-team-stats',
  'league-leaders',
  'league-player-rankings',
  'league-fixtures',
  'league-bracket',
  'league-strength',
];

describe('league blocks', () => {
  it('registers a component for every type', () => {
    for (const id of LEAGUE_TYPES) expect(gameBlockEntry(id)?.component, id).toBeDefined();
  });

  it('draws every type in every look, Pro reader, with the BTL colophon and clean copy', () => {
    for (const id of LEAGUE_TYPES) {
      for (const look of ['editorial', 'poster', 'annotated'] as GameBlockLook[]) {
        const html = render(config(id, { look }));
        expect(askedLook(html), id).toBe(look);
        expect(html, id).toContain('aria-label="Breaking The Lines"');
        expect(copyProblems(html), `${id} ${look}`).toEqual([]);
        expect(html, id).not.toContain('data-block-locked-note');
        expect(html, id).not.toContain('data-cell-state');
      }
    }
  });

  it('table: the highlighted team as the subject row and how many rows are shown', () => {
    const html = render(config('league-table'));
    const t = text(html);
    expect(t).toContain('Premier League');
    expect(t).toContain('2025/26');
    expect(t).toContain('6 of 20');
    expect(t).toContain('+15');
    expect(html.match(/data-grid-subject/g)?.length).toBe(1);
    const none = render(config('league-table', { options: { view: 'top_six' } }));
    expect(none).not.toContain('data-grid-subject');
  });

  it('team stats: sorted rows, the highlighted team, the league median row', () => {
    const html = render(config('league-team-stats'));
    const t = text(html);
    expect(t).toContain('Median');
    expect(t).toContain('15.8');
    expect(t.indexOf('Man City')).toBeLessThan(t.indexOf('Arsenal'));
    expect(html.match(/data-grid-subject/g)?.length).toBe(1);
  });

  it('leaders: the leader as the hero, the rest as rows on the leader scale', () => {
    const html = render(config('league-leaders'));
    const t = text(html);
    expect(t).toContain('14 goals');
    expect(t).toContain('Erling Haaland');
    expect(t).toContain('Saka');
    expect(html.match(/data-scale-state="value"/g)?.length).toBeGreaterThan(0);
  });

  it('player rankings, Pro: names, values, percentiles and the median resolve', () => {
    const t = text(render(config('league-player-rankings')));
    expect(t).toContain('Bukayo Saka');
    expect(t).toContain('2.62');
    expect(t).toContain('98th');
    expect(t).toContain('Median 1.40');
    expect(t).toContain('Key passes, 41 wingers');
  });

  it('player rankings, free: every gated cell locked, the note shown, nothing paid leaks', () => {
    const html = render(config('league-player-rankings'), 'free');
    const t = text(html);
    expect(t).not.toContain('Bukayo Saka');
    expect(t).not.toContain('2.62');
    expect(t).not.toContain('1.40');
    expect(html).toContain('data-cell-state="locked"');
    expect(html).toContain('data-scale-state="locked"');
    expect(t).toContain('Rankings for paid metrics are for Pro readers.');
  });

  it('player rankings, server render: pending, no note', () => {
    const html = render(config('league-player-rankings'), 'pending');
    expect(html).toContain('data-cell-state="pending"');
    expect(html).not.toContain('data-block-locked-note');
    expect(text(html)).not.toContain('2.62');
  });

  it('player rankings: a free board shows its public rows, nothing hardcoded as locked', () => {
    const c = config('league-player-rankings');
    const data: LeaguePlayerRankingsDataJson = {
      metricLabel: 'Goals',
      groupLabel: 'Forwards',
      memberCount: 30,
      gated: false,
      rows: [
        {
          rank: 1,
          player: { id: 'p', name: 'Erling Haaland' },
          team: { id: 't', name: 'Manchester City', shortName: 'Man City' },
          value: { value: 14, display: '14' },
          percentile: 99,
        },
      ],
      median: { value: 3, display: '3' },
    };
    const html = render(
      {
        ...c,
        data: data as Record<string, unknown>,
        gatedCells: [],
        snapshotId: '',
        lockedNote: undefined,
      },
      'free',
      {}
    );
    const t = text(html);
    expect(t).toContain('Erling Haaland');
    expect(t).toContain('99th');
    expect(t).toContain('Median 3');
    expect(html).not.toContain('data-cell-state');
    expect(html).not.toContain('data-block-locked-note');
  });

  it('player rankings: locks exactly the cells the values say are locked', () => {
    const c = config('league-player-rankings');
    const cells = {
      'row0.name': { state: 'value' as const, display: 'Bukayo Saka' },
      'row0.value': { state: 'locked' as const },
    };
    const html = render(c, 'pro', cells);
    expect(text(html)).toContain('Bukayo Saka');
    expect(html.match(/data-cell-state="locked"/g)?.length).toBe(1);
  });

  it('fixtures: grouped by day, kick-off times and statuses', () => {
    const t = text(render(config('league-fixtures')));
    expect(t).toContain('21 Nov 2026');
    expect(t).toContain('15:00');
    expect(t).toContain('Postponed');
    expect(t).toContain('Matchday 13');
    expect(
      fixtureMiddle({
        status: 'GAME_BLOCK_MATCH_STATUS_FINISHED',
        home: { score: 1, penalties: 4 },
        away: { score: 1, penalties: 3 },
      })
    ).toBe('1-1 (4-3 pens)');
    expect(groupByDay([{ kickoff: '2026-11-21T23:30:00Z' }])[0][0]).toBe('2026-11-21');
  });

  it('bracket: rounds in order, the side through marked, an undecided tie plain', () => {
    const html = render(config('league-bracket'));
    const t = text(html);
    expect(t.indexOf('Quarter-finals')).toBeLessThan(t.indexOf('Semi-finals'));
    expect(t).toContain('Final');
    expect(t).toContain('5-1 on aggregate');
    expect(t).toContain('To be decided');
    expect(html.match(/data-tie-winner/g)?.length).toBe(5);
  });

  it('league strength: wholly gated, so a free reader sees ranks and locked rows', () => {
    const pro = text(render(config('league-strength')));
    expect(pro).toContain('La Liga');
    expect(pro).toContain('88.4');
    const html = render(config('league-strength'), 'free');
    const t = text(html);
    expect(t).not.toContain('La Liga');
    expect(t).not.toContain('88.4');
    expect(html.match(/data-cell-state="locked"/g)?.length).toBe(20);
    expect(t).toContain('League strength figures are for Pro readers.');
    expect(t).toContain('10 of 52 leagues');
    expect(t).not.toContain('Index from cross-league');
  });
});

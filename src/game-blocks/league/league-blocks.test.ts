import { describe, expect, it } from 'vitest';
import { gameBlockEntry } from '../registry';
import type { GameBlockLook, GameBlockTypeId } from '../types';
import { dayHeading, matchdayTitle } from './fixtures';
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

  it('table: crest rows, GD with a sign, the highlighted club bold, no row count', () => {
    const html = render(config('league-table'));
    const t = text(html);
    expect(t).toContain('Premier League');
    expect(t).not.toContain('6 of 20');
    expect(t).toContain('+15');
    expect(html.match(/data-table-subject/g)?.length).toBe(1);
    const none = render(config('league-table', { options: { view: 'top_six' } }));
    expect(none).not.toContain('data-table-subject');
  });

  it('team stats: a board per stat, the five best clubs, no median row', () => {
    const html = render(config('league-team-stats'));
    const t = text(html);
    expect(t).not.toContain('Median');
    expect(html.match(/data-stat-board=/g)?.length).toBeGreaterThan(1);
    expect(t.indexOf('Man City')).toBeLessThan(t.indexOf('Arsenal'));
  });

  it('leaders: one board under the stat, the leader first, a bar for each', () => {
    const html = render(config('league-leaders'));
    const t = text(html);
    expect(t).toContain('Goals');
    expect(t).not.toContain('14 goals');
    expect(t.indexOf('Haaland')).toBeLessThan(t.indexOf('Saka'));
    expect(html.match(/data-board-row/g)?.length).toBeGreaterThan(1);
  });

  it('player rankings, Pro: names and values resolve; no ordinal or median', () => {
    const t = text(render(config('league-player-rankings')));
    expect(t).toContain('Bukayo Saka');
    expect(t).toContain('2.62');
    expect(t).not.toMatch(/\b\d+(st|nd|rd|th)\b|Median/);
  });

  it('player rankings, free: every gated cell locked, the note shown, nothing paid leaks', () => {
    const html = render(config('league-player-rankings'), 'free');
    const t = text(html);
    expect(t).not.toContain('Bukayo Saka');
    expect(t).not.toContain('2.62');
    expect(t).not.toContain('1.40');
    expect(html).toContain('data-cell-state="locked"');
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
    expect(t).not.toContain('99th');
    expect(t).not.toContain('Median');
    expect(html).not.toContain('data-cell-state');
    expect(html).not.toContain('data-block-locked-note');
  });

  it('player rankings: several stats draw one board per stat, the club short', () => {
    const c = config('league-player-rankings');
    const board = (key: string, label: string, name: string, value: string) => ({
      metricKey: key,
      metricLabel: label,
      per90: false,
      gated: false,
      rows: [
        {
          rank: 1,
          player: { id: `p-${key}`, name },
          team: { id: 't', name: 'Manchester City', shortName: 'Man City' },
          value: { value: Number(value), display: value },
        },
      ],
    });
    const categories = [
      board('goals', 'Goals', 'Erling Haaland', '9'),
      board('ast', 'Assists', 'Declan Rice', '5'),
      board('key', 'Key passes', 'Pascal Groß', '29'),
      board('tkl', 'Tackles', 'Anan Khalaili', '29'),
    ];
    const data: LeaguePlayerRankingsDataJson = {
      ...categories[0],
      groupLabel: 'Outfield players',
      categories,
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
    expect(html.match(/data-ranking-category=/g)?.length).toBe(4);
    for (const s of [
      'Goals',
      'Assists',
      'Key passes',
      'Tackles',
      'Pascal Groß',
      'Anan Khalaili',
      'Man City',
    ]) {
      expect(t).toContain(s);
    }
    expect(copyProblems(html)).toEqual([]);
    expect(html).not.toContain('data-cell-state');
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

  it('fixtures: titled by matchday, grouped by day, kick-off times and statuses', () => {
    const t = text(render(config('league-fixtures')));
    expect(t).toContain('Sat 21 Nov');
    expect(t).toContain('15:00');
    expect(t).toContain('Postponed');
    expect(matchdayTitle('Regular Season - 10')).toBe('Matchday 10');
    expect(matchdayTitle('Round 11')).toBe('Matchday 11');
    expect(matchdayTitle('Game Round 2026-11-21')).toBe('');
    expect(dayHeading('2026-11-21T15:00:00Z', false)).toBe('Saturday 21 November');
    expect(dayHeading('2026-11-21T15:00:00Z', true)).toBe('Sat 21 Nov');
  });

  it('bracket: rounds in order, Leg 1, Leg 2 and Aggregate, the side through bold', () => {
    const html = render(config('league-bracket'));
    const t = text(html);
    expect(t.indexOf('Quarter-finals')).toBeLessThan(t.indexOf('Semi-finals'));
    expect(t).toContain('Final');
    expect(t).toContain('Aggregate');
    expect(t).not.toContain('Total');
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
    expect(t).not.toContain('Index from cross-league');
  });
});

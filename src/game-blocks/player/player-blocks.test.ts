import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PLAYER_EXAMPLES, type PlayerExampleId } from '../fixtures/player';
import { formDomain } from '../parts/player-form-bars';
import { spreadLabels, trendRuns } from '../parts/player-trend-chart';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockLook, GatedCellValue } from '../types';
import { GameBlockValuesProvider } from '../values';
import { GameBlockView } from '../view';
import { absenceDates } from './absences';
import { isTotalsComparison, pickComparisonHighlight } from './comparison';
import comparisonTotals from '../fixtures/player-comparison-totals.example.json';
import type { GameBlockJson } from '../types';
import { oldestFirst } from './form';
import { PLAYER_BLOCKS } from './index';
import { teamRankLabel } from './season-totals';
import { changeLabel } from './season-trend';
import { shortDate, surname, thousands } from './shared';
import { askedLook } from '../fixtures/look';

type Reader = 'pro' | 'free' | 'pending';

function config(id: PlayerExampleId, patch: Partial<GameBlockConfig> = {}): GameBlockConfig {
  const res = toGameBlockConfig(PLAYER_EXAMPLES[id]);
  if (!res.ok) throw new Error(`${id} fixture did not map: ${res.reason}`);
  return { ...res.config, ...patch };
}

function values(id: PlayerExampleId, reader: Exclude<Reader, 'pending'>) {
  const pro = gatedValuesFromJson(PLAYER_EXAMPLES[id].gated);
  if (reader === 'pro') return pro;
  return Object.fromEntries(
    Object.keys(pro).map((k) => [k, { state: 'locked' } as GatedCellValue])
  );
}

function render(
  id: PlayerExampleId,
  reader: Reader = 'pro',
  patch: Partial<GameBlockConfig> = {},
  cells?: Record<string, GatedCellValue>
) {
  const c = config(id, patch);
  const view = h(GameBlockView, { config: c });
  if (reader === 'pending') return renderToStaticMarkup(view);
  return renderToStaticMarkup(
    h(GameBlockValuesProvider, {
      initial: { [c.snapshotId]: cells ?? values(id, reader) },
      children: view,
    })
  );
}

const IDS = Object.keys(PLAYER_EXAMPLES) as PlayerExampleId[];
const LOOKS: GameBlockLook[] = ['editorial', 'poster', 'annotated'];

describe('every player block', () => {
  it('has a component in the registry map', () => {
    for (const id of IDS) expect(PLAYER_BLOCKS[id], id).toBeTruthy();
  });

  it('draws in all three looks, titled by the subject, with the BTL mark only', () => {
    for (const id of IDS) {
      for (const look of LOOKS) {
        const html = render(id, 'pro', { look });
        expect(askedLook(html), `${id} ${look}`).toBe(look);
        expect(html, id).toContain('aria-label="Breaking The Lines"');
        expect(html, id).not.toContain('API-Football');
        expect(html, id).not.toContain('Update to see this block');
        expect(html, id).toContain(config(id).title);
      }
    }
  });

  it('shows a subheading only when one is set', () => {
    for (const id of IDS) {
      expect(render(id)).not.toContain('A short author line');
      expect(render(id, 'pro', { subheading: 'A short author line' })).toContain(
        'A short author line'
      );
    }
  });

  it('never shows a locked note to a reader who can see every cell', () => {
    for (const id of IDS) expect(render(id, 'pro'), id).not.toContain('data-block-locked-note');
  });

  it('never shows a locked note or a paid figure while cells are pending', () => {
    for (const id of IDS) {
      const html = render(id, 'pending');
      expect(html, id).not.toContain('data-block-locked-note');
      expect(html, id).not.toContain('data-cell-state="locked"');
    }
  });
});

describe('Season totals', () => {
  it('shows the hero total, team rank, next team-mate and paid figures to Pro', () => {
    const html = render('player-season-totals');
    expect(html).toContain('>14<');
    expect(html).toContain('league goals');
    expect(html).toContain('Most at Arsenal');
    expect(html).toContain('Havertz 9');
    expect(html).toContain('95th');
    expect(html).toContain('0.52');
    expect(html).toMatch(/Median (<!-- -->)?0\.24/);
    expect(html).toContain('31 apps');
    expect(html).toContain('2,410 mins');
    expect(html).toContain('Successful dribbles');
    expect(html).toContain('data-scale-state="value"');
  });

  it('keeps totals and locks paid cells for a reader below the plan', () => {
    const html = render('player-season-totals', 'free');
    expect(html).toContain('>14<');
    expect(html).toContain('>88<');
    expect(html).not.toContain('0.52');
    expect(html).not.toContain('95th');
    expect(html).toContain('data-cell-state="locked"');
    expect(html).toContain('data-scale-state="locked"');
    expect(html).toContain('Per 90 figures and percentiles are for Pro readers.');
  });

  it('draws whatever the cells say: free per 90 with a locked median', () => {
    const cells = values('player-season-totals', 'pro');
    for (const k of Object.keys(cells)) if (k.endsWith('.median')) cells[k] = { state: 'locked' };
    const html = render('player-season-totals', 'free', {}, cells);
    expect(html).toContain('0.52');
    expect(html).toContain('95th');
    expect(html).not.toContain('0.24');
    expect(html).toContain('data-block-locked-note');
  });

  it('heroes the author highlight', () => {
    const html = render('player-season-totals', 'pro', {
      options: { highlight: 'key_passes' },
    });
    expect(html).toContain('>76<');
    expect(html).toContain('key passes');
  });
});

describe('Form', () => {
  it('heroes the window average against the season, oldest match first', () => {
    const html = render('player-form');
    expect(html).toContain('7.5');
    expect(html).toContain('average rating, last 10');
    expect(html).toContain('Season 7.1');
    expect(html.match(/data-form-bar=""/g)?.length).toBe(10);
    expect(html.indexOf('Spurs')).toBeLessThan(html.indexOf('Chelsea'));
    expect(html).toContain('data-best=""');
  });

  it('sorts by date and builds the domain from the ratings', () => {
    expect(oldestFirst([{ date: '2026-11-09' }, { date: '2026-10-01' }])[0].date).toBe(
      '2026-10-01'
    );
    expect(formDomain([6.4, 8.9], 7.1)).toEqual([5, 10]);
    expect(formDomain([])).toEqual([5, 10]);
  });
});

describe('Match log', () => {
  it('lists matches newest first with result, minutes and rating', () => {
    const html = render('player-match-log');
    expect(html.indexOf('Chelsea (H)')).toBeLessThan(html.indexOf('Brentford (A)'));
    expect(html).toContain('W 2-1');
    expect(html).toContain('9 Nov');
    expect(html).toContain('Season 7.1');
    expect(html).toContain('Rating');
  });
});

describe('Comparison', () => {
  it('heroes the subject percentile beside the second player and shows per 90 to Pro', () => {
    const html = render('player-comparison');
    expect(html).toContain('Bukayo Saka v Phil Foden');
    expect(html).toContain('94th');
    expect(html).toContain('Foden 85th');
    expect(html).toContain('2.62');
    expect(html).toContain('2.11');
    expect(html).toContain('vs Premier League wingers');
    expect(html).toContain('Arsenal and Manchester City, 2025/26');
    expect(html).toContain('data-scale-comparator');
  });

  it('keeps the public percentiles and locks per 90 for a free reader', () => {
    const html = render('player-comparison', 'free');
    expect(html).toContain('94th');
    expect(html).not.toContain('2.62');
    expect(html).toContain('Per 90 figures are for Pro readers.');
  });

  it('picks the highlight, else the widest lead', () => {
    const m = (config('player-comparison').data as { metrics: { key: string }[] }).metrics;
    expect(pickComparisonHighlight(m, 'shots')?.key).toBe('shots');
    expect(pickComparisonHighlight(m, undefined)?.key).toBe('fd');
  });

  it('has a rows view', () => {
    const html = render('player-comparison', 'pro', { options: { view: 'rows' } });
    expect(html).toContain('Per 90');
    expect(html).toContain('2.62');
  });
});

describe('Comparison of season totals', () => {
  const json = comparisonTotals as unknown as GameBlockJson;
  function renderTotals(reader: 'pro' | 'pending' = 'pro') {
    const res = toGameBlockConfig(json);
    if (!res.ok) throw new Error(res.reason);
    const view = h(GameBlockView, { config: res.config });
    if (reader === 'pending') return renderToStaticMarkup(view);
    return renderToStaticMarkup(
      h(GameBlockValuesProvider, {
        initial: { [res.config.snapshotId]: gatedValuesFromJson(json.gated) },
        children: view,
      })
    );
  }

  it('draws totals and per 90 side by side with no scales', () => {
    const html = renderTotals();
    expect(html).toContain('data-comparison-totals');
    expect(html).not.toContain('data-scale-comparator');
    expect(html).toContain('Season totals');
    expect(html).toContain('Per 90');
    expect(html).toContain('Minutes');
    expect(html).toContain('2,210');
    expect(html).toContain('0.96');
    expect(html).toContain('Real Madrid and Inter Miami, 2026/27 and 2026');
    expect(html).toContain('All competitions');
    expect(html).not.toContain('percentile');
  });

  it('heroes the highlighted total beside the second player', () => {
    const html = renderTotals();
    expect(html).toContain('>14<');
    expect(html).toContain('Messi 19');
  });

  it('tells a percentile comparison from a totals one', () => {
    const totals = (toGameBlockConfig(json) as { config: GameBlockConfig }).config.data as {
      metrics: Parameters<typeof isTotalsComparison>[0];
    };
    const ranked = config('player-comparison').data as typeof totals;
    expect(isTotalsComparison(totals.metrics)).toBe(true);
    expect(isTotalsComparison(ranked.metrics)).toBe(false);
  });
});

describe('Career', () => {
  it('heroes career appearances and lists spells with a total row', () => {
    const html = render('player-career');
    expect(html).toContain('>319<');
    expect(html).toContain('career appearances');
    expect(html).toContain('2018 to now');
    expect(html).toContain('Total');
    expect(html).toContain('3 teams');
  });
});

describe('Archetypes', () => {
  it('heroes the best fit and scales every archetype', () => {
    const html = render('player-archetypes');
    expect(html).toContain('>91<');
    expect(html).toContain('Inside forward fit');
    expect(html).toContain('vs Premier League wingers');
    expect(html.match(/data-scale-state="value"/g)?.length).toBe(3);
  });
});

describe('Season trend', () => {
  it('heroes the latest percentile and the change since the first season', () => {
    const html = render('player-season-trend');
    expect(html).toContain('94th');
    expect(html).toContain('Up 23 since 2021/22');
    expect(html).toContain('2.62');
    expect(html).toContain('data-trend-chart');
    expect(html).toContain('vs Premier League wingers');
  });

  it('locks per 90 for a free reader and keeps percentiles', () => {
    const html = render('player-season-trend', 'free');
    expect(html).toContain('94th');
    expect(html).not.toContain('2.62');
    expect(html).toContain('Per 90 figures are for Pro readers.');
  });

  it('has a rows view with a dash for a season with no figure', () => {
    const html = render('player-season-trend', 'pro', { options: { view: 'rows' } });
    expect(html).toContain('2024/25');
    expect(html).toContain('–');
  });

  it('labels change and splits runs at gaps', () => {
    expect(changeLabel([71, null, 94])).toBe('Up 23');
    expect(changeLabel([85, 79])).toBe('Down 6');
    expect(changeLabel([50, 50])).toBe('Level');
    expect(changeLabel([50])).toBeNull();
    expect(trendRuns([1, 2, null, 4])).toEqual([
      [
        [0, 1],
        [1, 2],
      ],
      [[3, 4]],
    ]);
    expect(spreadLabels([50, 52, 120])).toEqual([50, 63, 120]);
  });
});

describe('Similar players', () => {
  it('shows names, teams and similarity to Pro', () => {
    const html = render('player-similar');
    expect(html).toContain('Michael Olise');
    expect(html).toContain('Bayern Munich');
    expect(html).toContain('0.91');
    expect(html).toContain('Same season, Premier League wingers');
  });

  it('shows the titled frame with locked rows to a free reader', () => {
    const html = render('player-similar', 'free');
    expect(html).toContain('Bukayo Saka');
    expect(html).not.toContain('Michael Olise');
    expect(html.match(/data-cell-state="locked"/g)?.length).toBe(15);
    expect(html).toContain('Similar players are for Pro readers.');
  });
});

describe('Transfers', () => {
  it('counts moves and lists them newest first with fees', () => {
    const html = render('player-transfers');
    expect(html).toContain('moves');
    expect(html.indexOf('West Ham to Arsenal')).toBeLessThan(html.indexOf('Chelsea U18'));
    expect(html).toContain('£105m');
    expect(html).toContain('Jul 2023');
  });
});

describe('Honours', () => {
  it('heroes winners medals and lists honours newest first', () => {
    const html = render('player-honours');
    expect(html).toContain('trophies');
    expect(html).toContain('FA Cup');
    expect(html.indexOf('2024')).toBeLessThan(html.indexOf('2019/20'));
  });
});

describe('Absences', () => {
  it('heroes games missed and words the dates', () => {
    const html = render('player-absences');
    expect(html).toContain('>25<');
    expect(html).toContain('games missed');
    expect(html).toContain('Hamstring');
    expect(html).toContain('21 Dec 2024 to 1 Apr 2025');
    expect(html).toContain('From 20 Oct 2026, back Late November');
  });

  it('words a same-year absence once', () => {
    expect(absenceDates({ from: '2023-11-25', to: '2023-12-02' })).toBe('25 Nov to 2 Dec 2023');
  });
});

describe('Details', () => {
  it('heroes age against the squad and lists the facts', () => {
    const html = render('player-details');
    expect(html).toContain('>25<');
    expect(html).toContain('Squad average 26.3');
    expect(html).toContain('178 cm');
    expect(html).toContain('Left');
    expect(html).toContain('Jun 2027');
    expect(html).toContain('5 Sep 2001');
  });
});

describe('labels', () => {
  it('formats short labels', () => {
    expect(shortDate('2026-11-09')).toBe('9 Nov');
    expect(shortDate('2026-11-09', true)).toBe('Nov 2026');
    expect(shortDate('2027')).toBe('2027');
    expect(thousands(2410)).toBe('2,410');
    expect(thousands(950)).toBe('950');
    expect(surname('Bukayo Saka')).toBe('Saka');
    expect(teamRankLabel(1, 'Arsenal')).toBe('Most at Arsenal');
    expect(teamRankLabel(2, 'Arsenal')).toBe('2nd at Arsenal');
    expect(teamRankLabel(0, 'Arsenal')).toBeNull();
  });
});

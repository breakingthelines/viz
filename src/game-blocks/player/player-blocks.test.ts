import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PLAYER_EXAMPLES, type PlayerExampleId } from '../fixtures/player';
import { spreadLabels, trendRuns } from '../parts/player-trend-chart';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockLook, GatedCellValue } from '../types';
import { GameBlockValuesProvider } from '../values';
import { GameBlockView } from '../view';
import { absenceDates } from './absences';
import { careerYears } from './career';
import {
  comparisonView,
  isTotalsComparison,
  pickComparisonHighlight,
  widestGaps,
} from './comparison';
import comparisonTotals from '../fixtures/player-comparison-totals.example.json';
import type { GameBlockJson } from '../types';
import { oldestFirst } from './form';
import { PLAYER_BLOCKS } from './index';
import { teamRankLabel } from './season-totals';
import { changeLabel } from './season-trend';
import { shortDate, surname, thousands } from './shared';
import { askedLook } from '../fixtures/look';
import { ramp } from '../../brand/colour';

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
  it('leads with the total and "per 90", then bars headed by the group', () => {
    const html = render('player-season-totals');
    expect(html).toContain('>14<');
    expect(html).toContain('league goals');
    expect(html).toMatch(/0\.52(<!-- -->)? per 90/);
    expect(html).toContain('vs Premier League wingers<');
    expect(html).toContain('Successful dribbles');
    expect(html).toContain('data-scale-state="value"');
  });

  it('draws no ranks, ordinals, medians, counts or appearances', () => {
    const html = render('player-season-totals');
    expect(html).not.toContain('Most at Arsenal');
    expect(html).not.toContain('Havertz');
    expect(html).not.toMatch(/\d(st|nd|rd|th)</);
    expect(html).not.toContain('Median');
    expect(html).not.toContain('data-scale-median');
    expect(html).not.toContain('Per 90 ');
    expect(html).not.toContain('vs 41');
    expect(html).not.toContain('apps');
    expect(html).not.toContain('mins');
  });

  it('keeps totals and locks paid cells for a reader below the plan', () => {
    const html = render('player-season-totals', 'free');
    expect(html).toContain('>14<');
    expect(html).not.toContain('0.52');
    expect(html).toContain('data-cell-state="locked"');
    expect(html).toContain('data-scale-state="locked"');
    expect(html).toContain('Per 90 figures and percentiles are for Pro readers.');
  });

  it('draws whatever the cells say: free per 90 with a locked percentile', () => {
    const cells = values('player-season-totals', 'pro');
    for (const k of Object.keys(cells))
      if (k.endsWith('.percentile')) cells[k] = { state: 'locked' };
    const html = render('player-season-totals', 'free', {}, cells);
    expect(html).toContain('0.52');
    expect(html).toContain('data-scale-state="locked"');
    expect(html).toContain('data-block-locked-note');
  });

  it('draws the hover Save image only when the frame owns the actions', () => {
    const c = config('player-season-totals');
    const withIcon = renderToStaticMarkup(h(GameBlockView, { config: c }));
    const host = renderToStaticMarkup(h(GameBlockView, { config: c, actions: 'host' }));
    expect(withIcon).toContain('aria-label="Save image"');
    expect(host).not.toContain('aria-label="Save image"');
  });

  it('draws the wheel for the wheel view, with no numbers or median ring', () => {
    const html = render('player-season-totals', 'pro', { options: { view: 'wheel' } });
    expect(html).toContain('data-season-fallback="wheel"');
    expect(html).toContain('btl-pw-slc');
    expect(html).not.toContain('data-median');
    expect(html).not.toContain('class="btl-pw-tip');
  });

  it('draws no scope line under the title', () => {
    const league = render('player-season-totals');
    expect(league).not.toContain('Arsenal, Premier League 2025/26');
  });

  it('puts a small picture beside the title in editorial, the BTL mark with none', () => {
    const c = config('player-season-totals', { look: 'editorial' });
    const html = renderToStaticMarkup(h(GameBlockView, { config: c }));
    expect(html).toContain('data-title-face');
  });

  it('defaults to the poster', () => {
    const json = { ...PLAYER_EXAMPLES['player-season-totals'] };
    json.spec = { ...json.spec, look: undefined };
    const res = toGameBlockConfig(json);
    expect(res.ok && res.config.look).toBe('poster');
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
  it('average rating and last match as fact rows, then the rating columns, oldest first', () => {
    const html = render('player-form');
    expect(html).toContain('Average rating:');
    expect(html).toContain('Last match:');
    expect(html.match(/data-form-rating/g)?.length).toBe(6);
    expect(html).toContain('data-form-best=""');
    expect(html).not.toMatch(/\b\d+(st|nd|rd|th)\b/);
  });

  it('sorts by date and builds the domain from the ratings', () => {
    expect(oldestFirst([{ date: '2026-11-09' }, { date: '2026-10-01' }])[0].date).toBe(
      '2026-10-01'
    );
  });
});

describe('Match log', () => {
  it('lists matches newest first: date, v or at the opponent, score, G, A, rating', () => {
    const html = render('player-match-log');
    expect(html.indexOf('Chelsea')).toBeLessThan(html.indexOf('Brentford'));
    expect(html).toMatch(/v <!-- -->Chelsea|v Chelsea/);
    expect(html).toContain('9 Nov');
    expect(html).toContain('Rating');
  });
});

describe('Comparison', () => {
  const scales = { options: { view: 'scales', highlight: 'key' } };
  const view = (v: string, extra: Partial<GameBlockConfig> = {}) =>
    render('player-comparison', 'pro', { ...extra, options: { view: v } });

  it('draws both players from a shared centre under the pool, no ordinals', () => {
    const html = render('player-comparison', 'pro', scales);
    expect(html).toContain('Bukayo Saka v Phil Foden');
    expect(html).not.toMatch(/\b\d+(st|nd|rd|th)\b/);
    expect(html).toContain('Per 90, vs Premier League wingers');
    expect(html).toContain('2.62');
    expect(html).toContain('2.11');
  });

  it('locks per 90 for a free reader', () => {
    const html = render('player-comparison', 'free', scales);
    expect(html).not.toContain('2.62');
    expect(html).toContain('Per 90 figures are for Pro readers.');
  });

  it('picks the highlight, else the widest lead', () => {
    const m = (config('player-comparison').data as { metrics: { key: string }[] }).metrics;
    expect(pickComparisonHighlight(m, 'shots')?.key).toBe('shots');
    expect(pickComparisonHighlight(m, undefined)?.key).toBe('fd');
  });

  it('has a rows view of per 90 values, no ordinals', () => {
    const html = view('rows');
    expect(html).toContain('Saka');
    expect(html).toContain('2.62');
    expect(html).not.toContain('94th');
  });

  it('draws one wheel with both players by default, scoped to the competition', () => {
    expect(comparisonView(undefined)).toBe('wheel');
    expect(comparisonView('nonsense')).toBe('wheel');
    const html = render('player-comparison');
    expect(html).toContain('data-comparison-view="wheel"');
    expect(html).toContain('data-overlay="Phil Foden"');
    expect(html).not.toContain('Arsenal and Manchester City');
  });

  it('picks the widest gap per family, and shows both players when it can', () => {
    const m = (config('player-comparison').data as { metrics: Parameters<typeof widestGaps>[0] })
      .metrics;
    expect(widestGaps(m, 4).map((x) => x.key)).toEqual(['fd', 'ast', 'npg']);
    // All three lean to Saka; Foden's one lead (shots) takes the last place.
    expect(widestGaps(m, 3).map((x) => x.key)).toEqual(['fd', 'ast', 'shots']);
  });

  it('draws the differ view in the annotated look, ringing the widest gap', () => {
    const html = view('differ');
    expect(html).toContain('data-game-block-look="annotated"');
    expect(html).toContain('data-comparison-view="differ"');
    expect(html).toMatch(/fouls won per\s90/);
    expect(html).not.toContain('Foden 41st');
    expect(html.indexOf('data-k="fd"')).toBeLessThan(html.indexOf('data-k="ast"'));
  });

  it('draws the bars view as the shared-centre rows', () => {
    const html = view('bars');
    expect(html).toContain('2.62');
    expect(html).not.toContain('94th');
  });

  it('draws three stats across in the strip', () => {
    const html = view('strip');
    expect(html).toContain('data-comparison-view="strip"');
    expect(html.match(/data-scale-state=/g)?.length).toBe(3);
    expect(html).toContain('p90');
  });

  it('draws two wheels, the second in white', () => {
    const html = view('two_wheels');
    expect(html).toContain('data-comparison-view="two_wheels"');
    expect(html.match(/aria-label="[^"]*, percentiles"/g)?.length).toBe(2);
    // Saka's 94th key passes ramps to red, Foden's 85th to white.
    expect(html).toContain(`fill="${ramp(94, 'subject')}"`);
    expect(html).toContain(`fill="${ramp(85, 'comparison')}"`);
  });

  it('draws the duel as a poster when both players have pictures', () => {
    for (const html of [view('duel'), render('player-comparison', 'pro', { look: 'poster' })]) {
      expect(html).toContain('data-game-block-look="poster"');
      expect(html).toContain('data-comparison-view="duel"');
    }
  });

  it('falls back to the wheel without both pictures, never a headshot as a crest', () => {
    const c = config('player-comparison');
    const html = view('duel', { comparison: { ...c.comparison!, id: '', imageUrl: undefined } });
    expect(html).toContain('data-comparison-view="wheel"');
    expect(html).not.toContain('data-poster-media');
    const asked = render('player-comparison', 'pro', {
      look: 'poster',
      comparison: { ...c.comparison!, id: '' },
    });
    expect(asked).toContain('data-comparison-view="wheel"');
    expect(asked).not.toContain('data-poster-media="crest"');
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
    expect(html).toContain('Season totals');
    expect(html).toContain('Per 90');
    expect(html).toContain('Minutes');
    expect(html).toContain('2,210');
    expect(html).toContain('0.96');
    expect(html).not.toContain('percentile');
  });

  it('draws totals and per 90 to the larger value, no hero', () => {
    const html = renderTotals();
    expect(html).not.toContain('data-block-anchor="hero"');
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
  it('lists spells newest first with apps, goals and assists, and a total row', () => {
    const html = render('player-career');
    expect(html).toContain('>319<');
    expect(html).toContain('Total');
    expect(html).not.toContain('career appearances');
    expect(careerYears('2018 to now')).toBe('2018 onwards');
  });
});

describe('Archetypes', () => {
  it('lists each archetype with a bar to its fit under the pool', () => {
    const html = render('player-archetypes');
    expect(html).toContain('>91<');
    expect(html).toContain('Inside forward');
    expect(html.match(/data-archetype-row=/g)?.length).toBe(3);
  });
});

describe('Season trend', () => {
  it('draws per 90 by season under the pool, each over a bar, no ordinals', () => {
    const html = render('player-season-trend');
    expect(html).not.toContain('94th');
    expect(html).toContain('2.62');
    expect(html).toContain('Per 90, vs Premier League wingers each season');
    expect(html).not.toMatch(/\bhis\b/);
  });

  it('locks per 90 for a free reader and keeps the bars', () => {
    const html = render('player-season-trend', 'free');
    expect(html).toContain('data-bar=');
    expect(html).not.toContain('94th');
    expect(html).not.toContain('2.62');
    expect(html).toContain('Per 90 figures are for Pro readers.');
  });

  it('has a rows view with a dash for a season with no figure', () => {
    const html = render('player-season-trend', 'pro', { options: { view: 'rows' } });
    expect(html).toContain('24/25');
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
  it('shows names and similarity to Pro under "Most similar"', () => {
    const html = render('player-similar');
    expect(html).toContain('Michael Olise');
    expect(html).toContain('0.91');
    expect(html).toContain('Most similar, Same season, Premier League wingers');
  });

  it('shows the titled frame with locked rows to a free reader', () => {
    const html = render('player-similar', 'free');
    expect(html).toContain('Bukayo Saka');
    expect(html).not.toContain('Michael Olise');
    expect(html.match(/data-cell-state="locked"/g)?.length).toBeGreaterThanOrEqual(10);
    expect(html).toContain('Similar players are for Pro readers.');
  });
});

describe('Transfers', () => {
  it('lists moves newest first: month, from and to, fee', () => {
    const html = render('player-transfers');
    expect(html).not.toContain('moves');
    expect(html.indexOf('West Ham to Arsenal')).toBeLessThan(html.indexOf('Chelsea U18'));
    expect(html).toContain('£105m');
    expect(html).toContain('Jul 2023');
  });
});

describe('Honours', () => {
  it('lists honours by competition with the seasons won', () => {
    const html = render('player-honours');
    expect(html).not.toContain('trophies');
    expect(html).toContain('FA Cup');
  });
});

describe('Absences', () => {
  it('lists absences: start date, reason, span and games missed', () => {
    const html = render('player-absences');
    expect(html).toContain('Hamstring');
    expect(html).toMatch(/games missed/);
    expect(html).toContain('ongoing');
  });

  it('words a same-year absence once', () => {
    expect(absenceDates({ from: '2023-11-25', to: '2023-12-02' })).toBe('25 Nov to 2 Dec 2023');
  });
});

describe('Details', () => {
  it('lists the facts as label and value pairs', () => {
    const t = render('player-details').replace(/<[^>]+>/g, '');
    expect(t).toContain('Club:');
    expect(t).toContain('178 cm');
    expect(t).toContain('Left');
    expect(t).toContain('to June 2027');
    expect(t).toContain('5 Sep 2001, age 25');
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

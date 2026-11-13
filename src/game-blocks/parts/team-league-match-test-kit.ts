import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TEAM_LEAGUE_MATCH_EXAMPLES } from '../fixtures/team-league-match';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockJson, GameBlockTypeId, GatedCellValue } from '../types';
import { GameBlockValuesProvider } from '../values';
import { GameBlockView } from '../view';

/** Test helpers for the team, league and match blocks. Not a test file itself. */

export function json(id: GameBlockTypeId): GameBlockJson {
  const j = TEAM_LEAGUE_MATCH_EXAMPLES[id];
  if (!j) throw new Error(`no example for ${id}`);
  return j;
}

export function config(id: GameBlockTypeId, patch: Partial<GameBlockConfig> = {}): GameBlockConfig {
  const res = toGameBlockConfig(json(id));
  if (!res.ok) throw new Error(`${id} did not map: ${res.reason}`);
  return { ...res.config, ...patch };
}

export type Reader = 'pro' | 'free' | 'pending';

export function values(
  id: GameBlockTypeId,
  reader: 'pro' | 'free'
): Record<string, GatedCellValue> {
  const j = json(id);
  const pro = gatedValuesFromJson(j.gated);
  if (reader === 'pro') return pro;
  return Object.fromEntries(
    (j.gatedCells ?? []).map((k) => [k, { state: 'locked' } as GatedCellValue])
  );
}

export function render(
  c: GameBlockConfig,
  reader: Reader = 'pro',
  vals?: Record<string, GatedCellValue>
) {
  const view = h(GameBlockView, { config: c });
  if (reader === 'pending') return renderToStaticMarkup(view);
  const cells = vals ?? values(c.blockType, reader);
  return renderToStaticMarkup(
    h(GameBlockValuesProvider, { initial: { [c.snapshotId]: cells }, children: view })
  );
}

/** Visible text: tags and React text separators dropped, entities decoded, spaces collapsed. */
export function text(html: string): string {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Copy rules every block keeps: no em-dashes, no exclamation marks, no API-Football mark. */
export function copyProblems(html: string): string[] {
  const t = text(html);
  const out: string[] = [];
  if (t.includes('\u2014')) out.push('em-dash');
  if (t.includes('!')) out.push('exclamation mark');
  if (t.includes('API-Football')) out.push('API-Football mark');
  return out;
}

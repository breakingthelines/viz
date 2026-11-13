import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WHEEL_EXAMPLE } from '../fixtures/index';
import { gatedValuesFromJson, toGameBlockConfig } from '../to-config';
import type { GameBlockConfig, GameBlockLook, GatedCellValue } from '../types';
import { GameBlockValuesProvider } from '../values';
import { GameBlockView, SUPPORTED_DATA_VERSION } from '../view';
import { groupLabel, lowerFirst, ordinal, pickHighlight } from './percentile-wheel';
import { askedLook } from '../fixtures/look';

function config(patch: Partial<GameBlockConfig> = {}): GameBlockConfig {
  const res = toGameBlockConfig(WHEEL_EXAMPLE);
  if (!res.ok) throw new Error('fixture did not map');
  return { ...res.config, ...patch };
}

const PRO = gatedValuesFromJson(WHEEL_EXAMPLE.gated);
const FREE: Record<string, GatedCellValue> = Object.fromEntries(
  Object.keys(PRO).map((k) => [k, { state: 'locked' } as GatedCellValue])
);

function render(c: GameBlockConfig, values?: Record<string, GatedCellValue>) {
  const view = h(GameBlockView, { config: c });
  if (!values) return renderToStaticMarkup(view);
  return renderToStaticMarkup(
    h(GameBlockValuesProvider, { initial: { [c.snapshotId]: values }, children: view })
  );
}

describe('Percentile wheel block', () => {
  it('shows the per 90 hero, its percentile and median to a Pro reader', () => {
    const html = render(config(), PRO);
    expect(html).toContain('2.62');
    expect(html).toMatch(/key passes per\s90/);
    expect(html).toContain('94th');
    expect(html).toMatch(/Median (<!-- -->)?1\.40/);
    expect(html).toContain('vs 41 Premier League wingers');
    expect(html).not.toContain('data-block-locked-note');
    expect(html).not.toContain('data-cell-state');
  });

  it('falls back to the public percentile and locks paid cells for a free reader', () => {
    const html = render(config(), FREE);
    expect(html).not.toContain('2.62');
    expect(html).not.toContain('1.40');
    expect(html).toContain('key passes percentile');
    expect(html).toContain('94th');
    expect(html).toContain('data-cell-state="locked"');
    expect(html).toContain('Per 90 figures are for Pro readers.');
    expect(html).toContain('See plans');
  });

  it('renders pending on the server, with no paid figure and no locked note', () => {
    const html = render(config());
    expect(html).not.toContain('2.62');
    expect(html).toContain('data-cell-state="pending"');
    expect(html).not.toContain('data-block-locked-note');
  });

  it('has no default prose: title, context, figures and short labels only', () => {
    const html = render(config(), PRO);
    expect(html).toContain('Bukayo Saka');
    expect(html).toContain('Arsenal, 2025/26');
    expect(html).not.toMatch(/The median among|is in the|percentile\./);
  });

  it('shows the subheading only when one is set', () => {
    expect(render(config(), PRO)).not.toContain('Arsenal creator');
    expect(render(config({ subheading: 'Arsenal creator in chief' }), PRO)).toContain(
      'Arsenal creator in chief'
    );
  });

  it('draws in every look with the BTL colophon and no API-Football mark', () => {
    for (const look of ['editorial', 'poster', 'annotated'] as GameBlockLook[]) {
      const html = render(config({ look }), PRO);
      expect(askedLook(html)).toBe(look);
      expect(html).toContain('aria-label="Breaking The Lines"');
      expect(html).not.toContain('API-Football');
      expect(html).toContain('2.62');
    }
  });

  it('asks for an update for a newer data version or an unknown type', () => {
    expect(render(config({ dataVersion: SUPPORTED_DATA_VERSION + 1 }))).toContain(
      'Update to see this block'
    );
    expect(render(config({ blockType: 'not-a-block' as GameBlockConfig['blockType'] }))).toContain(
      'Update to see this block'
    );
  });

  it('formats short labels', () => {
    expect(ordinal(94)).toBe('94th');
    expect(ordinal(92)).toBe('92nd');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(21)).toBe('21st');
    expect(lowerFirst('Key passes')).toBe('key passes');
    expect(lowerFirst('xG')).toBe('xG');
    expect(lowerFirst('PPDA')).toBe('PPDA');
    expect(groupLabel('Premier League wingers with 900 or more minutes', 41)).toBe(
      'vs 41 Premier League wingers'
    );
  });

  it('picks the author highlight, else the highest percentile', () => {
    const metrics = (config().data as { metrics: { key: string }[] }).metrics;
    expect(pickHighlight(metrics, 'shots')?.key).toBe('shots');
    expect(pickHighlight(metrics, undefined)?.key).toBe('key');
  });
});

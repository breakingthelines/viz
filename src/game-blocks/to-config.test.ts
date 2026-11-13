import { fromJson, toJson, type JsonValue } from '@bufbuild/protobuf';
import { GameBlockSchema } from '../generated/game/v1/types/game_block_pb';
import { describe, expect, it } from 'vitest';
import { WHEEL_EXAMPLE } from './fixtures/index';
import { GAME_BLOCK_REGISTRY } from './registry';
import { gatedValuesFromJson, toGameBlockConfig } from './to-config';
import type { GameBlockJson } from './types';

/** The example, round-tripped through the real protos message: what a host gets from `toJson`. */
function wire(patch: Record<string, unknown> = {}): GameBlockJson {
  const { _note, ...json } = WHEEL_EXAMPLE as Record<string, unknown>;
  void _note;
  const msg = fromJson(GameBlockSchema, { ...json, ...patch } as JsonValue);
  return toJson(GameBlockSchema, msg) as GameBlockJson;
}

describe('toGameBlockConfig', () => {
  it('maps a built wheel onto the stored config', () => {
    const res = toGameBlockConfig(wire());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const c = res.config;
    expect(c.version).toBe(1);
    expect(c.blockType).toBe('player-percentile-wheel');
    expect(c.title).toBe('Bukayo Saka');
    expect(c.titleOrigin).toBe('default');
    expect(c.look).toBe('editorial');
    expect(c.subject).toMatchObject({ kind: 'player', name: 'Bukayo Saka', subtitle: 'Arsenal' });
    expect(c.scope).toMatchObject({ seasonLabel: '2025/26', competitionLabel: 'Premier League' });
    expect(c.options).toMatchObject({ highlight: 'key', view: 'wheel' });
    expect(c.source).toEqual({
      provider: 'API-Football',
      asOf: '2026-11-13T09:00:00Z',
      read: 'BuildGameBlocks',
    });
    expect(c.gatedCells).toContain('key.per90');
    expect((c.data as { metrics: unknown[] }).metrics).toHaveLength(8);
    expect(c.lockedNote).toBe('Per 90 figures');
  });

  it('never copies a gated value into the config', () => {
    const res = toGameBlockConfig(wire());
    if (!res.ok) throw new Error('expected a config');
    const stored = JSON.stringify(res.config);
    expect(stored).not.toContain('2.62');
    expect(stored).not.toContain('"gated"');
    // positive control: a public figure is there
    expect(stored).toContain('"percentile":94');
  });

  it('reads look and subheading from the spec', () => {
    const res = toGameBlockConfig(
      wire({
        spec: {
          type: 'GAME_BLOCK_TYPE_PLAYER_PERCENTILE_WHEEL',
          look: 'GAME_BLOCK_LOOK_POSTER',
          options: { subheading: 'Arsenal creator in chief' },
        },
      })
    );
    if (!res.ok) throw new Error('expected a config');
    expect(res.config.look).toBe('poster');
    expect(res.config.subheading).toBe('Arsenal creator in chief');
    expect(res.config.options.extra).toBeUndefined();
  });

  it('returns the reason for an unavailable type', () => {
    const res = toGameBlockConfig(
      wire({ unavailable: { reason: 'REASON_GOALKEEPER', text: 'Not drawn for goalkeepers' } })
    );
    expect(res).toEqual({
      ok: false,
      reason: 'REASON_GOALKEEPER',
      text: 'Not drawn for goalkeepers',
      blockType: 'player-percentile-wheel',
    });
  });

  it('refuses an unknown type', () => {
    const res = toGameBlockConfig({ spec: { type: 'GAME_BLOCK_TYPE_SOMETHING_NEW' } });
    expect(res.ok).toBe(false);
  });

  it('maps the redacted gated map for a preview', () => {
    const json = wire({
      gated: {
        'key.per90': { state: 'METRIC_STATE_VALUE', value: 2.62, display: '2.62' },
        'key.median': { state: 'METRIC_STATE_LOCKED' },
      },
    });
    expect(gatedValuesFromJson(json.gated)).toEqual({
      'key.per90': { state: 'value', value: 2.62, display: '2.62' },
      'key.median': { state: 'locked' },
    });
  });
});

describe('registry', () => {
  it('covers every GameBlockType in protos with its oneof key', () => {
    const enumValues = GameBlockSchema.file.enums
      .find((e) => e.name === 'GameBlockType')!
      .values.map((v) => v.name)
      .filter((n) => n !== 'GAME_BLOCK_TYPE_UNSPECIFIED');
    expect(GAME_BLOCK_REGISTRY.map((e) => e.protoType).sort()).toEqual([...enumValues].sort());
    const oneof = GameBlockSchema.oneofs.find((o) => o.name === 'data')!;
    const keys = oneof.fields.map((f) => f.jsonName);
    for (const e of GAME_BLOCK_REGISTRY) expect(keys).toContain(e.dataKey);
  });

  it('has sentence-case labels and unique ids', () => {
    const ids = new Set(GAME_BLOCK_REGISTRY.map((e) => e.id));
    expect(ids.size).toBe(GAME_BLOCK_REGISTRY.length);
    for (const e of GAME_BLOCK_REGISTRY) {
      expect(e.label[0]).toBe(e.label[0].toUpperCase());
      expect(e.label.slice(1)).toBe(e.label.slice(1).toLowerCase());
    }
  });
});

import { gameBlockEntryForProto } from './registry';
import type {
  GameBlockConfig,
  GameBlockJson,
  GameBlockLook,
  GameBlockSubject,
  GameBlockSubjectCardJson,
  GameBlockSubjectKind,
  GatedCellJson,
  GatedCellValue,
} from './types';
import { GAME_BLOCK_CONFIG_VERSION } from './types';

/**
 * Maps a built `GameBlock` (protos JSON, `toJson` output) onto the config a
 * body stores. Studio, the platform thoughts composer and the Regista hosts
 * all go through this, so none of them reads protos.
 *
 * The gated map is never copied: a config holds public data and cell keys
 * only. Use `gatedValuesFromJson` to seed a preview's values instead.
 */

export type ToGameBlockConfigResult =
  | { ok: true; config: GameBlockConfig }
  | { ok: false; reason: string; text: string; blockType?: string };

const SUBJECT_KINDS: Record<string, GameBlockSubjectKind> = {
  SUBJECT_TYPE_PLAYER: 'player',
  SUBJECT_TYPE_TEAM: 'team',
  SUBJECT_TYPE_COMPETITION: 'competition',
  SUBJECT_TYPE_COACH: 'coach',
  SUBJECT_TYPE_GAME: 'game',
};

const LOOKS: Record<string, GameBlockLook> = {
  GAME_BLOCK_LOOK_EDITORIAL: 'editorial',
  GAME_BLOCK_LOOK_POSTER: 'poster',
  GAME_BLOCK_LOOK_ANNOTATED: 'annotated',
};

const STATES: Record<string, GatedCellValue['state']> = {
  METRIC_STATE_VALUE: 'value',
  METRIC_STATE_LOCKED: 'locked',
  METRIC_STATE_NO_DATA: 'no-data',
};

function subjectOf(card: GameBlockSubjectCardJson | undefined): GameBlockSubject | undefined {
  if (!card?.id && !card?.name) return undefined;
  const out: GameBlockSubject = {
    id: card.id ?? '',
    kind: SUBJECT_KINDS[card.type ?? ''] ?? 'player',
    name: card.name ?? '',
  };
  if (card.subtitle) out.subtitle = card.subtitle;
  if (card.imageUrl) out.imageUrl = card.imageUrl;
  if (card.crestUrl) out.crestUrl = card.crestUrl;
  if (card.url) out.url = card.url;
  return out;
}

function dropEmpty<T extends Record<string, unknown>>(o: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== '' && v !== 0) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export function toGameBlockConfig(
  json: GameBlockJson,
  opts: { origin?: GameBlockConfig['origin'] } = {}
): ToGameBlockConfigResult {
  const protoType = json.spec?.type ?? '';
  const entry = gameBlockEntryForProto(protoType);
  if (json.unavailable) {
    return {
      ok: false,
      reason: json.unavailable.reason ?? 'REASON_UNSPECIFIED',
      text: json.unavailable.text ?? '',
      blockType: entry?.id,
    };
  }
  if (!entry) {
    return { ok: false, reason: 'UNKNOWN_TYPE', text: 'Update to see this block' };
  }
  const subject = subjectOf(json.subject);
  if (!subject) return { ok: false, reason: 'NO_SUBJECT', text: '', blockType: entry.id };

  const spec = json.spec ?? {};
  const extra =
    spec.options && Object.keys(spec.options).length > 0 ? { ...spec.options } : undefined;
  const subheading = extra?.subheading;
  if (extra) delete extra.subheading;

  const config: GameBlockConfig = {
    version: GAME_BLOCK_CONFIG_VERSION,
    blockType: entry.id,
    dataVersion: json.schemaVersion ?? 1,
    snapshotId: json.snapshotId ?? '',
    title: json.defaultTitle || subject.name,
    titleOrigin: 'default',
    look: LOOKS[spec.look ?? ''] ?? 'editorial',
    subject,
    scope: dropEmpty({
      seasonId: spec.seasonId,
      seasonLabel: json.seasonLabel,
      competitionId: spec.competitionId,
      competitionLabel: json.competitionLabel,
      gameId: subject.kind === 'game' ? subject.id : undefined,
      gameLabel: subject.kind === 'game' ? subject.name : undefined,
    }),
    context: json.contextLine ?? '',
    baseline: json.baseline ?? '',
    source: { provider: json.provider ?? '', asOf: json.asOf ?? '', read: 'BuildGameBlocks' },
    options: dropEmpty({
      view: spec.view,
      highlight: spec.highlight,
      limit: spec.limit,
      extra: extra && Object.keys(extra).length > 0 ? extra : undefined,
    }),
    data: (json[entry.dataKey] as Record<string, unknown> | undefined) ?? {},
    gatedCells: [...(json.gatedCells ?? [])],
    text: {
      caption: json.text?.caption ?? '',
      columns: [...(json.text?.columns ?? [])],
      rows: (json.text?.rows ?? []).map((r) => [...(r.cells ?? [])]),
      notes: [...(json.text?.notes ?? [])],
    },
    origin: opts.origin ?? 'picker',
  };
  if (subheading) config.subheading = subheading;
  const comparison = subjectOf(json.comparison);
  if (comparison) config.comparison = comparison;
  if (json.lockedNote) config.lockedNote = json.lockedNote;
  return { ok: true, config };
}

function cellOf(c: GatedCellJson): GatedCellValue {
  const state = STATES[c.state ?? ''] ?? 'no-data';
  if (state !== 'value') return { state };
  const out: GatedCellValue = { state, display: c.display ?? '' };
  if (typeof c.value === 'number') out.value = c.value;
  return out;
}

/**
 * The redacted gated map a `BuildGameBlocks` or `GetGameBlockValues` response
 * carries, as `GameBlockValuesProvider` takes it. Never stored in a body.
 */
export function gatedValuesFromJson(
  gated: Record<string, GatedCellJson> | undefined
): Record<string, GatedCellValue> {
  const out: Record<string, GatedCellValue> = {};
  for (const [k, v] of Object.entries(gated ?? {})) out[k] = cellOf(v);
  return out;
}

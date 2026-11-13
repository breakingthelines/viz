/**
 * Game blocks: the stored config every host renders, and the wire JSON it is
 * built from.
 *
 * `GameBlockConfig` is what a body holds (editor `game-block` node, `stats-card`
 * v2, Regista attachments). It carries public data only: a paid figure is
 * named by a cell key ("key_passes.per90") and resolved per viewer through
 * `GameBlockValuesProvider`. Nothing here is ever a gated value.
 *
 * The `*Json` types mirror `btl.game.v1.types` (protos 0.209.0) as
 * `toJson()` writes them: lowerCamel field names, enums as their full names,
 * default values left out. `types.pin.test.ts` fails the type check when a
 * proto field is added, removed or renamed without a matching change here.
 */

/** Every block type, as the string id a saved body carries. */
export type GameBlockTypeId =
  | 'player-percentile-wheel'
  | 'player-season-totals'
  | 'player-form'
  | 'player-comparison'
  | 'player-career'
  | 'player-match-log'
  | 'player-archetypes'
  | 'player-season-trend'
  | 'player-similar'
  | 'player-transfers'
  | 'player-honours'
  | 'player-absences'
  | 'player-details'
  | 'team-season-totals'
  | 'team-form'
  | 'team-goal-timing'
  | 'team-squad'
  | 'team-out-and-doubtful'
  | 'team-transfers'
  | 'team-honours'
  | 'manager-record'
  | 'league-table'
  | 'league-team-stats'
  | 'league-leaders'
  | 'league-player-rankings'
  | 'league-fixtures'
  | 'league-bracket'
  | 'league-strength'
  | 'match-stats'
  | 'match-result'
  | 'match-timeline'
  | 'match-fan-grades'
  | 'match-player-of-the-match'
  | 'match-predictions'
  | 'match-missing-players';

/** How a block is drawn. An author option, stored in the config. */
export type GameBlockLook = 'editorial' | 'poster' | 'annotated';

export const GAME_BLOCK_LOOKS: readonly GameBlockLook[] = ['editorial', 'poster', 'annotated'];

/** Where a block sits: an article column, a chat answer, a picker tile. */
export type GameBlockDensity = 'article' | 'chat' | 'tile';

export type GameBlockSubjectKind = 'player' | 'team' | 'competition' | 'coach' | 'game';

/** The current `GameBlockConfig.version`. */
export const GAME_BLOCK_CONFIG_VERSION = 1;

export interface GameBlockSubject {
  id: string;
  kind: GameBlockSubjectKind;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  crestUrl?: string;
  url?: string;
}

export interface GameBlockConfig<D = Record<string, unknown>> {
  version: 1;
  blockType: GameBlockTypeId;
  /** `GameBlock.schema_version` of `data`. A reader refuses a newer one. */
  dataVersion: number;
  /** game-service snapshot. Empty when the block has no gated cells. */
  snapshotId: string;
  title: string;
  titleOrigin: 'default' | 'author' | 'regista';
  /** Optional author or Regista line under the title. Empty by default. */
  subheading?: string;
  /** Author option. Missing means editorial. */
  look?: GameBlockLook;
  subject: GameBlockSubject;
  comparison?: GameBlockSubject;
  scope: {
    seasonId?: string;
    seasonLabel?: string;
    competitionId?: string;
    competitionLabel?: string;
    gameId?: string;
    gameLabel?: string;
  };
  context: string;
  /** The comparison group as game-service words it. Blocks show a terse form. */
  baseline: string;
  /** Snapshot provenance. Never drawn as footer text. */
  source: { provider: string; asOf: string; read: 'BuildGameBlocks' };
  options: { view?: string; highlight?: string; limit?: number; extra?: Record<string, string> };
  /** The type's data message as JSON, public fields only. */
  data: D;
  gatedCells: string[];
  lockedNote?: string;
  text: { caption: string; columns: string[]; rows: string[][]; notes: string[] };
  origin: 'picker' | 'regista';
}

/** One paid value as one viewer may see it (`GatedCell`). */
export interface GatedCellValue {
  state: 'value' | 'locked' | 'no-data';
  value?: number;
  /** Formatted: "2.62", "94th". Set when `state` is `value`. */
  display?: string;
}

/** What a block reads for a cell: a resolved value or `pending` before the fetch lands. */
export type GatedCellRead = GatedCellValue | { state: 'pending' };

// ---------------------------------------------------------------------------
// Wire JSON (protos 0.209.0, `toJson` output)
// ---------------------------------------------------------------------------

export type MetricStateJson =
  | 'METRIC_STATE_UNSPECIFIED'
  | 'METRIC_STATE_VALUE'
  | 'METRIC_STATE_NO_DATA'
  | 'METRIC_STATE_LOCKED'
  | 'METRIC_STATE_PENDING';

export interface SubjectRefJson {
  id?: string;
  type?: string;
  sport?: string;
  label?: string;
  slug?: string;
  imageUrl?: string;
  canonicalUrl?: string;
}

export interface GameBlockSpecJson {
  type?: string;
  subject?: SubjectRefJson;
  seasonId?: string;
  competitionId?: string;
  comparison?: SubjectRefJson;
  highlight?: string;
  view?: string;
  limit?: number;
  look?: string;
  options?: Record<string, string>;
}

export interface GatedCellJson {
  state?: MetricStateJson;
  value?: number;
  display?: string;
}

export interface GameBlockTextJson {
  caption?: string;
  columns?: string[];
  rows?: { cells?: string[] }[];
  notes?: string[];
}

export interface GameBlockOptionJson {
  key?: string;
  label?: string;
  hint?: string;
}

export interface GameBlockOptionGroupJson {
  key?: string;
  label?: string;
  choices?: GameBlockOptionJson[];
  selected?: string;
  maxSelected?: number;
}

export interface GameBlockSubjectCardJson {
  id?: string;
  type?: string;
  name?: string;
  subtitle?: string;
  imageUrl?: string;
  crestUrl?: string;
  url?: string;
}

export interface GameBlockUnavailableJson {
  reason?: string;
  text?: string;
}

/**
 * `GameBlock` as JSON. The `data` oneof arrives as one of the camel-cased
 * `player*`, `team*`, `manager*`, `league*` or `match*` keys, read by
 * `toGameBlockConfig` through the registry, so it is typed loosely here.
 */
export interface GameBlockJsonBase {
  snapshotId?: string;
  spec?: GameBlockSpecJson;
  schemaVersion?: number;
  subject?: GameBlockSubjectCardJson;
  comparison?: GameBlockSubjectCardJson;
  seasonLabel?: string;
  competitionLabel?: string;
  contextLine?: string;
  defaultTitle?: string;
  baseline?: string;
  provider?: string;
  asOf?: string;
  lockedNote?: string;
  gatedCells?: string[];
  gated?: Record<string, GatedCellJson>;
  text?: GameBlockTextJson;
  highlights?: GameBlockOptionJson[];
  views?: GameBlockOptionJson[];
  unavailable?: GameBlockUnavailableJson;
  options?: GameBlockOptionGroupJson[];
}

export type GameBlockJson = GameBlockJsonBase & { [dataKey: string]: unknown };

// ---------------------------------------------------------------------------
// Per-type data (public fields only)
// ---------------------------------------------------------------------------

export interface GameBlockMetricJson {
  key?: string;
  label?: string;
  shortLabel?: string;
  family?: string;
  state?: MetricStateJson;
  percentile?: number;
  valueCell?: string;
  medianCell?: string;
}

export interface GameBlockFamilyJson {
  key?: string;
  label?: string;
}

export interface PlayerPercentileWheelDataJson {
  metrics?: GameBlockMetricJson[];
  families?: GameBlockFamilyJson[];
  groupPhrase?: string;
  groupSize?: number;
  minutes?: number;
  appearances?: number;
  methodVersion?: string;
}

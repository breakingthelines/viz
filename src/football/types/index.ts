/**
 * viz's football type surface.
 *
 * Two layers:
 *
 * 1. The **wire contract**, re-exported verbatim from the vendored
 *    `btl.game.v1.types.football` generated code. Enums and per-action payload
 *    messages are the protos repo's to define; viz never redeclares them, so a
 *    contract change lands here as a type error rather than as silent drift.
 *    The generated tree is synced from protos by GitHub Actions — see
 *    `protos/.github/workflows/sync-types.yml`.
 *
 * 2. The **display types** viz owns. `FootballActionPayload` identifies actors
 *    by id only (`teamId`, `playerId`) and carries no id or clock of its own,
 *    because on the wire those are resolved elsewhere. Rendering needs names,
 *    kit colours and a stable key, so viz declares small structural interfaces
 *    for them. They are plain objects: a host builds them as literals, with no
 *    protobuf runtime involved.
 */

export {
  // Action payload + the typed per-action data carried in its oneof
  type FootballActionPayload,
  type ShotEventData,
  type PassEventData,
  type TackleEventData,
  type CarryEventData,
  type InterceptionEventData,
  type FreezeFramePlayer,
  // Enums
  FootballActionType,
  ShotOutcome,
  PassHeight,
  PassOutcome,
  TackleOutcome,
  DuelType,
  InterceptionOutcome,
  BodyPart,
  // Schemas (for creating messages)
  FootballActionPayloadSchema,
  ShotEventDataSchema,
  PassEventDataSchema,
  TackleEventDataSchema,
  CarryEventDataSchema,
  InterceptionEventDataSchema,
  FreezeFramePlayerSchema,
} from '#/generated/game/v1/types/football/football_pb.ts';

// Re-export create from protobuf for convenience
export { create } from '@bufbuild/protobuf';

import type {
  FootballActionPayload,
  ShotEventData,
  PassEventData,
  TackleEventData,
  CarryEventData,
  InterceptionEventData,
} from '#/generated/game/v1/types/football/football_pb.ts';

// =============================================================================
// DISPLAY TYPES (viz-owned — no proto counterpart)
// =============================================================================

/**
 * A point on the pitch, normalised to 0-100 on both axes regardless of the
 * provider's native grid.
 *
 * Structurally identical to the proto `PitchCoordinates` minus its `$typeName`
 * brand, so a decoded proto value is assignable to it and a plain `{ x, y }`
 * literal is too. viz exports this one rather than the proto message because
 * every coordinate a host hands to a component is a literal.
 */
export interface PitchCoordinates {
  /** 0 = own goal line, 100 = opposition goal line. */
  x: number;
  /** 0 = left touchline, 100 = right touchline. */
  y: number;
}

/** A team, as far as rendering is concerned. */
export interface Team {
  /** Stable id. Matched against `MatchAction.team`, `ShotMapProps.homeTeamId`. */
  id: string;
  /** Full display name, e.g. "Argentina". */
  name: string;
  /** Abbreviated name for chips and labels, e.g. "ARG". Falls back to `name`. */
  shortName?: string;
  /** Outfield kit colour, any CSS colour. Drives marker and chip colouring. */
  primaryColor?: string;
  /** Secondary kit colour, any CSS colour. */
  secondaryColor?: string;
}

/** A player, as far as rendering is concerned. */
export interface Player {
  /** Stable id. Matched against `selectedPlayerId` props. */
  id: string;
  /** Display name. Components shorten it themselves where space is tight. */
  name: string;
  /** Shirt number, shown on markers when the component is asked to show numbers. */
  shirtNumber?: number;
}

/**
 * One action in a match, ready to render: the proto payload's own fields plus
 * the identity and timing a host has already resolved.
 *
 * `actionData` is the proto oneof verbatim — the same five-plus case names and
 * the same payload messages — so this type tracks the wire contract exactly
 * where it matters and adds only what the wire cannot carry.
 */
export interface MatchAction {
  /** Stable id. Used for React keys and for `selectedShotId`-style selection. */
  id: string;
  /** Match minute. */
  timestamp: number;
  /** What kind of action this is. */
  type: FootballActionType;
  /** Where on the pitch it happened. */
  location?: PitchCoordinates;
  /** The team that performed it, resolved from the payload's `teamId`. */
  team?: Team;
  /** The player who performed it, resolved from the payload's `playerId`. */
  player?: Player;
  /** The typed action payload — the proto oneof. */
  actionData: FootballActionPayload['actionData'];
}

/** Formation position - player with their position on the pitch */
export interface FormationPosition {
  player: Player;
  position: PitchCoordinates;
  role?: string;
}

/** Team formation for display */
export interface Formation {
  team: Team;
  formation: string; // e.g., "4-3-3", "4-4-2"
  positions: FormationPosition[];
}

/** A data provider viz can attribute a visualisation to. */
export type DataProvider =
  | 'statsbomb'
  | 'opta'
  | 'wyscout'
  | 'instat'
  | 'skillcorner'
  | 'metrica'
  | 'custom';

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * The minimum an action needs for the guards below: the proto oneof. Both
 * {@link MatchAction} and a bare `FootballActionPayload` satisfy it, so the
 * guards narrow either.
 */
type WithActionData = { actionData: FootballActionPayload['actionData'] };

export function isShot<T extends WithActionData>(
  action: T
): action is T & { actionData: { case: 'shot'; value: ShotEventData } } {
  return action.actionData.case === 'shot';
}

export function isPass<T extends WithActionData>(
  action: T
): action is T & { actionData: { case: 'pass'; value: PassEventData } } {
  return action.actionData.case === 'pass';
}

export function isTackle<T extends WithActionData>(
  action: T
): action is T & { actionData: { case: 'tackle'; value: TackleEventData } } {
  return action.actionData.case === 'tackle';
}

export function isCarry<T extends WithActionData>(
  action: T
): action is T & { actionData: { case: 'carry'; value: CarryEventData } } {
  return action.actionData.case === 'carry';
}

export function isInterception<T extends WithActionData>(
  action: T
): action is T & { actionData: { case: 'interception'; value: InterceptionEventData } } {
  return action.actionData.case === 'interception';
}

// =============================================================================
// ENUM TO STRING HELPERS
// =============================================================================

import {
  FootballActionType,
  ShotOutcome,
  PassHeight,
  PassOutcome,
  TackleOutcome,
  DuelType,
  InterceptionOutcome,
  BodyPart,
} from '#/generated/game/v1/types/football/football_pb.ts';

export const actionTypeName: Record<FootballActionType, string> = {
  [FootballActionType.UNSPECIFIED]: 'unspecified',
  [FootballActionType.SHOT]: 'shot',
  [FootballActionType.PASS]: 'pass',
  [FootballActionType.TACKLE]: 'tackle',
  [FootballActionType.CARRY]: 'carry',
  [FootballActionType.INTERCEPTION]: 'interception',
  [FootballActionType.CARD]: 'card',
  [FootballActionType.DUEL]: 'duel',
  [FootballActionType.GOALKEEPER]: 'goalkeeper',
  [FootballActionType.CLEARANCE]: 'clearance',
  [FootballActionType.SUBSTITUTION]: 'substitution',
  [FootballActionType.FOUL_COMMITTED]: 'foul_committed',
  [FootballActionType.TAKE_ON]: 'take_on',
  [FootballActionType.RECOVERY]: 'recovery',
  [FootballActionType.PRESSURE]: 'pressure',
};

export const shotOutcomeName: Record<ShotOutcome, string> = {
  [ShotOutcome.UNSPECIFIED]: 'unspecified',
  [ShotOutcome.GOAL]: 'goal',
  [ShotOutcome.SAVED]: 'saved',
  [ShotOutcome.MISSED]: 'missed',
  [ShotOutcome.BLOCKED]: 'blocked',
  [ShotOutcome.POST]: 'post',
};

export const passHeightName: Record<PassHeight, string> = {
  [PassHeight.UNSPECIFIED]: 'unspecified',
  [PassHeight.GROUND]: 'ground',
  [PassHeight.LOW]: 'low',
  [PassHeight.HIGH]: 'high',
};

export const passOutcomeName: Record<PassOutcome, string> = {
  [PassOutcome.UNSPECIFIED]: 'unspecified',
  [PassOutcome.SUCCESSFUL]: 'successful',
  [PassOutcome.UNSUCCESSFUL]: 'unsuccessful',
};

export const tackleOutcomeName: Record<TackleOutcome, string> = {
  [TackleOutcome.UNSPECIFIED]: 'unspecified',
  [TackleOutcome.WON]: 'won',
  [TackleOutcome.LOST]: 'lost',
};

export const duelTypeName: Record<DuelType, string> = {
  [DuelType.UNSPECIFIED]: 'unspecified',
  [DuelType.GROUND]: 'ground',
  [DuelType.AERIAL]: 'aerial',
};

export const interceptionOutcomeName: Record<InterceptionOutcome, string> = {
  [InterceptionOutcome.UNSPECIFIED]: 'unspecified',
  [InterceptionOutcome.WON]: 'won',
  [InterceptionOutcome.LOST]: 'lost',
};

export const bodyPartName: Record<BodyPart, string> = {
  [BodyPart.UNSPECIFIED]: 'unspecified',
  [BodyPart.RIGHT_FOOT]: 'right_foot',
  [BodyPart.LEFT_FOOT]: 'left_foot',
  [BodyPart.HEAD]: 'head',
  [BodyPart.OTHER]: 'other',
};

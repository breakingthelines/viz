/**
 * Re-export proto types from generated folder.
 * These types are synced from the protos repo via GitHub Actions.
 */

export {
  // Message types
  type NormalizedMatchData,
  type DataSource,
  type Team,
  type Player,
  type PitchCoordinates,
  type MatchEvent,
  type ShotEventData,
  type PassEventData,
  type TackleEventData,
  type CarryEventData,
  type InterceptionEventData,
  // Enums
  EventType,
  ShotOutcome,
  PassHeight,
  PassOutcome,
  TackleOutcome,
  DuelType,
  InterceptionOutcome,
  BodyPart,
  // Schemas (for creating messages)
  NormalizedMatchDataSchema,
  DataSourceSchema,
  TeamSchema,
  PlayerSchema,
  PitchCoordinatesSchema,
  MatchEventSchema,
  ShotEventDataSchema,
  PassEventDataSchema,
  TackleEventDataSchema,
  CarryEventDataSchema,
  InterceptionEventDataSchema,
} from '#/generated/game/v1/types/football/football_pb.ts';

// Re-export create from protobuf for convenience
export { create } from '@bufbuild/protobuf';

// =============================================================================
// TYPE GUARDS
// =============================================================================

import type {
  MatchEvent,
  ShotEventData,
  PassEventData,
  TackleEventData,
  CarryEventData,
  InterceptionEventData,
} from '#/generated/game/v1/types/football/football_pb.ts';

export function isShot(
  event: MatchEvent
): event is MatchEvent & { eventData: { case: 'shot'; value: ShotEventData } } {
  return event.eventData.case === 'shot';
}

export function isPass(
  event: MatchEvent
): event is MatchEvent & { eventData: { case: 'pass'; value: PassEventData } } {
  return event.eventData.case === 'pass';
}

export function isTackle(
  event: MatchEvent
): event is MatchEvent & { eventData: { case: 'tackle'; value: TackleEventData } } {
  return event.eventData.case === 'tackle';
}

export function isCarry(
  event: MatchEvent
): event is MatchEvent & { eventData: { case: 'carry'; value: CarryEventData } } {
  return event.eventData.case === 'carry';
}

export function isInterception(
  event: MatchEvent
): event is MatchEvent & { eventData: { case: 'interception'; value: InterceptionEventData } } {
  return event.eventData.case === 'interception';
}

// =============================================================================
// ENUM TO STRING HELPERS
// =============================================================================

import {
  EventType,
  ShotOutcome,
  PassHeight,
  PassOutcome,
  TackleOutcome,
  DuelType,
  InterceptionOutcome,
  BodyPart,
} from '#/generated/game/v1/types/football/football_pb.ts';

export const eventTypeName: Record<EventType, string> = {
  [EventType.UNSPECIFIED]: 'unspecified',
  [EventType.SHOT]: 'shot',
  [EventType.PASS]: 'pass',
  [EventType.TACKLE]: 'tackle',
  [EventType.CARRY]: 'carry',
  [EventType.INTERCEPTION]: 'interception',
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

// =============================================================================
// VIZ-SPECIFIC TYPES (not in proto - used for display components)
// =============================================================================

import type {
  Team,
  Player,
  PitchCoordinates,
} from '#/generated/game/v1/types/football/football_pb.ts';

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

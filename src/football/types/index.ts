// Schema exports
export {
  DataSourceSchema,
  PitchCoordinatesSchema,
  PlayerSchema,
  TeamSchema,
  MatchInfoSchema,
  FormationPositionSchema,
  FormationSchema,
  NormalizedMatchDataSchema,
} from './schema';

export type {
  DataSource,
  PitchCoordinates,
  Player,
  Team,
  MatchInfo,
  FormationPosition,
  Formation,
  NormalizedMatchData,
} from './schema';

export {
  ShotOutcomeSchema,
  ShotEventSchema,
  PassOutcomeSchema,
  PassEventSchema,
  TackleEventSchema,
  CarryEventSchema,
  InterceptionEventSchema,
  MatchEventSchema,
} from './events';

export type {
  ShotOutcome,
  ShotEvent,
  PassOutcome,
  PassEvent,
  TackleEvent,
  CarryEvent,
  InterceptionEvent,
  MatchEvent,
} from './events';

// Type guards
export function isShotEvent(event: MatchEvent): event is import('./events').ShotEvent {
  return event.type === 'shot';
}

export function isPassEvent(event: MatchEvent): event is import('./events').PassEvent {
  return event.type === 'pass';
}

export function isTackleEvent(event: MatchEvent): event is import('./events').TackleEvent {
  return event.type === 'tackle';
}

export function isCarryEvent(event: MatchEvent): event is import('./events').CarryEvent {
  return event.type === 'carry';
}

export function isInterceptionEvent(
  event: MatchEvent
): event is import('./events').InterceptionEvent {
  return event.type === 'interception';
}

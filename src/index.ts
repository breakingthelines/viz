// Football - Primitives
export { Pitch, PlayerMarker, Arrow } from './football/primitives/index';
export type {
  PitchProps,
  PitchVariant,
  PlayerMarkerProps,
  ArrowProps,
} from './football/primitives/index';

// Football - Compositions
export { ShotMap, FormationBoard } from './football/compositions/index';
export type { ShotMapProps, FormationBoardProps } from './football/compositions/index';

// Football - Types (proto)
export type {
  NormalizedMatchData,
  DataSource,
  Team,
  Player,
  PitchCoordinates,
  MatchEvent,
  ShotEventData,
  PassEventData,
  TackleEventData,
  CarryEventData,
  InterceptionEventData,
  Formation,
  FormationPosition,
} from './football/types/index';

export {
  EventType,
  ShotOutcome,
  PassHeight,
  PassOutcome,
  TackleOutcome,
  DuelType,
  InterceptionOutcome,
  BodyPart,
} from './football/types/index';

export { isShot, isPass, isTackle, isCarry, isInterception } from './football/types/index';

export {
  eventTypeName,
  shotOutcomeName,
  passHeightName,
  passOutcomeName,
  tackleOutcomeName,
  duelTypeName,
  interceptionOutcomeName,
  bodyPartName,
} from './football/types/index';

// Shared components
export { DataAttribution } from './components/index';
export type { DataAttributionProps } from './components/index';

// Utilities
export {
  fromStatsBomb,
  fromOpta,
  fromWyscout,
  toSvgCoords,
  toHalfPitchCoords,
  mirrorCoords,
  distance,
  angle,
  exportAsPng,
  exportAsSvg,
  exportAsBlob,
  copyToClipboard,
} from './utils/index';
export type { ExportOptions } from './utils/index';

// Lib
export { cn } from './lib/utils';

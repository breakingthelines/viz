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

// Football - Types
export type {
  DataSource,
  PitchCoordinates,
  Player,
  Team,
  MatchInfo,
  FormationPosition,
  Formation,
  NormalizedMatchData,
  ShotOutcome,
  ShotEvent,
  PassOutcome,
  PassEvent,
  TackleEvent,
  CarryEvent,
  InterceptionEvent,
  MatchEvent,
} from './football/types/index';

export {
  isShotEvent,
  isPassEvent,
  isTackleEvent,
  isCarryEvent,
  isInterceptionEvent,
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

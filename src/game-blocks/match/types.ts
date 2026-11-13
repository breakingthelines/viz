import type {
  GameBlockAbsenceJson,
  GameBlockMatchJson,
  GameBlockPlayerGradeJson,
  GameBlockRefJson,
  GameBlockSideJson,
  GameBlockValueJson,
} from '../parts/team-league-match-common';

/**
 * Match block data as `toJson()` writes it (protos 0.209.0), public fields
 * only. Pinned by `types.pin.test.ts` in this folder.
 */

export interface GameBlockMatchStatJson {
  key?: string;
  label?: string;
  home?: GameBlockValueJson;
  away?: GameBlockValueJson;
}

export interface MatchStatsDataJson {
  match?: GameBlockMatchJson;
  stats?: GameBlockMatchStatJson[];
}

export interface GameBlockScorerJson {
  player?: GameBlockRefJson;
  side?: GameBlockSideJson;
  minute?: string;
  /** "pen", "og". Empty for an open play goal. */
  detail?: string;
}

export interface MatchResultDataJson {
  match?: GameBlockMatchJson;
  scorers?: GameBlockScorerJson[];
}

export type GameBlockMatchEventKindJson =
  | 'KIND_UNSPECIFIED'
  | 'KIND_GOAL'
  | 'KIND_OWN_GOAL'
  | 'KIND_PENALTY_GOAL'
  | 'KIND_MISSED_PENALTY'
  | 'KIND_YELLOW_CARD'
  | 'KIND_RED_CARD'
  | 'KIND_SUBSTITUTION'
  | 'KIND_VAR';

export interface GameBlockMatchEventJson {
  minute?: string;
  side?: GameBlockSideJson;
  kind?: GameBlockMatchEventKindJson;
  player?: GameBlockRefJson;
  relatedPlayer?: GameBlockRefJson;
  detail?: string;
}

export interface MatchTimelineDataJson {
  match?: GameBlockMatchJson;
  events?: GameBlockMatchEventJson[];
}

export interface MatchFanGradesDataJson {
  match?: GameBlockMatchJson;
  home?: GameBlockPlayerGradeJson[];
  away?: GameBlockPlayerGradeJson[];
  homeAverage?: number;
  awayAverage?: number;
  homeFormation?: string;
  awayFormation?: string;
}

export interface MatchPlayerOfTheMatchDataJson {
  match?: GameBlockMatchJson;
  winner?: GameBlockPlayerGradeJson;
  runnerUp?: GameBlockPlayerGradeJson;
  totalVotes?: number;
}

export interface MatchPredictionsDataJson {
  match?: GameBlockMatchJson;
  homeShare?: number;
  drawShare?: number;
  awayShare?: number;
  mostPickedScore?: string;
  mostPickedShare?: number;
  readerCount?: number;
}

export interface MatchMissingPlayersDataJson {
  match?: GameBlockMatchJson;
  home?: GameBlockAbsenceJson[];
  away?: GameBlockAbsenceJson[];
}

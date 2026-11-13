/**
 * Player block data as JSON (protos 0.209.0, `toJson` output): lowerCamel
 * names, enums as full names, default values left out. Public fields only; a
 * paid figure is a cell key. `data.pin.test.ts` pins every field name to the
 * generated protos types.
 */
import type { GameBlockFamilyJson, MetricStateJson } from '../types';

export type GameBlockVenueJson =
  | 'GAME_BLOCK_VENUE_UNSPECIFIED'
  | 'GAME_BLOCK_VENUE_HOME'
  | 'GAME_BLOCK_VENUE_AWAY'
  | 'GAME_BLOCK_VENUE_NEUTRAL';

export type GameBlockResultJson =
  | 'GAME_BLOCK_RESULT_UNSPECIFIED'
  | 'GAME_BLOCK_RESULT_WIN'
  | 'GAME_BLOCK_RESULT_DRAW'
  | 'GAME_BLOCK_RESULT_LOSS';

export interface GameBlockRefJson {
  id?: string;
  name?: string;
  shortName?: string;
  imageUrl?: string;
  url?: string;
}

export interface GameBlockValueJson {
  value?: number;
  display?: string;
}

export interface GameBlockPlayerMatchJson {
  gameId?: string;
  date?: string;
  opponent?: GameBlockRefJson;
  venue?: GameBlockVenueJson;
  result?: GameBlockResultJson;
  score?: string;
  minutes?: number;
  goals?: number;
  assists?: number;
  rating?: number;
  competitionLabel?: string;
  url?: string;
}

export interface GameBlockTransferJson {
  date?: string;
  player?: GameBlockRefJson;
  from?: GameBlockRefJson;
  to?: GameBlockRefJson;
  type?: string;
  fee?: string;
}

export interface GameBlockHonourJson {
  competition?: GameBlockRefJson;
  seasonLabel?: string;
  place?: string;
}

export interface GameBlockAbsenceJson {
  player?: GameBlockRefJson;
  from?: string;
  to?: string;
  reason?: string;
  gamesMissed?: number;
  expectedReturn?: string;
  status?: string;
}

export interface GameBlockSeasonStatJson {
  key?: string;
  label?: string;
  total?: GameBlockValueJson;
  per90Cell?: string;
  percentileCell?: string;
  medianCell?: string;
}

export interface PlayerSeasonTotalsDataJson {
  stats?: GameBlockSeasonStatJson[];
  appearances?: number;
  minutes?: number;
  team?: GameBlockRefJson;
  highlightTeamRank?: number;
  nextTeamMate?: GameBlockRefJson;
  nextTeamMateTotal?: GameBlockValueJson;
}

export interface PlayerFormDataJson {
  matches?: GameBlockPlayerMatchJson[];
  windowAverageRating?: number;
  seasonAverageRating?: number;
}

export interface GameBlockComparisonMetricJson {
  key?: string;
  label?: string;
  shortLabel?: string;
  family?: string;
  subjectState?: MetricStateJson;
  subjectPercentile?: number;
  comparisonState?: MetricStateJson;
  comparisonPercentile?: number;
  subjectValueCell?: string;
  comparisonValueCell?: string;
}

export interface PlayerComparisonDataJson {
  metrics?: GameBlockComparisonMetricJson[];
  families?: GameBlockFamilyJson[];
  subjectGroupPhrase?: string;
  comparisonGroupPhrase?: string;
  subjectMinutes?: number;
  comparisonMinutes?: number;
}

export interface GameBlockCareerRowJson {
  team?: GameBlockRefJson;
  years?: string;
  appearances?: number;
  goals?: number;
  assists?: number;
}

export interface PlayerCareerDataJson {
  rows?: GameBlockCareerRowJson[];
  total?: GameBlockCareerRowJson;
}

export interface PlayerMatchLogDataJson {
  matches?: GameBlockPlayerMatchJson[];
  seasonAverageRating?: number;
}

export interface GameBlockArchetypeJson {
  id?: string;
  name?: string;
  fit?: number;
  poolPhrase?: string;
}

export interface PlayerArchetypesDataJson {
  archetypes?: GameBlockArchetypeJson[];
}

export interface GameBlockSeasonJson {
  seasonId?: string;
  label?: string;
  groupPhrase?: string;
}

export interface GameBlockTrendPointJson {
  seasonId?: string;
  state?: MetricStateJson;
  percentile?: number;
  valueCell?: string;
}

export interface GameBlockTrendMetricJson {
  key?: string;
  label?: string;
  points?: GameBlockTrendPointJson[];
}

export interface PlayerSeasonTrendDataJson {
  seasons?: GameBlockSeasonJson[];
  metrics?: GameBlockTrendMetricJson[];
}

export interface GameBlockSimilarRowJson {
  nameCell?: string;
  teamCell?: string;
  similarityCell?: string;
}

export interface PlayerSimilarDataJson {
  count?: number;
  scopePhrase?: string;
  rows?: GameBlockSimilarRowJson[];
}

export interface PlayerTransfersDataJson {
  transfers?: GameBlockTransferJson[];
}

export interface PlayerHonoursDataJson {
  honours?: GameBlockHonourJson[];
  winnerCount?: number;
}

export interface PlayerAbsencesDataJson {
  absences?: GameBlockAbsenceJson[];
}

export interface PlayerDetailsDataJson {
  age?: number;
  dateOfBirth?: string;
  heightCm?: number;
  foot?: string;
  nationality?: string;
  position?: string;
  contractEnd?: string;
  team?: GameBlockRefJson;
  squadAverageAge?: number;
}

import type {
  GameBlockMatchJson,
  GameBlockRefJson,
  GameBlockValueJson,
} from '../parts/team-league-match-common';

/**
 * League block data as `toJson()` writes it (protos 0.209.0), public fields
 * only. A paid value is a cell key, never a number. Pinned by
 * `types.pin.test.ts` in this folder.
 */

export interface GameBlockStandingRowJson {
  rank?: number;
  team?: GameBlockRefJson;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
  /** Oldest first: "WWDLW". */
  form?: string;
}

export interface LeagueTableDataJson {
  rows?: GameBlockStandingRowJson[];
  groupLabel?: string;
  totalRows?: number;
}

export interface GameBlockColumnJson {
  key?: string;
  label?: string;
  leagueMedian?: GameBlockValueJson;
  lowerIsBetter?: boolean;
}

export interface GameBlockTeamStatsRowJson {
  team?: GameBlockRefJson;
  values?: GameBlockValueJson[];
}

export interface LeagueTeamStatsDataJson {
  columns?: GameBlockColumnJson[];
  rows?: GameBlockTeamStatsRowJson[];
  sort?: string;
}

export interface GameBlockLeaderRowJson {
  rank?: number;
  player?: GameBlockRefJson;
  team?: GameBlockRefJson;
  value?: GameBlockValueJson;
}

export interface LeagueLeadersDataJson {
  category?: string;
  categoryLabel?: string;
  rows?: GameBlockLeaderRowJson[];
}

export interface GameBlockRankingRowJson {
  rank?: number;
  player?: GameBlockRefJson;
  team?: GameBlockRefJson;
  value?: GameBlockValueJson;
  percentile?: number;
  valueCell?: string;
  percentileCell?: string;
  nameCell?: string;
  teamCell?: string;
}

export interface LeaguePlayerRankingsDataJson {
  metricKey?: string;
  metricLabel?: string;
  groupLabel?: string;
  memberCount?: number;
  per90?: boolean;
  gated?: boolean;
  rows?: GameBlockRankingRowJson[];
  median?: GameBlockValueJson;
  medianCell?: string;
}

export interface LeagueFixturesDataJson {
  label?: string;
  games?: GameBlockMatchJson[];
}

export interface GameBlockTieJson {
  home?: GameBlockRefJson;
  away?: GameBlockRefJson;
  legs?: GameBlockMatchJson[];
  winner?: GameBlockRefJson;
  aggregate?: string;
}

export interface GameBlockRoundJson {
  label?: string;
  ties?: GameBlockTieJson[];
}

export interface LeagueBracketDataJson {
  rounds?: GameBlockRoundJson[];
}

export interface GameBlockStrengthRowJson {
  rank?: number;
  leagueCell?: string;
  indexCell?: string;
}

export interface LeagueStrengthDataJson {
  count?: number;
  methodLine?: string;
  rows?: GameBlockStrengthRowJson[];
}

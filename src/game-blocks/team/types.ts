import type {
  GameBlockAbsenceJson,
  GameBlockHonourJson,
  GameBlockRefJson,
  GameBlockTeamMatchJson,
  GameBlockTransferJson,
  GameBlockValueJson,
} from '../parts/team-league-match-common';

/**
 * Team and manager block data as `toJson()` writes it (protos 0.209.0),
 * public fields only. Pinned by `types.pin.test.ts` in this folder.
 */

export interface GameBlockTeamStatJson {
  key?: string;
  label?: string;
  value?: GameBlockValueJson;
  /** 1 is best. 0 when unranked. */
  leagueRank?: number;
  leagueMedian?: GameBlockValueJson;
  lowerIsBetter?: boolean;
}

export interface TeamSeasonTotalsDataJson {
  stats?: GameBlockTeamStatJson[];
  played?: number;
  teamCount?: number;
}

export interface TeamFormDataJson {
  matches?: GameBlockTeamMatchJson[];
  windowPointsPerGame?: number;
  seasonPointsPerGame?: number;
}

export interface GameBlockPeriodJson {
  label?: string;
  goalsFor?: number;
  goalsAgainst?: number;
}

export interface TeamGoalTimingDataJson {
  periods?: GameBlockPeriodJson[];
}

export interface GameBlockSquadPlayerJson {
  player?: GameBlockRefJson;
  shirtNumber?: number;
  age?: number;
}

export interface GameBlockSquadGroupJson {
  label?: string;
  players?: GameBlockSquadPlayerJson[];
}

export interface TeamSquadDataJson {
  groups?: GameBlockSquadGroupJson[];
}

export interface TeamOutAndDoubtfulDataJson {
  players?: GameBlockAbsenceJson[];
}

export interface TeamTransfersDataJson {
  windowLabel?: string;
  ins?: GameBlockTransferJson[];
  outs?: GameBlockTransferJson[];
}

export interface TeamHonoursDataJson {
  honours?: GameBlockHonourJson[];
  winnerCount?: number;
}

export interface GameBlockTenureJson {
  team?: GameBlockRefJson;
  from?: string;
  to?: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  winRate?: number;
}

export interface ManagerRecordDataJson {
  coach?: GameBlockRefJson;
  tenures?: GameBlockTenureJson[];
  careerWinRate?: number;
}

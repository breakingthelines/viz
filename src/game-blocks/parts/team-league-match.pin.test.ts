import type {
  GameBlockAbsence,
  GameBlockColumn,
  GameBlockHonour,
  GameBlockLeaderRow,
  GameBlockMatch,
  GameBlockMatchEvent,
  GameBlockMatchSide,
  GameBlockMatchStat,
  GameBlockPeriod,
  GameBlockPlayerGrade,
  GameBlockRankingRow,
  GameBlockRef,
  GameBlockRound,
  GameBlockScorer,
  GameBlockSquadGroup,
  GameBlockSquadPlayer,
  GameBlockStandingRow,
  GameBlockStrengthRow,
  GameBlockTeamMatch,
  GameBlockTeamStat,
  GameBlockTeamStatsRow,
  GameBlockTenure,
  GameBlockTie,
  GameBlockTransfer,
  GameBlockValue,
  LeagueBracketData,
  LeagueFixturesData,
  LeagueLeadersData,
  LeaguePlayerRankingsData,
  LeagueStrengthData,
  LeagueTableData,
  LeagueTeamStatsData,
  ManagerRecordData,
  MatchFanGradesData,
  MatchMissingPlayersData,
  MatchPlayerOfTheMatchData,
  MatchPredictionsData,
  MatchResultData,
  MatchStatsData,
  MatchTimelineData,
  TeamFormData,
  TeamGoalTimingData,
  TeamHonoursData,
  TeamOutAndDoubtfulData,
  TeamSeasonTotalsData,
  TeamSquadData,
  TeamTransfersData,
} from '../../generated/game/v1/types/game_block_pb';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  GameBlockAbsenceJson,
  GameBlockHonourJson,
  GameBlockMatchJson,
  GameBlockMatchSideJson,
  GameBlockPlayerGradeJson,
  GameBlockRefJson,
  GameBlockTeamMatchJson,
  GameBlockTransferJson,
  GameBlockValueJson,
} from './team-league-match-common';
import type {
  GameBlockPeriodJson,
  GameBlockSquadGroupJson,
  GameBlockSquadPlayerJson,
  GameBlockTeamStatJson,
  GameBlockTenureJson,
  ManagerRecordDataJson,
  TeamFormDataJson,
  TeamGoalTimingDataJson,
  TeamHonoursDataJson,
  TeamOutAndDoubtfulDataJson,
  TeamSeasonTotalsDataJson,
  TeamSquadDataJson,
  TeamTransfersDataJson,
} from '../team/types';
import type {
  GameBlockColumnJson,
  GameBlockLeaderRowJson,
  GameBlockRankingRowJson,
  GameBlockRoundJson,
  GameBlockStandingRowJson,
  GameBlockStrengthRowJson,
  GameBlockTeamStatsRowJson,
  GameBlockTieJson,
  LeagueBracketDataJson,
  LeagueFixturesDataJson,
  LeagueLeadersDataJson,
  LeaguePlayerRankingsDataJson,
  LeagueStrengthDataJson,
  LeagueTableDataJson,
  LeagueTeamStatsDataJson,
} from '../league/types';
import type {
  GameBlockMatchEventJson,
  GameBlockMatchStatJson,
  GameBlockScorerJson,
  MatchFanGradesDataJson,
  MatchMissingPlayersDataJson,
  MatchPlayerOfTheMatchDataJson,
  MatchPredictionsDataJson,
  MatchResultDataJson,
  MatchStatsDataJson,
  MatchTimelineDataJson,
} from '../match/types';

/**
 * Pins the team, league and match JSON types to protos 0.209.0: a field added,
 * removed or renamed in protos fails `tsc` here until the types follow.
 */
type Fields<M> = Exclude<keyof M, '$typeName' | '$unknown'>;

describe('team, league and match types mirror the protos', () => {
  it('pins every message field name', () => {
    expectTypeOf<keyof GameBlockRefJson>().toEqualTypeOf<Fields<GameBlockRef>>();
    expectTypeOf<keyof GameBlockValueJson>().toEqualTypeOf<Fields<GameBlockValue>>();
    expectTypeOf<keyof GameBlockMatchSideJson>().toEqualTypeOf<Fields<GameBlockMatchSide>>();
    expectTypeOf<keyof GameBlockMatchJson>().toEqualTypeOf<Fields<GameBlockMatch>>();
    expectTypeOf<keyof GameBlockTeamMatchJson>().toEqualTypeOf<Fields<GameBlockTeamMatch>>();
    expectTypeOf<keyof GameBlockTransferJson>().toEqualTypeOf<Fields<GameBlockTransfer>>();
    expectTypeOf<keyof GameBlockHonourJson>().toEqualTypeOf<Fields<GameBlockHonour>>();
    expectTypeOf<keyof GameBlockAbsenceJson>().toEqualTypeOf<Fields<GameBlockAbsence>>();
    expectTypeOf<keyof GameBlockPlayerGradeJson>().toEqualTypeOf<Fields<GameBlockPlayerGrade>>();
    expectTypeOf<keyof GameBlockTeamStatJson>().toEqualTypeOf<Fields<GameBlockTeamStat>>();
    expectTypeOf<keyof TeamSeasonTotalsDataJson>().toEqualTypeOf<Fields<TeamSeasonTotalsData>>();
    expectTypeOf<keyof TeamFormDataJson>().toEqualTypeOf<Fields<TeamFormData>>();
    expectTypeOf<keyof GameBlockPeriodJson>().toEqualTypeOf<Fields<GameBlockPeriod>>();
    expectTypeOf<keyof TeamGoalTimingDataJson>().toEqualTypeOf<Fields<TeamGoalTimingData>>();
    expectTypeOf<keyof GameBlockSquadPlayerJson>().toEqualTypeOf<Fields<GameBlockSquadPlayer>>();
    expectTypeOf<keyof GameBlockSquadGroupJson>().toEqualTypeOf<Fields<GameBlockSquadGroup>>();
    expectTypeOf<keyof TeamSquadDataJson>().toEqualTypeOf<Fields<TeamSquadData>>();
    expectTypeOf<keyof TeamOutAndDoubtfulDataJson>().toEqualTypeOf<
      Fields<TeamOutAndDoubtfulData>
    >();
    expectTypeOf<keyof TeamTransfersDataJson>().toEqualTypeOf<Fields<TeamTransfersData>>();
    expectTypeOf<keyof TeamHonoursDataJson>().toEqualTypeOf<Fields<TeamHonoursData>>();
    expectTypeOf<keyof GameBlockTenureJson>().toEqualTypeOf<Fields<GameBlockTenure>>();
    expectTypeOf<keyof ManagerRecordDataJson>().toEqualTypeOf<Fields<ManagerRecordData>>();
    expectTypeOf<keyof GameBlockStandingRowJson>().toEqualTypeOf<Fields<GameBlockStandingRow>>();
    expectTypeOf<keyof LeagueTableDataJson>().toEqualTypeOf<Fields<LeagueTableData>>();
    expectTypeOf<keyof GameBlockColumnJson>().toEqualTypeOf<Fields<GameBlockColumn>>();
    expectTypeOf<keyof GameBlockTeamStatsRowJson>().toEqualTypeOf<Fields<GameBlockTeamStatsRow>>();
    expectTypeOf<keyof LeagueTeamStatsDataJson>().toEqualTypeOf<Fields<LeagueTeamStatsData>>();
    expectTypeOf<keyof GameBlockLeaderRowJson>().toEqualTypeOf<Fields<GameBlockLeaderRow>>();
    expectTypeOf<keyof LeagueLeadersDataJson>().toEqualTypeOf<Fields<LeagueLeadersData>>();
    expectTypeOf<keyof GameBlockRankingRowJson>().toEqualTypeOf<Fields<GameBlockRankingRow>>();
    expectTypeOf<keyof LeaguePlayerRankingsDataJson>().toEqualTypeOf<
      Fields<LeaguePlayerRankingsData>
    >();
    expectTypeOf<keyof LeagueFixturesDataJson>().toEqualTypeOf<Fields<LeagueFixturesData>>();
    expectTypeOf<keyof GameBlockTieJson>().toEqualTypeOf<Fields<GameBlockTie>>();
    expectTypeOf<keyof GameBlockRoundJson>().toEqualTypeOf<Fields<GameBlockRound>>();
    expectTypeOf<keyof LeagueBracketDataJson>().toEqualTypeOf<Fields<LeagueBracketData>>();
    expectTypeOf<keyof GameBlockStrengthRowJson>().toEqualTypeOf<Fields<GameBlockStrengthRow>>();
    expectTypeOf<keyof LeagueStrengthDataJson>().toEqualTypeOf<Fields<LeagueStrengthData>>();
    expectTypeOf<keyof GameBlockMatchStatJson>().toEqualTypeOf<Fields<GameBlockMatchStat>>();
    expectTypeOf<keyof MatchStatsDataJson>().toEqualTypeOf<Fields<MatchStatsData>>();
    expectTypeOf<keyof GameBlockScorerJson>().toEqualTypeOf<Fields<GameBlockScorer>>();
    expectTypeOf<keyof MatchResultDataJson>().toEqualTypeOf<Fields<MatchResultData>>();
    expectTypeOf<keyof GameBlockMatchEventJson>().toEqualTypeOf<Fields<GameBlockMatchEvent>>();
    expectTypeOf<keyof MatchTimelineDataJson>().toEqualTypeOf<Fields<MatchTimelineData>>();
    expectTypeOf<keyof MatchFanGradesDataJson>().toEqualTypeOf<Fields<MatchFanGradesData>>();
    expectTypeOf<keyof MatchPlayerOfTheMatchDataJson>().toEqualTypeOf<
      Fields<MatchPlayerOfTheMatchData>
    >();
    expectTypeOf<keyof MatchPredictionsDataJson>().toEqualTypeOf<Fields<MatchPredictionsData>>();
    expectTypeOf<keyof MatchMissingPlayersDataJson>().toEqualTypeOf<
      Fields<MatchMissingPlayersData>
    >();
  });
});

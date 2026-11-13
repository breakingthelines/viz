import type { GameBlockJson, GameBlockTypeId } from '../types';
import leagueBracket from './league-bracket.example.json';
import leagueFixtures from './league-fixtures.example.json';
import leagueLeaders from './league-leaders.example.json';
import leaguePlayerRankings from './league-player-rankings.example.json';
import leagueStrength from './league-strength.example.json';
import leagueTable from './league-table.example.json';
import leagueTeamStats from './league-team-stats.example.json';
import managerRecord from './manager-record.example.json';
import matchFanGrades from './match-fan-grades.example.json';
import matchMissingPlayers from './match-missing-players.example.json';
import matchPlayerOfTheMatch from './match-player-of-the-match.example.json';
import matchPredictions from './match-predictions.example.json';
import matchResult from './match-result.example.json';
import matchStats from './match-stats.example.json';
import matchTimeline from './match-timeline.example.json';
import teamForm from './team-form.example.json';
import teamGoalTiming from './team-goal-timing.example.json';
import teamHonours from './team-honours.example.json';
import teamOutAndDoubtful from './team-out-and-doubtful.example.json';
import teamSeasonTotals from './team-season-totals.example.json';
import teamSquad from './team-squad.example.json';
import teamTransfers from './team-transfers.example.json';

/**
 * Example team, manager, league and match blocks for stories and tests.
 * EXAMPLE FIGURES ONLY: plausible, not real, in the shape of a
 * `BuildGameBlocks` response.
 */
export const TEAM_LEAGUE_MATCH_EXAMPLES: Partial<Record<GameBlockTypeId, GameBlockJson>> = {
  'league-bracket': leagueBracket as unknown as GameBlockJson,
  'league-fixtures': leagueFixtures as unknown as GameBlockJson,
  'league-leaders': leagueLeaders as unknown as GameBlockJson,
  'league-player-rankings': leaguePlayerRankings as unknown as GameBlockJson,
  'league-strength': leagueStrength as unknown as GameBlockJson,
  'league-table': leagueTable as unknown as GameBlockJson,
  'league-team-stats': leagueTeamStats as unknown as GameBlockJson,
  'manager-record': managerRecord as unknown as GameBlockJson,
  'match-fan-grades': matchFanGrades as unknown as GameBlockJson,
  'match-missing-players': matchMissingPlayers as unknown as GameBlockJson,
  'match-player-of-the-match': matchPlayerOfTheMatch as unknown as GameBlockJson,
  'match-predictions': matchPredictions as unknown as GameBlockJson,
  'match-result': matchResult as unknown as GameBlockJson,
  'match-stats': matchStats as unknown as GameBlockJson,
  'match-timeline': matchTimeline as unknown as GameBlockJson,
  'team-form': teamForm as unknown as GameBlockJson,
  'team-goal-timing': teamGoalTiming as unknown as GameBlockJson,
  'team-honours': teamHonours as unknown as GameBlockJson,
  'team-out-and-doubtful': teamOutAndDoubtful as unknown as GameBlockJson,
  'team-season-totals': teamSeasonTotals as unknown as GameBlockJson,
  'team-squad': teamSquad as unknown as GameBlockJson,
  'team-transfers': teamTransfers as unknown as GameBlockJson,
};

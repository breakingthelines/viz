import { LEAGUE_BLOCKS } from './league/index';
import { MATCH_BLOCKS } from './match/index';
import { PLAYER_BLOCKS } from './player/index';
import { TEAM_BLOCKS } from './team/index';
import type { AnyGameBlockComponent } from './block-props';
import type { GameBlockSubjectKind, GameBlockTypeId } from './types';

/**
 * Every game block type: its id, the proto enum and oneof key it arrives
 * under, its palette label and submenu, search keywords, the subject kinds it
 * takes, the editor node that stores it, and the component that draws it.
 *
 * Labels are sentence case. A type without a component yet renders the frame
 * with "Update to see this block" (see `GameBlockView`).
 */

export type GameBlockSubmenu = 'player' | 'team' | 'league' | 'match';

/** The editor node a type is stored in. Existing node types keep their ids. */
export type GameBlockNodeType = 'game-block' | 'stats-card' | 'career-table' | 'match-stats';

export interface GameBlockRegistryEntry {
  id: GameBlockTypeId;
  /** `GameBlockType` enum name as JSON carries it. */
  protoType: string;
  /** The `GameBlock.data` oneof key as JSON carries it. */
  dataKey: string;
  label: string;
  submenu: GameBlockSubmenu;
  subjectKinds: GameBlockSubjectKind[];
  node: GameBlockNodeType;
  keywords: string[];
  component?: AnyGameBlockComponent;
}

export const SUBMENU_LABELS: Record<GameBlockSubmenu, string> = {
  player: 'Player',
  team: 'Team',
  league: 'League',
  match: 'Match',
};

const ENTRIES: Omit<GameBlockRegistryEntry, 'component'>[] = [
  {
    id: 'player-percentile-wheel',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_PERCENTILE_WHEEL',
    dataKey: 'playerPercentileWheel',
    label: 'Percentile wheel',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['wheel', 'radar', 'pizza', 'percentile', 'profile'],
  },
  {
    id: 'player-season-totals',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_SEASON_TOTALS',
    dataKey: 'playerSeasonTotals',
    label: 'Season totals',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'stats-card',
    keywords: ['season', 'totals', 'stats', 'goals', 'assists', 'per 90'],
  },
  {
    id: 'player-form',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_FORM',
    dataKey: 'playerForm',
    label: 'Form',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['form', 'ratings', 'last games', 'recent'],
  },
  {
    id: 'player-comparison',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_COMPARISON',
    dataKey: 'playerComparison',
    label: 'Comparison',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['compare', 'versus', 'head to head', 'wheel'],
  },
  {
    id: 'player-career',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_CAREER',
    dataKey: 'playerCareer',
    label: 'Career',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'career-table',
    keywords: ['career', 'clubs', 'history', 'seasons'],
  },
  {
    id: 'player-match-log',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_MATCH_LOG',
    dataKey: 'playerMatchLog',
    label: 'Match log',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['match log', 'games', 'appearances', 'ratings'],
  },
  {
    id: 'player-archetypes',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_ARCHETYPES',
    dataKey: 'playerArchetypes',
    label: 'Archetypes',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['archetype', 'role', 'style', 'profile'],
  },
  {
    id: 'player-season-trend',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_SEASON_TREND',
    dataKey: 'playerSeasonTrend',
    label: 'Season trend',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['trend', 'seasons', 'over time', 'progression'],
  },
  {
    id: 'player-similar',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_SIMILAR',
    dataKey: 'playerSimilar',
    label: 'Similar players',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['similar', 'like', 'comparable', 'scouting'],
  },
  {
    id: 'player-transfers',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_TRANSFERS',
    dataKey: 'playerTransfers',
    label: 'Transfers',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['transfers', 'moves', 'fees', 'signings'],
  },
  {
    id: 'player-honours',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_HONOURS',
    dataKey: 'playerHonours',
    label: 'Honours',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['honours', 'trophies', 'titles', 'medals'],
  },
  {
    id: 'player-absences',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_ABSENCES',
    dataKey: 'playerAbsences',
    label: 'Absences',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['injuries', 'absences', 'suspensions', 'availability'],
  },
  {
    id: 'player-details',
    protoType: 'GAME_BLOCK_TYPE_PLAYER_DETAILS',
    dataKey: 'playerDetails',
    label: 'Details',
    submenu: 'player',
    subjectKinds: ['player'],
    node: 'game-block',
    keywords: ['details', 'age', 'height', 'foot', 'contract'],
  },
  {
    id: 'team-season-totals',
    protoType: 'GAME_BLOCK_TYPE_TEAM_SEASON_TOTALS',
    dataKey: 'teamSeasonTotals',
    label: 'Season totals',
    submenu: 'team',
    subjectKinds: ['team'],
    node: 'stats-card',
    keywords: ['season', 'totals', 'stats', 'team', 'club'],
  },
  {
    id: 'team-form',
    protoType: 'GAME_BLOCK_TYPE_TEAM_FORM',
    dataKey: 'teamForm',
    label: 'Form',
    submenu: 'team',
    subjectKinds: ['team'],
    node: 'game-block',
    keywords: ['form', 'results', 'last games', 'team', 'club'],
  },
  {
    id: 'team-goal-timing',
    protoType: 'GAME_BLOCK_TYPE_TEAM_GOAL_TIMING',
    dataKey: 'teamGoalTiming',
    label: 'Goal timing',
    submenu: 'team',
    subjectKinds: ['team'],
    node: 'game-block',
    keywords: ['goal timing', 'minutes', 'periods', 'when'],
  },
  {
    id: 'team-squad',
    protoType: 'GAME_BLOCK_TYPE_TEAM_SQUAD',
    dataKey: 'teamSquad',
    label: 'Squad',
    submenu: 'team',
    subjectKinds: ['team'],
    node: 'game-block',
    keywords: ['squad', 'players', 'roster'],
  },
  {
    id: 'team-out-and-doubtful',
    protoType: 'GAME_BLOCK_TYPE_TEAM_OUT_AND_DOUBTFUL',
    dataKey: 'teamOutAndDoubtful',
    label: 'Out and doubtful',
    submenu: 'team',
    subjectKinds: ['team'],
    node: 'game-block',
    keywords: ['injuries', 'out', 'doubtful', 'availability'],
  },
  {
    id: 'team-transfers',
    protoType: 'GAME_BLOCK_TYPE_TEAM_TRANSFERS',
    dataKey: 'teamTransfers',
    label: 'Transfers',
    submenu: 'team',
    subjectKinds: ['team'],
    node: 'game-block',
    keywords: ['transfers', 'signings', 'departures', 'window'],
  },
  {
    id: 'team-honours',
    protoType: 'GAME_BLOCK_TYPE_TEAM_HONOURS',
    dataKey: 'teamHonours',
    label: 'Honours',
    submenu: 'team',
    subjectKinds: ['team'],
    node: 'game-block',
    keywords: ['honours', 'trophies', 'titles'],
  },
  {
    id: 'manager-record',
    protoType: 'GAME_BLOCK_TYPE_MANAGER_RECORD',
    dataKey: 'managerRecord',
    label: 'Manager record',
    submenu: 'team',
    subjectKinds: ['team', 'coach'],
    node: 'game-block',
    keywords: ['manager', 'coach', 'head coach', 'record', 'tenure'],
  },
  {
    id: 'league-table',
    protoType: 'GAME_BLOCK_TYPE_LEAGUE_TABLE',
    dataKey: 'leagueTable',
    label: 'Table',
    submenu: 'league',
    subjectKinds: ['competition'],
    node: 'game-block',
    keywords: ['table', 'standings', 'league', 'competition'],
  },
  {
    id: 'league-team-stats',
    protoType: 'GAME_BLOCK_TYPE_LEAGUE_TEAM_STATS',
    dataKey: 'leagueTeamStats',
    label: 'Team stats',
    submenu: 'league',
    subjectKinds: ['competition'],
    node: 'game-block',
    keywords: ['team stats', 'league', 'competition', 'compare'],
  },
  {
    id: 'league-leaders',
    protoType: 'GAME_BLOCK_TYPE_LEAGUE_LEADERS',
    dataKey: 'leagueLeaders',
    label: 'Leaders',
    submenu: 'league',
    subjectKinds: ['competition'],
    node: 'game-block',
    keywords: ['leaders', 'top scorers', 'assists', 'league'],
  },
  {
    id: 'league-player-rankings',
    protoType: 'GAME_BLOCK_TYPE_LEAGUE_PLAYER_RANKINGS',
    dataKey: 'leaguePlayerRankings',
    label: 'Player rankings',
    submenu: 'league',
    subjectKinds: ['competition'],
    node: 'game-block',
    keywords: ['rankings', 'players', 'league', 'percentile'],
  },
  {
    id: 'league-fixtures',
    protoType: 'GAME_BLOCK_TYPE_LEAGUE_FIXTURES',
    dataKey: 'leagueFixtures',
    label: 'Fixtures',
    submenu: 'league',
    subjectKinds: ['competition'],
    node: 'game-block',
    keywords: ['fixtures', 'results', 'matchday', 'schedule'],
  },
  {
    id: 'league-bracket',
    protoType: 'GAME_BLOCK_TYPE_LEAGUE_BRACKET',
    dataKey: 'leagueBracket',
    label: 'Bracket',
    submenu: 'league',
    subjectKinds: ['competition'],
    node: 'game-block',
    keywords: ['bracket', 'knockout', 'cup', 'tournament'],
  },
  {
    id: 'league-strength',
    protoType: 'GAME_BLOCK_TYPE_LEAGUE_STRENGTH',
    dataKey: 'leagueStrength',
    label: 'League strength',
    submenu: 'league',
    subjectKinds: ['competition'],
    node: 'game-block',
    keywords: ['league strength', 'index', 'compare leagues'],
  },
  {
    id: 'match-stats',
    protoType: 'GAME_BLOCK_TYPE_MATCH_STATS',
    dataKey: 'matchStats',
    label: 'Match stats',
    submenu: 'match',
    subjectKinds: ['game'],
    node: 'match-stats',
    keywords: ['match stats', 'game stats', 'possession', 'shots'],
  },
  {
    id: 'match-result',
    protoType: 'GAME_BLOCK_TYPE_MATCH_RESULT',
    dataKey: 'matchResult',
    label: 'Result',
    submenu: 'match',
    subjectKinds: ['game'],
    node: 'game-block',
    keywords: ['result', 'score', 'scorers', 'match'],
  },
  {
    id: 'match-timeline',
    protoType: 'GAME_BLOCK_TYPE_MATCH_TIMELINE',
    dataKey: 'matchTimeline',
    label: 'Timeline',
    submenu: 'match',
    subjectKinds: ['game'],
    node: 'game-block',
    keywords: ['timeline', 'events', 'goals', 'cards', 'subs'],
  },
  {
    id: 'match-fan-grades',
    protoType: 'GAME_BLOCK_TYPE_MATCH_FAN_GRADES',
    dataKey: 'matchFanGrades',
    label: 'Fan grades',
    submenu: 'match',
    subjectKinds: ['game'],
    node: 'game-block',
    keywords: ['fan grades', 'ratings', 'readers', 'votes'],
  },
  {
    id: 'match-player-of-the-match',
    protoType: 'GAME_BLOCK_TYPE_MATCH_PLAYER_OF_THE_MATCH',
    dataKey: 'matchPlayerOfTheMatch',
    label: 'Player of the match',
    submenu: 'match',
    subjectKinds: ['game'],
    node: 'game-block',
    keywords: ['player of the match', 'motm', 'vote'],
  },
  {
    id: 'match-predictions',
    protoType: 'GAME_BLOCK_TYPE_MATCH_PREDICTIONS',
    dataKey: 'matchPredictions',
    label: 'Predictions',
    submenu: 'match',
    subjectKinds: ['game'],
    node: 'game-block',
    keywords: ['predictions', 'readers', 'score', 'pick'],
  },
  {
    id: 'match-missing-players',
    protoType: 'GAME_BLOCK_TYPE_MATCH_MISSING_PLAYERS',
    dataKey: 'matchMissingPlayers',
    label: 'Missing players',
    submenu: 'match',
    subjectKinds: ['game'],
    node: 'game-block',
    keywords: ['missing', 'injuries', 'suspended', 'absent'],
  },
];

const COMPONENTS: Partial<Record<GameBlockTypeId, GameBlockRegistryEntry['component']>> = {
  ...PLAYER_BLOCKS,
  ...TEAM_BLOCKS,
  ...LEAGUE_BLOCKS,
  ...MATCH_BLOCKS,
};

export const GAME_BLOCK_REGISTRY: readonly GameBlockRegistryEntry[] = ENTRIES.map((e) => ({
  ...e,
  component: COMPONENTS[e.id],
}));

const BY_ID = new Map(GAME_BLOCK_REGISTRY.map((e) => [e.id, e]));
const BY_PROTO = new Map(GAME_BLOCK_REGISTRY.map((e) => [e.protoType, e]));

export function gameBlockEntry(id: string): GameBlockRegistryEntry | undefined {
  return BY_ID.get(id as GameBlockTypeId);
}

export function gameBlockEntryForProto(protoType: string): GameBlockRegistryEntry | undefined {
  return BY_PROTO.get(protoType);
}

export function isGameBlockTypeId(id: string): id is GameBlockTypeId {
  return BY_ID.has(id as GameBlockTypeId);
}

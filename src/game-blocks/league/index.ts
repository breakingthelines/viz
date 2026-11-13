import type { GameBlockComponentMap } from '../block-props';
import { LeagueBracketBlock } from './bracket';
import { LeagueFixturesBlock } from './fixtures';
import { LeagueLeadersBlock } from './leaders';
import { LeaguePlayerRankingsBlock } from './player-rankings';
import { LeagueStrengthBlock } from './strength';
import { LeagueTableBlock } from './table';
import { LeagueTeamStatsBlock } from './team-stats';

/** League block components, keyed by type id. */
export const LEAGUE_BLOCKS: GameBlockComponentMap = {
  'league-table': LeagueTableBlock,
  'league-team-stats': LeagueTeamStatsBlock,
  'league-leaders': LeagueLeadersBlock,
  'league-player-rankings': LeaguePlayerRankingsBlock,
  'league-fixtures': LeagueFixturesBlock,
  'league-bracket': LeagueBracketBlock,
  'league-strength': LeagueStrengthBlock,
};

export {
  LeagueBracketBlock,
  LeagueFixturesBlock,
  LeagueLeadersBlock,
  LeaguePlayerRankingsBlock,
  LeagueStrengthBlock,
  LeagueTableBlock,
  LeagueTeamStatsBlock,
};
export type * from './types';

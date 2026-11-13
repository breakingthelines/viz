import type { GameBlockComponentMap } from '../block-props';
import { TeamFormBlock } from './form';
import { TeamGoalTimingBlock } from './goal-timing';
import { TeamHonoursBlock } from './honours';
import { ManagerRecordBlock } from './manager-record';
import { TeamOutAndDoubtfulBlock } from './out-and-doubtful';
import { TeamSeasonTotalsBlock } from './season-totals';
import { TeamSquadBlock } from './squad';
import { TeamTransfersBlock } from './transfers';

/** Team block components (manager record included), keyed by type id. */
export const TEAM_BLOCKS: GameBlockComponentMap = {
  'team-season-totals': TeamSeasonTotalsBlock,
  'team-form': TeamFormBlock,
  'team-goal-timing': TeamGoalTimingBlock,
  'team-squad': TeamSquadBlock,
  'team-out-and-doubtful': TeamOutAndDoubtfulBlock,
  'team-transfers': TeamTransfersBlock,
  'team-honours': TeamHonoursBlock,
  'manager-record': ManagerRecordBlock,
};

export {
  ManagerRecordBlock,
  TeamFormBlock,
  TeamGoalTimingBlock,
  TeamHonoursBlock,
  TeamOutAndDoubtfulBlock,
  TeamSeasonTotalsBlock,
  TeamSquadBlock,
  TeamTransfersBlock,
};
export type * from './types';

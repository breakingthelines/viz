import type { GameBlockComponentMap } from '../block-props';
import { PlayerAbsencesBlock } from './absences';
import { PlayerArchetypesBlock } from './archetypes';
import { PlayerCareerBlock } from './career';
import { PlayerComparisonBlock } from './comparison';
import { PlayerDetailsBlock } from './details';
import { PlayerFormBlock } from './form';
import { PlayerHonoursBlock } from './honours';
import { PlayerMatchLogBlock } from './match-log';
import { PlayerPercentileWheelBlock } from './percentile-wheel';
import { PlayerSeasonTotalsBlock } from './season-totals';
import { PlayerSeasonTrendBlock } from './season-trend';
import { PlayerSimilarBlock } from './similar';
import { PlayerTransfersBlock } from './transfers';

/** Player block components, keyed by type id. */
export const PLAYER_BLOCKS: GameBlockComponentMap = {
  'player-percentile-wheel': PlayerPercentileWheelBlock,
  'player-season-totals': PlayerSeasonTotalsBlock,
  'player-form': PlayerFormBlock,
  'player-comparison': PlayerComparisonBlock,
  'player-career': PlayerCareerBlock,
  'player-match-log': PlayerMatchLogBlock,
  'player-archetypes': PlayerArchetypesBlock,
  'player-season-trend': PlayerSeasonTrendBlock,
  'player-similar': PlayerSimilarBlock,
  'player-transfers': PlayerTransfersBlock,
  'player-honours': PlayerHonoursBlock,
  'player-absences': PlayerAbsencesBlock,
  'player-details': PlayerDetailsBlock,
};

export {
  PlayerAbsencesBlock,
  PlayerArchetypesBlock,
  PlayerCareerBlock,
  PlayerComparisonBlock,
  PlayerDetailsBlock,
  PlayerFormBlock,
  PlayerHonoursBlock,
  PlayerMatchLogBlock,
  PlayerPercentileWheelBlock,
  PlayerSeasonTotalsBlock,
  PlayerSeasonTrendBlock,
  PlayerSimilarBlock,
  PlayerTransfersBlock,
};
export type * from './data';
export { PlayerFormBars } from '../parts/player-form-bars';
export type { PlayerFormBar } from '../parts/player-form-bars';
export { PlayerScaleKey, PlayerScaleRows } from '../parts/player-scale-rows';
export type { PlayerScaleRow } from '../parts/player-scale-rows';
export { PlayerTrendChart } from '../parts/player-trend-chart';
export type { PlayerTrendLine } from '../parts/player-trend-chart';

import type { GameBlockComponentMap } from '../block-props';
import { PlayerPercentileWheelBlock } from './percentile-wheel';

/** Player block components, keyed by type id. */
export const PLAYER_BLOCKS: GameBlockComponentMap = {
  'player-percentile-wheel': PlayerPercentileWheelBlock,
};

export { PlayerPercentileWheelBlock } from './percentile-wheel';

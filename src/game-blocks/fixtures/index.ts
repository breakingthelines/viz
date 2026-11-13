import type { GameBlockJson } from '../types';
import wheel from './player-percentile-wheel.example.json';

/**
 * Example blocks for stories and tests. EXAMPLE FIGURES ONLY: plausible, not
 * real, in the shape of a `BuildGameBlocks` response.
 */
export const WHEEL_EXAMPLE = wheel as unknown as GameBlockJson;

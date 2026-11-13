import type { GameBlockJson } from '../types';
import absences from './player-absences.example.json';
import archetypes from './player-archetypes.example.json';
import career from './player-career.example.json';
import comparison from './player-comparison.example.json';
import details from './player-details.example.json';
import form from './player-form.example.json';
import honours from './player-honours.example.json';
import matchLog from './player-match-log.example.json';
import seasonTotals from './player-season-totals.example.json';
import seasonTrend from './player-season-trend.example.json';
import similar from './player-similar.example.json';
import transfers from './player-transfers.example.json';

/**
 * Example player blocks for stories and tests. EXAMPLE FIGURES ONLY:
 * plausible, not real, in the shape of a `BuildGameBlocks` response.
 */
const json = (j: unknown) => j as GameBlockJson;

export const PLAYER_EXAMPLES = {
  'player-season-totals': json(seasonTotals),
  'player-form': json(form),
  'player-comparison': json(comparison),
  'player-career': json(career),
  'player-match-log': json(matchLog),
  'player-archetypes': json(archetypes),
  'player-season-trend': json(seasonTrend),
  'player-similar': json(similar),
  'player-transfers': json(transfers),
  'player-honours': json(honours),
  'player-absences': json(absences),
  'player-details': json(details),
} as const;

export type PlayerExampleId = keyof typeof PLAYER_EXAMPLES;

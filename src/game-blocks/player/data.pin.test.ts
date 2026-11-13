import type {
  GameBlockAbsence,
  GameBlockArchetype,
  GameBlockCareerRow,
  GameBlockComparisonMetric,
  GameBlockHonour,
  GameBlockPlayerMatch,
  GameBlockRef,
  GameBlockSeason,
  GameBlockSeasonStat,
  GameBlockSimilarRow,
  GameBlockTransfer,
  GameBlockTrendMetric,
  GameBlockTrendPoint,
  GameBlockValue,
  PlayerAbsencesData,
  PlayerArchetypesData,
  PlayerCareerData,
  PlayerComparisonData,
  PlayerDetailsData,
  PlayerFormData,
  PlayerHonoursData,
  PlayerMatchLogData,
  PlayerSeasonTotalsData,
  PlayerSeasonTrendData,
  PlayerSimilarData,
  PlayerTransfersData,
} from '../../generated/game/v1/types/game_block_pb';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  GameBlockAbsenceJson,
  GameBlockArchetypeJson,
  GameBlockCareerRowJson,
  GameBlockComparisonMetricJson,
  GameBlockHonourJson,
  GameBlockPlayerMatchJson,
  GameBlockRefJson,
  GameBlockSeasonJson,
  GameBlockSeasonStatJson,
  GameBlockSimilarRowJson,
  GameBlockTransferJson,
  GameBlockTrendMetricJson,
  GameBlockTrendPointJson,
  GameBlockValueJson,
  PlayerAbsencesDataJson,
  PlayerArchetypesDataJson,
  PlayerCareerDataJson,
  PlayerComparisonDataJson,
  PlayerDetailsDataJson,
  PlayerFormDataJson,
  PlayerHonoursDataJson,
  PlayerMatchLogDataJson,
  PlayerSeasonTotalsDataJson,
  PlayerSeasonTrendDataJson,
  PlayerSimilarDataJson,
  PlayerTransfersDataJson,
} from './data';

/**
 * Pins the player data JSON types to protos 0.209.0: a field added, removed or
 * renamed in protos fails `tsc` here until `data.ts` follows.
 */
type Fields<M> = Exclude<keyof M, '$typeName' | '$unknown'>;

describe('player data types mirror the protos', () => {
  it('pins every message field name', () => {
    expectTypeOf<keyof GameBlockRefJson>().toEqualTypeOf<Fields<GameBlockRef>>();
    expectTypeOf<keyof GameBlockValueJson>().toEqualTypeOf<Fields<GameBlockValue>>();
    expectTypeOf<keyof GameBlockPlayerMatchJson>().toEqualTypeOf<Fields<GameBlockPlayerMatch>>();
    expectTypeOf<keyof GameBlockTransferJson>().toEqualTypeOf<Fields<GameBlockTransfer>>();
    expectTypeOf<keyof GameBlockHonourJson>().toEqualTypeOf<Fields<GameBlockHonour>>();
    expectTypeOf<keyof GameBlockAbsenceJson>().toEqualTypeOf<Fields<GameBlockAbsence>>();
    expectTypeOf<keyof GameBlockSeasonStatJson>().toEqualTypeOf<Fields<GameBlockSeasonStat>>();
    expectTypeOf<keyof PlayerSeasonTotalsDataJson>().toEqualTypeOf<
      Fields<PlayerSeasonTotalsData>
    >();
    expectTypeOf<keyof PlayerFormDataJson>().toEqualTypeOf<Fields<PlayerFormData>>();
    expectTypeOf<keyof GameBlockComparisonMetricJson>().toEqualTypeOf<
      Fields<GameBlockComparisonMetric>
    >();
    expectTypeOf<keyof PlayerComparisonDataJson>().toEqualTypeOf<Fields<PlayerComparisonData>>();
    expectTypeOf<keyof GameBlockCareerRowJson>().toEqualTypeOf<Fields<GameBlockCareerRow>>();
    expectTypeOf<keyof PlayerCareerDataJson>().toEqualTypeOf<Fields<PlayerCareerData>>();
    expectTypeOf<keyof PlayerMatchLogDataJson>().toEqualTypeOf<Fields<PlayerMatchLogData>>();
    expectTypeOf<keyof GameBlockArchetypeJson>().toEqualTypeOf<Fields<GameBlockArchetype>>();
    expectTypeOf<keyof PlayerArchetypesDataJson>().toEqualTypeOf<Fields<PlayerArchetypesData>>();
    expectTypeOf<keyof GameBlockSeasonJson>().toEqualTypeOf<Fields<GameBlockSeason>>();
    expectTypeOf<keyof GameBlockTrendPointJson>().toEqualTypeOf<Fields<GameBlockTrendPoint>>();
    expectTypeOf<keyof GameBlockTrendMetricJson>().toEqualTypeOf<Fields<GameBlockTrendMetric>>();
    expectTypeOf<keyof PlayerSeasonTrendDataJson>().toEqualTypeOf<Fields<PlayerSeasonTrendData>>();
    expectTypeOf<keyof GameBlockSimilarRowJson>().toEqualTypeOf<Fields<GameBlockSimilarRow>>();
    expectTypeOf<keyof PlayerSimilarDataJson>().toEqualTypeOf<Fields<PlayerSimilarData>>();
    expectTypeOf<keyof PlayerTransfersDataJson>().toEqualTypeOf<Fields<PlayerTransfersData>>();
    expectTypeOf<keyof PlayerHonoursDataJson>().toEqualTypeOf<Fields<PlayerHonoursData>>();
    expectTypeOf<keyof PlayerAbsencesDataJson>().toEqualTypeOf<Fields<PlayerAbsencesData>>();
    expectTypeOf<keyof PlayerDetailsDataJson>().toEqualTypeOf<Fields<PlayerDetailsData>>();
  });
});

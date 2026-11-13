import type {
  GameBlock,
  GameBlockFamily,
  GameBlockMetric,
  GameBlockOption,
  GameBlockOptionGroup,
  GameBlockSpec,
  GameBlockSubjectCard,
  GameBlockText,
  GameBlockUnavailable,
  GatedCell,
  PlayerPercentileWheelData,
} from '../generated/game/v1/types/game_block_pb';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  GameBlockFamilyJson,
  GameBlockJsonBase,
  GameBlockMetricJson,
  GameBlockOptionGroupJson,
  GameBlockOptionJson,
  GameBlockSpecJson,
  GameBlockSubjectCardJson,
  GameBlockTextJson,
  GameBlockUnavailableJson,
  GatedCellJson,
  PlayerPercentileWheelDataJson,
} from './types';

/**
 * Pins the hand-written JSON types to protos 0.209.0: a field added, removed
 * or renamed in protos fails `tsc` here until `types.ts` follows.
 */
type Fields<M> = Exclude<keyof M, '$typeName' | '$unknown'>;

describe('types.ts mirrors the protos', () => {
  it('pins every message field name', () => {
    expectTypeOf<keyof GameBlockMetricJson>().toEqualTypeOf<Fields<GameBlockMetric>>();
    expectTypeOf<keyof GameBlockFamilyJson>().toEqualTypeOf<Fields<GameBlockFamily>>();
    expectTypeOf<keyof PlayerPercentileWheelDataJson>().toEqualTypeOf<
      Fields<PlayerPercentileWheelData>
    >();
    expectTypeOf<keyof GameBlockSpecJson>().toEqualTypeOf<Fields<GameBlockSpec>>();
    expectTypeOf<keyof GatedCellJson>().toEqualTypeOf<Fields<GatedCell>>();
    expectTypeOf<keyof GameBlockTextJson>().toEqualTypeOf<Fields<GameBlockText>>();
    expectTypeOf<keyof GameBlockOptionJson>().toEqualTypeOf<Fields<GameBlockOption>>();
    expectTypeOf<keyof GameBlockOptionGroupJson>().toEqualTypeOf<Fields<GameBlockOptionGroup>>();
    expectTypeOf<keyof GameBlockSubjectCardJson>().toEqualTypeOf<Fields<GameBlockSubjectCard>>();
    expectTypeOf<keyof GameBlockUnavailableJson>().toEqualTypeOf<Fields<GameBlockUnavailable>>();
    // The data oneof arrives under its case key, read through the registry.
    expectTypeOf<keyof GameBlockJsonBase>().toEqualTypeOf<Exclude<Fields<GameBlock>, 'data'>>();
  });
});

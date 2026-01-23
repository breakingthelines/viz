import { z } from 'zod';
import { PitchCoordinatesSchema, PlayerSchema, TeamSchema } from './schema';

/**
 * Base event schema with common fields
 */
const BaseEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(), // Match minute (e.g., 45.5 for 45'30")
  period: z.enum(['first_half', 'second_half', 'extra_first', 'extra_second', 'penalties']),
  team: TeamSchema,
  player: PlayerSchema.optional(),
  location: PitchCoordinatesSchema,
});

/**
 * Shot outcome types
 */
export const ShotOutcomeSchema = z.enum(['goal', 'saved', 'blocked', 'off_target', 'post']);

export type ShotOutcome = z.infer<typeof ShotOutcomeSchema>;

/**
 * Shot event
 */
export const ShotEventSchema = BaseEventSchema.extend({
  type: z.literal('shot'),
  outcome: ShotOutcomeSchema,
  xg: z.number().min(0).max(1).optional(),
  bodyPart: z.enum(['right_foot', 'left_foot', 'head', 'other']).optional(),
  technique: z.string().optional(),
  endLocation: PitchCoordinatesSchema.optional(),
});

export type ShotEvent = z.infer<typeof ShotEventSchema>;

/**
 * Pass outcome types
 */
export const PassOutcomeSchema = z.enum(['complete', 'incomplete', 'intercepted', 'out']);

export type PassOutcome = z.infer<typeof PassOutcomeSchema>;

/**
 * Pass event
 */
export const PassEventSchema = BaseEventSchema.extend({
  type: z.literal('pass'),
  outcome: PassOutcomeSchema,
  endLocation: PitchCoordinatesSchema,
  recipient: PlayerSchema.optional(),
  passType: z.enum(['ground', 'low', 'high', 'cross', 'through_ball', 'long_ball']).optional(),
  xA: z.number().min(0).max(1).optional(), // Expected assist
});

export type PassEvent = z.infer<typeof PassEventSchema>;

/**
 * Tackle event
 */
export const TackleEventSchema = BaseEventSchema.extend({
  type: z.literal('tackle'),
  outcome: z.enum(['won', 'lost']),
});

export type TackleEvent = z.infer<typeof TackleEventSchema>;

/**
 * Carry event (dribble/ball progression)
 */
export const CarryEventSchema = BaseEventSchema.extend({
  type: z.literal('carry'),
  endLocation: PitchCoordinatesSchema,
  underPressure: z.boolean().optional(),
});

export type CarryEvent = z.infer<typeof CarryEventSchema>;

/**
 * Interception event
 */
export const InterceptionEventSchema = BaseEventSchema.extend({
  type: z.literal('interception'),
  outcome: z.enum(['won', 'lost', 'touched']),
});

export type InterceptionEvent = z.infer<typeof InterceptionEventSchema>;

/**
 * Discriminated union of all event types
 */
export const MatchEventSchema = z.discriminatedUnion('type', [
  ShotEventSchema,
  PassEventSchema,
  TackleEventSchema,
  CarryEventSchema,
  InterceptionEventSchema,
]);

export type MatchEvent = z.infer<typeof MatchEventSchema>;

import { z } from 'zod';

/**
 * Data source/provider identifier
 */
export const DataSourceSchema = z.enum([
  'statsbomb',
  'opta',
  'wyscout',
  'instat',
  'skillcorner',
  'metrica',
  'custom',
]);

export type DataSource = z.infer<typeof DataSourceSchema>;

/**
 * Normalized pitch coordinates (0-100 scale)
 * x: 0 = own goal line, 100 = opposition goal line
 * y: 0 = left touchline, 100 = right touchline
 */
export const PitchCoordinatesSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export type PitchCoordinates = z.infer<typeof PitchCoordinatesSchema>;

/**
 * Player information
 */
export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  number: z.number().int().positive().optional(),
  position: z.string().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;

/**
 * Team information
 */
export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  color: z.string().optional(),
});

export type Team = z.infer<typeof TeamSchema>;

/**
 * Match information
 */
export const MatchInfoSchema = z.object({
  id: z.string(),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  date: z.string().optional(),
  competition: z.string().optional(),
  season: z.string().optional(),
  venue: z.string().optional(),
});

export type MatchInfo = z.infer<typeof MatchInfoSchema>;

/**
 * Formation position (4-3-3, 4-4-2, etc.)
 */
export const FormationPositionSchema = z.object({
  player: PlayerSchema,
  position: PitchCoordinatesSchema,
  role: z.string().optional(),
});

export type FormationPosition = z.infer<typeof FormationPositionSchema>;

/**
 * Team formation
 */
export const FormationSchema = z.object({
  team: TeamSchema,
  formation: z.string(), // e.g., "4-3-3", "4-4-2"
  positions: z.array(FormationPositionSchema),
});

export type Formation = z.infer<typeof FormationSchema>;

/**
 * Normalized match data structure
 */
export const NormalizedMatchDataSchema = z.object({
  source: DataSourceSchema,
  match: MatchInfoSchema,
  homeFormation: FormationSchema.optional(),
  awayFormation: FormationSchema.optional(),
  events: z.array(z.unknown()), // Events are typed separately
});

export type NormalizedMatchData = z.infer<typeof NormalizedMatchDataSchema>;

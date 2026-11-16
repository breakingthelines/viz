/**
 * `@breakingthelines/viz/stats` — the player-profile stat charts (spec §4.1):
 * `PercentileWheel`, `ComparisonBars`, `PercentileRows`, `ArchetypeList`,
 * `FormChart`, `SeasonTrend`, `LeagueLadder`, `SimilarList`, `StyleMap`,
 * `SimilarityOrbit` and `SimilarityOrbitPair`.
 *
 * PF-V2 ships `PercentileWheel`. PF-V3 ships `ComparisonBars`,
 * `PercentileRows`, `ArchetypeList` and `SimilarList`, plus the shared
 * types (`stat-metric.ts`) and formatting (`format.ts`) every block in
 * this subpath uses. PF-V4 lands `FormChart`, the Seasons chart and
 * `LeagueLadder` here, reusing those shared types rather than its own
 * copy (`SeasonTrend` replaced `SeasonLines` in 0.21.0).
 * `@breakingthelines/viz/brand` (mark, wordmark, watermark,
 * signature, the percentile colour ramp, `SocialFrame`) already ships
 * from PF-V1.
 */

export { PercentileWheel } from './percentile-wheel';
export type { PercentileWheelProps, PercentileWheelComparison } from './percentile-wheel';

export { ComparisonBars } from './comparison-bars';
export type { ComparisonBarsProps, ComparisonBarsRow } from './comparison-bars';

export { PercentileRows } from './percentile-rows';
export type { PercentileRowsProps } from './percentile-rows';

export { ArchetypeList } from './archetype-list';
export type { ArchetypeListProps, ArchetypeListItem } from './archetype-list';

export { SimilarList } from './similar-list';
export type { SimilarListProps, SimilarListItem } from './similar-list';

export {
  ORBIT_RED,
  ORBIT_WHITE,
  OrbitDetailStrip,
  PAIR_SCALES,
  SimilarityOrbit,
  SimilarityOrbitPair,
  pairOrbitFaces,
  singleOrbitFaces,
  useOrbitMotion,
} from './similarity-orbit';
export type {
  OrbitDetailStripProps,
  OrbitFaceRole,
  OrbitFaceSources,
  OrbitScaleChoice,
  SimilarityOrbitPairProps,
  SimilarityOrbitProps,
} from './similarity-orbit';
export {
  ORBIT_COMPACT,
  ORBIT_REGULAR,
  ORBIT_SINGLE,
  driftFor,
  isJoint,
  linkedDot,
  memberIndex,
  orbitDots,
  orbitLayout,
  pairOrbitLabel,
  placeFaces,
  placeLines,
  placesLine,
  poolSize,
  rankPhrase,
  singleOrbitLabel,
} from './similarity-orbit-model';
export type {
  DotPlace,
  FacePlace,
  OrbitData,
  OrbitLayout,
  OrbitMember,
  OrbitPlayer,
  OrbitScale,
} from './similarity-orbit-model';

export { FormChart, formOpponentCode } from './form-chart';
export type {
  FormChartMatch,
  FormChartOpponent,
  FormChartProps,
  FormChartTeam,
} from './form-chart';

export {
  SeasonTrend,
  seasonTrendReading,
  seasonTrendRuns,
  seasonTrendX,
  seasonTrendY,
} from './season-trend';
export type {
  SeasonTrendPoint,
  SeasonTrendProps,
  SeasonTrendRow,
  SeasonTrendSeason,
} from './season-trend';

export { LeagueLadder } from './league-ladder';
export type { LeagueLadderProps, LeagueLadderRow } from './league-ladder';

export { StyleMap, nudgeStyleMap, styleMapAxis, styleMapStep, tickAnchor } from './style-map';
export type { StyleMapPlaced, StyleMapPoint, StyleMapProps } from './style-map';

export { ordinal, formatMetricValue, formatPercentile } from './format';

export type { EntityLink, MetricState, StatMetric } from './stat-metric';

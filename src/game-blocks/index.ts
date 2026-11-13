// @breakingthelines/viz/game-blocks: every game block, its registry, the
// per-viewer values provider and the swappable skin.
export * from './types';
export type {
  AnyGameBlockComponent,
  GameBlockComponentMap,
  GameBlockComponentProps,
} from './block-props';
export {
  GAME_BLOCK_REGISTRY,
  SUBMENU_LABELS,
  gameBlockEntry,
  gameBlockEntryForProto,
  isGameBlockTypeId,
} from './registry';
export type { GameBlockNodeType, GameBlockRegistryEntry, GameBlockSubmenu } from './registry';
export { gatedValuesFromJson, toGameBlockConfig } from './to-config';
export type { ToGameBlockConfigResult } from './to-config';
export {
  GameBlockScope,
  GameBlockValuesProvider,
  useBlockLocked,
  useGatedCell,
  usePlansHref,
} from './values';
export type { GameBlockValuesMap, GameBlockValuesProviderProps } from './values';
export { GameBlockMessage, GameBlockView, SUPPORTED_DATA_VERSION } from './view';
export type { GameBlockViewProps } from './view';
export * from './skin/index';
export * from './player/index';
export * from './team/index';
export * from './league/index';
export * from './match/index';

// Team, league and match parts, for hosts that draw these figures outside a
// block (the player parts are exported from './player/index').
export {
  BlockGrid,
  RefName,
  ResultStrip,
  ScaleCell,
  SectionLabel,
  SplitBar,
} from './parts/team-league-match-ui';
export type { GridColumn, GridRow } from './parts/team-league-match-ui';
export {
  GRADE_BEST,
  GRADE_WORST,
  gradeScaleLabel,
  gradeToScale,
  rankToScale,
} from './parts/team-league-match-common';
export { TeamFormRows } from './parts/team-form';
export { GoalTimingChart, periodShort } from './parts/team-goal-timing';
export { HonourRows, groupHonours } from './parts/team-honours';
export type { HonourGroup } from './parts/team-honours';
export { TenureRows, tenureYears } from './parts/team-manager-tenures';
export { AbsenceRows, absenceReason, absenceReturn } from './parts/team-absences';
export { SquadList } from './parts/team-squad';
export { TransferRows, TransferWindow, transferTerms } from './parts/team-transfers';
export { TeamSeasonStatRows, pickTeamStat } from './parts/team-season-stats';
export { TableNote } from './parts/league-common';
export { KnockoutBracket } from './parts/league-bracket';
export { FixtureList, fixtureMiddle, groupByDay } from './parts/league-fixtures';
export { LeaderRows } from './parts/league-leaders';
export { RankingRows } from './parts/league-rankings';
export { StrengthRows } from './parts/league-strength';
export { StandingsTable } from './parts/league-table';
export { TeamStatsTable } from './parts/league-team-stats';
export { matchHero } from './parts/match-common';
export { FanGradeSides, GradeList, GradePitch, topGraded } from './parts/match-fan-grades';
export { PlayerOfTheMatchScale } from './parts/match-player-of-the-match';
export { PredictionRows } from './parts/match-predictions';
export type { PredictionShare } from './parts/match-predictions';
export { ScorerColumns, scorerLines } from './parts/match-scorers';
export { MatchStatRows } from './parts/match-stats';
export { EVENT_LABEL, TimelineRows, eventWho } from './parts/match-timeline';

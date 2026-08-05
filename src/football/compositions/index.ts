export { ShotMap } from './shot-map';
export type { ShotMapProps, ShotMapVariant } from './shot-map';

export { FormationBoard } from './formation-board';
export type { FormationBoardProps } from './formation-board';

export { PlayerRatingBoard } from './player-rating-board';
export type {
  PlayerGrade,
  PlayerRatingBoardEntry,
  PlayerRatingBoardProps,
} from './player-rating-board';

export { LineupPitch } from './lineup-pitch';
export type {
  LineupPitchProps,
  LineupSlot,
  LineupSlotPlayer,
  LineupMarkerContent,
} from './lineup-pitch';

export { LineupCard, LINEUP_CARD_FRAME_SIZE, useLineupFrame } from './lineup-card';
export type { LineupCardProps, LineupCardFrame, LineupCardFocalPoint } from './lineup-card';

export { LineupList } from './lineup-list';
export type { LineupListProps } from './lineup-list';

export { LineupCardPitch } from './lineup-card-pitch';
export type { LineupCardPitchProps } from './lineup-card-pitch';

// `cardPitchSlots` was removed in 0.14.0. It reversed a lineup's DEPTH axis to
// get the card's keeper-at-the-top viewpoint, which is a mirror rather than a
// rotation and published every card with its left and right flanks swapped.
// The viewpoint is now `LineupPitch`'s `orientation="portrait-down"`, and
// callers pass ordinary lineup coordinates — see `Pitch`'s `toScreen`.
export {
  LineupCardCarousel,
  LineupCardView,
  LEADING_SLIDE_ID,
  LINEUP_CARD_VARIANTS,
  LINEUP_CARD_VIEW_HEIGHT,
  LINEUP_CARD_VIEW_SCALE_VAR,
} from './lineup-card-carousel';
export type {
  LineupCardBody,
  LineupCardCarouselProps,
  LineupCardLeadingSlide,
  LineupCardSlide,
  LineupCardVariant,
  LineupCardViewData,
} from './lineup-card-carousel';

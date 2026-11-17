// The block skin: the only place game blocks make visual decisions. Blocks
// import from here; a replacement skin replaces this folder.
export { BlockFrame, NARROW_BELOW, TitleArt, usePairArtStatus, usePersonArtStatus } from './frame';
export type { BlockFrameProps, BlockHero, BlockMedia } from './frame';
export {
  DEFAULT_MEDIA_BASE,
  GameBlockAssetsProvider,
  playerHalftoneUrl,
  playerHeadshotUrl,
  resolveMediaSrc,
  teamCrestSrc,
  useMediaBase,
} from './assets';
export {
  BlockBaseline,
  BlockFigure,
  BlockRows,
  BlockScale,
  GatedValue,
  LockedRule,
  TABULAR,
  useBodyFont,
} from './primitives';
export type { BlockRow } from './primitives';
export {
  BlockActionsContext,
  GameBlockSkinProvider,
  useBlockLayout,
  useBlockScale,
  useBlockSkin,
} from './provider';
export { clubFit, clubName, clubShort, surname } from './names';
export {
  Bar,
  CrestCell,
  FactRows,
  InFrame,
  LabelCell,
  NameCell,
  Num,
  NumCell,
  QuietLines,
  Row,
  Rows,
  Section,
  SectionHeading,
  Sections,
  StatCell,
  useWordStyle,
} from './rows';
export type { Fact } from './rows';
export type { BlockActions, BlockLayout } from './provider';
export { BLOCK_SCALE, DEFAULT_BLOCK_SKIN, skinCssVars } from './tokens';
export type { BlockScaleTokens, BlockSkinTokens } from './tokens';

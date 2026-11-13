// The block skin: the only place game blocks make visual decisions. Blocks
// import from here; a replacement skin replaces this folder.
export { BlockFrame, NARROW_BELOW } from './frame';
export type { BlockFrameProps, BlockHero, BlockMedia } from './frame';
export {
  DEFAULT_MEDIA_BASE,
  GameBlockAssetsProvider,
  playerHalftoneUrl,
  playerHeadshotUrl,
  resolveMediaSrc,
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
export { GameBlockSkinProvider, useBlockLayout, useBlockSkin } from './provider';
export type { BlockLayout } from './provider';
export { DEFAULT_BLOCK_SKIN, skinCssVars } from './tokens';
export type { BlockSkinTokens } from './tokens';

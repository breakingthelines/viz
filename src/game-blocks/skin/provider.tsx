import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { GameBlockDensity, GameBlockLook } from '../types';
import { DEFAULT_BLOCK_SKIN, type BlockSkinTokens } from './tokens';

const SkinContext = createContext<BlockSkinTokens>(DEFAULT_BLOCK_SKIN);

/**
 * Overrides skin tokens for every block below. A host that wants a lighter or
 * branded block passes the tokens it changes; the rest keep their defaults.
 */
export function GameBlockSkinProvider({
  skin,
  children,
}: {
  skin?: Partial<BlockSkinTokens>;
  children: ReactNode;
}) {
  const parent = useContext(SkinContext);
  const value = useMemo(() => ({ ...parent, ...skin }), [parent, skin]);
  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

/** The resolved skin tokens, for values an SVG attribute needs as a literal. */
export function useBlockSkin(): BlockSkinTokens {
  return useContext(SkinContext);
}

/**
 * Told the look a block draws, which differs from the one asked for when a
 * poster has no usable image and draws as editorial. Set by `GameBlockView`'s
 * `onLookDrawn`.
 */
export const DrawnLookContext = createContext<((look: GameBlockLook) => void) | undefined>(
  undefined
);

export interface BlockLayout {
  look: GameBlockLook;
  density: GameBlockDensity;
  /** True below the two-column width (phone, chat, tile). */
  narrow: boolean;
}

export const LayoutContext = createContext<BlockLayout>({
  look: 'editorial',
  density: 'article',
  narrow: true,
});

/** The enclosing frame's look and width class. */
export function useBlockLayout(): BlockLayout {
  return useContext(LayoutContext);
}

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Where a block finds a player's pictures when the block data does not carry
 * them.
 *
 * Game blocks are built by game-service, whose subject card leaves the
 * headshot empty for most players (the platform draws headshots from the
 * entity asset chain by id, not from that field). The poster needs a photo,
 * so it builds the addresses from the player's canonical id, the same CDN
 * convention design-system's entityAssetCandidates uses:
 *
 *   resolved/player-halftone/<id>   the poster halftone, pre-rendered by
 *                                   content-service's player-cutouts job
 *   apifootball/player/<id>.png     the mirrored API-Football headshot
 *
 * The base is BTL's media CDN and already ends in /media. A host on another
 * environment passes its own through GameBlockAssetsProvider.
 */
export const DEFAULT_MEDIA_BASE = 'https://cdn.breakingthelines.app/media';

const MediaBaseContext = createContext<string>(DEFAULT_MEDIA_BASE);

export function GameBlockAssetsProvider({
  mediaBase,
  children,
}: {
  mediaBase?: string;
  children: ReactNode;
}) {
  const parent = useContext(MediaBaseContext);
  return (
    <MediaBaseContext.Provider value={mediaBase || parent}>{children}</MediaBaseContext.Provider>
  );
}

export function useMediaBase(): string {
  return useContext(MediaBaseContext);
}

const TRAILING_SLASH = /\/+$/;
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function base(mediaBase: string): string {
  return mediaBase.replace(TRAILING_SLASH, '');
}

/** The pre-rendered poster halftone for a player. */
export function playerHalftoneUrl(mediaBase: string, playerId: string): string {
  return `${base(mediaBase)}/resolved/player-halftone/${encodeURIComponent(playerId)}`;
}

/** The mirrored API-Football headshot for a player. */
export function playerHeadshotUrl(mediaBase: string, playerId: string): string {
  return `${base(mediaBase)}/apifootball/player/${encodeURIComponent(playerId)}.png`;
}

/**
 * A block image address made loadable: absolute URLs and data URIs as they
 * are, a relative CDN key (`media/...`, which identity and game-service emit)
 * on the media base, so it never resolves against the page's own origin.
 */
export function resolveMediaSrc(src: string | undefined, mediaBase: string): string | undefined {
  const v = src?.trim();
  if (!v) return undefined;
  if (ABSOLUTE.test(v)) return v;
  const key = v.replace(/^\/+/, '');
  if (key.startsWith('media/')) return `${base(mediaBase)}/${key.slice('media/'.length)}`;
  return v;
}

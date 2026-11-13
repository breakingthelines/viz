import type { ReactNode } from 'react';
import type { GameBlockComponentProps } from '../block-props';
import type { BlockFrameProps, BlockMedia } from '../skin/index';
import type { GameBlockConfig } from '../types';
import type { GameBlockResultJson, GameBlockVenueJson } from './data';

/**
 * Helpers every player block shares: the frame props a block always passes,
 * and the short labels its rows use. Labels only, never sentences.
 */

/** "Arsenal, 2025/26", else the context line game-service wrote. */
export function playerContext(config: GameBlockConfig<unknown>): string {
  const parts = [config.subject.subtitle, config.scope.seasonLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : config.context;
}

/** "Bukayo Saka" to "Saka". */
export function surname(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

/** The props every player block passes its frame, before its own hero and body. */
export function baseFrame(
  { config, titleSlot, density }: GameBlockComponentProps<unknown>,
  exportSuffix: string,
  media?: BlockMedia
): Pick<
  BlockFrameProps,
  | 'look'
  | 'title'
  | 'titleSlot'
  | 'context'
  | 'subheading'
  | 'media'
  | 'lockedNote'
  | 'density'
  | 'exportName'
> {
  const subject = config.subject;
  return {
    look: config.look ?? 'editorial',
    title: config.title || subject.name,
    titleSlot,
    context: playerContext(config),
    subheading: config.subheading,
    media: media ?? { kind: 'person', src: subject.imageUrl, crestSrc: subject.crestUrl },
    lockedNote: config.lockedNote,
    density,
    exportName: `btl-${subject.name}-${exportSuffix}`,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "2026-11-09" to "9 Nov", or "Nov 2026" with `withYear`. A bare "2027" stays
 * as it is. Written by hand so server and client agree whatever the locale.
 */
export function shortDate(iso: string | undefined, withYear = false): string {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(iso ?? '');
  if (!m) return iso ?? '';
  const [, y, mo, d] = m;
  if (!mo) return y;
  const month = MONTHS[Number(mo) - 1] ?? '';
  if (withYear || !d) return `${month} ${y}`;
  return `${Number(d)} ${month}`;
}

/** 2410 to "2,410". */
export function thousands(n: number): string {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** One decimal: 7.125 to "7.1". */
export function oneDecimal(n: number | undefined): string {
  return typeof n === 'number' ? n.toFixed(1) : '–';
}

export const RESULT_LETTER: Record<GameBlockResultJson, string> = {
  GAME_BLOCK_RESULT_UNSPECIFIED: '',
  GAME_BLOCK_RESULT_WIN: 'W',
  GAME_BLOCK_RESULT_DRAW: 'D',
  GAME_BLOCK_RESULT_LOSS: 'L',
};

export const VENUE_LETTER: Record<GameBlockVenueJson, string> = {
  GAME_BLOCK_VENUE_UNSPECIFIED: '',
  GAME_BLOCK_VENUE_HOME: 'H',
  GAME_BLOCK_VENUE_AWAY: 'A',
  GAME_BLOCK_VENUE_NEUTRAL: 'N',
};

/** A label with a quieter second part: "Arsenal" then "2018 to now". */
export function TwoPart({ main, quiet }: { main: ReactNode; quiet?: ReactNode }) {
  if (!quiet) return <>{main}</>;
  return (
    <>
      {main} <span style={{ color: 'var(--btl-block-ink-3)' }}>{quiet}</span>
    </>
  );
}

/** "a 0 to 100 scale" from a percentile, or null when there is none. */
export function pctOf(n: number | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

import type { CSSProperties } from 'react';
import { cn } from '#/lib/utils';

/**
 * A small team crest / country badge for the football blocks — the single home
 * for rendering a remote crest image, so every block gets identical, correct
 * behaviour instead of hand-rolling an `<img>` each time.
 *
 * Two things this primitive owns so they can never drift per-block:
 *
 *  - `crossOrigin="anonymous"`. The "save as image" feature rasterises the block
 *    into a `<canvas>` (html-to-image); the browser only lets a cross-origin
 *    image be drawn to canvas — without tainting it — when the image was fetched
 *    in CORS mode, which requires this attribute. The BTL CDN returns a matching
 *    `Access-Control-Allow-Origin` per request. Miss it and the crest renders on
 *    screen but comes out BLANK in the saved PNG. This is the required web-
 *    platform contract, not a workaround — see {@link SvgHeadshot} for the
 *    headshot equivalent.
 *  - Absent-url guard: no `url` → render nothing (never a broken-image chip).
 *
 * The default styling matches the common crest (a ~16px rounded, contained
 * badge that sits inline beside a team name). Blocks that need a variant
 * (circular, non-rounded, dimmed) pass `className`/`style`, merged over the
 * default via `cn`.
 */
export interface CrestProps {
  /** Remote crest URL. When absent/empty, nothing renders. */
  url?: string;
  /** Accessible title (team/country name). Omit for purely decorative use. */
  name?: string;
  /** Extra classes merged over the default badge styling. */
  className?: string;
  /** Inline style (e.g. a dimmed opacity for the inactive side). */
  style?: CSSProperties;
}

export function Crest({ url, name, className, style }: CrestProps) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      width={16}
      height={16}
      // Required for the crest to survive the share-as-image canvas capture; see
      // the component doc above. Do NOT remove.
      crossOrigin="anonymous"
      className={cn('inline-block size-4 rounded object-contain align-middle', className)}
      style={style}
      title={name}
    />
  );
}

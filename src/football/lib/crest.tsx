import type { CSSProperties } from 'react';
import { cn } from '#/lib/utils';

/**
 * A small team crest or country badge for the football blocks. It is the single
 * home for rendering a remote crest image, so every block gets the same
 * behaviour instead of hand-rolling an `<img>`.
 *
 * It is a plain `<img>` on purpose, with no `crossOrigin`. The same CDN URL is
 * often loaded plainly elsewhere on the page: `SvgHeadshot`, the Pass Sonar
 * focus-card crest, a host's own lineup or match-stats block. The browser HTTP
 * cache keys a response by URL, and the CDN (R2) sends
 * `Access-Control-Allow-Origin` only when the request carries an `Origin`,
 * without `Vary: Origin` on the plain response. A `crossOrigin` load that finds
 * a fresh plain copy in cache is served that copy, fails the CORS check, and the
 * crest never renders. On an origin missing from the CDN's CORS allowlist
 * (admin, localhost, Storybook) it fails on every load.
 *
 * Save as image does not need the attribute. `captureElementToPng`
 * (`utils/export.ts`) never reads pixels from this element: html-to-image
 * fetches every `<img>` src again with `{ mode: 'cors', cache: 'no-cache' }`
 * and draws the `data:` URL it gets back. `no-cache` revalidates with the CDN,
 * so a plain cached copy never answers that fetch.
 * `utils/crest-capture.stories.tsx` checks both behaviours in Chromium, and
 * `remote-images.test.ts` fails if the attribute comes back.
 *
 * With no `url` it renders nothing, never a broken-image chip.
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
      className={cn('inline-block size-4 rounded object-contain align-middle', className)}
      style={style}
      title={name}
    />
  );
}

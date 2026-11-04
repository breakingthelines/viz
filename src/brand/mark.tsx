import { useId } from 'react';

/**
 * The BTL bracket mark, as a self-contained public SVG component.
 *
 * Path data taken verbatim from the approved mock (`scratchpad/prof/wheel2.py`
 * — `MARK_L`/`MARK_R`), the same geometry `football/lib/btl-logo.tsx`'s
 * internal `BtlMark` draws (viewBox `0 0 29.091 28.022`, scaled there from
 * `0 0 29.09 28.02` — effectively identical). This one is sized by a plain
 * `size` number rather than `className`/`style`, since the profile build's
 * charts (the wheel's centre mark, the social card's header mark) need an
 * exact pixel size at render time, computed from chart geometry rather than
 * styled from the outside.
 */

const MARK_L = 'M12.467 0V8.516H9.049V19.513H12.467V28.022H0V0H12.467Z';
const MARK_R = 'M29.091 0V28.022H16.628V19.513H20.046V8.516H16.628V0H29.091Z';

/** Intrinsic mark geometry (mock viewBox). */
export const MARK_WIDTH = 29.091;
export const MARK_HEIGHT = 28.022;

export interface BtlMarkProps {
  /** Rendered width in px. Height follows the mark's own aspect ratio. */
  size: number;
  /** Fill colour. Defaults to the BTL brand red. */
  fill?: string;
  /**
   * `false` when the mark is the only thing identifying something — e.g.
   * standalone brand use — so it needs an accessible name. Defaults to
   * `true`: most placements (the wheel's centre, a decorative flourish)
   * already sit inside their own labelled container, and the mock marks
   * this mark `aria-hidden="true"` (`mark_g`, `scratchpad/prof/wheel2.py`).
   */
  decorative?: boolean;
}

export function BtlMark({ size, fill = '#E20613', decorative = true }: BtlMarkProps) {
  const height = (size * MARK_HEIGHT) / MARK_WIDTH;
  const titleId = useId();
  if (decorative) {
    return (
      <svg
        width={size}
        height={height}
        viewBox={`0 0 ${MARK_WIDTH} ${MARK_HEIGHT}`}
        aria-hidden
        focusable="false"
      >
        <path d={MARK_L} fill={fill} />
        <path d={MARK_R} fill={fill} />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 ${MARK_WIDTH} ${MARK_HEIGHT}`}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>Breaking The Lines</title>
      <path d={MARK_L} fill={fill} />
      <path d={MARK_R} fill={fill} />
    </svg>
  );
}

/** Exported so `wordmark.tsx` and other brand components draw the identical paths. */
export { MARK_L, MARK_R };

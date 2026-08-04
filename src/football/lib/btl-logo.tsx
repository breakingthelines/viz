import { useId, type CSSProperties } from 'react';

/**
 * The BTL bracket mark — two red-gradient brackets, viewBox `0 0 29.09 28.02`.
 *
 * viz is a standalone AGPL package with NO design-system dependency, so the
 * geometry is replicated from the design-system `BtlLogo` rather than
 * imported. Keep it in sync with `design-system/src/components/ui/btl-logo.tsx`.
 *
 * Lives here — rather than inline in one consumer — because two surfaces now
 * draw it at very different scales: the blocks' colophon (`PanelFooter`, a
 * 17px mark) and the lineup social card (`LineupCard`, a 40px mark). The
 * Figma social-card export draws the identical path set, just scaled:
 * every coordinate in its 41.5251x40 artboard is this viewBox's coordinate
 * times 40/28.022, exactly (12.467 -> 17.7961, 8.516 -> 12.1557, 9.049 ->
 * 12.9166, 19.513 -> 27.8536, 29.09 -> 41.5251). So this is genuinely one
 * mark at two sizes, and a second copy of the path data would be a
 * divergence waiting to happen.
 *
 * Size it from the outside — `className` (Tailwind `size-*`) or an inline
 * width/height via `style` — since the SVG itself declares none.
 */
export function BtlMark({ className, style }: { className?: string; style?: CSSProperties }) {
  const uid = useId();
  const gl = `${uid}-l`;
  const gr = `${uid}-r`;
  return (
    <svg
      viewBox="0 0 29.09 28.02"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gl}
          x1="0"
          y1="14.01"
          x2="12.467"
          y2="14.01"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E20613" />
          <stop offset="1" stopColor="#E5332A" />
        </linearGradient>
        <linearGradient
          id={gr}
          x1="16.628"
          y1="14.01"
          x2="29.091"
          y2="14.01"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E20613" />
          <stop offset="1" stopColor="#E5332A" />
        </linearGradient>
      </defs>
      <path d="M12.467 0V8.516H9.049V19.513H12.467V28.022H0V0H12.467Z" fill={`url(#${gl})`} />
      <path d="M29.091 0V28.022H16.628V19.513H20.046V8.516H16.628V0H29.091Z" fill={`url(#${gr})`} />
    </svg>
  );
}

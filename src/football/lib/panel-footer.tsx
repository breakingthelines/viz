import { useId } from 'react';
import { cn } from '#/lib/utils';

/**
 * Shared brand + attribution footer for the football blocks: the BTL wordmark
 * on the left, the data provider's mark on the right, on a quiet divider.
 *
 * viz is a standalone AGPL package with NO design-system dependency, so the
 * BTL wordmark and the provider mark are inlined here (the design-system
 * `BtlWordmark` SVG geometry is replicated verbatim, white text). Keep this in
 * sync with `design-system/src/components/ui/btl-logo.tsx`.
 */

/** Data source behind a block — drives the provider mark. */
export type DataProvider = 'statsbomb' | 'opta' | 'none';

/**
 * The BTL bracket mark — two red-gradient brackets. Replicated from the
 * design-system `BtlLogo` (viewBox 0 0 29.09 28.02) so viz needs no ds import.
 */
function BtlMark({ className }: { className?: string }) {
  const uid = useId();
  const gl = `${uid}-l`;
  const gr = `${uid}-r`;
  return (
    <svg
      viewBox="0 0 29.09 28.02"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gl} x1="0" y1="14.01" x2="12.467" y2="14.01" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E20613" />
          <stop offset="1" stopColor="#E5332A" />
        </linearGradient>
        <linearGradient id={gr} x1="16.628" y1="14.01" x2="29.091" y2="14.01" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E20613" />
          <stop offset="1" stopColor="#E5332A" />
        </linearGradient>
      </defs>
      <path d="M12.467 0V8.516H9.049V19.513H12.467V28.022H0V0H12.467Z" fill={`url(#${gl})`} />
      <path d="M29.091 0V28.022H16.628V19.513H20.046V8.516H16.628V0H29.091Z" fill={`url(#${gr})`} />
    </svg>
  );
}

/** The BTL wordmark: bracket mark + "breaking / the lines", sized for a colophon. */
function BtlWordmark() {
  return (
    <span className="flex shrink-0 items-center gap-[7px]" aria-label="Breaking The Lines">
      <BtlMark className="size-[17px] shrink-0" />
      <span className="flex flex-col gap-0 text-[9.5px] font-semibold leading-[1.08] tracking-[-0.3px] text-white">
        <span>breaking</span>
        <span>the lines</span>
      </span>
    </span>
  );
}

/**
 * The Hudl StatsBomb provider mark, in white on transparent (the source logo is
 * orange/dark on white). Rendered as a clean white logotype: bold "hudl" +
 * lighter "statsbomb". The exact vector asset can be dropped in here later.
 */
function StatsBombMark() {
  return (
    <span
      className="flex shrink-0 items-baseline gap-[3px] text-[11px] leading-none"
      aria-label="Data: Hudl StatsBomb"
    >
      <span className="font-bold lowercase tracking-tight text-white">hudl</span>
      <span className="font-medium lowercase tracking-tight text-white/55">statsbomb</span>
    </span>
  );
}

function ProviderMark({ provider }: { provider: DataProvider }) {
  if (provider === 'statsbomb') return <StatsBombMark />;
  // Other providers fall back to nothing until their mark is added.
  return null;
}

/**
 * Brand + attribution strip pinned to the foot of a block panel: BTL wordmark
 * left, data provider right. Subtle top divider separates it from the data key.
 */
export function PanelFooter({
  provider = 'statsbomb',
  className,
}: {
  /** Data source shown on the right. Defaults to StatsBomb. */
  provider?: DataProvider;
  /** Extra classes on the footer row. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2.5',
        className
      )}
    >
      <BtlWordmark />
      <ProviderMark provider={provider} />
    </div>
  );
}

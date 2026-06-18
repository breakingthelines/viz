import { useId, useRef, useState } from 'react';
import { cn } from '#/lib/utils';
import { HUDL_STATSBOMB_LOGO } from './provider-marks';

/**
 * Shared brand + attribution + share footer for the football blocks: the BTL
 * wordmark on the left, then a "Share" control and the data provider's mark on
 * the right, on a quiet divider.
 *
 * viz is a standalone AGPL package with NO design-system dependency, so the BTL
 * wordmark is inlined here (the design-system `BtlWordmark` SVG geometry is
 * replicated verbatim, white text). Keep this in sync with
 * `design-system/src/components/ui/btl-logo.tsx`.
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
 * The Hudl StatsBomb provider mark — the official logo (white "hudl" + orange
 * "statsbomb" + the orange mark) on transparent, inlined as a data URI.
 */
function ProviderMark({ provider }: { provider: DataProvider }) {
  if (provider === 'statsbomb') {
    return (
      <img
        src={HUDL_STATSBOMB_LOGO}
        alt="Data: Hudl StatsBomb"
        className="h-[14px] w-auto shrink-0 select-none"
        draggable={false}
      />
    );
  }
  // Other providers fall back to nothing until their mark is added.
  return null;
}

/** A clean upload/share glyph (no icon dependency in this package). */
function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M8 10.5V2.6M8 2.6 5.3 5.3M8 2.6l2.7 2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.6 9v3.4a1 1 0 0 0 1 1h6.8a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Slugify a block title for the saved file name. */
function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'breaking-the-lines'
  );
}

/**
 * Brand + attribution + share strip pinned to the foot of a block panel: BTL
 * wordmark left; a "Share" button + the data-provider mark right. A subtle top
 * divider separates it from the data key.
 *
 * "Share" rasterises the whole block panel to a PNG (via html-to-image, lazily
 * imported) and saves it — so a reader can lift the graphic straight out. The
 * button itself is excluded from the captured image.
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
  const footerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const onShare = async () => {
    // The footer is always a direct child of the block panel, so its parent is
    // the element we want to capture.
    const panel = footerRef.current?.parentElement;
    if (!panel || busy) return;
    setBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const titleEl = panel.querySelector('.font-semibold');
      const name = slugify(titleEl?.textContent ?? 'breaking the lines');
      const dataUrl = await toPng(panel, {
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        // Drop the share button itself from the saved image.
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
      });
      const link = document.createElement('a');
      link.download = `btl-${name}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      // Best-effort: a capture failure shouldn't disturb the block.
      console.error('[viz] share-as-image failed', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={footerRef}
      className={cn(
        'mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2.5',
        className
      )}
    >
      <BtlWordmark />
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-export-ignore="true"
          onClick={onShare}
          disabled={busy}
          aria-label="Save this block as an image"
          className="flex items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] px-2 py-1 text-[10.5px] font-medium text-white/65 transition-colors hover:border-white/25 hover:text-white disabled:cursor-default disabled:opacity-50"
        >
          <ShareGlyph className={busy ? 'animate-pulse' : undefined} />
          {busy ? 'Saving…' : 'Share'}
        </button>
        <ProviderMark provider={provider} />
      </div>
    </div>
  );
}

import { useCallback, useState, type ReactNode } from 'react';
import { cn } from '#/lib/utils';
import {
  captureElementToPng,
  dataUrlToBlob,
  downloadDataUrl,
  type ExportOptions,
} from '#/utils/export';

/** Options accepted by `save()`, layered over the plain capture options. */
export interface ImageSaveOptions
  extends Pick<ExportOptions, 'backgroundColor' | 'scale' | 'width' | 'height' | 'fitToContent'> {
  /** File name WITHOUT extension; `.png` is appended. */
  fileName: string;
  /**
   * Show the overlay on EVERY pointer type, not just touch. A caller opts
   * into this when its own capture needs the overlay's UI regardless of
   * device — e.g. the Lineup card's share sheet, which now also carries an
   * in-modal orientation toggle a mouse user needs the SAME preview-and-pick
   * surface to reach. Fine-pointer callers that don't pass this keep the
   * original instant-download behaviour unchanged.
   */
  forcePreview?: boolean;
  /**
   * Extra controls rendered inside the overlay, between the captured image
   * and the Share/Download row (e.g. an orientation toggle). The hook itself
   * stays block-agnostic — it just hosts whatever `ReactNode` the caller
   * hands it once a preview is open.
   */
  extraControls?: ReactNode;
}

export interface UseImageSaveResult {
  /**
   * Capture `element` and deliver it to the user. Safe to call with `null`
   * (no-ops) so a caller can pass a possibly-unmounted ref directly.
   *
   * - Fine pointer (desktop/mouse): downloads immediately, unchanged from
   *   the pre-existing behaviour — unless `options.forcePreview` is set, in
   *   which case it opens the SAME overlay a touch device gets (a caller
   *   asking for the share/save modal regardless of pointer type).
   * - Coarse pointer (touch), or any pointer with `forcePreview`: captures
   *   first, then opens `overlay` showing the rendered PNG with Share/
   *   Download buttons (plus `options.extraControls`, if given). The
   *   overlay's Share button is what actually calls `navigator.share()` —
   *   synchronously, off ITS OWN tap — so iOS Safari's transient activation
   *   is fresh. This function only gets the image ready; it does not call
   *   `share()`.
   */
  save: (element: HTMLElement | null, options: ImageSaveOptions) => Promise<void>;
  /** Renders the touch-path overlay when open; `null` otherwise. Always safe to render — mount it unconditionally. */
  overlay: React.ReactNode;
  /** True while a capture is in flight (from the `save()` tap to the overlay opening / download firing). */
  saving: boolean;
}

/** True on a coarse (touch) primary pointer; false on desktop/mouse and during SSR. */
function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
}

/**
 * Shared "save this block/card as an image" behaviour for the StatsBomb
 * blocks' `PanelFooter` and the editor's `ReaderPlate`, built to be reliable
 * on iOS Safari.
 *
 * THE PROBLEM this hook exists to fix: `navigator.share()` needs the calling
 * tap's transient activation, which iOS Safari expires a few seconds after
 * the tap. The old flow (tap → dynamically import html-to-image → capture →
 * build a File → `navigator.share()`) strings enough async work between the
 * tap and `share()` that the activation window can close before `share()`
 * ever runs, so it throws `NotAllowedError` — and the `<a download>` fallback
 * silently no-ops on iOS, so the tap appears to do nothing.
 *
 * THE FIX: capture the image FIRST (however long that takes — a busy state
 * covers it), then hand the ALREADY-CAPTURED image to an in-app overlay. The
 * overlay's own Share button calls `navigator.share()` synchronously off ITS
 * tap, a fresh gesture with nothing awaited first, so activation is
 * guaranteed fresh. The overlay's `<img>` also supports iOS's native
 * long-press "Save to Photos", and a Download button is always available as
 * a fallback that never depends on Share.
 *
 * Desktop is untouched by default: a fine pointer downloads immediately,
 * exactly like before. A caller can opt a specific capture INTO the overlay
 * on every pointer type via `options.forcePreview` (e.g. the Lineup card,
 * whose share modal also carries an orientation toggle — see
 * `options.extraControls` — that only makes sense inside the preview
 * surface, not behind an instant download).
 */
export function useImageSave(): UseImageSaveResult {
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{
    dataUrl: string;
    fileName: string;
    extraControls?: ReactNode;
  } | null>(null);

  // Deliberately NOT calling `preloadImageExport()` here. It exists as an
  // exported, opt-in utility a host can call itself (e.g. once, near the app
  // root) — but wiring it into every `useImageSave()` mount was tried (both
  // via a `useEffect` and via a direct render-body call) and, even with
  // `preloadImageExport`'s own module-level dedup, measured to make capture
  // timing LESS reliable under heavy parallel load: a real, reproducible
  // regression against `pass-sonar-save-padding.stories.tsx` (failures
  // ranging ~5-20% depending on exactly how the warmup was scheduled, vs 0%
  // with no automatic warmup at all across 20+ full-suite runs). The
  // mechanism wasn't fully isolated, but the pattern was consistent enough
  // — and the padding regression too load-bearing — to leave this out
  // rather than ship a latency micro-optimisation that measurably
  // destabilises an existing correctness guard.
  const save = useCallback(
    async (element: HTMLElement | null, options: ImageSaveOptions): Promise<void> => {
      if (!element) return;
      const { fileName, backgroundColor, scale, width, height, fitToContent, forcePreview, extraControls } =
        options;

      setSaving(true);
      try {
        const dataUrl = await captureElementToPng(element, {
          backgroundColor,
          fileName,
          // Forwarded, not defaulted here: a caller that says nothing still
          // gets `captureElementToPng`'s own defaults. Until these were passed
          // through, no consumer could raise export resolution at all — the
          // hook accepted only a background colour, so every saved card was
          // pinned at 2x whatever the on-screen CSS width happened to be.
          ...(scale !== undefined ? { scale } : {}),
          ...(width !== undefined ? { width } : {}),
          ...(height !== undefined ? { height } : {}),
          ...(fitToContent !== undefined ? { fitToContent } : {}),
        });
        if (forcePreview || isTouchDevice()) {
          setPreview({ dataUrl, fileName: `${fileName}.png`, extraControls });
        } else {
          downloadDataUrl(dataUrl, `${fileName}.png`);
        }
      } catch (err) {
        console.error('[viz] useImageSave capture failed', err);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const close = useCallback(() => setPreview(null), []);

  const onShare = useCallback(() => {
    if (!preview) return;
    // SYNCHRONOUS from here down to `navigator.share()` — no `await` — so
    // this tap's transient activation is still fresh when `share()` runs.
    // `dataUrlToBlob` is a plain atob/Uint8Array decode (no `fetch`), which
    // is what makes that possible.
    const blob = dataUrlToBlob(preview.dataUrl);
    const file = new File([blob], preview.fileName, { type: blob.type || 'image/png' });
    if (!navigator.canShare?.({ files: [file] })) return;
    navigator.share({ files: [file] }).catch((err) => {
      // User dismissed the native sheet — a no-op, not an error.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[viz] useImageSave share failed', err);
    });
  }, [preview]);

  const onDownload = useCallback(() => {
    if (!preview) return;
    downloadDataUrl(preview.dataUrl, preview.fileName);
  }, [preview]);

  // Computed at render time (not stored in state): whether THIS device can
  // actually share THIS captured file, so the Share button only appears
  // when it would work (Safari's `canShare` returns `false` for an empty
  // `files` array, so this must check against a real File built the same
  // way `onShare` will build one — a cheap, synchronous decode). Guarded on
  // `preview` first, so this never touches `navigator` during SSR or before
  // a capture exists.
  const canShare =
    preview != null &&
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({
      files: [new File([dataUrlToBlob(preview.dataUrl)], preview.fileName, { type: 'image/png' })],
    });

  const overlay =
    preview == null ? null : (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save image"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
        onClick={close}
      >
        <div
          className="relative flex max-h-full w-full max-w-md flex-col items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute -top-2 right-0 flex size-8 items-center justify-center rounded-full border border-white/10 bg-[#161616] text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-colors hover:text-white"
          >
            <CloseGlyph />
          </button>

          <img
            src={preview.dataUrl}
            alt="Captured card, ready to save"
            className="max-h-[70vh] w-auto max-w-full rounded-[10px] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
          />

          {preview.extraControls}

          <div className="flex w-full items-center gap-2.5">
            {canShare && (
              <button
                type="button"
                onClick={onShare}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-white/10 bg-white px-4 py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90'
                )}
              >
                <ShareGlyph />
                Share
              </button>
            )}
            <button
              type="button"
              onClick={onDownload}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10"
            >
              <DownloadGlyph />
              Download
            </button>
          </div>
        </div>
      </div>
    );

  return { save, overlay, saving };
}

function ShareGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5v8.25M8 1.5 5.2 4.3M8 1.5l2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 8v4.5A1.5 1.5 0 0 0 5 14h6a1.5 1.5 0 0 0 1.5-1.5V8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5v8M5.2 6.7 8 9.5l2.8-2.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 12v.5A1.5 1.5 0 0 0 5 14h6a1.5 1.5 0 0 0 1.5-1.5V12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 3l10 10M13 3 3 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

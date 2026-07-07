// `html-to-image` is lazily imported inside each function below rather than
// statically at module scope — load-bearing, not stylistic. The pre-
// consolidation call site (`PanelFooter`'s `onSave`) did the same lazy
// `await import('html-to-image')`, and that async module-fetch incidentally
// gave the browser a chance to commit a style/layout mutation the caller had
// just made (e.g. stripping a selection ring) before the capture read the
// DOM. Verified empirically against `pass-sonar-save-padding.stories.tsx`
// (which runs the real capture in Chromium and measures the output PNG):
// a static top-level import, even paired with an explicit `setTimeout`- or
// double-`requestAnimationFrame`-based yield in its place, still flaked
// under full-suite load — only preserving the real lazy import reproduces
// the original's reliability.

/**
 * A 1x1 transparent PNG data URL. Used as the `html-to-image` fallback for a
 * remote image (crest/headshot) that fails to load, so one dead/blocked URL
 * can't abort an entire capture — `html-to-image` rejects the whole promise
 * on any image error unless a placeholder is supplied.
 */
const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** The `data-*` attribute a node opts into to be dropped from a capture. */
const EXPORT_IGNORE_ATTR = 'exportIgnore';

/** True if `node` is an element marked `data-export-ignore="true"`. */
function isExportIgnored(node: Node): boolean {
  return node instanceof HTMLElement && node.dataset[EXPORT_IGNORE_ATTR] === 'true';
}

export interface ExportOptions {
  /** Scale factor for the exported image (a.k.a. `pixelRatio`). Default `2`. */
  scale?: number;
  /**
   * Background color painted behind transparent pixels — including any strip
   * added by `fitToContent`'s height compensation (below). Transparent if not
   * set, matching plain `html-to-image` behaviour.
   */
  backgroundColor?: string;
  /** Quality for JPEG/WebP (0-1) */
  quality?: number;
  /** File name without extension */
  fileName?: string;
  /**
   * Exclude any node (and its subtree) marked `data-export-ignore="true"` —
   * e.g. the save button itself, or builder-only controls — from the
   * capture. Default `true`. Composed with `filter` below when both are
   * given: a node must pass BOTH to be included.
   */
  filterExportIgnore?: boolean;
  /**
   * Additional inclusion filter, composed with `filterExportIgnore`. Same
   * contract as `html-to-image`'s own `filter`: return `true` to include a
   * node (and consider its children); `false` excludes it and its subtree.
   */
  filter?: (node: HTMLElement) => boolean;
  /**
   * Force a fresh, CORS-correct fetch of every remote image in the capture
   * (`cacheBust` + `fetchRequestInit: { mode: 'cors', cache: 'no-cache' }`).
   * Without this, a stale pre-CORS edge-cache copy of a crest/headshot — one
   * served without an `Access-Control-Allow-Origin` header — taints the
   * canvas and the image comes out blank, even though the live `<img>` has
   * `crossOrigin="anonymous"` set correctly. Default `true`.
   */
  cors?: boolean;
  /**
   * Data URL substituted for any image that still fails to load (a
   * genuinely dead URL, after the `cors` re-fetch above) so one bad asset
   * can't abort the whole capture. Defaults to a 1x1 transparent PNG. Pass
   * `undefined` (with `cors: false`) to restore `html-to-image`'s own
   * default of an empty area on image-load failure.
   */
  imagePlaceholder?: string;
  /**
   * Explicitly size the capture to the element's own measured box, adding
   * its bottom padding back in. `html-to-image` derives the canvas from the
   * truncated integer `clientHeight` and drops the root node's bottom
   * padding when rasterising — visibly asymmetric top/bottom whitespace on
   * any padded panel. This measures `getBoundingClientRect` (which already
   * includes both paddings) and re-adds `paddingBottom` once more so
   * `backgroundColor` can fill the recovered strip. A no-op — identical to
   * leaving sizing to `html-to-image`, only exact — when the element has no
   * bottom padding. Default `true`.
   */
  fitToContent?: boolean;
  /**
   * Style overrides applied to the cloned node before capture, merged over
   * the built-in `{ boxShadow: 'none' }` (which neutralises any selection
   * ring/outline a host may have put on the live element — box-shadow alone
   * doesn't affect layout, so it's always safe to clear on the clone).
   */
  style?: Partial<CSSStyleDeclaration>;
}

/**
 * Build the shared `html-to-image` capture options: every export-
 * correctness fix (CORS-safe remote images, dead-image fallback, the
 * data-export-ignore filter, exact content-box sizing, selection-ring
 * neutralisation) applied by default, so any caller — `PanelFooter`'s
 * "Share" button or a host embedder's own save action — gets a correctly-
 * rendered capture without re-deriving these fixes. Must be called AFTER the
 * lazy `import('html-to-image')` (see the file-level note above) so any
 * DOM mutation the caller just made has landed before `element` is measured.
 */
function buildCaptureOptions(element: HTMLElement, options: ExportOptions) {
  const {
    scale = 2,
    backgroundColor,
    filterExportIgnore = true,
    filter,
    cors = true,
    imagePlaceholder = TRANSPARENT_PIXEL,
    fitToContent = true,
    style,
  } = options;

  const composedFilter =
    filterExportIgnore || filter
      ? (node: HTMLElement) => {
          if (filterExportIgnore && isExportIgnored(node)) return false;
          if (filter && !filter(node)) return false;
          return true;
        }
      : undefined;

  let width: number | undefined;
  let height: number | undefined;
  if (fitToContent) {
    const rect = element.getBoundingClientRect();
    const padBottom = parseFloat(getComputedStyle(element).paddingBottom) || 0;
    width = Math.ceil(rect.width);
    height = Math.ceil(rect.height) + Math.ceil(padBottom);
  }

  return {
    pixelRatio: scale,
    backgroundColor,
    width,
    height,
    style: { boxShadow: 'none', ...style },
    filter: composedFilter,
    ...(cors
      ? { cacheBust: true, fetchRequestInit: { mode: 'cors' as const, cache: 'no-cache' as const } }
      : {}),
    imagePlaceholder,
  };
}

/**
 * Export an element as PNG and trigger download.
 *
 * Applies every export-correctness fix by default: 2x `pixelRatio`,
 * CORS-safe re-fetch of remote crest/headshot images, a transparent-pixel
 * fallback for a dead image URL, the `data-export-ignore="true"` exclusion
 * filter, and exact content-box sizing that recovers the bottom padding
 * `html-to-image` otherwise drops. All of it is overridable via `options`,
 * but nothing needs to be re-specified to get a correct capture — see
 * {@link ExportOptions}.
 */
export async function exportAsPng(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { fileName = 'visualization' } = options;

  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, buildCaptureOptions(element, options));

  downloadDataUrl(dataUrl, `${fileName}.png`);
}

/**
 * Export an element as SVG and trigger download
 */
export async function exportAsSvg(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { backgroundColor, fileName = 'visualization' } = options;

  const { toSvg } = await import('html-to-image');
  const dataUrl = await toSvg(element, {
    backgroundColor,
  });

  downloadDataUrl(dataUrl, `${fileName}.svg`);
}

/**
 * Export an element as Blob (for clipboard or other uses)
 */
export async function exportAsBlob(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const { scale = 2, backgroundColor } = options;

  const { toBlob } = await import('html-to-image');
  return toBlob(element, {
    pixelRatio: scale,
    backgroundColor,
  }) as Promise<Blob>;
}

/**
 * Copy visualization to clipboard as PNG
 */
export async function copyToClipboard(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportAsBlob(element, options);

  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ]);
}

/**
 * Helper to trigger download from data URL
 */
function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

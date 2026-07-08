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
   * Fetch every remote image in the capture in CORS mode with revalidation
   * (`fetchRequestInit: { mode: 'cors', cache: 'no-cache' }`) so a stale
   * pre-CORS edge-cache copy of a crest/headshot — one served without an
   * `Access-Control-Allow-Origin` header — can't taint the canvas and blank
   * the image. Default `true`. Note this does NOT append a cache-busting
   * query string — see `cacheBust`, which is off by default because some
   * image CDNs reject any query param with a 403.
   */
  cors?: boolean;
  /**
   * Append a cache-busting query param to every remote image URL before
   * fetching. `html-to-image` offers this to dodge a poisoned browser cache,
   * but the extra query string makes some strict / token-gated image CDNs —
   * notably `media.api-sports.io`, where football headshots and crests
   * hotlink from — return `403 Forbidden`; the CORS fetch then rejects and
   * the image silently blanks (substituted by `imagePlaceholder`). `cors`
   * already forces revalidation via `cache: 'no-cache'`, so cache-busting is
   * redundant for CORS-clean hosts. Default `false`.
   */
  cacheBust?: boolean;
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
    cacheBust = false,
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
    cacheBust,
    ...(cors ? { fetchRequestInit: { mode: 'cors' as const, cache: 'no-cache' as const } } : {}),
    imagePlaceholder,
  };
}

/**
 * Rasterise `element` to a PNG data URL. Applies every export-correctness
 * fix by default: 2x `pixelRatio`, CORS-safe re-fetch of remote
 * crest/headshot images, a transparent-pixel fallback for a dead image URL,
 * the `data-export-ignore="true"` exclusion filter, and exact content-box
 * sizing that recovers the bottom padding `html-to-image` otherwise drops.
 * All of it is overridable via `options`, but nothing needs to be
 * re-specified to get a correct capture — see {@link ExportOptions}.
 *
 * This is the capture half of `exportAsPng` split out on its own so a caller
 * that needs the image BEFORE deciding how to deliver it — e.g. to show it
 * in an in-app preview and share it off a later, clean tap, where
 * `navigator.share()` must run synchronously off the user gesture with no
 * intervening await (iOS Safari's transient-activation window is only a few
 * seconds and does not survive an async capture in between) — can await the
 * capture on its own timeline and keep the share call itself gesture-clean.
 * `exportAsPng` below still does capture + save as one step for callers that
 * don't need that split.
 *
 * Keeps the lazy `import('html-to-image')` for the same reason documented at
 * the top of this file: it is load-bearing for capture timing, not just
 * bundle-splitting.
 */
export async function captureElementToPng(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<string> {
  const { toPng } = await import('html-to-image');
  // Inline cross-origin SVG <image> hrefs first — WebKit / iOS Safari hangs
  // indefinitely rasterising an SVG that references external images. Restored
  // afterwards so the live DOM keeps its original hrefs.
  const restoreSvgImages = await inlineSvgImageHrefs(element);
  // Collapse export-ignored chrome (e.g. the save button) so its siblings
  // reflow flush before capture. Restored afterwards.
  const restoreHidden = hideExportIgnored(element);
  try {
    return await toPng(element, buildCaptureOptions(element, options));
  } finally {
    restoreHidden();
    restoreSvgImages();
  }
}

/**
 * Collapse every `data-export-ignore="true"` node with `display: none` before
 * capture, returning a restore function. The `filterExportIgnore` capture
 * option drops these nodes from the clone, but html-to-image still reserves
 * their original layout box — leaving a gap where they sat (e.g. the save
 * button's slot beside a card footer's formation label, which pushes the label
 * off the corner). `display: none` removes them from layout so their siblings
 * reflow flush; restored immediately after the capture.
 */
function hideExportIgnored(element: HTMLElement): () => void {
  const nodes = Array.from(element.querySelectorAll<HTMLElement>('[data-export-ignore="true"]'));
  const previous = nodes.map((node) => node.style.display);
  for (const node of nodes) node.style.display = 'none';
  return () => {
    nodes.forEach((node, i) => {
      node.style.display = previous[i];
    });
  };
}

const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Read a Blob as a `data:` URL. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Inline every external SVG `<image>` href as a `data:` URI, returning a
 * restore function. `html-to-image` inlines HTML `<img>` and CSS backgrounds
 * but NOT SVG `<image>` (`href` / `xlink:href`), and WebKit / iOS Safari HANGS
 * indefinitely when rasterising an SVG that references a cross-origin image
 * (it won't load external resources from an SVG drawn to a canvas) — so the
 * capture never resolves and the caller is stuck "saving" forever. Our football
 * pitches render player headshots as SVG `<image>` (`SvgHeadshot`), so this is
 * load-bearing for lineups; it also stops those headshots coming out blank.
 * Best-effort per node: a failed fetch leaves that href untouched (it just
 * won't appear) rather than aborting the whole capture.
 */
async function inlineSvgImageHrefs(element: HTMLElement): Promise<() => void> {
  const nodes = Array.from(element.querySelectorAll('image'));
  const restores: Array<() => void> = [];
  await Promise.all(
    nodes.map(async (node) => {
      const hrefAttr = node.getAttribute('href');
      const xlinkAttr = node.getAttributeNS(XLINK_NS, 'href');
      const href = hrefAttr ?? xlinkAttr;
      if (!href || href.startsWith('data:')) return;
      try {
        const resp = await fetch(href, { mode: 'cors', cache: 'no-cache' });
        if (!resp.ok) return;
        const dataUrl = await blobToDataUrl(await resp.blob());
        node.setAttribute('href', dataUrl);
        if (xlinkAttr != null) node.removeAttributeNS(XLINK_NS, 'href');
        restores.push(() => {
          if (hrefAttr != null) node.setAttribute('href', hrefAttr);
          else node.removeAttribute('href');
          if (xlinkAttr != null) node.setAttributeNS(XLINK_NS, 'href', xlinkAttr);
        });
      } catch {
        /* leave this node's href as-is */
      }
    })
  );
  return () => {
    for (const restore of restores) restore();
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

  const dataUrl = await captureElementToPng(element, options);

  await saveImage(dataUrl, `${fileName}.png`);
}

/** Module-level dedup for {@link preloadImageExport} — see its JSDoc. */
let preloadStarted = false;

/**
 * Opt-in warmup: issues one `import('html-to-image')` ahead of a save tap so
 * the eventual capture (`captureElementToPng`/`exportAsPng`) hits an
 * already-loaded module instead of paying the cold `import()` cost inside
 * the user gesture's activation window. Dedups itself at the module level
 * (via `preloadStarted`) — safe to call more than once, from more than one
 * place; only the first call anywhere actually issues the `import()`.
 * Best-effort: swallows load failures (e.g. offline) and resets so a later
 * call can retry, since the lazy `import()` at capture time is still a
 * correct, if slower, fallback either way.
 *
 * NOT called automatically by `useImageSave` — this was tried (both via a
 * `useEffect` and via a direct render-body call on every mount) and, even
 * with the dedup above, measured to make `captureElementToPng`'s timing
 * LESS reliable under heavy parallel load: a real, reproducible regression
 * against `pass-sonar-save-padding.stories.tsx` (roughly 5-20% of full-suite
 * runs, depending on exactly how the warmup was scheduled, vs 0/30+ with no
 * automatic warmup). The precise mechanism wasn't fully isolated, but the
 * pattern was consistent enough, and the padding regression too
 * load-bearing, to leave the wiring out rather than ship a latency
 * micro-optimisation that measurably destabilises an existing correctness
 * guard. Exported for a host that wants to call it itself (e.g. once, near
 * an app root, well away from any save-button mount) — at its own risk if
 * doing so from many places at once under heavy load.
 */
export function preloadImageExport(): void {
  if (typeof window !== 'undefined' && !preloadStarted) {
    preloadStarted = true;
    void import('html-to-image').catch(() => {
      // Let a later real capture retry the import instead of latching a
      // permanent failure from one transient warmup error.
      preloadStarted = false;
    });
  }
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
 * Save a rendered image data URL to the device.
 *
 * On touch devices a synthetic `<a download>` click is unreliable — iOS Safari
 * ignores the `download` attribute and just opens the image inline, so tapping
 * the save button appears to do nothing. There we prefer the Web Share API,
 * which surfaces the native share sheet (with "Save Image" / "Save to Files").
 * Desktop keeps the direct download.
 *
 * NOTE: this is the fallback path for callers of `exportAsPng` who don't use
 * `useImageSave`. It still awaits a `fetch` + `share()` off the gesture, so it
 * is still subject to the original bug this module was built to fix — iOS
 * Safari's transient activation is only a few seconds and an async capture
 * ahead of this call can burn through it before `share()` runs. Callers that
 * need a RELIABLE touch share should use `useImageSave` instead: it captures
 * the PNG first, then opens an in-app overlay whose Share button calls
 * `navigator.share()` synchronously off a fresh tap (see
 * `src/components/use-image-save.tsx`). This function is kept for back-compat
 * and for non-interactive/desktop-only callers.
 */
async function saveImage(dataUrl: string, fileName: string): Promise<void> {
  const isTouch =
    typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

  if (isTouch && typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (err) {
      // User dismissed the share sheet — a no-op; don't also fire a download.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Any other failure (activation lost, share unsupported): fall through.
    }
  }

  downloadDataUrl(dataUrl, fileName);
}

/**
 * Trigger a direct file download from a data URL (desktop path). Exported
 * (in addition to being used internally by `saveImage`) so `useImageSave` can
 * reuse the exact same mechanism for its own desktop/fine-pointer branch and
 * its overlay's Download button, rather than re-deriving it.
 */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

/**
 * Synchronously decode a `data:` URL into a `Blob`, without `fetch`.
 *
 * `useImageSave`'s overlay Share button must call `navigator.share()`
 * SYNCHRONOUSLY off the tap — no `await` in between — so the browser still
 * considers the click's transient activation "fresh". `fetch(dataUrl)` (what
 * `saveImage` above uses) is itself async even for a same-document `data:`
 * URL in some engines, which is exactly the kind of incidental await this
 * function exists to avoid. `atob` + `Uint8Array` + the `Blob` constructor
 * are all synchronous, so this can run directly inside a click handler with
 * nothing awaited before `share()`.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('dataUrlToBlob: not a data URL');
  }
  const header = dataUrl.slice(0, commaIndex);
  const body = dataUrl.slice(commaIndex + 1);
  const mimeMatch = /^data:([^;,]+)?/.exec(header);
  const mime = mimeMatch?.[1] || 'image/png';

  const binary = header.includes(';base64') ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

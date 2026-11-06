/** The link and title a shared image travels with. */
export interface ShareLink {
  title?: string;
  text?: string;
  url?: string;
}

/**
 * The `navigator.share()` payload for a captured image: the file plus the
 * caller's link and title when given, or the file alone when `canShare`
 * refuses the two together. The check runs before a target is chosen, so a
 * target that accepts the payload and then drops the file is not caught.
 * `canShare` is passed in so the choice is testable without a browser.
 */
export function imageSharePayload(
  file: File,
  link: ShareLink | undefined,
  canShare: ((data: ShareData) => boolean) | undefined
): ShareData | null {
  const filesOnly: ShareData = { files: [file] };
  if (!canShare) return null;
  const extra: ShareData = {};
  if (link?.title) extra.title = link.title;
  if (link?.text) extra.text = link.text;
  if (link?.url) extra.url = link.url;
  if (Object.keys(extra).length > 0) {
    const full: ShareData = { ...filesOnly, ...extra };
    if (canShare(full)) return full;
  }
  return canShare(filesOnly) ? filesOnly : null;
}

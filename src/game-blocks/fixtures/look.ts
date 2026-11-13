/**
 * The look an author asked for, read from a rendered block: the drawn look,
 * or the look it fell back from (a poster with no usable image draws as
 * editorial).
 */
export function askedLook(html: string): string | undefined {
  const fallback = html.match(/data-game-block-look-fallback="([a-z]+)"/)?.[1];
  return fallback ?? html.match(/data-game-block-look="([a-z]+)"/)?.[1];
}

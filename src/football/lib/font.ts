/**
 * The typeface for the football data blocks.
 *
 * Product decision: the blocks render in **Inter**, a clean UI sans, rather
 * than inheriting the host page's editorial serif (e.g. the Le Monde face used
 * for article body copy). A graphic of stat numbers, axis ticks and tight
 * labels reads better in a humanist sans than in a serif.
 *
 * viz is a standalone AGPL package with NO design-system dependency and does
 * NOT bundle a webfont into the published output — the blocks rely on this
 * Inter-first stack with a system-sans fallback. Hosts that already load Inter
 * (the platform/studio do, via the design system) get the real face; everyone
 * else falls back gracefully to the platform UI sans.
 *
 * This is applied inline (not via a Tailwind `font-sans` utility) on each
 * block's outermost panel element so it wins over the host body's inherited
 * font regardless of whether the host has compiled viz's `font-sans` token or
 * loaded viz's stylesheet. Every descendant — block titles, stat numbers,
 * labels, axis ticks, legends, and SVG `<text>` — inherits it.
 */
export const BLOCK_FONT_STACK =
  "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

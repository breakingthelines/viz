import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '#/lib/utils';
import { BtlMark, BTL_BLACK, BTL_RED } from '#/football/lib/btl-logo';
import { capTrim } from '#/football/lib/cap-trim';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { formatFormationLabel } from '#/football/compositions/formation-label';

/**
 * Which social frame the card is authored at.
 *
 * - `square` — 1212x1200, a split panel: the hero photo is its own 600px
 *   column on the LEFT, the content column sits beside it on the right.
 * - `portrait` — 1000x1200, the hero photo is full-bleed behind everything
 *   and the content column is overlaid on the left over a gradient scrim.
 *
 * Both are exact pixel sizes, not responsive breakpoints — see
 * {@link LineupCardProps} for why.
 */
export type LineupCardFrame = 'square' | 'portrait';

/** Exact authored pixel size of each frame, straight from the Figma artboards. */
export const LINEUP_CARD_FRAME_SIZE: Record<LineupCardFrame, { width: number; height: number }> = {
  square: { width: 1212, height: 1200 },
  portrait: { width: 1000, height: 1200 },
};

/**
 * A normalized focal point for the hero photo, each axis 0–1 (`{x: 0, y: 0}`
 * is the image's top-left, `{x: 1, y: 1}` its bottom-right). The photo always
 * COVERS its slot; this chooses which part survives the crop, so a subject
 * who is off-centre in the source frame can be kept in shot.
 *
 * Maps straight onto CSS `object-position` percentages. The Figma portrait
 * frames crop their photo to `left: -14.93%` at `width: 173.06%`, which is
 * this same cover-crop with `x` ≈ 0.204.
 */
export interface LineupCardFocalPoint {
  x: number;
  y: number;
}

export interface LineupCardProps {
  /** Which social frame to author at. Defaults to `portrait`. */
  frame?: LineupCardFrame;
  /** The card headline, e.g. "Alternative England XI". Wraps freely. */
  title: string;
  /** Small muted label above the headline. Defaults to `"Lineup"`. */
  eyebrow?: string;
  /**
   * Formation string, e.g. `"4-3-3"`. When set, the card prints a
   * "Formation:" footer beneath the body; when omitted the footer is dropped
   * entirely — which is what the pitch frame does, since the pitch already
   * shows the shape (Figma 3048:11311 has no footer).
   */
  formation?: string;
  /** Hero photograph. An AUTHOR UPLOAD per lineup, not derived entity imagery. */
  heroImageUrl?: string;
  /** Which part of {@link heroImageUrl} survives the cover-crop. Defaults to centre. */
  heroFocalPoint?: LineupCardFocalPoint;
  /**
   * How far to shade the hero photograph down, 0–1, where `0` leaves the
   * photo untouched and `1` takes it to solid black at the shade's strongest
   * point. Values outside that range are clamped.
   *
   * The shade is not a flat wash: it is strongest along the photo's
   * CONTENT-FACING edge and clears completely {@link SHADE_REACH} of the way
   * across, so the photograph resolves into the card's dark column instead of
   * meeting it at a hard seam. Which edge that is follows the frame — the
   * portrait frame's column overlays the photo on the left, so its shade runs
   * left-to-right; the square frame's photo is a panel to the LEFT of the
   * column, so its shade runs right-to-left. One rule, mirrored.
   *
   * Defaults to whatever the Figma file itself draws for the frame, which is
   * a real per-frame difference rather than an inconsistency to normalise
   * away (the same situation as {@link FOOTER_GAP}): the portrait frames
   * carry a 0.8 scrim because their text sits ON the photograph and needs it,
   * while the square frames carry NONE — their photo has its own panel and
   * nothing to be legible against. So an unset `heroDimming` reproduces the
   * file, and every card authored before this prop existed is untouched. See
   * {@link HERO_DIMMING}.
   *
   * Applies to the PHOTOGRAPH only. A card with no {@link heroImageUrl} falls
   * back to a brand fill ({@link HERO_FILL}) and this prop is inert over it —
   * see that constant for why darkening a deliberate brand colour is the
   * wrong operation.
   */
  heroDimming?: number;
  /** The card body: a `LineupList` (team sheet) or a `LineupPitch` (formation). */
  children: ReactNode;
  /** Additional CSS classes on the card root. */
  className?: string;
}

/** Figma `neutral/grey-200` — the card ground. */
const GROUND = '#151515';
/** Figma `neutral/grey-500` — the eyebrow, shirt numbers and footer label. */
const MUTED = '#807c7c';
/** The hairline the Figma file rules every panel edge with. */
const HAIRLINE = 'rgba(255,255,255,0.05)';

/**
 * The hairlines are drawn as INSET BOX-SHADOWS rather than CSS borders, and
 * that is a fidelity fix, not a style preference.
 *
 * A Figma stroke is painted over its frame and takes no space, whereas a CSS
 * border under `box-sizing: border-box` eats into the content box. Bordering
 * the content column the obvious way costs it 1px of width and 2px of height,
 * which sounds negligible until it reaches the team sheet: the sheet is
 * `justify-between` over that height, so the loss is divided across ten gaps
 * and accumulates down the column — measured at up to 3px of drift by the
 * eleventh name against the Figma render, and it would grow with any taller
 * frame. An inset shadow paints the same hairline, follows `border-radius`,
 * and leaves layout untouched, so the column keeps its exact 515x1104 content
 * box.
 *
 * (`captureElementToPng` clears `box-shadow` on the CLONED ROOT to neutralise
 * a host's selection ring. These are all on descendants, so the capture
 * keeps them.)
 */
const HAIRLINE_ALL = `inset 0 0 0 1px ${HAIRLINE}`;
/** Top, right and bottom only — the square frame's content column is open on its left. */
const HAIRLINE_OPEN_LEFT = [
  `inset 0 1px 0 0 ${HAIRLINE}`,
  `inset -1px 0 0 0 ${HAIRLINE}`,
  `inset 0 -1px 0 0 ${HAIRLINE}`,
].join(', ');

/**
 * Tracking, as a fraction of font size. The Figma file's letter-spacing is a
 * SYSTEM, not a set of one-off values: -0.5995px at 19.984px, -0.6px at 20px,
 * -2.4px at 80px, -1.2px at 40px, -0.72px at 24px, -0.96px at 32px — every
 * one of them exactly -3% of its own size. Expressed in `em` so the ratio
 * survives any future size change instead of decaying into magic pixel
 * values. (The team-sheet NAMES are the one deliberate exception at -4%; see
 * `lineup-list.tsx`.)
 */
export const CARD_TRACKING = '-0.03em';

/** Inter Semi Bold — the single weight the whole card is set in. */
const SEMIBOLD = 600;

/**
 * Vertical gap between the card body and the "Formation:" footer.
 *
 * A real per-frame difference in the Figma file, not an inconsistency to
 * normalise away: the portrait frames nest the footer with the team sheet in
 * one 48px-gap group (3049:11504), while the square frame hangs it directly
 * off the body's own 80px rhythm (3049:11545 as a sibling of the rows
 * wrapper). The narrower portrait column earns the tighter gap.
 */
const FOOTER_GAP: Record<LineupCardFrame, number> = { square: 80, portrait: 48 };

/**
 * The frame the surrounding {@link LineupCard} is authored at, so a body can
 * pick up the handful of measurements that genuinely differ between the two
 * (the team sheet's column gap) without every caller having to thread a prop
 * that must agree with the card's. `null` when a body is rendered standalone
 * — outside a card, in a Storybook control, or in a host's own layout — in
 * which case the body falls back to its own default.
 */
const LineupFrameContext = createContext<LineupCardFrame | null>(null);

/** The enclosing {@link LineupCard}'s frame, or `null` outside one. */
export function useLineupFrame(): LineupCardFrame | null {
  return useContext(LineupFrameContext);
}

/**
 * The BTL lockup as the social card draws it: the bracket mark at 41.525x40
 * beside a two-line "breaking / the lines" wordmark.
 *
 * The wordmark's two lines sit 21.8px apart at 19.984px type — a line height
 * of ~1.091, noticeably tighter than Inter's natural 1.21 — so the lockup
 * reads as one compact block rather than two loose lines. `capTrim` takes
 * that line height so the block's box still hugs cap-height to baseline and
 * centres correctly against the 40px mark.
 */
function BtlLockup() {
  const fontSize = 19.984;
  return (
    <div className="flex shrink-0 items-center" style={{ gap: 15.702 }}>
      {/* Sized inline, not by a Tailwind class: viz is a standalone package
          and a host that does not compile its arbitrary utilities would
          otherwise render the mark at the SVG's own (absent) intrinsic size.
          41.525x40 is the mark's viewBox aspect scaled to a 40px cap. */}
      <BtlMark className="block shrink-0" style={{ width: 41.525, height: 40 }} />
      <div
        className="whitespace-nowrap"
        style={{
          fontSize,
          fontWeight: SEMIBOLD,
          color: 'white',
          letterSpacing: CARD_TRACKING,
          ...capTrim(21.8 / fontSize),
        }}
      >
        <div>breaking</div>
        <div>the lines</div>
      </div>
    </div>
  );
}

/**
 * Peak opacity of the hero shade, per frame, when the author has not asked
 * for one — straight from the Figma file, which draws a different answer for
 * each frame because each frame asks a different question of its photograph.
 *
 * The portrait frames lay the whole team sheet ON the photo, so they carry a
 * 0.8 scrim: without it the names are set over an uncontrolled image and the
 * card is only legible by luck. The square frames give the photo its own
 * panel with the content beside it rather than over it, so the file draws no
 * scrim there at all — node 3048:11351 is a plain image fill.
 *
 * Keeping both numbers is what makes {@link LineupCardProps.heroDimming}
 * safe to add: an unset prop reproduces each frame's existing render exactly,
 * so no card already in the wild moves. `SquareShadeIsOptIn` and
 * `PortraitShadeMatchesFigma` measure both halves of that claim in pixels.
 */
const HERO_DIMMING: Record<LineupCardFrame, number> = { square: 0, portrait: 0.8 };

/**
 * How far the shade reaches across its surface, measured from the
 * content-facing edge — the Figma portrait scrim's own stop, reused for the
 * square frame rather than inventing a second number for it.
 *
 * The same FRACTION on both frames is the point. In portrait it spans 69.028%
 * of the 1000px frame, clearing 62px past the content column's right edge; in
 * square it spans 69.028% of the 600px photo panel, leaving the outer ~186px
 * of the photograph — the part that is doing the work of being the hero — at
 * full strength. So one constant states one intent ("clear a little past the
 * content, then stop") in two geometries, instead of two tuned magic values
 * that would drift independently.
 */
const SHADE_REACH = '69.028%';

/**
 * Which way the shade ramps, per frame — always toward the content.
 *
 * Portrait's column overlays the photo on the LEFT, so its shade is strongest
 * at the frame's left edge and runs `to right`. The square's photo is a panel
 * to the LEFT of the column, so the edge facing the content is its RIGHT one
 * and the ramp runs `to left`. Both are the same sentence about the design;
 * only the geometry is mirrored.
 */
const SHADE_DIRECTION: Record<LineupCardFrame, 'to left' | 'to right'> = {
  square: 'to left',
  portrait: 'to right',
};

/**
 * The peak strength of the square frame's brand fill, as an opacity of
 * {@link BTL_RED} over {@link BTL_BLACK}, and how far across the panel it
 * carries. See {@link HERO_FILL} for why these are the numbers.
 *
 * Chosen by rendering the candidates at true size and at reader size and
 * looking at them, not derived — stated plainly rather than dressed up as
 * arithmetic, because there is no honest derivation of "how red should a
 * brand plate be".
 */
const FILL_RED_PEAK = 0.52;
const FILL_RED_REACH = '88%';

/**
 * What the hero slot is filled with when a card carries no photograph.
 *
 * This is not a placeholder for a missing asset. `heroImageUrl` is an author
 * upload that many lineups will never get, and the card views are becoming
 * renderable INSIDE published articles and thoughts — opt-in per lineup, by a
 * flag that is independent of whether a photo exists. So this fill is a
 * finished editorial surface that can be the permanent, public appearance of
 * a lineup block, seen repeatedly through a publication. It is held to that
 * bar, not to the bar of a private download.
 *
 * Left unfilled the square frame renders its whole left half in the same
 * `#151515` as the column beside it, split only by a 5%-white hairline — the
 * split-panel composition collapses into one grey rectangle and the card
 * reads as a failed render.
 *
 * ## Square: a deep brand-red plate, resolving to black at the column
 *
 * Red is the owner's call; how much of it is a design one, and full-strength
 * `BTL_RED` across 600x1200 is the wrong amount. This system spends red at
 * about 40px, on the bracket mark alone — everything else is `#151515` ground
 * and white Inter. A saturated red half-panel inverts that: `#E20613` carries
 * roughly twenty times the relative luminance of the column beside it, so it
 * takes the card off the headline, which is the actual content. Rendered, it
 * reads as an error state rather than a plate. And because it repeats
 * unchanged across every photo-less card, that shout would be the house style
 * of a whole publication.
 *
 * So the panel is red at about half strength over brand black, brightest at
 * its OUTER edge and falling to nothing before it reaches the column. That
 * lands the fill around `#7c0910` where it is read as identity — unmistakably
 * BTL red, dark enough that the white headline stays the loudest thing on the
 * card at both export size and reader size — and arrives at `BTL_BLACK`
 * exactly where the panel meets the column, so the seam the photo used to
 * hide disappears instead of becoming a red-against-grey edge.
 *
 * It is also the same lighting story as the photograph: the shade darkens the
 * panel's inner edge, the fill lights its outer one. The frame reads the same
 * way whether it holds a photo or not.
 *
 * REJECTED, all rendered and compared rather than argued:
 *  - flat or full-strength `BTL_RED`, and a straight `BTL_RED`-to-black ramp
 *    — both keep a large area at or near full saturation and shout down the
 *    headline;
 *  - a black panel with a red edge band — quiet and it repeats well, but the
 *    panel is then black, which under-delivers the brief;
 *  - a diagonal wash — better light, but it introduces an axis nothing else
 *    in this strictly orthogonal card uses;
 *  - ghosting the BTL mark into the panel — the card already prints the
 *    lockup 48px away in the next column, so at reader scale that is two
 *    logos on one block, not texture.
 *
 * The fill is deliberately IDENTICAL on every photo-less card. Variation
 * would have to be invented (hashing a title into a hue, say), and a colour
 * that changes for reasons the reader cannot see is decoration pretending to
 * be information. A masthead plate repeating is identity; the failure to
 * avoid is looking accidental, not looking consistent.
 *
 * ## Portrait: brand black, flat
 *
 * Nothing to grade. The photo is full-bleed behind text that already assumes
 * a dark field, there is no seam and no half-panel needing an identity, so
 * the fill's whole job is to be a deliberate black rather than the lighter
 * `#151515` ground showing through. Flat {@link BTL_BLACK} gives a clean
 * black card with white type, and avoids the banding a shallow ramp across
 * 1000px of near-black would produce in 8-bit.
 *
 * ## The shade does not apply here
 *
 * {@link LineupCardProps.heroDimming} shades the PHOTOGRAPH and stops there.
 * Its job is to tame an image the design never saw — which can arrive bright,
 * busy or low-contrast — and a brand fill is the opposite of that: it is
 * already exactly the value we chose, tuned against the headline it sits
 * beside. Darkening it would not produce "BTL red, quieter", it would drag a
 * chosen colour somewhere nobody chose. And a setting the author made about
 * their photo should not follow them onto the fallback when they remove it.
 * So the shade layer is rendered only when there is a photo to shade.
 */
const HERO_FILL: Record<LineupCardFrame, string> = {
  square: `linear-gradient(to right, ${withAlpha(BTL_RED, FILL_RED_PEAK)} 0%, ${withAlpha(BTL_RED, 0)} ${FILL_RED_REACH}), ${BTL_BLACK}`,
  portrait: BTL_BLACK,
};

/**
 * `#rrggbb` as `rgba(r,g,b,a)`, so the shade can be mixed from
 * {@link BTL_BLACK} itself rather than from a second, hand-written copy of
 * the same colour in a different notation. `rgba(13,13,13,0.8)` and
 * `#0d0d0d` are the same value, and nothing would catch them drifting apart.
 *
 * Emits no spaces after the commas, which is what the Figma-derived scrim
 * this replaced was already written as — `PortraitShadeMatchesFigma` pins the
 * resulting gradient, so the formatting is load-bearing there.
 */
function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

/**
 * The shade over the hero photograph: {@link BTL_BLACK} at `dimming`, ramping
 * to clear {@link SHADE_REACH} of the way in from the content-facing edge.
 *
 * At the portrait default this returns exactly the gradient the card has
 * always painted — `linear-gradient(to right, rgba(13,13,13,0.8) 0%,
 * rgba(13,13,13,0) 69.028%)` — character for character.
 */
function heroShade(frame: LineupCardFrame, dimming: number): string {
  return `linear-gradient(${SHADE_DIRECTION[frame]}, ${withAlpha(BTL_BLACK, dimming)} 0%, ${withAlpha(BTL_BLACK, 0)} ${SHADE_REACH})`;
}

/** `value` clamped into 0–1, with any non-finite input falling back to `fallback`. */
function clamp01(value: number | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

/**
 * The hero photograph, cover-cropped to `heroFocalPoint`.
 *
 * Rendered as a real `<img>` rather than a CSS `background-image` because the
 * capture path (`utils/export.ts`) inlines `<img>` sources — CORS re-fetch,
 * SVG rasterising, dead-URL placeholder — and none of that reaches a
 * background layer.
 */
function HeroPhoto({ url, focalPoint }: { url?: string; focalPoint?: LineupCardFocalPoint }) {
  if (!url) return null;
  const x = ((focalPoint?.x ?? 0.5) * 100).toFixed(3);
  const y = ((focalPoint?.y ?? 0.5) * 100).toFixed(3);
  return (
    <img
      alt=""
      aria-hidden
      draggable={false}
      src={url}
      className="pointer-events-none absolute inset-0 h-full w-full max-w-none select-none object-cover"
      style={{ objectPosition: `${x}% ${y}%` }}
    />
  );
}

/**
 * The BTL lineup social export card — the shell every shareable lineup image
 * is composed inside.
 *
 * It owns everything that is the same whichever way the XI is shown: the
 * exact frame size, the `#151515` ground, the hero photograph and its scrim,
 * the BTL lockup, the eyebrow + headline, the "Formation:" footer, and the
 * square-vs-portrait layout difference. The XI itself is the `children`
 * slot — pass a {@link LineupList} for the numbered team sheet, or a
 * `LineupPitch` for the formation board. Both are laid into the same slot at
 * the same measurements, which is what keeps the two bodies interchangeable
 * without either knowing about the card's chrome.
 *
 * ## Authored at an exact pixel size, deliberately
 *
 * Every measurement here is an absolute pixel value from the Figma file, and
 * the root is a hard `width`/`height` box — there is no responsive behaviour
 * and that is the point. The card exists to be rasterised by
 * `captureElementToPng` at a fixed social frame, and `html-to-image` clones a
 * node that is ALREADY laid out: the capture's `width`/`height` options size
 * the cloned root but cannot make its descendants reflow, since each one
 * carries its computed pixel width over from the live DOM. So a card rendered
 * small and captured "up" to 1000x1200 would rasterise its small layout onto
 * a large canvas. Render it at its true size and use the capture's `scale`
 * for retina density instead. `lineup-card.stories.tsx` measures exactly this.
 *
 * ## Typography
 *
 * All text is trimmed to cap-height/baseline via `capTrim`, reproducing the
 * Figma file's `text-box-trim` without depending on a Chromium-only CSS
 * property — see `lib/cap-trim.ts`, which explains why that is load-bearing
 * rather than cosmetic here.
 */
export function LineupCard({
  frame = 'portrait',
  title,
  eyebrow = 'Lineup',
  formation,
  heroImageUrl,
  heroFocalPoint,
  heroDimming,
  children,
  className,
}: LineupCardProps) {
  const { width, height } = LINEUP_CARD_FRAME_SIZE[frame];
  const isSquare = frame === 'square';
  const formationLabel = formatFormationLabel(formation);
  // The shade covers the PHOTOGRAPH only — with no photo the hero slot is a
  // brand fill, which is already the colour it was chosen to be and has
  // nothing to be shaded for (see `HERO_FILL`). A dimming of 0 paints a fully
  // transparent layer, so it is dropped outright rather than rendered as a
  // no-op node; that is what leaves the square frame's DOM identical to
  // before this prop existed, since its default IS 0.
  const dimming = clamp01(heroDimming, HERO_DIMMING[frame]);
  const shade = heroImageUrl && dimming > 0 ? heroShade(frame, dimming) : null;

  // The content column is 628px wide in BOTH frames — the one measurement the
  // two layouts share. What differs is where it sits and how it is inset: the
  // square frame pushes it against the photo panel's edge with an asymmetric
  // 65px left inset and rules three of its sides, while the portrait frame
  // simply overlays it flush left with an even 48px pad.
  const columnStyle = isSquare
    ? {
        right: 1,
        paddingTop: 48,
        paddingRight: 48,
        paddingBottom: 48,
        paddingLeft: 65,
        boxShadow: HAIRLINE_OPEN_LEFT,
      }
    : { left: 0, padding: 48 };

  return (
    <div
      data-slot="lineup-card"
      data-frame={frame}
      className={cn('relative overflow-hidden', className)}
      style={{
        width,
        height,
        background: GROUND,
        // Inter-first (product decision, shared with every other block): the
        // card must not inherit a host page's editorial serif. See
        // `lib/font.ts`.
        fontFamily: BLOCK_FONT_STACK,
      }}
    >
      {/* PORTRAIT: the photo is the full frame, with a left-to-right shade the
          content column reads against. Painted FIRST so the column sits over
          it. The brand fill sits UNDER the photo rather than instead of it, so
          it also backs a photo that is still decoding or has died on a dead
          URL — both land on brand black rather than on bare ground. */}
      {!isSquare && (
        <div className="absolute inset-0" style={{ boxShadow: HAIRLINE_ALL }}>
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ background: HERO_FILL[frame] }}
          >
            <HeroPhoto url={heroImageUrl} focalPoint={heroFocalPoint} />
          </div>
          {shade && <div aria-hidden className="absolute inset-0" style={{ background: shade }} />}
        </div>
      )}

      <div
        data-slot="lineup-card-content"
        className="absolute top-0 flex flex-col items-start"
        style={{ width: 628, height, gap: 48, ...columnStyle }}
      >
        <BtlLockup />

        <div className="flex min-h-0 w-full flex-1 flex-col items-start" style={{ gap: 80 }}>
          <div className="flex w-full shrink-0 flex-col items-start" style={{ gap: 32 }}>
            {eyebrow && (
              <div
                className="w-full"
                style={{
                  fontSize: 20,
                  fontWeight: SEMIBOLD,
                  color: MUTED,
                  letterSpacing: CARD_TRACKING,
                  ...capTrim(),
                }}
              >
                {eyebrow}
              </div>
            )}
            {/* Conditional exactly as `eyebrow` above is. An unconditional
                title collapses to zero height when absent, but the header's
                `gap: 32` still applies between it and the eyebrow — leaving
                32px of dead air under the kicker on every untitled card.
                Editor 0.60.0 dropped the "Starting XI" default outright, so
                untitled is now an ordinary state rather than a rarity. */}
            {title && (
              <div
                className="w-full"
                style={{
                  fontSize: 80,
                  fontWeight: SEMIBOLD,
                  color: 'white',
                  letterSpacing: CARD_TRACKING,
                  wordBreak: 'break-word',
                  ...capTrim(),
                }}
              >
                {title}
              </div>
            )}
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col" style={{ gap: FOOTER_GAP[frame] }}>
            {/* The body slot. `justify-center` only bites when the body is
                SHORTER than the slot (the pitch, which keeps its own aspect
                ratio); `LineupList` fills the slot outright, so it is inert
                there. One wrapper serves both bodies. */}
            <LineupFrameContext.Provider value={frame}>
              <div
                data-slot="lineup-card-body"
                className="flex min-h-0 w-full flex-1 flex-col justify-center"
              >
                {children}
              </div>
            </LineupFrameContext.Provider>

            {formationLabel && (
              <div
                className="flex w-full shrink-0 flex-col items-start whitespace-nowrap"
                style={{ gap: 24 }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: SEMIBOLD,
                    color: MUTED,
                    letterSpacing: CARD_TRACKING,
                    ...capTrim(),
                  }}
                >
                  Formation:
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: SEMIBOLD,
                    color: 'white',
                    letterSpacing: CARD_TRACKING,
                    ...capTrim(),
                  }}
                >
                  {formationLabel}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SQUARE: the photo is its own panel butted against the content column,
          rounded on its outer edge only. Painted LAST — the Figma file stacks
          it OVER the column, which is why the column's 65px left inset (rather
          than 48px) is what actually clears it. */}
      {isSquare && (
        <div
          className="absolute left-0 top-0 overflow-hidden"
          style={{
            width: 600,
            height,
            boxShadow: HAIRLINE_ALL,
            borderRadius: '0 16px 16px 0',
            background: HERO_FILL[frame],
          }}
        >
          <HeroPhoto url={heroImageUrl} focalPoint={heroFocalPoint} />
          {shade && <div aria-hidden className="absolute inset-0" style={{ background: shade }} />}
        </div>
      )}
    </div>
  );
}

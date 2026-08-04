import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '#/lib/utils';
import { BtlMark } from '#/football/lib/btl-logo';
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
  children,
  className,
}: LineupCardProps) {
  const { width, height } = LINEUP_CARD_FRAME_SIZE[frame];
  const isSquare = frame === 'square';
  const formationLabel = formatFormationLabel(formation);

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
      {/* PORTRAIT: the photo is the full frame, with a left-to-right scrim the
          content column reads against. Painted FIRST so the column sits over
          it. */}
      {!isSquare && (
        <div className="absolute inset-0" style={{ boxShadow: HAIRLINE_ALL }}>
          <div className="absolute inset-0 overflow-hidden">
            <HeroPhoto url={heroImageUrl} focalPoint={heroFocalPoint} />
          </div>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgba(13,13,13,0.8) 0%, rgba(13,13,13,0) 69.028%)',
            }}
          />
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
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col" style={{ gap: FOOTER_GAP[frame] }}>
            {/* The body slot. `justify-center` only bites when the body is
                SHORTER than the slot (the pitch, which keeps its own aspect
                ratio); `LineupList` fills the slot outright, so it is inert
                there. One wrapper serves both bodies. */}
            <LineupFrameContext.Provider value={frame}>
              <div className="flex min-h-0 w-full flex-1 flex-col justify-center">{children}</div>
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
          }}
        >
          <HeroPhoto url={heroImageUrl} focalPoint={heroFocalPoint} />
        </div>
      )}
    </div>
  );
}

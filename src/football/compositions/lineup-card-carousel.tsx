'use client';

// A swipeable gallery of the lineup card's views, with pills.
//
// `LineupCard` is one composition at one frame. There are four ways to draw
// the same XI with it — two frames crossed with two bodies — and until now
// every one of those choices was made in a form, by reading labels, before
// anything was rendered. This shows the author (or a reader) the four cards
// themselves and lets them move between them.
//
// ## Why this lives in viz
//
// It is presentation, not authoring. The editor's export modal is its first
// caller, but the same swipe-and-pills gallery is how a published lineup
// could be shown inside a thought or an article, and a reader surface can
// only reach it from here. So this component knows nothing about uploading,
// capturing, downloading, or `LineupConfig`: it takes the same plain data
// `LineupCard` already takes, renders it every way, and renders whatever
// controls its host hands it in `children`. With no `children` and no
// `onValueChange` it is a complete, read-only gallery.
//
// ## Server-rendered, and useful before JavaScript arrives
//
// platform is server-rendered, so the first view has to be real markup rather
// than something that appears on hydration. Three things follow, and all
// three are load-bearing rather than stylistic:
//
//  1. EVERY view is in the DOM, always. Nothing is mounted on demand, so a
//     crawler and a reader on a slow connection both see all four cards'
//     content — the names, the formation, the headline — without waiting for
//     or running any script.
//  2. The pills are ANCHORS to the views' own ids. A same-document fragment
//     link scrolls a scroll container natively, so the gallery is fully
//     operable with scripting off. JavaScript only upgrades that to a smooth,
//     history-free scroll and a controlled `value`.
//  3. The view scale is a CSS `calc()` over a custom property with an inline
//     fallback, not a measured value. There is no layout read, no
//     `ResizeObserver` and no effect anywhere in this file, so the server and
//     the client render byte-identical markup.
//
// ## Why the views are scaled rather than laid out small
//
// `LineupCard` is authored at an absolute pixel size and has no responsive
// behaviour by design — that is what makes a capture of it faithful. It
// therefore cannot be asked to lay out smaller; the only way to fit four of
// them on a screen is to lay each out at its true size and shrink it
// visually with `transform: scale()`.
//
// That makes these views UNSAFE TO CAPTURE, and deliberately so.
// `html-to-image` clones a node that is already laid out, so rasterising a
// scaled view would put a small layout onto a large canvas: every dimension
// in the output correct, every measurement inside it wrong. A host that
// exports a PNG must render its own unscaled `LineupCardView` offscreen and
// capture that. See the editor's `LineupCardStage`.

import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '#/lib/utils';
import {
  LineupCard,
  LINEUP_CARD_FRAME_SIZE,
  type LineupCardFocalPoint,
  type LineupCardFrame,
} from '#/football/compositions/lineup-card';
import { LineupList } from '#/football/compositions/lineup-list';
import { LineupCardPitch } from '#/football/compositions/lineup-card-pitch';
import type {
  LineupMarkerContent,
  LineupSlot,
  LineupSlotPlayer,
} from '#/football/compositions/lineup-pitch';

/** Which body fills the card's slot: the numbered team sheet, or the pitch. */
export type LineupCardBody = 'list' | 'pitch';

/** One way of drawing the XI — a frame crossed with a body. */
export interface LineupCardVariant {
  /** Stable, URL-safe id. Used for the view's DOM id and its pill's `href`. */
  id: string;
  frame: LineupCardFrame;
  body: LineupCardBody;
  /** The pill's visible text. */
  label: string;
  /**
   * The pill's accessible name, where "5:6" would be read out as nonsense.
   * Falls back to {@link label}.
   */
  spokenLabel?: string;
}

/**
 * Every view, in swipe order.
 *
 * All four are distinct outputs; none is a near-duplicate of another.
 *
 * - The FRAME is not a crop of one layout, it is two layouts. Square gives
 *   the photograph its own 600px panel with a rounded outer edge and rules
 *   three sides of a 515px content column; portrait makes the photograph
 *   full-bleed behind a left-to-right scrim with an evenly-inset 532px
 *   column. They also differ in aspect (1:1 against 5:6), which is what
 *   decides where the image can be posted at full size.
 * - The BODY changes what the card is about: a numbered team sheet announces
 *   a squad, a pitch argues a shape.
 *
 * Ordered frame-major, so one step changes the BODY — much the more visible
 * of the two axes — and crossing to the other frame takes a deliberate second
 * step. Portrait leads because it is the frame lineups default to.
 */
export const LINEUP_CARD_VARIANTS: readonly LineupCardVariant[] = [
  {
    id: 'portrait-list',
    frame: 'portrait',
    body: 'list',
    label: 'Team sheet 5:6',
    spokenLabel: 'Team sheet, portrait five by six',
  },
  {
    id: 'portrait-pitch',
    frame: 'portrait',
    body: 'pitch',
    label: 'Pitch 5:6',
    spokenLabel: 'Pitch, portrait five by six',
  },
  {
    id: 'square-list',
    frame: 'square',
    body: 'list',
    label: 'Team sheet 1:1',
    spokenLabel: 'Team sheet, square one by one',
  },
  {
    id: 'square-pitch',
    frame: 'square',
    body: 'pitch',
    label: 'Pitch 1:1',
    spokenLabel: 'Pitch, square one by one',
  },
] as const;

/** Both frames are exactly 1200px tall, so one scale factor sizes either. */
export const LINEUP_CARD_VIEW_HEIGHT = 1200;

/**
 * The custom property the view scale reads. A host can set this at any
 * breakpoint in its own stylesheet to make the gallery responsive without a
 * resize listener; when it is unset, the `viewScale` prop's value is used
 * instead via the `var()` fallback.
 */
export const LINEUP_CARD_VIEW_SCALE_VAR = '--btl-lineup-view-k';

/** Everything a card view needs, whichever frame and body it is drawn at. */
export interface LineupCardViewData {
  /** The card headline. */
  title: string;
  /** Small muted label above the headline. Defaults to viz's own `"Lineup"`. */
  eyebrow?: string;
  /**
   * Formation string, e.g. `"4-3-3"`. Printed as the card's footer under the
   * TEAM SHEET body only — the pitch already shows the shape, and the Figma
   * pitch frame has no footer.
   */
  formation?: string;
  /** The XI for the team-sheet body, in the order it should be printed. */
  players: LineupSlotPlayer[];
  /**
   * The XI for the pitch body, in ORDINARY lineup coordinates — the same ones
   * a `LineupPitch` elsewhere in the product is given, keeper at low `x` and
   * `y=0` at the team's own left touchline.
   *
   * Callers must not reshape them for the card's keeper-at-the-top viewpoint.
   * That is carried by `LineupCardPitch`'s `orientation="portrait-down"`,
   * where it is one provable rotation; until 0.14.0 this component reversed
   * the depth axis here instead, which is a MIRROR and published every card
   * with its left and right flanks swapped.
   */
  slots: LineupSlot[];
  heroImageUrl?: string;
  heroFocalPoint?: LineupCardFocalPoint;
  teamColor?: string;
  numberColor?: string;
  /** What the pitch draws in each marker. Defaults to `'headshot'`. */
  markerContent?: LineupMarkerContent;
}

/**
 * One card view at its TRUE, unscaled size.
 *
 * Exported on its own because a host that captures a PNG must render this
 * directly — offscreen, with no transform anywhere above it — rather than
 * capturing one of the gallery's scaled views. It carries no chrome of any
 * kind, so a capture of it needs no `data-export-ignore` filter to come out
 * clean.
 */
export function LineupCardView({
  variant,
  data,
  className,
}: {
  variant: LineupCardVariant;
  data: LineupCardViewData;
  className?: string;
}) {
  return (
    <LineupCard
      frame={variant.frame}
      title={data.title}
      eyebrow={data.eyebrow}
      formation={variant.body === 'list' ? data.formation : undefined}
      heroImageUrl={data.heroImageUrl}
      heroFocalPoint={data.heroFocalPoint}
      className={className}
    >
      {variant.body === 'list' ? (
        <LineupList players={data.players} />
      ) : (
        // `LineupCardPitch` owns every number the Figma pitch frame asks for —
        // the marker size, the name type, the viewpoint. This file used to
        // carry its own copy of them, drifting from the copy the geometry
        // stories measured; see that module's header for what that cost.
        <LineupCardPitch
          slots={data.slots}
          markerContent={data.markerContent}
          teamColor={data.teamColor}
          numberColor={data.numberColor}
        />
      )}
    </LineupCard>
  );
}

export interface LineupCardCarouselProps {
  /** The XI, and everything drawn around it. */
  data: LineupCardViewData;
  /** Which views to offer. Defaults to {@link LINEUP_CARD_VARIANTS}. */
  variants?: readonly LineupCardVariant[];
  /** Controlled selection, by variant id. */
  value?: string;
  /** Uncontrolled starting selection. Defaults to the first variant. */
  defaultValue?: string;
  /** Fires when the author picks a pill or swipes to another view. */
  onValueChange?: (id: string, variant: LineupCardVariant) => void;
  /**
   * How far down each view is drawn, as a fraction of its true size.
   * `0.35` puts a 1200px-tall card at 420px. Overridden at any breakpoint by
   * setting {@link LINEUP_CARD_VIEW_SCALE_VAR} in the host's own CSS.
   */
  viewScale?: number;
  /** Accessible name for the gallery. */
  label?: string;
  /**
   * The host's own controls, rendered under the pills and OUTSIDE every view
   * — so nothing here can reach a capture of a card. Omit for a read-only
   * gallery.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * The gallery: every view of one XI, swipeable, with pills.
 *
 * Read-only by default. Pass `children` to hang a host's own controls under
 * the pills, and `onValueChange` to learn which view is showing — neither is
 * required, and neither is baked in.
 */
export function LineupCardCarousel({
  data,
  variants = LINEUP_CARD_VARIANTS,
  value,
  defaultValue,
  onValueChange,
  viewScale = 0.35,
  label = 'Lineup card views',
  children,
  className,
}: LineupCardCarouselProps) {
  const domId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  /**
   * The view a programmatic scroll is currently travelling towards, or `null`.
   *
   * Without this the two halves of the control fight each other. Picking a
   * pill selects a view AND starts a smooth scroll — and a smooth scroll emits
   * scroll events for the whole of its journey, each one asking
   * {@link onTrackScroll} "which view is nearest the middle now?". For the
   * first few frames the honest answer is still the PREVIOUS view, so the
   * selection is dragged back and the pill visibly flickers before settling.
   * While a scroll we started is in flight, the explicit pick wins.
   */
  const travellingTo = useRef<number | null>(null);
  const [uncontrolled, setUncontrolled] = useState(
    () => defaultValue ?? variants[0]?.id ?? LINEUP_CARD_VARIANTS[0]!.id
  );
  const selected = value ?? uncontrolled;
  const viewId = (variantId: string) => `${domId}-view-${variantId}`;

  /**
   * Bring a view to the middle of the track.
   *
   * Written against the track's own `scrollTo` rather than
   * `Element.scrollIntoView`, which would also scroll every ancestor — inside
   * a modal that yanks the whole dialog around.
   */
  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    const view = track?.children[index];
    if (!track || !(view instanceof HTMLElement)) return;
    const reduced =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    travellingTo.current = index;
    track.scrollTo({
      left: view.offsetLeft - (track.clientWidth - view.offsetWidth) / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, []);

  const select = useCallback(
    (index: number) => {
      const variant = variants[index];
      if (!variant) return;
      if (value === undefined) setUncontrolled(variant.id);
      onValueChange?.(variant.id, variant);
    },
    [variants, value, onValueChange]
  );

  /**
   * Swiping is the other half of the same control: whichever view ends up
   * nearest the middle becomes the selection, so the pills follow a drag or a
   * trackpad flick without anyone touching them.
   */
  const onTrackScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const middle = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let shortest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < track.children.length; i++) {
      const view = track.children[i];
      if (!(view instanceof HTMLElement)) continue;
      const distance = Math.abs(view.offsetLeft + view.offsetWidth / 2 - middle);
      if (distance < shortest) {
        shortest = distance;
        nearest = i;
      }
    }
    // Mid-journey on a scroll we started: hold the explicit pick until it
    // actually arrives, rather than reporting the view it is passing over.
    if (travellingTo.current !== null) {
      if (nearest !== travellingTo.current) return;
      travellingTo.current = null;
    }
    select(nearest);
  }, [select]);

  /**
   * The reader takes over. Any direct gesture on the track abandons a
   * programmatic scroll, so a swipe part-way through one is never ignored —
   * without this, a missed landing (sub-pixel rounding on an odd track width)
   * could leave the guard armed and swallow every later swipe.
   */
  const releaseTravel = useCallback(() => {
    travellingTo.current = null;
  }, []);

  return (
    // NOTE the scale is deliberately NOT set as an inline custom property on
    // this root. Each view reads `var(--btl-lineup-view-k, <viewScale>)`, so
    // the prop is the FALLBACK — which is what lets a host override it from
    // its own stylesheet at any breakpoint. Defining the variable here would
    // put it on an ancestor of every view and beat the host's rule outright,
    // silently pinning the gallery to one size. (It did, until this comment
    // existed.)
    <div
      data-slot="lineup-card-carousel"
      className={cn('flex w-full flex-col items-center gap-4', className)}
    >
      {/*
        A plain scroll container, tabbable so a keyboard can pan it and so the
        views are never content trapped behind a gesture. `aria-roledescription`
        names the pattern without inventing a role that browsers do not map.
      */}
      <div
        ref={trackRef}
        role="group"
        aria-label={label}
        aria-roledescription="carousel"
        tabIndex={0}
        data-slot="lineup-card-track"
        onScroll={onTrackScroll}
        onPointerDown={releaseTravel}
        onTouchStart={releaseTravel}
        onWheel={releaseTravel}
        className="flex w-full snap-x snap-mandatory items-center gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-[50%] py-1 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30 motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {variants.map((variant) => {
          const { width } = LINEUP_CARD_FRAME_SIZE[variant.frame];
          const active = variant.id === selected;
          return (
            <div
              key={variant.id}
              id={viewId(variant.id)}
              role="group"
              aria-label={variant.spokenLabel ?? variant.label}
              aria-roledescription="slide"
              data-slot="lineup-card-view"
              data-variant={variant.id}
              data-active={active || undefined}
              className={cn(
                'relative shrink-0 snap-center overflow-hidden rounded-[10px] border transition-[opacity,border-color] duration-200 motion-reduce:transition-none',
                active
                  ? 'border-white/15 opacity-100 shadow-[0_24px_64px_rgba(0,0,0,0.6)]'
                  : 'border-white/[0.06] opacity-45'
              )}
              style={{
                width: `calc(${width}px * var(${LINEUP_CARD_VIEW_SCALE_VAR}, ${viewScale}))`,
                height: `calc(${LINEUP_CARD_VIEW_HEIGHT}px * var(${LINEUP_CARD_VIEW_SCALE_VAR}, ${viewScale}))`,
              }}
            >
              <div
                style={{
                  width,
                  height: LINEUP_CARD_VIEW_HEIGHT,
                  transformOrigin: 'top left',
                  transform: `scale(var(${LINEUP_CARD_VIEW_SCALE_VAR}, ${viewScale}))`,
                }}
              >
                <LineupCardView variant={variant} data={data} />
              </div>
            </div>
          );
        })}
      </div>

      {/*
        The pills. Anchors rather than buttons so the gallery still works with
        scripting off: a same-document fragment link scrolls the track
        natively. With JavaScript the default is prevented — which also keeps
        a modal from pushing a hash onto the history stack — and replaced by a
        smooth, centred scroll.
      */}
      <nav aria-label={label} data-slot="lineup-card-pills">
        <ul className="flex list-none flex-wrap items-center justify-center gap-1.5 p-0">
          {variants.map((variant, index) => {
            const active = variant.id === selected;
            return (
              <li key={variant.id}>
                <a
                  href={`#${viewId(variant.id)}`}
                  aria-label={variant.spokenLabel ?? variant.label}
                  aria-current={active ? 'true' : undefined}
                  data-slot="lineup-card-pill"
                  data-variant={variant.id}
                  onClick={(event) => {
                    event.preventDefault();
                    select(index);
                    scrollToIndex(index);
                  }}
                  // Enter is the anchor's own native activation and arrives
                  // as a click. Space is not — a link ignores it, and scrolls
                  // the page instead — but these READ as pill buttons, so a
                  // keyboard user reasonably tries it. Handling it here is
                  // the one behaviour the anchor does not already give us.
                  onKeyDown={(event) => {
                    if (event.key !== ' ') return;
                    event.preventDefault();
                    select(index);
                    scrollToIndex(index);
                  }}
                  className={cn(
                    'block cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold no-underline transition-colors motion-reduce:transition-none',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
                    active
                      ? 'border-red-100 bg-red-100/15 text-white'
                      : 'border-white/[0.08] bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white'
                  )}
                >
                  {variant.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {children}
    </div>
  );
}

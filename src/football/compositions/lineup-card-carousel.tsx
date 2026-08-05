'use client';

// A swipeable gallery of the lineup card's views.
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
// caller, but the same swipeable gallery is how a published lineup could be
// shown inside a thought or an article, and a reader surface can only reach
// it from here. So this component knows nothing about uploading, capturing,
// downloading, or `LineupConfig`: it takes the same plain data `LineupCard`
// already takes, renders it every way, and renders whatever controls its host
// hands it in `children`. With no `children` and no `onValueChange` it is a
// complete, read-only gallery.
//
// ## The gallery ADDS views, it does not replace one
//
// A reader surface reaches this through an author opt-in, and an opt-in that
// swaps the block out is a different block rather than an extra option: turn
// it on and the plate the reader has always been shown — the one the author
// laid out and previewed — disappears behind a gallery of social cards.
//
// So the host's own rendering of the lineup leads. It arrives as
// {@link LineupCardLeadingSlide}, a plain `ReactNode` with an accessible
// name, and is drawn FIRST and selected by default, with the card views
// after it. The dependency has to run this way round: the reader plate is the
// editor's (`ReaderPlate`, framing a `LineupPitch`), and viz cannot import
// the editor. Pass nothing and the gallery is exactly the four card views it
// has always been, which is what the export modal wants.
//
// ## Server-rendered, and useful before JavaScript arrives
//
// platform is server-rendered, so the first view has to be real markup rather
// than something that appears on hydration. Three things follow, and all
// three are load-bearing rather than stylistic:
//
//  1. EVERY view is in the DOM, always. Nothing is mounted on demand, so a
//     crawler and a reader on a slow connection both see every view's
//     content — the names, the formation, the headline — without waiting for
//     or running any script.
//  2. The indicators are ANCHORS to the views' own ids. A same-document
//     fragment link scrolls a scroll container natively, so the gallery is
//     fully operable with scripting off. JavaScript only upgrades that to a
//     smooth, history-free scroll and a controlled `value`.
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
  /**
   * Stable, URL-safe id. Used for the view's DOM id and its indicator's
   * `href`, and it is the value `value` / `onValueChange` speak in.
   */
  id: string;
  frame: LineupCardFrame;
  body: LineupCardBody;
  /**
   * A short human-readable name for the view.
   *
   * NOT RENDERED. The gallery's indicators are bars, not chips — four
   * verbatim captions under a card is a row of interface explaining a row of
   * pictures that already explain themselves, which is a poor trade on a
   * reader surface. This survives as the fallback accessible name behind
   * {@link spokenLabel}, and because a host that lists the views in a FORM
   * (the export modal's own picker) still needs words for them.
   */
  label: string;
  /**
   * The indicator's accessible name, where "5:6" would be read out as
   * nonsense. Falls back to {@link label}.
   *
   * This is the whole of what a screen reader is given for the view now that
   * nothing is printed, so it has to identify the view on its own.
   */
  spokenLabel?: string;
}

/**
 * A slide the HOST draws, shown before every card view.
 *
 * This is how the lineup as authored — the reader's own plate, the pitch they
 * are shown with the gallery switched off — stays the first thing on screen.
 * viz takes it as an opaque node rather than building it, because the plate
 * belongs to the editor and a viz that imported it would invert the
 * dependency between the two packages.
 *
 * It is NOT a {@link LineupCardVariant}: it has no frame, no body, and no
 * absolute size, so it is not scaled, not framed and never exported. Anything
 * keyed on {@link LINEUP_CARD_VARIANTS} has to allow for that — most visibly
 * `onValueChange`, which reports `undefined` for its variant.
 */
export interface LineupCardLeadingSlide {
  /**
   * Stable, URL-safe id — the selection value, and the fragment its indicator
   * links to. Defaults to {@link LEADING_SLIDE_ID}. Set it only to avoid a
   * collision with a custom `variants` list.
   */
  id?: string;
  /**
   * The slide's accessible name, and its indicator's. Required, because the
   * indicator prints nothing and this is all a screen reader gets — e.g.
   * `"The lineup as published"`.
   */
  label: string;
  /** What to draw. Rendered as-is, at whatever size it lays itself out to. */
  content: ReactNode;
}

/** The id {@link LineupCardLeadingSlide} takes when it does not name itself. */
export const LEADING_SLIDE_ID = 'original';

/**
 * One slide, as a host sees it — what {@link LineupCardCarouselProps.slideAction}
 * is handed and what {@link LineupCardCarouselProps.onValueChange} reports.
 */
export interface LineupCardSlide {
  /** The slide's id, and its selection value. */
  id: string;
  /** The slide's accessible name. */
  label: string;
  /**
   * The card view this slide draws, or `undefined` for the leading slide.
   *
   * This is the field a host branches on. A leading slide has no frame and no
   * absolute size, so there is nothing behind it to capture — see
   * {@link LineupCardCarouselProps.slideAction}.
   */
  variant?: LineupCardVariant;
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
  /** Which card views to offer. Defaults to {@link LINEUP_CARD_VARIANTS}. */
  variants?: readonly LineupCardVariant[];
  /**
   * The host's own rendering of the lineup, drawn FIRST and selected by
   * default. Omit for a gallery of card views alone.
   */
  leadingSlide?: LineupCardLeadingSlide;
  /** Controlled selection, by slide id. */
  value?: string;
  /**
   * Uncontrolled starting selection. Defaults to the first slide — the
   * {@link leadingSlide} when there is one, so switching the gallery on
   * leaves a reader looking at exactly what they were looking at before.
   */
  defaultValue?: string;
  /**
   * Fires when someone picks an indicator or swipes to another slide.
   *
   * `variant` is `undefined` on the {@link leadingSlide}, which is not one of
   * the card views and has no frame to export at. A host that stages a
   * capture must treat that as "nothing to stage" rather than falling back to
   * a card the reader is not looking at.
   */
  onValueChange?: (id: string, variant?: LineupCardVariant) => void;
  /**
   * How far down each CARD view is drawn, as a fraction of its true size.
   * `0.35` puts a 1200px-tall card at 420px. Overridden at any breakpoint by
   * setting {@link LINEUP_CARD_VIEW_SCALE_VAR} in the host's own CSS. The
   * {@link leadingSlide} is not scaled — it is the host's own layout, at its
   * own size.
   */
  viewScale?: number;
  /**
   * A control for the slide currently showing — in practice, "save this one".
   *
   * ## Why the carousel does not simply have a save button
   *
   * These cards exist to be shared, and a reader on a published thought could
   * not take one: the views are DOM, not images, so a long-press offers
   * nothing to save and a right-click offers nothing to copy. Read-only was
   * the wrong line to draw.
   *
   * It is still not a line viz can cross by itself, though. Capturing a card
   * means rendering an unscaled {@link LineupCardView} offscreen, rasterising
   * it and handing someone a file — a host's job, and the editor already owns
   * that path. So viz asks the host for the control and puts it somewhere
   * sensible. Pass nothing and the gallery renders exactly what it always did,
   * with no extra node at all.
   *
   * ## Where it goes, and what that guarantees
   *
   * OUTSIDE the track, under the indicators — not pinned to a card's corner.
   * Two reasons, and the first is the load-bearing one:
   *
   *  1. Nothing here can reach a capture. Not "is filtered out of one" —
   *     cannot be inside one, since it is not inside any view. The wrapper
   *     carries `data-export-ignore="true"` as well, so a host that captures a
   *     WIDER root than a single card still excludes it.
   *  2. One control in one place, at a comfortable size, reachable by thumb on
   *     a phone and by pointer on desktop, that does not move as the reader
   *     swipes and does not cover the artwork it is offering to save.
   *
   * ## The leading slide
   *
   * Called for it too, with `variant` unset — the decision is the host's, not
   * viz's. The editor's plate already carries its own save control, so it
   * should return `null` there rather than offer a second one; that is one
   * line, and it is a line only the host can write honestly.
   */
  slideAction?: (slide: LineupCardSlide) => ReactNode;
  /** Accessible name for the gallery. */
  label?: string;
  /**
   * The host's own controls, rendered under the indicators and OUTSIDE every
   * view — so nothing here can reach a capture of a card. Omit for a
   * read-only gallery.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * One slide of the gallery, whoever drew it.
 *
 * The leading slide and the card views differ in almost everything — one is
 * the host's fluid layout, the others are absolutely-sized cards painted
 * through a transform — but they are one list to the track, to the scroll
 * arithmetic and to the indicators, and every one of those wants the same
 * three things from a slide: what to call it, what to link to it, and whether
 * it is the one showing. Flattening them here is what stops each of those
 * three places growing its own "unless it is the first one" clause.
 */
interface CarouselSlide extends LineupCardSlide {
  /** What the leading slide draws. Unset for a card view. */
  content?: ReactNode;
}

/**
 * Where the track rests when `view` is the slide being shown.
 *
 * Centring is the resting position for every slide the track can actually
 * centre. The first and last cannot be — there is no scroll range past either
 * end — so theirs are the range's own ends, which is what leaves the first
 * slide flush with the container's leading edge and the last flush with its
 * trailing one.
 *
 * Both halves of the control read this one function: the scroll an indicator
 * starts, and the scroll handler's answer to "which slide is this?". They
 * used to disagree — the handler measured against the viewport's MIDDLE,
 * which no end slide ever reaches — so at rest the gallery could report a
 * slide the reader was not looking at.
 */
function restingScrollLeft(track: HTMLElement, view: HTMLElement): number {
  // Measured against the TRACK, not `view.offsetLeft`. `offsetLeft` is
  // relative to the nearest POSITIONED ancestor, which the track is not — so
  // it silently carries however far the track itself sits from that ancestor,
  // in a number that is then compared against `scrollLeft`, which is measured
  // from the track's own edge. The two agree only when the track happens to
  // start at the ancestor's edge. Rects have one origin and no such condition.
  const trackBox = track.getBoundingClientRect();
  const viewBox = view.getBoundingClientRect();
  const start = viewBox.left - trackBox.left - track.clientLeft + track.scrollLeft;
  const centred = start - (track.clientWidth - viewBox.width) / 2;
  const furthest = Math.max(track.scrollWidth - track.clientWidth, 0);
  return Math.min(Math.max(centred, 0), furthest);
}

/**
 * The gallery: the lineup as published, then every card view of it, swipeable.
 *
 * Read-only by default. Pass `children` to hang a host's own controls under
 * the indicators, and `onValueChange` to learn which slide is showing —
 * neither is required, and neither is baked in.
 */
export function LineupCardCarousel({
  data,
  variants = LINEUP_CARD_VARIANTS,
  leadingSlide,
  value,
  defaultValue,
  onValueChange,
  slideAction,
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
   * Without this the two halves of the control fight each other. Picking an
   * indicator selects a slide AND starts a smooth scroll — and a smooth scroll
   * emits scroll events for the whole of its journey, each one asking
   * {@link onTrackScroll} "which slide is the track resting at now?". For the
   * first few frames the honest answer is still the PREVIOUS slide, so the
   * selection is dragged back and the indicator visibly flickers before
   * settling. While a scroll we started is in flight, the explicit pick wins.
   */
  const travellingTo = useRef<number | null>(null);

  /**
   * Every slide, in swipe order: the host's own first, then the card views.
   *
   * Deliberately NOT memoised. Nothing in this file is an effect or a
   * subscription, so the array's identity is never a dependency of anything
   * that could fire twice — and a `useMemo` keyed on `data`, `variants` and
   * `leadingSlide` would be recomputed on almost every render anyway, since a
   * host builds all three inline.
   */
  const slides: CarouselSlide[] = [
    ...(leadingSlide
      ? [
          {
            id: leadingSlide.id ?? LEADING_SLIDE_ID,
            label: leadingSlide.label,
            content: leadingSlide.content,
          },
        ]
      : []),
    ...variants.map((variant) => ({
      id: variant.id,
      label: variant.spokenLabel ?? variant.label,
      variant,
    })),
  ];

  const [uncontrolled, setUncontrolled] = useState(
    () => defaultValue ?? slides[0]?.id ?? LINEUP_CARD_VARIANTS[0]!.id
  );
  const selected = value ?? uncontrolled;
  const viewId = (slideId: string) => `${domId}-view-${slideId}`;

  // The control for the slide showing, if the host offers one for it. Falls
  // back to the first slide so a `value` naming nothing still has an action
  // rather than dropping it silently — the same slide the indicators would
  // then be showing as current.
  const activeSlide = slides.find((slide) => slide.id === selected) ?? slides[0];
  const action =
    activeSlide && slideAction
      ? // Rebuilt rather than passed straight through, so the host is handed
        // the published {@link LineupCardSlide} and not this file's private
        // `content` field along with it.
        slideAction({ id: activeSlide.id, label: activeSlide.label, variant: activeSlide.variant })
      : null;

  /**
   * Bring a slide to its resting place in the track.
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
      left: restingScrollLeft(track, view),
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, []);

  const select = useCallback(
    (index: number) => {
      const slide = slides[index];
      if (!slide) return;
      if (value === undefined) setUncontrolled(slide.id);
      // `undefined` on the leading slide, which is the whole point of the
      // second argument being optional — see `onValueChange`.
      onValueChange?.(slide.id, slide.variant);
    },
    [slides, value, onValueChange]
  );

  /**
   * Swiping is the other half of the same control: whichever slide the track
   * has come to rest at becomes the selection, so the indicators follow a drag
   * or a trackpad flick without anyone touching them.
   *
   * "Come to rest at" is {@link restingScrollLeft}, not "is nearest the
   * middle". They agree for every slide the track can centre and disagree at
   * both ends, where centring is unreachable: with the track at 0 the first
   * slide's own centre is left of the viewport's middle, so a neighbour can
   * measure closer to it and be reported as the slide showing — while the
   * reader is plainly looking at the first one.
   */
  const onTrackScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    let nearest = 0;
    let shortest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < track.children.length; i++) {
      const view = track.children[i];
      if (!(view instanceof HTMLElement)) continue;
      const distance = Math.abs(restingScrollLeft(track, view) - track.scrollLeft);
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
        // NO horizontal padding, and that is the whole of the fix for a gap
        // that used to open before the first slide.
        //
        // This carried `px-[50%]`, the usual companion to `snap-center`: half
        // a container of padding at each end is what lets an END slide reach
        // the middle of the viewport, since otherwise the scroll range stops
        // before it gets there. But that padding is CONTENT. At rest the
        // track shows half a container of nothing and then the first card,
        // pushed right by an allowance made for a slide in the middle.
        //
        // The end slides do not need to reach the middle; they need to reach
        // the EDGES. `snap-start` on the first and `snap-end` on the last say
        // exactly that, and are reachable without any padding at all —
        // scroll offset 0 and the range's far end. Everything between them
        // still centres. See `restingScrollLeft`, which is the same rule in
        // arithmetic so the scroll handler agrees with the CSS.
        className="flex w-full snap-x snap-mandatory items-center gap-4 overflow-x-auto overscroll-x-contain scroll-smooth py-1 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30 motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => {
          const active = slide.id === selected;
          const snap =
            index === 0 ? 'snap-start' : index === slides.length - 1 ? 'snap-end' : 'snap-center';
          return (
            <div
              key={slide.id}
              id={viewId(slide.id)}
              role="group"
              aria-label={slide.label}
              aria-roledescription="slide"
              data-slot="lineup-card-view"
              data-slide={slide.id}
              // Only a CARD view carries this. The leading slide is the
              // host's own layout and has no variant to name, and a host
              // querying `[data-variant]` is asking for something exportable.
              data-variant={slide.variant?.id}
              data-active={active || undefined}
              className={cn(
                'relative shrink-0 transition-opacity duration-200 motion-reduce:transition-none',
                snap,
                slide.variant
                  ? // A card is a picture with a hard edge, so it is framed
                    // and clipped to it.
                    cn(
                      'overflow-hidden rounded-[10px] border transition-[opacity,border-color]',
                      active
                        ? 'border-white/15 opacity-100 shadow-[0_24px_64px_rgba(0,0,0,0.6)]'
                        : 'border-white/[0.06] opacity-45'
                    )
                  : // The leading slide is not. It draws its own frame — the
                    // editor's plate has a border, a radius and a tilt — so a
                    // second one here would be a box inside a box, and
                    // `overflow-hidden` would clip the shadow it casts. It
                    // takes a full turn of the track because it is a fluid
                    // block, not a card at an absolute size.
                    cn('w-full', active ? 'opacity-100' : 'opacity-45')
              )}
              style={
                slide.variant
                  ? {
                      width: `calc(${LINEUP_CARD_FRAME_SIZE[slide.variant.frame].width}px * var(${LINEUP_CARD_VIEW_SCALE_VAR}, ${viewScale}))`,
                      height: `calc(${LINEUP_CARD_VIEW_HEIGHT}px * var(${LINEUP_CARD_VIEW_SCALE_VAR}, ${viewScale}))`,
                    }
                  : undefined
              }
            >
              {slide.variant ? (
                <div
                  style={{
                    width: LINEUP_CARD_FRAME_SIZE[slide.variant.frame].width,
                    height: LINEUP_CARD_VIEW_HEIGHT,
                    transformOrigin: 'top left',
                    transform: `scale(var(${LINEUP_CARD_VIEW_SCALE_VAR}, ${viewScale}))`,
                  }}
                >
                  <LineupCardView variant={slide.variant} data={data} />
                </div>
              ) : (
                slide.content
              )}
            </div>
          );
        })}
      </div>

      {/*
        The indicators: one bar per slide, the same device platform's arena
        carousel uses, and nothing written.

        They used to print the views' names — "Team sheet 5:6", "Pitch 5:6",
        "Team sheet 1:1", "Pitch 1:1" — a full row of captions under a row of
        pictures, on a surface where the reader came to read an article. The
        question a carousel control has to answer is "which of these am I
        looking at", and four bars answer it; the names only ever restated
        what each card plainly shows.

        WHAT WENT IS THE PRINTING, NOT THE MEANING. Every bar still carries
        the view's `spokenLabel` as its accessible name, so a screen reader
        still hears "Team sheet, portrait five by six" and can still tell the
        views apart — a bar with no name would have made this an accessibility
        regression dressed as a design one.

        Still ANCHORS rather than buttons, so the gallery works with scripting
        off: a same-document fragment link scrolls the track natively. With
        JavaScript the default is prevented — which also keeps a modal from
        pushing a hash onto the history stack — and replaced by a smooth
        scroll. `data-slot="lineup-card-pill"` is deliberately unchanged: it
        is a published DOM contract the editor's own suite asserts against,
        and renaming it to match the new shape would break a consumer to
        rename a string.
      */}
      <nav aria-label={label} data-slot="lineup-card-pills">
        <ul className="flex list-none items-center justify-center gap-2 p-0">
          {slides.map((slide, index) => {
            const active = slide.id === selected;
            return (
              <li key={slide.id}>
                <a
                  href={`#${viewId(slide.id)}`}
                  aria-label={slide.label}
                  aria-current={active ? 'true' : undefined}
                  data-slot="lineup-card-pill"
                  data-slide={slide.id}
                  data-variant={slide.variant?.id}
                  onClick={(event) => {
                    event.preventDefault();
                    select(index);
                    scrollToIndex(index);
                  }}
                  // Enter is the anchor's own native activation and arrives
                  // as a click. Space is not — a link ignores it, and scrolls
                  // the page instead — but these READ as buttons, so a
                  // keyboard user reasonably tries it. Handling it here is
                  // the one behaviour the anchor does not already give us.
                  onKeyDown={(event) => {
                    if (event.key !== ' ') return;
                    event.preventDefault();
                    select(index);
                    scrollToIndex(index);
                  }}
                  // The anchor is the TARGET, 24x24, and the bar inside it is
                  // the mark. Sizing the anchor to the bar would make the
                  // whole control a 24x4px strip, which is under any sane
                  // pointer target on the phone this is mostly read on.
                  className={cn(
                    'group/indicator flex size-6 cursor-pointer items-center no-underline',
                    'focus-visible:rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1 w-full rounded-full transition-colors motion-reduce:transition-none',
                      active ? 'bg-white' : 'bg-white/30 group-hover/indicator:bg-white/60'
                    )}
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/*
        The host's control for the slide showing — "save this card", in the
        only case there is so far.

        `data-export-ignore="true"` is belt to the braces: this node is not
        inside any view, so it cannot be in a capture of one, but a host that
        rasterises a WIDER root would otherwise pick it up. `captureElementToPng`
        collapses every node carrying it before it measures.

        Rendered only when the host actually returns something, so a gallery
        with no `slideAction` — and one whose host declines to offer an action
        for THIS slide, which is what the leading plate should do — emits no
        node at all rather than an empty box holding space open.
      */}
      {action ? (
        <div
          data-slot="lineup-card-slide-action"
          data-slide={activeSlide?.id}
          data-export-ignore="true"
          className="flex items-center justify-center"
        >
          {action}
        </div>
      ) : null}

      {children}
    </div>
  );
}

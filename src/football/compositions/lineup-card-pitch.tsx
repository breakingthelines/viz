// The lineup social card's PITCH BODY — one definition, for every host.
//
// ## Why this is its own module
//
// This composition existed twice. `LineupCardView` (in `lineup-card-carousel`)
// carried one copy, because that is the component a host renders and captures;
// `lineup-card.stories.tsx` carried another, because that is where the card's
// geometry is measured. They were written from the same Figma frame and then
// drifted, silently, in the direction that mattered most:
//
//  - 0.12.0 removed the faked `pitchPadding={1.7}` from the story copy in
//    favour of the card-scoped `fit`/`pitchPadding` defaults, and left it on
//    the shipped one.
//  - 0.13.0 sized the name type down to the Figma-derived 16px on the story
//    copy — and asserted it, in `SquarePitchGeometry` — and left the shipped
//    one deriving 25px from an oversized marker.
//
// So every chip-geometry guard in the suite passed while the card a reader
// was actually handed rendered its labels 57% too large and truncated three
// ordinary surnames ("van D…", "Jacq…", "Frim…") across the back four. The
// guards were not weak; they were pointed at a component nobody ships.
//
// One exported component closes that for good: the stories measure the same
// node the exporter rasterises, so a number can no longer be right in the
// suite and wrong in the product.

import {
  LineupPitch,
  type LineupMarkerContent,
  type LineupSlot,
} from '#/football/compositions/lineup-pitch';

/**
 * The Figma card's headshot RADIUS, in viewBox units — 4.354.
 *
 * Derived rather than eyeballed: the card's pitch declares a 66.667-unit-wide
 * viewBox across a 489.6px box, i.e. 7.344 px per unit, so the file's 64px
 * disc is a 32px radius is 4.354 units.
 */
const CARD_MARKER_SIZE = 4.354;

/**
 * The name chip's type size, in viewBox units — 2.177, which is 16px at the
 * same 7.344 px/unit, HALF the marker radius, so the name is set at a quarter
 * of the 64px headshot's diameter.
 *
 * A deliberate departure from the Figma, which sets 22px (2.993 units). It is
 * recorded here rather than buried: the file's own value is 27% larger, and
 * 0.11.0 matched it on purpose. What the file could not show is a real team
 * sheet — its sample XI is James, Stones, Rice, Kane, Saka, and at that length
 * 22px looks correct. Against the names cards are actually published with, the
 * same 22px reads as heavy chips crowding the photographs they are supposed to
 * caption, and it is the size at which the back four's chips start competing
 * for room at all.
 *
 * 16px is what makes the competition disappear rather than merely survivable.
 * Measured on the reported Liverpool XI, the tightest chip on the board is a
 * centre back's: bounded by the midpoint to its partner, it owns 17.33 units
 * — 127.3px — to carry a 54px surname, better than two to one. At the 25.09px
 * the shipped card was rendering, that same budget fell to 102.5px against a
 * name that needed more than 100px, and the full backs joined the centre
 * backs' row (a chip is 1.75x the type, so taller type pulls more markers into
 * competition) and halved it again. The budget rule did not need loosening;
 * the type was wrong. See `nameChipBudgets`.
 *
 * The MARKER is untouched at the file's 64px. This is a change to the type
 * only, which is what `nameFontSize` was added for in 0.11.0 — sizing the
 * label independently of the disc, instead of shrinking the photographs to
 * control the text hanging under them.
 */
const CARD_NAME_FONT_SIZE = 2.177;

export interface LineupCardPitchProps {
  /**
   * The XI, in ORDINARY lineup coordinates — the same ones a `LineupPitch`
   * anywhere else in the product is given, keeper at low `x` and `y=0` at the
   * team's own left touchline.
   *
   * Nothing is pre-reversed here, and callers must not pre-reverse either.
   * The card's viewpoint is carried by `orientation="portrait-down"` below,
   * where it is a single provable rotation rather than a coordinate reshape
   * each caller has to get right — the two callers this replaced both got it
   * wrong the same way, flipping depth alone and mirroring the whole XI.
   */
  slots: LineupSlot[];
  /** What a filled marker shows. Defaults to `headshot`, as the Figma draws. */
  markerContent?: LineupMarkerContent;
  /** Marker fill / ring colour. Defaults to the file's neutral chip grey. */
  teamColor?: string;
  /** Kit-number / monogram text colour. */
  numberColor?: string;
}

/**
 * The pitch as the lineup social card draws it — Figma 3048:11311.
 *
 * Everything the frame asks for comes out of `LineupPitch`'s existing props;
 * no new ones were needed beyond the `portrait-down` orientation, which is a
 * property of the VIEWPOINT rather than of the card.
 *
 * `teamName`/`formation` are deliberately NOT passed. `LineupPitch` prints its
 * own team + formation chip above the pitch in read-only mode, and the card
 * already carries both in its own headline and footer — omitting them is what
 * suppresses the duplicate, with no new prop required.
 *
 * `fit` and `pitchPadding` are NOT passed either, and that is the point:
 * inside a `LineupCard` they resolve to `height` / `0` on their own, so a host
 * composing this card gets the slot fit without having to know the numbers.
 * 0.11.0 passed `pitchPadding={1.7}` to fake it — that sized the drawing to
 * the slot's 734px height but left the pitch's BOX at 515x772.5, hanging 19px
 * past the slot top and bottom, and it also widened the viewBox enough to
 * shift the px-per-unit scale every other number here is derived from.
 * `PitchFitsCardBodySlot` measures the repair.
 */
export function LineupCardPitch({
  slots,
  markerContent = 'headshot',
  teamColor = '#2b2b2b',
  numberColor,
}: LineupCardPitchProps) {
  return (
    <LineupPitch
      slots={slots}
      // The card composes its XI keeper-first under the headline, so it looks
      // back up the pitch from the far end: own goal at the TOP, attacking
      // down, and the team's left touchline on the viewer's right. Explicit
      // rather than left to the prop default — the card must keep drawing this
      // viewpoint whatever that default happens to be.
      orientation="portrait-down"
      markerContent={markerContent}
      showNames
      editable={false}
      theme="dark"
      // The Figma pitch is a hairline drawing on the card's own dark ground,
      // far lighter than `Pitch`'s `#2b2b2b` dark-theme default. Grass is left
      // unset — `LineupPitch`'s dark default is already the file's `#1f1f1f`.
      lineColor="rgba(255,255,255,0.5)"
      markerSize={CARD_MARKER_SIZE}
      nameFontSize={CARD_NAME_FONT_SIZE}
      // Neutral `#2b2b2b` (the file's own chip grey) rather than the default
      // team blue, which would be the only saturated colour on an otherwise
      // monochrome card. It backs each headshot and shows through a
      // transparent one.
      teamColor={teamColor}
      numberColor={numberColor}
      // Without `shrink-0` the flex slot squeezes the pitch to ~420px wide and
      // floats it in the middle of the column.
      className="w-full shrink-0"
    />
  );
}

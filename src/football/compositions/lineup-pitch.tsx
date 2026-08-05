import { useRef, useState } from 'react';
import { cn } from '#/lib/utils';
import { Pitch, toScreen, fromScreen, fullPitchFrame } from '#/football/primitives/pitch';
import type { PitchTheme, PitchOrientation } from '#/football/primitives/pitch';
import { formatFormationLabel } from '#/football/compositions/formation-label';
import { monogram, surname } from '#/football/lib/player-name';
import { SvgHeadshot } from '#/football/lib/headshot';
import { finite, finitePositive } from '#/football/lib/finite';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { BTL_RED } from '#/football/lib/btl-logo';
import { useLineupFrame } from '#/football/compositions/lineup-card';
import { measureLabelEm, useFontsReady } from '#/football/lib/text-width';

/** A player assigned to a lineup slot. */
export interface LineupSlotPlayer {
  /** Stable identifier (squad/provider id, or a generated id for custom names). */
  id: string;
  /** Display name. */
  name: string;
  /** Shirt number, shown inside the marker in `number` mode. */
  shirtNumber?: number;
  /** Headshot URL, shown inside the marker in `headshot` mode (monogram fallback). */
  imageUrl?: string;
  /**
   * Marks this player as the team captain.
   *
   * Rendered by BOTH bodies of the lineup social card, from this one field, so
   * a single lineup's data drives either without being reshaped in between:
   * `LineupList` prints a "C" badge after the name on the team sheet, and
   * `LineupPitch` overlays a red armband disc on the player's marker.
   *
   * **At most one captain.** A team has one, so both bodies render the badge
   * for the FIRST flagged player only and silently ignore any others — a
   * lineup carrying two is caller error, and drawing two armbands would
   * present invalid data as though it were valid. "First" is in the order the
   * caller supplies (slot order here, team-sheet order in `LineupList`), so
   * the choice is deterministic rather than dependent on layout. viz does not
   * reject the input or warn: the editor enforces exactly one at build time,
   * and a published card is the wrong place to surface a data error.
   */
  isCaptain?: boolean;
}

/** A single position on the lineup board — filled or empty. */
export interface LineupSlot {
  /** x on the 0–100 pitch scale (low = own half). */
  x: number;
  /** y on the 0–100 pitch scale (0 = left touchline, 100 = right). */
  y: number;
  /** Positional role label (e.g. "GK", "CB", "ST"), shown in empty slots. */
  role?: string;
  /** Assigned player, or undefined for an empty slot. */
  player?: LineupSlotPlayer;
}

/** What fills a player marker: the shirt number, or the player's headshot. */
export type LineupMarkerContent = 'number' | 'headshot';

export interface LineupPitchProps {
  /** Slots to render (filled + empty). */
  slots: LineupSlot[];
  /** Team display name (used for the chip when no short name is set). */
  teamName?: string;
  /** Short name shown in the chip. Falls back to {@link teamName}. */
  teamShortName?: string;
  /** Formation label string, e.g. "4-3-3". */
  formation?: string;
  /** Marker fill / ring colour for filled slots. */
  teamColor?: string;
  /** Kit-number / monogram text colour. Defaults to white. */
  numberColor?: string;
  /**
   * Colour for the player NAME label (under a filled marker) and the
   * empty-slot ROLE label. Defaults to `'white'` — today's hardcoded colour,
   * so every existing caller renders identically. A caller pairing this with
   * a light `grassColor` should pass a dark value here (and to `lineColor`)
   * for contrast — `LineupPitch` itself has no auto-contrast logic; see the
   * `lineColor` doc above for the same contract.
   */
  labelColor?: string;
  /** Pitch theme. Defaults to `dark` (the editor / reader surface). */
  theme?: PitchTheme;
  /**
   * Pitch background (grass) colour. Forwarded to viz `Pitch`'s own
   * `grassColor` prop, overriding the default. **Unset, under the `dark`
   * theme** resolves to `#1f1f1f` (the Figma lineup restyle's own card-scoped
   * default — see the `resolvedGrassColor` comment in the component body),
   * NOT `Pitch`'s shared near-black `--color-pitch-grass-dark` token every
   * other dark pitch in the package defaults to.
   */
  grassColor?: string;
  /**
   * Pitch line colour. Forwarded verbatim to viz `Pitch`'s own `lineColor`
   * prop, overriding the theme default. `LineupPitch` has no auto-contrast
   * logic of its own — pass a colour that stays readable against whatever
   * `grassColor` is set to (the editor's pitch-colour presets each carry a
   * paired/derived line colour for exactly this).
   */
  lineColor?: string;
  /** Additional CSS classes. */
  className?: string;
  /** Marker radius in viewBox units. */
  markerSize?: number;
  /**
   * Player NAME label size, in viewBox units. Defaults to `markerSize * 0.718`
   * — the derived size every existing caller gets, so omitting this renders
   * exactly as before.
   *
   * Exists because the lineup social card is composed to a fixed artboard and
   * the derived default cannot serve it. The default 0.718 is the deliberate
   * legibility bump shipped in 0.9.1/0.9.2 for the reader plate, where a
   * lineup is read in a feed; the card instead states a size outright, so the
   * two surfaces are not forced to share one ratio and neither can silently
   * revert a decision made for the other.
   *
   * Setting this does NOT change the marker — that is the whole point of the
   * prop. The card sizes its name type well under the derived ratio (a
   * quarter of the marker's diameter, against the file's own 0.34) while
   * keeping the headshots at the Figma's 64px; see the card's own call for
   * why, and note that shrinking the discs to control the labels would have
   * been the wrong lever.
   *
   * Whatever size is chosen, a chip is still fitted to the room its marker
   * actually owns before it is drawn — see {@link nameChipBudgets}. This prop
   * sets the type; it does not license a chip to run into its neighbour or out
   * of the frame.
   *
   * In viewBox units rather than pixels, to match `markerSize`'s own contract
   * — the caller that pins one is invariably pinning both against the same
   * px-per-unit scale.
   */
  nameFontSize?: number;
  /**
   * Gutter around the pitch markings, in pitch units, forwarded to `Pitch`'s
   * own `padding`. Defaults to `7` — the value this component has always
   * hardcoded, so every existing caller renders identically — except inside a
   * {@link LineupCard}, where it defaults to `0`; see {@link fit} for why the
   * two defaults travel together.
   *
   * The gutter is what stops a marker sitting ON the touchline (or its name
   * chip hanging below the goal line) from being clipped by the SVG edge, so
   * it should only be reduced when the formation in play keeps its markers
   * clear of the boundary. It is exposed because the padded viewBox costs
   * real width: at `7`, the pitch DRAWING is only ~83% of the box it is
   * given, which is invisible on a block sitting in an article column but
   * very visible on the lineup social card, where the pitch is supposed to
   * run the full width of a fixed 515px panel (Figma 3048:11311 draws it
   * edge-to-edge at 515x734). Lowering it there recovers that width without
   * distorting the pitch's real ~2:3 proportions, which stretching the SVG
   * to the panel would.
   *
   * `0` is valid and means flush, no gutter — which is why it is guarded with
   * `finite` rather than `finitePositive`, the latter treating `0` as garbage
   * and silently restoring the default.
   */
  pitchPadding?: number;
  /** What a filled marker shows. Defaults to `number`. */
  markerContent?: LineupMarkerContent;
  /** Show the surname under each filled marker. */
  showNames?: boolean;
  /**
   * Interactive mode. When true, every slot is clickable and empty slots
   * render a dashed, inviting placeholder. When false (the published reader),
   * empty slots render as faint static circles and nothing is clickable.
   */
  editable?: boolean;
  /** Fires with the slot index when a slot is clicked (only when editable). */
  onSlotClick?: (index: number) => void;
  /**
   * Fires with a filled slot's player (and its index) when the marker is
   * clicked in read-only mode — e.g. to navigate to the player's entity page.
   * Has no effect when `editable`: there, a marker click opens the assignment
   * picker via {@link onSlotClick} instead, so a click never means two
   * different things on the same marker. Empty slots are never interactive
   * under this prop (there's no player to click through to).
   */
  onPlayerClick?: (player: LineupSlotPlayer, index: number) => void;
  /**
   * Fires when a completed drag moves a filled marker onto another slot —
   * `(fromIndex, toIndex)`. The caller swaps the two slots' `player` in one
   * update (position `x`/`y`/`role` belong to the formation slot, not the
   * player, so they stay put). Dragging onto an EMPTY slot is a valid "move"
   * — a swap against an undefined player.
   *
   * Purely additive over the existing tap gesture: a plain tap (movement
   * under the drag threshold) still calls {@link onSlotClick} as before, and
   * omitting this prop keeps a filled marker click-only, exactly as before it
   * existed. Fires once per completed drag, on release — never mid-drag — so
   * the consumer does a single `updateConfig`, not one per pointer move.
   *
   * Only engages when `editable`. Keyboard / assistive-tech users are
   * unaffected either way: they still reassign a slot through
   * {@link onSlotClick}'s picker, which remains the fully accessible path —
   * a pointer drag has no keyboard equivalent here.
   */
  onSlotsSwap?: (fromIndex: number, toIndex: number) => void;
  /** Index of the currently selected slot (highlight ring). */
  selectedSlotIndex?: number;
  /**
   * Touch-optimised sizing for a large, fullscreen editing surface (the
   * editor's fullscreen/landscape lineup mode). Scales markers, names and
   * empty-slot labels up from the inline-card defaults in one step — the
   * same readability bump a caller could already dial in by hand via
   * `markerSize`, just pre-tuned so a fullscreen host doesn't have to guess a
   * magic number. Ignored when `markerSize` is set explicitly (an explicit
   * caller value always wins).
   */
  fullscreen?: boolean;
  /**
   * How the pitch fills its container. `'width'` is the classic
   * `w-full h-auto` behaviour — the pitch is as wide as its container and the
   * height follows from the 3:2 aspect ratio. `'height'` instead fills the
   * container's height and derives width from it (capped so it never
   * overflows), for a container whose HEIGHT is the binding constraint — a
   * landscape phone viewport, which is wide but short.
   *
   * ## The default is `'width'`, except inside a `LineupCard`
   *
   * An explicit value always wins. Left unset, this resolves to `'width'` —
   * today's behaviour for the editor's builder, the published reader and
   * Match Centre, all of which render this component with no card around it
   * and must not move — and to `'height'` inside a {@link LineupCard}, whose
   * body slot is a FIXED 515x734 box rather than a column of free height.
   *
   * That slot is why the card is the one surface that has to fit the other
   * way round. A width-fitted pitch in a 515px-wide slot is 772.5px tall (the
   * real 2:3 proportion), so its box hung 19px past the slot at top and
   * bottom — measured, not estimated, in `PitchFitsCardBodySlot`. The Figma
   * frame draws 515x734 by stretching its pitch graphic to aspect 0.702; a
   * real pitch is 0.667, so the box can match the slot's width or its height
   * but not both without distorting the pitch, and the height is the
   * dimension this composition actually reads. Matching it lands the box at
   * 489.6x734.4 — inside the slot on both axes, 12.7px of slack each side.
   *
   * `pitchPadding` defaults to `0` in the same breath, and the two are one
   * decision rather than two: the card's slot is the pitch's frame, so the
   * DRAWING should fill it edge to edge exactly as the Figma does (its 734px
   * box IS the pitch graphic, with the markers inside it). Fitting the height
   * without dropping the gutter would shrink the drawing to 466x699 — the box
   * would fit and the pitch would get smaller, which is not the fix. Together
   * they leave the visible pitch where it already was (490x735 before,
   * 489.6x734.4 after, a 0.08% change) and take 38px of empty overhang off
   * the box.
   *
   * Both defaults are scoped through {@link useLineupFrame}, so they are
   * reached only by a pitch with a card above it — a standalone `LineupPitch`
   * never sees them. `StandaloneFitIsUnchanged` pins that isolation.
   */
  fit?: 'width' | 'height';
  /**
   * Pitch orientation. Defaults to `landscape` — every existing consumer
   * (the editor's Lineup block, Match Centre) renders identically to today.
   * `portrait` rotates the pitch a quarter-turn so the own goal sits at the
   * bottom and the front line at the top — attacking UP the screen — for a
   * lineup that needs to fill a phone-shaped viewport. Forwarded straight to
   * the underlying {@link Pitch}; every slot's marker is repositioned via
   * the same {@link toScreen} remap so markings and markers always agree on
   * where the pitch is. Marker CONTENT — the number/monogram, the name
   * label, the headshot, the empty-slot "+" — is never rotated, only its
   * anchor point moves, so it stays upright and legible in every
   * orientation. Drag-to-swap (`onSlotsSwap`) also works unchanged in
   * portrait: the pointer-to-pitch-space conversion accounts for
   * orientation via {@link fromScreen} before any hit-testing happens, so
   * the gesture math itself never needs to know which orientation is active.
   *
   * `portrait-down` is the same box turned 180 degrees — own goal at the TOP,
   * attacking DOWN the screen, and the team's own left touchline on the
   * VIEWER'S RIGHT, because you are looking back up the pitch from the far
   * end. It is the lineup social card's viewpoint.
   *
   * Pass it rather than pre-reversing `slots`. A caller that flips only the
   * depth axis to get the keeper to the top produces a MIRROR — left and right
   * swap, and the whole XI renders back to front — which is the defect
   * `portrait-down` was added to fix; see {@link toScreen}. Slots stay in
   * ordinary lineup coordinates in every orientation, so one lineup's data can
   * be handed to the reader plate and to a card without being reshaped in
   * between, and `nameChipBudgets`, the drag hit-test and the drag ghost all
   * keep agreeing with the markings for free.
   */
  orientation?: PitchOrientation;
}

/** Client-pixel movement past which a marker press counts as a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 6;

/**
 * Headshot ring stroke width, as a fraction of the marker's own radius
 * (`markerSize`) — pulled from the Figma restyle's headshot: a 1.321px ring
 * on a 74px-diameter (r 37px) circle, 1.321 / 37 ≈ 0.0357. Proportional
 * (rather than a flat constant) so it stays the same relative hairline
 * across `fullscreen`/custom `markerSize` values, not just the inline-card
 * default.
 */
const HEADSHOT_RING_WIDTH_RATIO = 0.036;
/**
 * Headshot ring opacity — the Figma ring is `rgba(255,255,255,0.05)`, a
 * near-invisible hairline rather than a solid stroke; matched here exactly
 * rather than brightened, per the Figma reference.
 */
const HEADSHOT_RING_OPACITY = 0.05;

/**
 * Project a pointer event's screen position into the pitch's own 0–100
 * normalized user-space — the same space `slot.x` / `slot.y` already live in
 * — via the element's screen CTM, then {@link fromScreen} to undo the
 * `orientation` remap. This is what keeps the drag tracking correct
 * regardless of how large the `aspect-[3/2]`/`aspect-[2/3]` box is rendered
 * at (a mobile card vs. the desktop builder), AND regardless of
 * orientation — everything downstream (`nearestSlotIndex`, the accumulated
 * `dx`/`dy` offset) reads this result and stays written purely in terms of
 * `slot.x`/`slot.y`, without ever needing to know which orientation is
 * active. The `fromScreen` call's trailing `true` undoes the SAME
 * `fillEdgeToEdge` compression this pitch always renders with (see the
 * `<Pitch>` call below) — omitting it here would leave every drag hit-test
 * off by that compression's ratio.
 */
function toPitchPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  orientation: PitchOrientation
): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const { x, y } = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return fromScreen(x, y, orientation, true);
}

/** The slot whose (x, y) is closest to a pitch-space point — the pending drop target. */
function nearestSlotIndex(slots: LineupSlot[], x: number, y: number): number {
  let best = 0;
  let bestDistSq = Infinity;
  for (let i = 0; i < slots.length; i++) {
    const dx = finite(slots[i].x) - x;
    const dy = finite(slots[i].y) - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = i;
    }
  }
  return best;
}

/** An in-flight pointer drag of a filled marker, tracked in pitch (0–100) user-space. */
interface DragGesture {
  pointerId: number;
  fromIndex: number;
  startClientX: number;
  startClientY: number;
  /** Pitch-space pointer offset from the origin slot's position. */
  dx: number;
  dy: number;
  /** Whether movement has exceeded {@link DRAG_THRESHOLD_PX} — a drag, not a tap. */
  dragging: boolean;
  /** Slot nearest the live pointer position — the pending drop target. */
  targetIndex: number;
}

interface MarkerGlyphProps {
  x: number;
  y: number;
  player: LineupSlotPlayer;
  markerSize: number;
  markerContent: LineupMarkerContent;
  color: string;
  numberColor: string;
  ringColor?: string;
  /** Forwarded to the headshot's own image node. Ghost copies pass `'none'` — the real, capturing marker keeps handling the gesture. */
  pointerEvents?: 'none' | 'auto';
}

/** The marker's visual only (headshot or number disc) — shared by the in-place marker and its drag ghost. */
function MarkerGlyph({
  x,
  y,
  player,
  markerSize,
  markerContent,
  color,
  numberColor,
  ringColor,
  pointerEvents = 'auto',
}: MarkerGlyphProps) {
  if (markerContent === 'headshot') {
    return (
      <SvgHeadshot
        cx={x}
        cy={y}
        r={markerSize}
        name={player.name}
        imageUrl={player.imageUrl}
        color={color}
        // Figma restyle (node 3047:11125): a hairline WHITE ring at ~5%
        // opacity — was the team `color` itself at near-full opacity, which
        // read as a second, competing rim of colour around a headshot
        // that's already backed by that same colour. Width is proportional
        // to `markerSize` (not a flat constant like the old 0.5) at the
        // ratio pulled from the Figma headshot: a 1.321px ring on a 74px
        // (r=37) circle, 1.321/37 ≈ 0.036 of the radius — see
        // `HEADSHOT_RING_WIDTH_RATIO`. The drag ghost still explicitly
        // forwards `ringColor="white"`, so this is a no-op for it and only
        // changes the in-place, non-ghost marker.
        ringColor={ringColor ?? 'white'}
        ringWidth={markerSize * HEADSHOT_RING_WIDTH_RATIO}
        ringOpacity={HEADSHOT_RING_OPACITY}
        monogramFill={numberColor}
        monogramSizeRatio={0.8}
        fallbackStroke="white"
        fallbackStrokeWidth={0.3}
        pointerEvents={pointerEvents}
      />
    );
  }

  return (
    <>
      <circle cx={x} cy={y} r={markerSize} fill={color} stroke="white" strokeWidth="0.3" />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={numberColor}
        fontSize={player.shirtNumber !== undefined ? markerSize : markerSize * 0.8}
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {player.shirtNumber !== undefined ? player.shirtNumber : monogram(player.name)}
      </text>
    </>
  );
}

/**
 * Captain armband geometry, all as fractions of `markerSize` (the marker
 * RADIUS) so the badge scales with the marker instead of needing its own size
 * knob — the same rule the name chip and the headshot ring already follow.
 *
 * The badge sits centred ON the marker's rim at 45° up-and-right, half on the
 * photo and half off it, which is how a real armband reads at a glance: an
 * attachment to the player rather than a label about them. Up-and-right is the
 * one quadrant that is structurally free — the name chip always hangs BELOW
 * the marker (`labelBaselineOffset`), so a top-corner badge can never collide
 * with the label, at any marker size or font scale. `CaptainBadgeClearsName`
 * in the stories measures exactly that.
 */
const CAPTAIN_BADGE_OFFSET = Math.SQRT1_2;
/** Badge radius. Big enough to carry a legible "C", small enough not to read as a second marker. */
const CAPTAIN_BADGE_RADIUS_RATIO = 0.42;
/** "C" size as a fraction of the badge's own radius. */
const CAPTAIN_BADGE_FONT_RATIO = 1.25;
/** Hairline rim, matching the headshot ring's own white-at-low-opacity language. */
const CAPTAIN_BADGE_RING_RATIO = 0.06;

/**
 * The captain's armband: a BTL-red disc carrying a white "C", overlaid on the
 * corner of a player's marker.
 *
 * Drawn in the package's own brand red ({@link BTL_RED}) rather than a
 * one-off hex — on an otherwise monochrome card it is the single saturated
 * mark, so it has to be the same red as the BTL bracket beside it.
 */
function CaptainArmband({ x, y, markerSize }: { x: number; y: number; markerSize: number }) {
  const r = markerSize * CAPTAIN_BADGE_RADIUS_RATIO;
  const cx = x + markerSize * CAPTAIN_BADGE_OFFSET;
  const cy = y - markerSize * CAPTAIN_BADGE_OFFSET;
  return (
    <g
      data-slot="lineup-captain-badge"
      style={{ pointerEvents: 'none' }}
      // `role` + `aria-label` together, matching `LineupList`'s own captain
      // badge — a bare `aria-label` on a <g> is not reliably exposed, and the
      // two bodies should describe the armband the same way.
      role="img"
      aria-label="Captain"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={BTL_RED}
        stroke="white"
        strokeWidth={markerSize * CAPTAIN_BADGE_RING_RATIO}
        strokeOpacity={HEADSHOT_RING_OPACITY}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={r * CAPTAIN_BADGE_FONT_RATIO}
        fontWeight="700"
        style={{ pointerEvents: 'none' }}
      >
        C
      </text>
    </g>
  );
}

/**
 * FALLBACK average per-character advance for the name chip's width, as a
 * fraction of `nameFontSize`, used only where the environment cannot measure
 * text (server-side rendering, or a canvas context the host refuses) — see
 * {@link measureLabelEm}, which is the primary path.
 *
 * Inter's mixed-case running-text advance averages a bit under 0.6em; this is
 * deliberately a little OVER that (bias toward roomier rather than clipped)
 * since a single constant has to cover both narrow runs ("Rice") and wide
 * ones ("Bellingham", "O'Reilly").
 *
 * That bias is exactly why it can only be the fallback. Measured against Inter
 * at the lineup card's real size, the sample XI's surnames run from 0.451em
 * per character ("Colwill") to 0.620em ("James") — a 37% spread that no single
 * number covers. Pinned at the top of the range so nothing clips, this
 * over-measures most names by up to a third: on the card's 515px pitch it drew
 * "Colwill" in a 134px chip around an 83px word, and the resulting slack
 * collided the back four's chips into each other ("Colwill"/"O'Reilly"
 * overlapped by 34px) where the Figma frame (3048:11311) keeps them clearly
 * apart. The Figma chip is a real text layout box that hugs its glyph run with
 * a flat 8px of padding, and {@link measureLabelEm} is how this reproduces
 * that mechanism rather than approximating it.
 */
const NAME_CHIP_CHAR_ADVANCE = 0.62;
/**
 * Horizontal chip padding, EACH side, as a fraction of `nameFontSize` — the
 * Figma chip pads 8px around 22px text (8/22 ≈ 0.364).
 */
const NAME_CHIP_PAD_X = 8 / 22;
/**
 * Chip height as a multiple of `nameFontSize` — the Figma chip is 22px text
 * (≈ 26.4px line box at Inter's ~1.2 line-height) plus 6px padding top and
 * bottom: (26.4 + 6 × 2) / 22 ≈ 1.75.
 */
const NAME_CHIP_HEIGHT_RATIO = 1.75;
/**
 * Chip corner radius as a fraction of `nameFontSize` — the Figma chip's
 * radius is a flat 6px against its 22px text (6/22 ≈ 0.27), not scaled off
 * the chip's own height.
 */
const NAME_CHIP_RADIUS_RATIO = 6 / 22;
/**
 * Chip border stroke width, as a fraction of `nameFontSize` — the Figma
 * chip's hairline border is 1.429px against its 22px text (1.429/22 ≈
 * 0.065).
 */
const NAME_CHIP_BORDER_RATIO = 1.429 / 22;
/**
 * The name `<text>` is drawn at its alphabetic baseline (no `dominantBaseline`
 * override — unchanged from before the chip existed, so existing snapshots of
 * the text node itself stay identical). The chip rect instead needs to centre
 * on the text's visual middle, which sits ABOVE that baseline by roughly this
 * fraction of the font size for cap-height Latin surnames (no descenders in
 * the sample data) — a small, deliberately-conservative fudge verified by
 * rendering, not derived from font metrics (the Figma file has no equivalent
 * number for this — it's an artifact of SVG's baseline-anchored `<text>`,
 * not something a real text layout box needs).
 */
const NAME_CHIP_BASELINE_TO_CENTER = 0.32;

/** Backing chip fill — the Figma chip's `#2b2b2b` ("grey-300"), solid. */
const NAME_CHIP_FILL = '#2b2b2b';
/** Backing chip border colour — the Figma chip's hairline `rgba(255,255,255,0.05)`. */
const NAME_CHIP_BORDER_COLOR = 'rgba(255, 255, 255, 0.05)';

/**
 * Character appended to a surname that cannot fit the horizontal space its
 * marker owns. A real ellipsis, not three periods — it is one glyph, so it
 * costs a third of the width at the exact moment width is the problem.
 */
const NAME_CHIP_ELLIPSIS = '…';

/** Measured width of `label`'s glyph run, or the per-character estimate. */
function labelRunWidth(label: string, fontSize: number, fontsReady: boolean): number {
  const em = measureLabelEm(label, fontsReady);
  return em !== null ? em * fontSize : label.length * fontSize * NAME_CHIP_CHAR_ADVANCE;
}

/**
 * Width of the name chip for `label`, in the same user units as `fontSize`.
 *
 * Sizes to the label's REAL measured glyph run plus the Figma chip's flat
 * padding, falling back to the per-character estimate only where text cannot
 * be measured at all. Either way this stays a plain, synchronous computation
 * with no post-paint measure/resize pass, which matters for the export/capture
 * path (`utils/export.ts`) that rasterises the SVG as-is on first render.
 */
function nameChipWidth(label: string, fontSize: number, fontsReady: boolean): number {
  return labelRunWidth(label, fontSize, fontsReady) + fontSize * NAME_CHIP_PAD_X * 2;
}

/**
 * The label to actually draw, and the chip to draw it in, for a marker that
 * owns `maxWidth` of horizontal space.
 *
 * Returns the label untouched whenever it fits, which is the overwhelmingly
 * common case — a lineup of ordinary surnames never reaches the truncation
 * branch at all, so this cannot drift the design on the cards it does not need
 * to act on.
 *
 * When a surname genuinely does not fit, it is TRUNCATED rather than set in
 * smaller type. Both keep the chip inside its budget; they differ in what they
 * cost. Shrinking one chip's type to fit "Alexander-Arnold" into a full back's
 * share of a 4-3-3 means setting it around 40% smaller than the ten chips
 * beside it, and a board carrying five different type sizes reads as broken
 * typography rather than as a fitted layout — the one thing a design match to
 * a fixed artboard cannot afford. Truncation keeps a single type size across
 * the whole board, so the design's rhythm survives, and spends the cost on the
 * one label that cannot be honoured in full. With the player's own photograph
 * directly above it and ten team-mates around it, a truncated surname still
 * identifies who it is.
 *
 * The chip HUGS the truncated run rather than filling the budget it was given
 * — the Figma's flat padding is a property of the chip, not a consequence of
 * how much room happened to be available, and a chip padded out to its budget
 * would advertise the constraint instead of absorbing it.
 */
function fitNameChip(
  label: string,
  fontSize: number,
  fontsReady: boolean,
  maxWidth: number
): { label: string; width: number } {
  const natural = nameChipWidth(label, fontSize, fontsReady);
  if (natural <= maxWidth || label.length === 0) return { label, width: natural };

  const textBudget = maxWidth - fontSize * NAME_CHIP_PAD_X * 2;
  // Longest prefix whose ellipsised run still fits, by binary search over the
  // label's own length. `measureLabelEm` is cached, so the handful of probes
  // this costs are measured once per distinct string and never re-measured on
  // a re-render (a drag re-renders this component on every pointer frame).
  let lo = 0;
  let hi = label.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const run = labelRunWidth(label.slice(0, mid) + NAME_CHIP_ELLIPSIS, fontSize, fontsReady);
    if (run <= textBudget) lo = mid;
    else hi = mid - 1;
  }

  const fitted = label.slice(0, lo) + NAME_CHIP_ELLIPSIS;
  return { label: fitted, width: nameChipWidth(fitted, fontSize, fontsReady) };
}

/**
 * How much horizontal room each name chip owns, in user units — the mechanism
 * that stops a long surname running into its neighbour or off the touchline.
 *
 * Each chip may extend to whichever comes first: the edge of the pitch's own
 * rendered frame, or the midpoint between its own marker and the nearest
 * marker whose chip shares its row. Both bounds are geometric rather than
 * tuned, which is the point — a chip cannot leave the frame because the frame
 * is its limit, and two chips cannot intersect because neither may cross the
 * line halfway between them. No font size can violate either, so this holds
 * for any XI, any formation and any `nameFontSize` a caller passes, instead of
 * holding for the one lineup a fixture happened to contain.
 *
 * ## Row-sharing, not raw distance
 *
 * Only markers whose chips overlap VERTICALLY compete. Every chip hangs the
 * same distance below its own marker, so two chips share a row exactly when
 * their markers' screen `y` differ by less than one chip height. Without that
 * test a deep-lying midfielder would be treated as a rival to a winger
 * directly above them and both would be clamped for a collision that cannot
 * happen — in a 4-3-3 that is the pivot against the front three, i.e. the
 * common case, not an edge case.
 *
 * ## The floor
 *
 * A chip is never reduced below what its own ellipsis needs. Two markers at
 * genuinely the same position cannot both be labelled without overlapping, and
 * a zero-width chip is a worse answer to that than a very narrow one — an
 * invalid formation should look cramped, not blank.
 *
 * ## Which frame
 *
 * Bounds come from {@link fullPitchFrame} — the padded viewBox, gutter
 * included — rather than from the pitch MARKINGS. On the social card the two
 * are the same box, because the card renders its pitch edge to edge with no
 * gutter, so there "inside the frame" and "inside the pitch" are one claim and
 * a name can never leave the grass.
 *
 * Everywhere else the gutter exists precisely so an edge marker's label can
 * overhang the outline without being cut off — `pitchPadding`'s own doc says
 * so. Clamping to the markings instead would confiscate that room from the one
 * element it was reserved for: in landscape the goalkeeper stands 5 units off
 * his own goal line, and his name is wider than that, so the reader plate and
 * Match Centre would start truncating "Pickford" to fix a card that is not
 * theirs. Binding to the frame keeps every existing surface rendering exactly
 * as it does today and still gives the card the stricter guarantee, from one
 * rule rather than a special case.
 */
function nameChipBudgets(
  anchors: readonly { x: number; y: number }[],
  chipHeight: number,
  minWidth: number,
  pitchMinX: number,
  pitchMaxX: number
): number[] {
  return anchors.map((anchor, index) => {
    let half = Math.min(anchor.x - pitchMinX, pitchMaxX - anchor.x);
    for (let other = 0; other < anchors.length; other++) {
      if (other === index) continue;
      const rival = anchors[other]!;
      if (Math.abs(rival.y - anchor.y) >= chipHeight) continue; // different row
      half = Math.min(half, Math.abs(rival.x - anchor.x) / 2);
    }
    return Math.max(half * 2, minWidth);
  });
}

/**
 * A solid, rounded backing chip sized to `label` so a player's name never has
 * to compete with the pitch markings under it (the six-yard box, the centre
 * circle, the penalty arc all used to run straight through bare white text —
 * see the module doc's Figma reference, node 3047:11125).
 */
function NameChip({
  x,
  y,
  width,
  fontSize,
}: {
  x: number;
  y: number;
  /** Already fitted to the marker's own budget — see {@link fitNameChip}. */
  width: number;
  fontSize: number;
}) {
  const height = fontSize * NAME_CHIP_HEIGHT_RATIO;
  const centerY = y - fontSize * NAME_CHIP_BASELINE_TO_CENTER;
  return (
    <rect
      x={x - width / 2}
      y={centerY - height / 2}
      width={width}
      height={height}
      rx={fontSize * NAME_CHIP_RADIUS_RATIO}
      fill={NAME_CHIP_FILL}
      stroke={NAME_CHIP_BORDER_COLOR}
      strokeWidth={fontSize * NAME_CHIP_BORDER_RATIO}
      style={{ pointerEvents: 'none' }}
    />
  );
}

/**
 * Interactive formation board for building a lineup. Unlike `FormationBoard`
 * (which renders a confirmed, fully-populated team sheet), every slot here can
 * be empty and clickable so a creator can assign players one at a time — the
 * pitch primitive of the editor's Lineup block. Markers show either the shirt
 * number or the player's headshot (with a monogram fallback).
 *
 * When `onSlotsSwap` is supplied, filled markers are also drag-to-swap: press
 * and drag one onto another slot (filled or empty) to exchange the two
 * assignments, without ever leaving the formation grid. It's built on raw
 * Pointer Events + `getScreenCTM()` hit-testing rather than a DnD library —
 * see the module doc for why.
 *
 * Renders `landscape` (goal-to-goal left → right) by default; pass
 * `orientation="portrait"` for a vertical pitch (own goal at the bottom,
 * attacking up the screen) that fills a phone-shaped viewport, or
 * `orientation="portrait-down"` for the same pitch seen from the far end (own
 * goal at the top, attacking down, left/right reversed with it) — see
 * {@link LineupPitchProps.orientation}.
 *
 * Always renders its underlying `Pitch` with `fillEdgeToEdge` — a real pitch
 * is ~3:2 (landscape) / ~2:3 (portrait), not square, so this fills the
 * `aspect-[3/2]`/`aspect-[2/3]` card edge-to-edge instead of `Pitch`'s
 * classic square-viewBox letterbox. Every position this component computes
 * (marking geometry inside `Pitch` itself, each slot's marker via
 * `toScreen`, the drag ghost, the pointer-to-pitch-space conversion for
 * drag-to-swap via `toPitchPoint`/`fromScreen`) already funnels through
 * those shared functions, so this is one consistent remap with nothing left
 * positioned in the old square space.
 */
export function LineupPitch({
  slots,
  teamName,
  teamShortName,
  formation,
  teamColor,
  numberColor = 'white',
  labelColor = 'white',
  theme = 'dark',
  grassColor,
  lineColor,
  className,
  markerSize: markerSizeRaw,
  nameFontSize: nameFontSizeRaw,
  pitchPadding: pitchPaddingRaw,
  markerContent = 'number',
  showNames = true,
  editable = false,
  onSlotClick,
  onPlayerClick,
  onSlotsSwap,
  selectedSlotIndex,
  fullscreen = false,
  fit: fitRaw,
  orientation = 'landscape',
}: LineupPitchProps) {
  // `null` unless a `LineupCard` is rendering this pitch as its body. The
  // card's body slot is a fixed box rather than a free-height column, which
  // is the one situation where the pitch has to fit its HEIGHT and run its
  // drawing edge to edge — see `fit`'s doc for the measurements. Reading it
  // from context rather than adding a prop is what keeps the change off every
  // other consumer: the editor's builder, the published reader and Match
  // Centre have no card above them, so they resolve to the same `'width'` /
  // `7` they always have. An explicit prop still wins in either case.
  const inCard = useLineupFrame() !== null;
  const fit = fitRaw ?? (inCard ? 'height' : 'width');
  const pitchPadding = pitchPaddingRaw ?? (inCard ? 0 : 7);
  // A height fit only bites if the box above the SVG has a DEFINITE height:
  // `h-full` resolves to `auto` against an auto-height parent, which silently
  // leaves the pitch at its width fit (measured — the class changes and not
  // one pixel moves). Inside a card the slot is a definite 734px, so passing
  // the height down the root makes the SVG's own `h-full` resolvable.
  // `items-center` stops the flex row stretching the `w-auto` SVG back out to
  // the full slot width, which would letterbox the drawing inside an
  // oversized box instead of shrinking the box to the drawing.
  const fillsHeight = inCard && fit === 'height';
  const color = teamColor ?? 'var(--color-team-home)';
  // Figma lineup restyle (node 3047:11125): the dark pitch reads as a DARK
  // GREY (`#1f1f1f`, "grey-100") rather than the near-black
  // `--color-pitch-grass-dark` token every OTHER dark-themed block (heat
  // maps, shot maps, pass networks, `FormationBoard` — see `Pitch`'s own
  // `PitchTheme` doc) shares. That token is deliberately pinned to match the
  // page's own `#0d0d0d` so a BARE data-overlay block blends into the page
  // it sits directly on — the opposite relationship this composition needs:
  // it sits inside a bordered CARD (the editor's Lineup panel / the
  // published reader's `ReaderPlate`) and has to read as a distinct field
  // against that card's chrome, lighter than the surrounding card, exactly
  // as the Figma file draws it (`#1f1f1f` pitch inside a `#151515` card).
  // Scoped to `LineupPitch` alone — NOT a change to the shared token, which
  // would relighten every one of those other blocks along with it — via
  // this default rather than a `Pitch`-level change; an explicit
  // `grassColor` (the editor Colours panel's presets, or a caller's own
  // override) always wins, exactly as before this default existed. Only
  // applies to `dark`; a `grass` theme keeps `Pitch`'s own classic green
  // default untouched.
  const resolvedGrassColor = grassColor ?? (theme === 'dark' ? '#1f1f1f' : undefined);
  const chipLabel = teamShortName ?? teamName;
  // Figma lineup restyle (node 3047:11125): "4-3-3" renders as a clean,
  // prominent element (bold, near-full-opacity), not a whisper-quiet
  // afterthought — see `formatFormationLabel` for the matching separator
  // fix (plain hyphens, not en-dashes).
  const formationLabel = formatFormationLabel(formation);
  // An explicit `markerSize` always wins; otherwise `fullscreen` requests the
  // pre-tuned touch-optimised size; otherwise the classic inline-card default.
  // 4.6 (was 5.6) — the safe-area/stylistic-formations redesign: smaller
  // markers read as better-proportioned against the tighter, edge-to-edge
  // pitch fit (see `padding` on the `<Pitch>` call below), verified in
  // `scratchpad/formations-all.html` across all 9 formations x both
  // orientations.
  // 3.34, from the Figma card's own geometry: a 74px headshot on a 1109px-wide
  // pitch is 6.67% of the width, and markerSize is the RADIUS, so 3.34. The
  // previous 4.6 rendered markers roughly a third larger than the design and
  // crowded the pitch. Fullscreen keeps its own touch-target size.
  const markerSize = finitePositive(markerSizeRaw ?? (fullscreen ? 8.5 : 3.34), 3.34);
  // Name / role-label sizing stays PROPORTIONAL to markerSize (derived, not a
  // second hardcoded constant) so a fullscreen or custom marker size scales
  // the whole marker+label unit together instead of the label lagging behind
  // at its old fixed px size.
  //
  // 0.687, up from the Figma's own 0.595 (a 22px label against a 74px
  // headshot, i.e. 1.98 units against a 3.34 radius).
  //
  // The Figma ratio measured correct and read too small in practice. At the
  // reader plate's typical 590px-wide pitch the name chips rendered at 9.69
  // CSS px — legible up close, not legible in a feed or in a shared image,
  // which is most of where a lineup is actually seen. 0.718 puts them at
  // ~11.7px there, +2px on the original, judged against real cards.
  //
  // Still PROPORTIONAL to markerSize rather than a second hardcoded constant,
  // so a fullscreen or custom marker size scales the whole marker+label unit
  // together. The chip geometry derives from this too (see the NAME_CHIP_*
  // ratios), so the chip grows with the text and needs no separate change.
  // An explicit `nameFontSize` always wins (the social card pins the Figma's
  // own 22px); otherwise it stays PROPORTIONAL to `markerSize` so a
  // fullscreen or custom marker size scales the whole marker+label unit
  // together instead of the label lagging behind at a fixed size.
  const nameFontSize = finitePositive(nameFontSizeRaw ?? markerSize * 0.718, markerSize * 0.718);
  const labelBaselineOffset = markerSize * 1.5;
  const roleFontSize = markerSize * 0.6;
  // The one captain to draw an armband on, or -1 for none. Resolved once here
  // rather than per-slot so "first flagged wins" is a single, obvious rule
  // (see `LineupSlotPlayer.isCaptain`) instead of a condition repeated inside
  // the render loop.
  const captainIndex = slots.findIndex((slot) => slot.player?.isCaptain === true);
  // Name chips size themselves to the REAL measured glyph run, which is only
  // trustworthy once the webfont has arrived — see `text-width.ts`.
  const fontsReady = useFontsReady();

  // Every name chip, resolved in ONE pass before any of them is drawn.
  //
  // It has to be one pass because a chip's width is not a property of its own
  // label alone: how much room a marker owns depends on where its neighbours
  // are and where the touchline is (`nameChipBudgets`). Sizing each chip
  // inside its own render callback — which is what this component did until
  // the back four's chips started overlapping — can only ever see one label at
  // a time, so it cannot answer the question that actually decides the width.
  //
  // Still a plain synchronous computation, deliberately: the capture path
  // (`utils/export.ts`) rasterises the SVG on its first render and never gives
  // a post-paint measuring pass a chance to run.
  const nameChips = (() => {
    if (!showNames) return [];
    // The frame the pitch actually renders into, gutter included — asked of
    // `Pitch` itself rather than re-derived here, because the gutter is scaled
    // per axis under `fillEdgeToEdge` and a second copy of that rule would be
    // wrong on one axis. `true` matches the `fillEdgeToEdge` on the `<Pitch>`
    // below, exactly as every other call in this component does.
    const frame = fullPitchFrame(orientation, finite(pitchPadding, inCard ? 0 : 7), true);

    const anchors = slots.flatMap((slot, index) => {
      if (!slot.player) return [];
      const position = toScreen(finite(slot.x), finite(slot.y), orientation, true);
      return [
        {
          index,
          label: surname(slot.player.name),
          x: position.x,
          y: position.y + labelBaselineOffset,
        },
      ];
    });

    const budgets = nameChipBudgets(
      anchors,
      nameFontSize * NAME_CHIP_HEIGHT_RATIO,
      nameChipWidth(NAME_CHIP_ELLIPSIS, nameFontSize, fontsReady),
      frame.minX,
      frame.maxX
    );

    return anchors.map((anchor, i) => {
      const fitted = fitNameChip(anchor.label, nameFontSize, fontsReady, budgets[i]!);
      return { ...anchor, label: fitted.label, width: fitted.width };
    });
  })();

  // Drag-to-swap is opt-in and purely additive: without `onSlotsSwap`, filled
  // markers behave exactly as they did before this feature existed (a plain
  // click). `drag` only ever holds an in-progress gesture — most renders it's
  // null and this whole block is inert.
  const dragEnabled = editable && Boolean(onSlotsSwap);
  const [drag, setDrag] = useState<DragGesture | null>(null);
  // A completed drag still ends in a browser-synthesised `click` on the
  // capturing element; this suppresses exactly that one click so a drag never
  // ALSO reopens the assignment picker for the slot it started from.
  const suppressNextClickRef = useRef(false);

  const releaseCapture = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleMarkerPointerDown = (e: React.PointerEvent<SVGGElement>, index: number) => {
    if (!dragEnabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // left button / touch / pen only
    // Defensive: calling this synchronously inside a trusted pointerdown
    // handler should always succeed (the pointer is, by definition, active
    // right now) — but an uncaught NotFoundError here would break the whole
    // gesture, so a swallowed failure just means the drag keeps tracking
    // without OS-level capture rather than crashing. See the module doc for
    // this component's history of touch/SVG edge cases.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // No-op: proceed without capture (see comment above).
    }
    setDrag({
      pointerId: e.pointerId,
      fromIndex: index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      dx: 0,
      dy: 0,
      dragging: false,
      targetIndex: index,
    });
  };

  const handleMarkerPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const origin = slots[drag.fromIndex];
    if (!origin) return;
    const svg = e.currentTarget.closest('svg');
    if (!svg) return;
    const movedPx = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
    if (!drag.dragging && movedPx < DRAG_THRESHOLD_PX) return; // still within tap tolerance
    const pt = toPitchPoint(svg, e.clientX, e.clientY, orientation);
    setDrag({
      ...drag,
      dragging: true,
      dx: pt.x - finite(origin.x),
      dy: pt.y - finite(origin.y),
      targetIndex: nearestSlotIndex(slots, pt.x, pt.y),
    });
  };

  const handleMarkerPointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    releaseCapture(e);
    if (drag.dragging) {
      suppressNextClickRef.current = true;
      if (drag.targetIndex !== drag.fromIndex) onSlotsSwap?.(drag.fromIndex, drag.targetIndex);
    }
    setDrag(null);
  };

  const handleMarkerPointerCancel = (e: React.PointerEvent<SVGGElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    releaseCapture(e);
    setDrag(null);
  };

  return (
    // Inter-first sans (product decision): opt out of the host page's editorial
    // serif so the chip + the pitch's SVG labels render in Inter.
    <div
      className={cn('flex flex-col', fillsHeight && 'h-full items-center', className)}
      style={{ fontFamily: BLOCK_FONT_STACK }}
    >
      {!editable && (chipLabel || formationLabel) && (
        <div
          data-slot="lineup-pitch-chip"
          className="pointer-events-none mb-2 flex items-baseline justify-center gap-1.5 text-[12px] tracking-tight"
        >
          {chipLabel && <span className="font-semibold text-white/90">{chipLabel}</span>}
          {formationLabel && (
            <span className="font-semibold tabular-nums text-white/80">{formationLabel}</span>
          )}
        </div>
      )}

      <Pitch
        variant="full"
        theme={theme}
        grassColor={resolvedGrassColor}
        lineColor={lineColor}
        fit={fit}
        orientation={orientation}
        fillEdgeToEdge
        padding={finite(pitchPadding, inCard ? 0 : 7)}
      >
        {slots.map((slot, index) => {
          // `position` is SCREEN space (post-`toScreen`) — every render usage
          // below (marker glyph, rings, name/role labels) draws directly at
          // this anchor with plain, unrotated local offsets, exactly as
          // before this prop existed. `slot.x`/`slot.y` themselves stay
          // untouched, normalized pitch-space values throughout — the
          // formation data never changes with orientation, only where it
          // lands on screen. The trailing `true` matches this pitch's
          // `fillEdgeToEdge` above, so markers land in the same (non-square)
          // screen space the pitch markings themselves now render in.
          const position = toScreen(finite(slot.x), finite(slot.y), orientation, true);
          const isSelected = selectedSlotIndex === index;
          // In the builder (`editable`), every slot click opens the assignment
          // picker. In the reader, only FILLED slots can be interactive, and
          // only to report the player out via `onPlayerClick` (e.g. a link to
          // their entity page) — empty slots have nothing to click through to.
          const interactive = editable
            ? Boolean(onSlotClick)
            : Boolean(slot.player && onPlayerClick);
          const handleClick = interactive
            ? () => {
                // Swallow the synthetic click a completed drag leaves behind —
                // see `suppressNextClickRef`'s declaration above.
                if (suppressNextClickRef.current) {
                  suppressNextClickRef.current = false;
                  return;
                }
                if (editable) onSlotClick?.(index);
                else if (slot.player) onPlayerClick?.(slot.player, index);
              }
            : undefined;
          const isBeingDragged = Boolean(
            dragEnabled && drag && drag.dragging && drag.fromIndex === index
          );
          const isDropTarget = Boolean(
            dragEnabled &&
            drag &&
            drag.dragging &&
            drag.targetIndex === index &&
            drag.fromIndex !== index
          );
          // Only filled markers are drag SOURCES (there's nothing to lift off
          // an empty slot); any slot can still be a drop TARGET, handled via
          // pointer capture on the source, so targets need no handlers of
          // their own.
          const dragHandlers =
            dragEnabled && slot.player
              ? {
                  onPointerDown: (e: React.PointerEvent<SVGGElement>) =>
                    handleMarkerPointerDown(e, index),
                  onPointerMove: handleMarkerPointerMove,
                  onPointerUp: handleMarkerPointerUp,
                  onPointerCancel: handleMarkerPointerCancel,
                }
              : undefined;
          // `touch-none` (full gesture takeover) is needed only on a filled,
          // drag-enabled marker — it's what lets a touch drag survive without
          // the page's native scroll hijacking it (see the comment below).
          // Every OTHER interactive slot (a tap-only empty slot, or a filled
          // marker with no drag wired up) instead gets `touch-manipulation`:
          // it removes the ~300ms tap delay and — the point here — disables
          // the double-tap-to-zoom gesture on that element, without blocking
          // single-finger scroll/pan the way `touch-none` would. Prevents the
          // "tapping a slot zooms the page" mobile complaint on every tap
          // target, not just the ones that can be dragged.
          const touchActionClass =
            dragEnabled && slot.player ? 'touch-none' : interactive && 'touch-manipulation';

          if (slot.player) {
            const player = slot.player;
            return (
              <g
                key={`slot-${index}`}
                onClick={handleClick}
                {...dragHandlers}
                role={interactive ? 'button' : undefined}
                aria-label={player.name}
                opacity={isBeingDragged ? 0.3 : undefined}
                className={cn(
                  'transition-transform',
                  interactive && 'cursor-pointer',
                  // `touch-action` must be set up-front (it's read at the start
                  // of a touch sequence, not mid-gesture): `touch-none` when
                  // this marker can be dragged (so a touch drag isn't hijacked
                  // by the page's native scroll), else `touch-manipulation`
                  // (kills the double-tap-zoom gesture while still allowing
                  // normal scroll/pan) — see `touchActionClass` above. Scoped
                  // to the marker itself, so touching the grass between
                  // markers is untouched.
                  touchActionClass
                )}
              >
                {isSelected && !isBeingDragged && (
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={markerSize + 1}
                    fill="none"
                    stroke="white"
                    strokeWidth="0.3"
                    opacity="0.6"
                  />
                )}

                {isDropTarget && (
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={markerSize + 1.6}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.7"
                    className="animate-pulse"
                  />
                )}

                {/* pointerEvents explicit (not relying on MarkerGlyph's default):
                    a headshot marker must stay independently clickable — see the
                    0.5.7 fix where SvgHeadshot's own default ('none') otherwise
                    swallows the click before it reaches this `<g>`. */}
                <MarkerGlyph
                  x={position.x}
                  y={position.y}
                  player={player}
                  markerSize={markerSize}
                  markerContent={markerContent}
                  color={color}
                  numberColor={numberColor}
                  pointerEvents="auto"
                />

                {/* The name chip is NOT drawn here — see the second pass below
                    this map for why it has to outlive its own slot's <g>. */}
              </g>
            );
          }

          // Empty slot — a placeholder circle. Dashed + inviting when editable,
          // faint and static in the reader. Also a valid drop target while a
          // drag is active: dropping a filled marker here MOVES the player in
          // (there's no player already here to displace).
          return (
            <g
              key={`slot-${index}`}
              onClick={handleClick}
              role={interactive ? 'button' : undefined}
              aria-label={interactive ? `Add ${slot.role ?? 'player'}` : slot.role}
              className={cn(
                'transition-opacity',
                interactive ? 'cursor-pointer opacity-70 hover:opacity-100' : 'opacity-30',
                touchActionClass
              )}
            >
              {isSelected && (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={markerSize + 1}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.3"
                  opacity="0.5"
                />
              )}
              {isDropTarget && (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={markerSize + 1.6}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.7"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={position.x}
                cy={position.y}
                r={markerSize}
                fill="rgba(255,255,255,0.04)"
                stroke="white"
                strokeWidth="0.3"
                strokeDasharray="0.8 0.7"
              />
              {interactive && (
                <text
                  x={position.x}
                  y={position.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={markerSize}
                  fontWeight="300"
                  opacity="0.8"
                  style={{ pointerEvents: 'none' }}
                >
                  +
                </text>
              )}
              {slot.role && (
                <text
                  x={position.x}
                  y={position.y + labelBaselineOffset}
                  textAnchor="middle"
                  fill={labelColor}
                  fontSize={roleFontSize}
                  fontWeight="600"
                  opacity="0.55"
                  style={{ pointerEvents: 'none' }}
                >
                  {slot.role}
                </text>
              )}
            </g>
          );
        })}

        {/* Name chips — a SECOND pass, deliberately after every marker.
            SVG has no z-index; paint order is document order. Drawing a chip
            inside its own slot's <g> means the NEXT slot's marker paints over
            it, and in a packed formation neighbouring markers sit close enough
            to slice through a chip — the exact failure the chip exists to
            prevent, made worse than bare text because a chip is opaque, so a
            marker cuts a visible notch out of it. Rendering every chip after
            every marker makes a name unoccludable by another player.
            Labels are `pointer-events: none`, so lifting them out of the slot
            <g> costs no interactivity — the marker still owns the gesture. */}
        {showNames &&
          nameChips.map(({ index, x, y, label, width }) => (
            <g key={`name-${index}`} style={{ pointerEvents: 'none' }}>
              <NameChip x={x} y={y} width={width} fontSize={nameFontSize} />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                fill={labelColor}
                fontSize={nameFontSize}
                // Regular (was 600/Semibold) — now that the chip behind it
                // carries the contrast, the Figma label itself is Inter
                // Regular, with a slight negative tracking
                // (`-0.66px` at 22px ≈ `-0.03em`).
                fontWeight="400"
                opacity="0.9"
                style={{ pointerEvents: 'none', letterSpacing: '-0.03em' }}
              >
                {label}
              </text>
            </g>
          ))}

        {/* Captain armband — a THIRD pass, after the chips.
            Same paint-order reasoning as the chips above (SVG has no z-index),
            taken one step further: the badge is the one mark on the board that
            identifies a player rather than merely naming them, so nothing —
            not a neighbouring marker, not another player's name chip — is
            allowed to paint over it. Deliberately NOT gated on `showNames`:
            the armband is player identity, not a label, and a board with names
            turned off still has a captain.
            Only the FIRST flagged player is drawn; see `isCaptain`'s doc. */}
        {captainIndex !== -1 &&
          (() => {
            const slot = slots[captainIndex]!;
            const position = toScreen(finite(slot.x), finite(slot.y), orientation, true);
            return <CaptainArmband x={position.x} y={position.y} markerSize={markerSize} />;
          })()}

        {/* Drag ghost: the dragged player's marker, floating at the live pointer
            position — rendered LAST so it paints on top of every slot (SVG has
            no z-index; paint order is document order). The in-place marker at
            the origin slot stays mounted, just dimmed (`isBeingDragged` above);
            this ghost is a pure visual overlay with `pointer-events: none` — the
            origin marker's `<g>` still holds the pointer capture and keeps
            handling the gesture throughout. */}
        {dragEnabled &&
          drag?.dragging &&
          (() => {
            const origin = slots[drag.fromIndex];
            if (!origin?.player) return null;
            // `drag.dx`/`drag.dy` are a normalized-space offset (see
            // `DragGesture`'s doc comment) — add them to the origin slot's
            // own normalized position, THEN convert to screen space for
            // rendering, so the ghost tracks the pointer correctly in
            // either orientation. `true`: same `fillEdgeToEdge` remap as the
            // in-place marker's `position` above.
            const ghost = toScreen(
              finite(origin.x) + drag.dx,
              finite(origin.y) + drag.dy,
              orientation,
              true
            );
            return (
              <g style={{ pointerEvents: 'none' }} className="drop-shadow-lg">
                <MarkerGlyph
                  x={ghost.x}
                  y={ghost.y}
                  player={origin.player}
                  markerSize={markerSize * 1.06}
                  markerContent={markerContent}
                  color={color}
                  numberColor={numberColor}
                  ringColor="white"
                  pointerEvents="none"
                />
              </g>
            );
          })()}
      </Pitch>
    </div>
  );
}

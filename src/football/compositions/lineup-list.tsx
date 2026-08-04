import { cn } from '#/lib/utils';
import { capTrim } from '#/football/lib/cap-trim';
import { useLineupFrame, type LineupCardFrame } from '#/football/compositions/lineup-card';
import type { LineupSlotPlayer } from '#/football/compositions/lineup-pitch';

export interface LineupListProps {
  /**
   * The XI, in team-sheet order (keeper first, then back to front). Rendered
   * in the order given — this component does no sorting, because "team sheet
   * order" is an editorial choice the author already made upstream.
   */
  players: LineupSlotPlayer[];
  /**
   * Which frame's measurements to use. Defaults to the enclosing
   * {@link LineupCard}'s frame, or `portrait` when rendered standalone. Only
   * the number/name column gap differs.
   */
  frame?: LineupCardFrame;
  /** Additional CSS classes. */
  className?: string;
}

/** Figma `neutral/grey-500` — the shirt numbers. */
const MUTED = '#807c7c';
/** Inter Semi Bold. */
const SEMIBOLD = 600;

/**
 * Gap between the numbers column and the names column. The square frame
 * closes it up because its content column carries an extra 17px of left inset
 * (65px, clearing the photo panel) and so has 17px less room for the sheet.
 */
const COLUMN_GAP: Record<LineupCardFrame, number> = { square: 32, portrait: 48 };

/**
 * Placeholder for a player with no shirt number.
 *
 * Not cosmetic: the two columns stay in register only because each has
 * exactly as many boxes as the other and `justify-between` distributes them
 * over the same height (see the component doc). An empty cell generates NO
 * line box at all, so its height would collapse to zero and every row below
 * it would slide out of alignment against its number. A non-breaking space
 * generates a normal line box — whose height comes from the font metrics, not
 * the glyph — so the row keeps its place and renders blank.
 */
const NO_SHIRT_NUMBER = ' ';

/**
 * The captain's armband badge.
 *
 * The Figma file uses Phosphor's `ClosedCaptioning` glyph as a "C" badge, and
 * this is its exact path data, taken from the file's own SVG export rather
 * than redrawn by hand. It is INLINED rather than pulled from
 * `@phosphor-icons/react` on purpose: viz is a standalone AGPL package that
 * deliberately carries no icon or design-system dependency (see the module
 * docs on `lib/font.ts` and `lib/panel-footer.tsx`, and `PanelFooter`'s own
 * hand-inlined save glyph), and adding a runtime icon package to a published
 * library for one 24px mark would be a real cost to every consumer. `fill` is
 * `currentColor` so the badge tracks the name colour beside it.
 */
function CaptainBadge() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block shrink-0"
      role="img"
      aria-label="Captain"
    >
      <path
        d="M21 4.5H3C2.60218 4.5 2.22064 4.65804 1.93934 4.93934C1.65804 5.22064 1.5 5.60218 1.5 6V18C1.5 18.3978 1.65804 18.7794 1.93934 19.0607C2.22064 19.342 2.60218 19.5 3 19.5H21C21.3978 19.5 21.7794 19.342 22.0607 19.0607C22.342 18.7794 22.5 18.3978 22.5 18V6C22.5 5.60218 22.342 5.22064 22.0607 4.93934C21.7794 4.65804 21.3978 4.5 21 4.5ZM21 18H3V6H21V18ZM14.9556 14.2228C15.0551 14.395 15.0822 14.5997 15.0309 14.7918C14.9796 14.984 14.854 15.1479 14.6818 15.2475C14.1117 15.5767 13.4651 15.75 12.8068 15.75C12.1485 15.75 11.5018 15.5768 10.9317 15.2476C10.3616 14.9185 9.88822 14.4451 9.55907 13.875C9.22992 13.305 9.05664 12.6583 9.05664 12C9.05664 11.3417 9.22992 10.695 9.55907 10.125C9.88822 9.55488 10.3616 9.08148 10.9317 8.75236C11.5018 8.42323 12.1485 8.24997 12.8068 8.25C13.4651 8.25003 14.1117 8.42333 14.6818 8.7525C14.7698 8.80029 14.8474 8.86523 14.9099 8.94348C14.9724 9.02173 15.0186 9.11171 15.0458 9.20811C15.0729 9.3045 15.0805 9.40536 15.0681 9.50474C15.0557 9.60412 15.0234 9.7 14.9734 9.78673C14.9233 9.87345 14.8563 9.94927 14.7764 10.0097C14.6966 10.0701 14.6054 10.1139 14.5083 10.1386C14.4112 10.1632 14.3102 10.1681 14.2112 10.1531C14.1122 10.138 14.0172 10.1033 13.9318 10.0509C13.5897 9.85366 13.2018 9.74987 12.8069 9.75C12.4121 9.75013 12.0242 9.85418 11.6822 10.0517C11.3403 10.2492 11.0564 10.5332 10.859 10.8752C10.6616 11.2172 10.5577 11.6051 10.5577 12C10.5577 12.3949 10.6616 12.7828 10.859 13.1248C11.0564 13.4668 11.3403 13.7508 11.6822 13.9483C12.0242 14.1458 12.4121 14.2499 12.8069 14.25C13.2018 14.2501 13.5897 14.1463 13.9318 13.9491C14.1039 13.8498 14.3084 13.8229 14.5003 13.8742C14.6922 13.9255 14.856 14.0509 14.9556 14.2228Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * The numbered team sheet — the lineup social card's text body, and the
 * counterpart to `LineupPitch`'s formation board. Drop it into a
 * {@link LineupCard} as the `children` slot.
 *
 * ## Two columns, not eleven rows
 *
 * The shirt numbers and the names are two INDEPENDENT full-height flex
 * columns, each `justify-between`, rather than eleven `[number | name]` rows.
 * That is what makes the sheet fill the frame: the XI distributes across
 * whatever height the card's body slot happens to be, so the card looks
 * deliberately composed at both frame sizes instead of leaving a pool of dead
 * space under the last name. Rows would have needed an explicit gap tuned per
 * frame, and would still have drifted the moment a title wrapped to a second
 * line and changed the slot height.
 *
 * The two columns stay in register because each holds exactly as many boxes
 * as the other, at cap-trimmed heights that scale with their own type size,
 * over the same track height. The names column's 4px block padding is the
 * shim that lands them together: numbers are 40px type (29.10px cap-trimmed)
 * and names are 28px (20.37px), so without it the first row's centres would
 * disagree by ~4px. With it they agree to within 0.4px at the first row and
 * drift by well under a pixel across all eleven — which is why the design has
 * that padding on the names column alone and nowhere else.
 *
 * The consequence to respect when editing: every cell must produce a line box
 * (see {@link NO_SHIRT_NUMBER}), and the two `players.map` passes must stay
 * the same length.
 */
export function LineupList({ players, frame, className }: LineupListProps) {
  const contextFrame = useLineupFrame();
  const resolvedFrame = frame ?? contextFrame ?? 'portrait';

  return (
    <div
      data-slot="lineup-list"
      className={cn('flex min-h-0 w-full flex-1 items-start', className)}
      style={{ gap: COLUMN_GAP[resolvedFrame] }}
    >
      <div
        data-slot="lineup-list-numbers"
        className="flex h-full shrink-0 flex-col items-start justify-between whitespace-nowrap"
        style={{
          fontSize: 40,
          fontWeight: SEMIBOLD,
          color: MUTED,
          // -1.2px at 40px — the card's shared -3% tracking.
          letterSpacing: '-0.03em',
        }}
      >
        {players.map((player) => (
          <div key={player.id} style={capTrim()}>
            {player.shirtNumber ?? NO_SHIRT_NUMBER}
          </div>
        ))}
      </div>

      <div
        data-slot="lineup-list-names"
        className="flex h-full shrink-0 flex-col items-start justify-between"
        style={{
          paddingTop: 4,
          paddingBottom: 4,
          fontSize: 28,
          fontWeight: SEMIBOLD,
          color: 'white',
          // -1.12px at 28px — -4%, the one place the card tightens past its
          // usual -3%. The names are the densest column on the card and the
          // extra 1% is what keeps a long one ("Jude Bellingham") from
          // crowding the frame edge.
          letterSpacing: '-0.04em',
        }}
      >
        {players.map((player) =>
          player.isCaptain ? (
            <div key={player.id} className="flex items-center" style={{ gap: 12 }}>
              <div className="whitespace-nowrap" style={capTrim()}>
                {player.name}
              </div>
              <CaptainBadge />
            </div>
          ) : (
            <div key={player.id} className="whitespace-nowrap" style={capTrim()}>
              {player.name}
            </div>
          )
        )}
      </div>
    </div>
  );
}

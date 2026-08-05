import type { LineupSlot, LineupSlotPlayer } from '#/football/compositions/lineup-pitch';
import { getFormationTemplate } from '#/football/data/formations';

/**
 * XIs that are shared between story files, so one lineup cannot be the hard
 * case in one suite and quietly absent from another.
 *
 * Until 0.14.0 the lineup card's pitch was configured in two places — inside
 * `LineupCardView`, which is what a host renders and captures, and again
 * inside `lineup-card.stories.tsx`, which is where its geometry was measured.
 * A fixture that lived in one story file could only ever exercise the copy
 * that file happened to render, which is how 0.13.0's name-type fix was
 * asserted on a pitch no reader has ever seen. The two copies are one
 * component now (`LineupCardPitch`); fixtures live out here so the same is
 * true of the XIs it is measured against.
 */

/**
 * The XI from the card the owner reported — a real published Liverpool 26/27
 * lineup, transcribed as sent.
 *
 * It is in the fixtures permanently because it is the lineup that broke, and
 * because the two XIs that were already here could not have caught it:
 *
 *  - `ENGLAND_XI` is the Figma file's own sample, and every surname in it is
 *    short (James, Stones, Rice, Kane, Saka). Right for a design match,
 *    useless as a layout guard.
 *  - `LONG_NAME_XI` was added in 0.13.0 for exactly this job and still missed
 *    these names, because it reaches for the EXTREME — "Alexander-Arnold",
 *    "Papastathopoulos" — and a guard tuned to survive the extreme can still
 *    clip the ORDINARY. Every surname below is an unremarkable top-flight
 *    name of six to eight characters, and three of them were truncated on the
 *    published card: "van D…", "Jacq…", "Frim…".
 *
 * That is the gap this closes. The hardest lineup and the most ordinary one
 * are different tests: the first proves the fit mechanism engages, the second
 * proves it does not engage when it must not.
 *
 * It is also ASYMMETRIC left-to-right by construction — a left back and a
 * right back who are different people, a left winger and a right winger who
 * are different people — which is what lets a rendering test tell a rotation
 * from a mirror. A symmetric XI renders identically under both, which is why
 * no fixture here caught the swapped flanks either.
 *
 * Laid onto the `4-3-3` template in template order: GK, LB, CB, CB, RB, the
 * pivot, two 8s, LW, ST, RW.
 */
export const LIVERPOOL_XI: readonly LineupSlotPlayer[] = [
  { id: 'alisson', name: 'Alisson Becker', shirtNumber: 1 },
  { id: 'kerkez', name: 'Kerkez', shirtNumber: 6 },
  { id: 'vandijk', name: 'van Dijk', shirtNumber: 4 },
  { id: 'jacquet', name: 'Jacquet', shirtNumber: 5 },
  { id: 'frimpong', name: 'Frimpong', shirtNumber: 30 },
  { id: 'gravenberch', name: 'Gravenberch', shirtNumber: 38 },
  { id: 'wirtz', name: 'Wirtz', shirtNumber: 7 },
  { id: 'szoboszlai', name: 'Szoboszlai', shirtNumber: 8 },
  { id: 'barcola', name: 'Barcola', shirtNumber: 11 },
  { id: 'isak', name: 'Isak', shirtNumber: 9 },
  { id: 'mbaye', name: 'Mbaye', shirtNumber: 17 },
] as const;

/**
 * The surnames {@link LIVERPOOL_XI} must still be carrying, named so a later
 * edit cannot quietly swap one for something shorter — the exact way the
 * previous fixture stopped measuring anything.
 *
 * These are the CHIP labels (`surname()` of each name), not the full names:
 * "Alisson Becker" is chipped as "Becker", and "van Dijk" keeps its particle.
 */
export const LIVERPOOL_CHIP_LABELS = [
  'Becker',
  'Kerkez',
  'van Dijk',
  'Jacquet',
  'Frimpong',
  'Gravenberch',
  'Wirtz',
  'Szoboszlai',
  'Barcola',
  'Isak',
  'Mbaye',
] as const;

/**
 * The three surnames the published card actually clipped — "van D…", "Jacq…",
 * "Frim…". All three sit in the back four, where markers are closest together
 * and a chip's share of the row is smallest.
 */
export const LIVERPOOL_REPORTED_TRUNCATIONS = ['van Dijk', 'Jacquet', 'Frimpong'] as const;

/**
 * Lay an XI onto a formation template, in ORDINARY lineup coordinates —
 * keeper at low `x`, `y` 0 at the team's own left touchline.
 *
 * Nothing here pre-mirrors or pre-rotates. Which way up a surface draws the
 * pitch is that surface's own business, expressed as a `LineupPitch`
 * `orientation`; a fixture that baked one in could not be handed to a
 * standalone pitch and a card and mean the same thing on both.
 */
export function xiSlots(
  xi: readonly LineupSlotPlayer[],
  formation = '4-3-3',
  decorate: (player: LineupSlotPlayer) => LineupSlotPlayer = (player) => player
): LineupSlot[] {
  return getFormationTemplate(formation).map((template, index) => {
    const player = xi[index];
    return {
      x: template.x,
      y: template.y,
      role: template.role,
      player: player ? decorate(player) : undefined,
    };
  });
}

/** {@link LIVERPOOL_XI} on the `4-3-3` the card's pitch frame draws. */
export function liverpoolSlots(
  decorate?: (player: LineupSlotPlayer) => LineupSlotPlayer
): LineupSlot[] {
  return xiSlots(LIVERPOOL_XI, '4-3-3', decorate);
}

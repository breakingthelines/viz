/**
 * Formation templates for the interactive {@link LineupPitch} builder.
 *
 * A template is a list of 11 empty slots laid out on the 0–100 pitch grid
 * (x: 0 = own goal line → 100 = opposition goal; y: 0 = left touchline →
 * 100 = right). The team attacks left → right, so the goalkeeper sits low and
 * the front line sits high. Each slot carries a positional `role` label so the
 * builder can show "ST" / "CB" / "GK" in an unfilled circle.
 *
 * These are starting positions, not gospel — the editor fills them with
 * players; a future iteration may let creators drag a slot to nudge it.
 *
 * Positions are hand-authored (not procedurally generated) to a deliberate
 * stylistic system, verified across all 9 formations x both orientations
 * against `scratchpad/formations-all.html` before landing here: a deep
 * keeper (x: 5); bowed back lines (fullbacks/wingbacks pushed forward and
 * wide relative to the centre-backs); midfield-3s as triangles (the pivot
 * drops deepest); central midfielders staggered in depth even within a flat
 * band (so they separate horizontally rather than stacking in landscape);
 * front lines as an arrowhead (the central striker highest and most central,
 * wingers wide and slightly deeper); midfield bands run narrower than the
 * attack. Role labels are unchanged from the previous procedurally-generated
 * layout.
 */
export interface FormationSlotTemplate {
  /** x on the 0–100 pitch scale (low = own half). */
  x: number;
  /** y on the 0–100 pitch scale (0 = left touchline, 100 = right). */
  y: number;
  /** Positional role label, e.g. "GK", "CB", "CAM", "ST". */
  role: string;
}

const GK: FormationSlotTemplate = { x: 5, y: 50, role: 'GK' };

/**
 * The supported formations. Keys are the canonical "4-3-3" strings shown in the
 * formation picker; values are the full 11-slot layout (GK + outfield), hand
 * placed per the stylistic system described above.
 */
const FORMATIONS: Record<string, FormationSlotTemplate[]> = {
  '4-3-3': [
    GK,
    { x: 25, y: 15, role: 'LB' },
    { x: 21, y: 37, role: 'CB' },
    { x: 21, y: 63, role: 'CB' },
    { x: 25, y: 85, role: 'RB' },
    { x: 40, y: 50, role: 'CM' }, // pivot, drops
    { x: 54, y: 34, role: 'CM' }, // advanced 8s, narrow
    { x: 54, y: 66, role: 'CM' },
    { x: 76, y: 18, role: 'LW' }, // arrowhead
    { x: 84, y: 50, role: 'ST' },
    { x: 76, y: 82, role: 'RW' },
  ],
  '4-4-2': [
    GK,
    { x: 25, y: 15, role: 'LB' },
    { x: 21, y: 37, role: 'CB' },
    { x: 21, y: 63, role: 'CB' },
    { x: 25, y: 85, role: 'RB' },
    { x: 50, y: 15, role: 'LM' },
    { x: 47, y: 35, role: 'CM' },
    { x: 47, y: 65, role: 'CM' },
    { x: 50, y: 85, role: 'RM' },
    { x: 82, y: 39, role: 'ST' },
    { x: 82, y: 61, role: 'ST' },
  ],
  '4-2-3-1': [
    GK,
    { x: 25, y: 15, role: 'LB' },
    { x: 21, y: 37, role: 'CB' },
    { x: 21, y: 63, role: 'CB' },
    { x: 25, y: 85, role: 'RB' },
    { x: 36, y: 38, role: 'CDM' },
    { x: 36, y: 62, role: 'CDM' },
    { x: 60, y: 18, role: 'LW' },
    { x: 63, y: 50, role: 'CAM' },
    { x: 60, y: 82, role: 'RW' },
    { x: 85, y: 50, role: 'ST' },
  ],
  '4-3-1-2': [
    GK,
    { x: 25, y: 15, role: 'LB' },
    { x: 21, y: 37, role: 'CB' },
    { x: 21, y: 63, role: 'CB' },
    { x: 25, y: 85, role: 'RB' },
    { x: 45, y: 30, role: 'CM' }, // triangle, middle drops
    { x: 36, y: 50, role: 'CM' },
    { x: 45, y: 70, role: 'CM' },
    { x: 62, y: 50, role: 'CAM' },
    { x: 82, y: 38, role: 'ST' },
    { x: 82, y: 62, role: 'ST' },
  ],
  '4-1-4-1': [
    GK,
    { x: 25, y: 15, role: 'LB' },
    { x: 21, y: 37, role: 'CB' },
    { x: 21, y: 63, role: 'CB' },
    { x: 25, y: 85, role: 'RB' },
    { x: 34, y: 50, role: 'CDM' },
    { x: 54, y: 15, role: 'LM' },
    { x: 53, y: 35, role: 'CM' },
    { x: 53, y: 65, role: 'CM' },
    { x: 54, y: 85, role: 'RM' },
    { x: 85, y: 50, role: 'ST' },
  ],
  '3-5-2': [
    GK,
    { x: 22, y: 26, role: 'CB' },
    { x: 20, y: 50, role: 'CB' },
    { x: 22, y: 74, role: 'CB' },
    { x: 49, y: 11, role: 'LWB' },
    { x: 50, y: 33, role: 'CM' },
    { x: 39, y: 50, role: 'CM' },
    { x: 50, y: 67, role: 'CM' },
    { x: 49, y: 89, role: 'RWB' },
    { x: 82, y: 39, role: 'ST' },
    { x: 82, y: 61, role: 'ST' },
  ],
  '3-4-3': [
    GK,
    { x: 22, y: 26, role: 'CB' },
    { x: 20, y: 50, role: 'CB' },
    { x: 22, y: 74, role: 'CB' },
    { x: 49, y: 15, role: 'LM' },
    { x: 46, y: 35, role: 'CM' },
    { x: 46, y: 65, role: 'CM' },
    { x: 49, y: 85, role: 'RM' },
    { x: 76, y: 18, role: 'LW' },
    { x: 84, y: 50, role: 'ST' },
    { x: 76, y: 82, role: 'RW' },
  ],
  '5-3-2': [
    GK,
    { x: 28, y: 10, role: 'LWB' },
    { x: 22, y: 29, role: 'CB' },
    { x: 20, y: 50, role: 'CB' },
    { x: 22, y: 71, role: 'CB' },
    { x: 28, y: 90, role: 'RWB' },
    { x: 40, y: 50, role: 'CM' },
    { x: 55, y: 33, role: 'CM' },
    { x: 55, y: 67, role: 'CM' },
    { x: 82, y: 39, role: 'ST' },
    { x: 82, y: 61, role: 'ST' },
  ],
  '4-5-1': [
    GK,
    { x: 25, y: 15, role: 'LB' },
    { x: 21, y: 37, role: 'CB' },
    { x: 21, y: 63, role: 'CB' },
    { x: 25, y: 85, role: 'RB' },
    { x: 53, y: 12, role: 'LM' },
    { x: 51, y: 33, role: 'CM' },
    { x: 39, y: 50, role: 'CM' },
    { x: 51, y: 67, role: 'CM' },
    { x: 53, y: 88, role: 'RM' },
    { x: 86, y: 50, role: 'ST' },
  ],
};

/** Ordered list of supported formation strings, for the picker dropdown. */
export const FORMATION_OPTIONS: string[] = Object.keys(FORMATIONS);

/** The default formation used when none is chosen. */
export const DEFAULT_FORMATION = '4-3-3';

/**
 * Resolve a formation string to its 11-slot template. Unknown formations fall
 * back to {@link DEFAULT_FORMATION} so the board never renders empty.
 */
export function getFormationTemplate(formation: string | undefined): FormationSlotTemplate[] {
  if (formation && FORMATIONS[formation]) return FORMATIONS[formation];
  return FORMATIONS[DEFAULT_FORMATION];
}

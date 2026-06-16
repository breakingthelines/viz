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
 */
export interface FormationSlotTemplate {
  /** x on the 0–100 pitch scale (low = own half). */
  x: number;
  /** y on the 0–100 pitch scale (0 = left touchline, 100 = right). */
  y: number;
  /** Positional role label, e.g. "GK", "CB", "CAM", "ST". */
  role: string;
}

/**
 * Evenly spread `n` players across the width of the pitch, keeping wide
 * players off the touchline. Narrower bands (1–3 players) hug the centre.
 */
function line(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [50];
  const margin = n <= 2 ? 32 : n === 3 ? 24 : 14;
  const span = 100 - margin * 2;
  return Array.from({ length: n }, (_, i) => Number((margin + (span * i) / (n - 1)).toFixed(1)));
}

/** Build a horizontal band of slots at depth `x` with the given role labels. */
function band(x: number, roles: string[]): FormationSlotTemplate[] {
  const ys = line(roles.length);
  return roles.map((role, i) => ({ x, y: ys[i], role }));
}

const GK: FormationSlotTemplate = { x: 6, y: 50, role: 'GK' };

/**
 * The supported formations. Keys are the canonical "4-3-3" strings shown in the
 * formation picker; values are the full 11-slot layout (GK + outfield bands).
 */
const FORMATIONS: Record<string, FormationSlotTemplate[]> = {
  '4-3-3': [
    GK,
    ...band(22, ['LB', 'CB', 'CB', 'RB']),
    ...band(48, ['CM', 'CM', 'CM']),
    ...band(80, ['LW', 'ST', 'RW']),
  ],
  '4-4-2': [
    GK,
    ...band(22, ['LB', 'CB', 'CB', 'RB']),
    ...band(50, ['LM', 'CM', 'CM', 'RM']),
    ...band(82, ['ST', 'ST']),
  ],
  '4-2-3-1': [
    GK,
    ...band(22, ['LB', 'CB', 'CB', 'RB']),
    ...band(42, ['CDM', 'CDM']),
    ...band(62, ['LW', 'CAM', 'RW']),
    ...band(84, ['ST']),
  ],
  '4-3-1-2': [
    GK,
    ...band(22, ['LB', 'CB', 'CB', 'RB']),
    ...band(44, ['CM', 'CM', 'CM']),
    ...band(62, ['CAM']),
    ...band(83, ['ST', 'ST']),
  ],
  '4-1-4-1': [
    GK,
    ...band(22, ['LB', 'CB', 'CB', 'RB']),
    ...band(40, ['CDM']),
    ...band(60, ['LM', 'CM', 'CM', 'RM']),
    ...band(84, ['ST']),
  ],
  '3-5-2': [
    GK,
    ...band(22, ['CB', 'CB', 'CB']),
    ...band(50, ['LWB', 'CM', 'CM', 'CM', 'RWB']),
    ...band(83, ['ST', 'ST']),
  ],
  '3-4-3': [
    GK,
    ...band(22, ['CB', 'CB', 'CB']),
    ...band(50, ['LM', 'CM', 'CM', 'RM']),
    ...band(80, ['LW', 'ST', 'RW']),
  ],
  '5-3-2': [
    GK,
    ...band(22, ['LWB', 'CB', 'CB', 'CB', 'RWB']),
    ...band(50, ['CM', 'CM', 'CM']),
    ...band(83, ['ST', 'ST']),
  ],
  '4-5-1': [
    GK,
    ...band(22, ['LB', 'CB', 'CB', 'RB']),
    ...band(52, ['LM', 'CM', 'CM', 'CM', 'RM']),
    ...band(85, ['ST']),
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

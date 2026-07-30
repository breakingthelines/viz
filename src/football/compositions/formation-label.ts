/**
 * BTL formation-label glyph treatment. Normalizes `"4 2 3 1"` / `"4–2–3–1"` /
 * stray whitespace to a clean `"4-2-3-1"` — plain hyphens, no parentheses.
 * Empty / malformed inputs return an empty string so callers can omit the
 * chip entirely.
 *
 * Plain hyphens (not en-dashes — a previous cut of this used `–`) per the
 * Figma lineup restyle (node 3047:11125): its own "4-3-3" is a literal
 * hyphen, rendered as a clean, prominent element, not a typographic nicety —
 * matched here exactly rather than kept as a print-style substitution.
 *
 * Shared by `LineupPitch`, `FormationBoard` and `PlayerRatingBoard` so the
 * chip stays consistent across all three compositions.
 */
export function formatFormationLabel(formation: string | undefined): string {
  if (!formation) return '';
  const trimmed = formation.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/[-–\s]+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.join('-');
}

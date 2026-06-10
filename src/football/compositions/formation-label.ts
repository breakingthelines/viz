/**
 * BTL formation-label glyph treatment. Renders `"4-2-3-1"` as `"4–2–3–1"`
 * (en-dash separators, no parentheses, no whitespace). Empty / malformed
 * inputs return an empty string so callers can omit the chip entirely.
 *
 * Shared by `FormationBoard` and `PlayerRatingBoard` so the chip stays
 * consistent across both compositions.
 */
export function formatFormationLabel(formation: string | undefined): string {
  if (!formation) return '';
  const trimmed = formation.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/[-–\s]+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.join('–');
}

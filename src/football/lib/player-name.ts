/**
 * Shared player-name helpers for football viz labels.
 *
 * Surnames are the last whitespace token, but compound / nobiliary surnames
 * carry one or more leading particles ("van Dijk", "Mac Allister", "De Bruyne",
 * "van der Sar"). Taking only the final token drops the particle, so we walk
 * backwards from the last token and keep absorbing recognised particles.
 */

/**
 * Lower-cased compound / nobiliary surname particles. When one of these sits
 * immediately before the running surname, it belongs to the surname.
 */
const SURNAME_PARTICLES: ReadonlySet<string> = new Set([
  'van',
  'von',
  'der',
  'den',
  'de',
  'del',
  'della',
  'di',
  'da',
  'das',
  'dos',
  'du',
  'la',
  'le',
  'mac',
  'mc',
  'st',
  'san',
  'santa',
  'ten',
  'ter',
  'te',
  'op',
  'bin',
  'ibn',
  'al',
  'abu',
]);

/** Split a name into non-empty whitespace-separated tokens. */
function tokenize(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

/** True when `token` is a known compound/nobiliary surname particle. */
function isParticle(token: string): boolean {
  return SURNAME_PARTICLES.has(token.toLowerCase());
}

/**
 * Surname for an under-marker / chain label. Takes the last whitespace token,
 * then prepends any directly-preceding particle tokens so compound surnames
 * stay intact.
 *
 * - "Bukayo Saka"        → "Saka"
 * - "Alexis Mac Allister" → "Mac Allister"
 * - "Virgil van Dijk"     → "van Dijk"
 * - "Kevin De Bruyne"     → "De Bruyne"
 * - "Edwin van der Sar"   → "van der Sar"
 * - "Pedri"               → "Pedri"
 * - ""                    → ""
 */
export function surname(name: string): string {
  const parts = tokenize(name);
  if (parts.length === 0) return '';

  // Start at the final token and absorb any particles that precede it.
  let start = parts.length - 1;
  while (start > 0 && isParticle(parts[start - 1] ?? '')) {
    start -= 1;
  }

  return parts.slice(start).join(' ');
}

/**
 * Up-to-two initials for a headshot / marker monogram. Combines the first
 * token's initial with the surname core's initial (the first non-particle of
 * the surname), so "Alexis Mac Allister" → "AA" and "Bukayo Saka" → "BS".
 *
 * - "Bukayo Saka"        → "BS"
 * - "Alexis Mac Allister" → "AA"
 * - "Pedri"               → "P"
 * - ""                    → "?"
 */
export function monogram(name: string): string {
  const parts = tokenize(name);
  if (parts.length === 0) return '?';

  const first = parts[0] ?? '';
  if (parts.length === 1) return first.charAt(0).toUpperCase();

  // Use the core of the surname (skip leading particles) for the second initial.
  const surnameTokens = tokenize(surname(name));
  const core = surnameTokens.find((token) => !isParticle(token)) ?? surnameTokens[0] ?? '';

  return (first.charAt(0) + core.charAt(0)).toUpperCase();
}

/**
 * Shared player-name helpers for football viz labels.
 *
 * `playerShortName` is the one short-name rule. It mirrors the design
 * system's `playerShortName` (design-system
 * src/components/game-centre/player-short-name.ts) line for line, with the
 * same test table (src/football/lib/__tests__/player-name.test.ts); change
 * both together. viz cannot import it: the design system is an optional peer
 * and CI cannot install it yet.
 *
 * In order:
 *  1. The provider's short form wins when given: leading initials go
 *     ("R. Kolo Muani" is "Kolo Muani"), a form with none stays whole
 *     ("Vinícius Júnior").
 *  2. A name with leading initials is treated the same way.
 *  3. A single token is the name ("Rodri", "Marquinhos").
 *  4. Otherwise the last token, with any particles directly before it
 *     ("Ángel Di María" is "Di María", "Edwin van der Sar" is "van der Sar"),
 *     and a generational suffix keeps the token before it. The first token is
 *     a forename and is only taken as a particle when it is in lower case.
 */

/** Lower-cased surname particles that stay with the surname after them. */
export const PLAYER_NAME_PARTICLES: ReadonlySet<string> = new Set([
  'abu',
  'al',
  'ben',
  'bin',
  'da',
  'dal',
  'dalla',
  'das',
  'de',
  'dei',
  'del',
  'della',
  'den',
  'der',
  'des',
  'di',
  'do',
  'dos',
  'du',
  'el',
  'ibn',
  'la',
  'le',
  'lo',
  'mac',
  'mc',
  'op',
  'san',
  'santa',
  'st',
  'st.',
  'te',
  'ten',
  'ter',
  'van',
  'von',
]);

/** Generational suffixes that never stand alone as a short name. */
const SUFFIXES: ReadonlySet<string> = new Set([
  'jr',
  'jr.',
  'junior',
  'júnior',
  'filho',
  'neto',
  'sobrinho',
  'ii',
  'iii',
  'iv',
]);

/** A single letter and a dot: an abbreviated forename ("Á."). */
const INITIAL = /^\p{L}\.$/u;

function tokens(name: string | undefined): string[] {
  return (name ?? '').trim().split(/\s+/).filter(Boolean);
}

/** The tokens after any leading initials, or undefined when there are none. */
function afterInitials(parts: readonly string[]): string[] | undefined {
  let start = 0;
  while (start < parts.length && INITIAL.test(parts[start]!)) start += 1;
  if (start === 0 || start >= parts.length) return undefined;
  return parts.slice(start);
}

/**
 * A player's short name: "Di María" for "Ángel Di María", "Mac Allister" for
 * "Alexis Mac Allister", "Kolo Muani" for "Randal Kolo Muani" when the
 * provider's "R. Kolo Muani" is given as `providerShort`.
 */
export function playerShortName(name: string | undefined, providerShort?: string): string {
  const given = tokens(providerShort);
  if (given.length > 0) return (afterInitials(given) ?? given).join(' ');
  const parts = tokens(name);
  if (parts.length === 0) return '';
  const rest = afterInitials(parts);
  if (rest) return rest.join(' ');
  if (parts.length === 1) return parts[0]!;
  let start = parts.length - 1;
  if (SUFFIXES.has(parts[start]!.toLowerCase())) start -= 1;
  while (start > 0 && PLAYER_NAME_PARTICLES.has(parts[start - 1]!.toLowerCase())) {
    const prev = parts[start - 1]!;
    // The first token is a forename ("Ben White") unless written in lower case.
    if (start - 1 === 0 && prev !== prev.toLowerCase()) break;
    start -= 1;
  }
  return parts.slice(start).join(' ');
}

/**
 * Surname for an under-marker / chain label: `playerShortName`.
 *
 * - "Bukayo Saka"         → "Saka"
 * - "Alexis Mac Allister" → "Mac Allister"
 * - "Virgil van Dijk"     → "van Dijk"
 * - "Pedri"               → "Pedri"
 */
export function surname(name: string): string {
  return playerShortName(name);
}

/** True when `token` is a known compound/nobiliary surname particle. */
function isParticle(token: string): boolean {
  return PLAYER_NAME_PARTICLES.has(token.toLowerCase());
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
  const parts = tokens(name);
  if (parts.length === 0) return '?';

  const first = parts[0] ?? '';
  if (parts.length === 1) return first.charAt(0).toUpperCase();

  // Use the core of the surname (skip leading particles) for the second initial.
  const surnameTokens = tokens(surname(name));
  const core = surnameTokens.find((token) => !isParticle(token)) ?? surnameTokens[0] ?? '';

  return (first.charAt(0) + core.charAt(0)).toUpperCase();
}

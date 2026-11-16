/**
 * The similarity orbit block's links: a player's page and the comparison page
 * for two players, on BTL's routes (`/game/football/player/<route>/<slug>`,
 * `/game/football/compare/<a>-vs-<b>/<slugA>-vs-<slugB>`). The rules are
 * platform's (`app/lib/compare-path.ts`, `identity-slug.ts`): route ids are
 * canonical ids without their prefix, the pair goes in byte order, and a
 * slug comes from the player's own page URL when the block carries one, else
 * from identity's slug rule on his name (the page redirects to its canonical
 * slug).
 */

const PLAYER_ID_PREFIX = 'btl_football_player_';
const ROUTE_ID_RE = /^[a-z0-9]+$/;
const PLAYER_PAGE_RE = /^\/game\/football\/player\/([a-z0-9]+)\/([^/?#]+)$/;
const SLUG_KEEP_RE = /^[\p{L}\p{Nd}]$/u;

export interface OrbitLinkPlayer {
  id: string;
  name: string;
  /** His page, when the block carries it. */
  url?: string;
}

function joinsSlug(char: string): boolean {
  return (
    char === "'" || char === '’' || char === '‘' || char === 'ʼ' || char === '.' || char === ','
  );
}

/** identity-service's canonical slug for a name (platform `identityCanonicalSlug`). */
export function identitySlug(value: string): string {
  const folded = value
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  let out = '';
  let dash = false;
  for (const char of folded) {
    if (SLUG_KEEP_RE.test(char)) {
      out += char;
      dash = false;
      continue;
    }
    if (joinsSlug(char)) continue;
    if (out.length > 0 && !dash) {
      out += '-';
      dash = true;
    }
  }
  return out.replace(/^-+|-+$/g, '');
}

/** "p4b7614c5" for "btl_football_player_p4b7614c5"; undefined for any other id. */
export function playerRouteId(id: string): string | undefined {
  if (!id.startsWith(PLAYER_ID_PREFIX)) return undefined;
  const route = id.slice(PLAYER_ID_PREFIX.length);
  return ROUTE_ID_RE.test(route) ? route : undefined;
}

function slugOf(p: OrbitLinkPlayer): string {
  const m = PLAYER_PAGE_RE.exec(p.url ?? '');
  return m?.[2] ?? identitySlug(p.name);
}

/** His page: the block's URL when it is a player page, else built from his id and name. */
export function playerPagePath(p: OrbitLinkPlayer): string | undefined {
  if (p.url && PLAYER_PAGE_RE.test(p.url)) return p.url;
  const route = playerRouteId(p.id);
  const slug = identitySlug(p.name);
  return route && slug ? `/game/football/player/${route}/${slug}` : undefined;
}

/** The comparison page for two players, in byte order; undefined for a non-player or the same one. */
export function playerComparePath(a: OrbitLinkPlayer, b: OrbitLinkPlayer): string | undefined {
  const ar = playerRouteId(a.id);
  const br = playerRouteId(b.id);
  const as = slugOf(a);
  const bs = slugOf(b);
  if (!ar || !br || !as || !bs || ar === br) return undefined;
  const [first, second] =
    ar < br
      ? [
          { r: ar, s: as },
          { r: br, s: bs },
        ]
      : [
          { r: br, s: bs },
          { r: ar, s: as },
        ];
  return `/game/football/compare/${encodeURIComponent(`${first.r}-vs-${second.r}`)}/${encodeURIComponent(
    `${first.s}-vs-${second.s}`
  )}`;
}

const SURNAME_PARTICLES = new Set([
  'da',
  'de',
  'del',
  'della',
  'der',
  'di',
  'do',
  'dos',
  'du',
  'la',
  'le',
  'ten',
  'ter',
  'van',
  'von',
]);

/** "Mbappé" for "Kylian Mbappé", "De Bruyne" for "Kevin De Bruyne" (the Compare page's rule). */
export function orbitSurname(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words[0] ?? '';
  let start = words.length - 1;
  while (start > 1 && SURNAME_PARTICLES.has(words[start - 1]!.toLowerCase())) start--;
  return words.slice(start).join(' ');
}

/**
 * Club and player names as every block prints them (style.md, Title). Clubs
 * use the BTL display name, the club form dropped ("Liverpool F.C." is
 * "Liverpool", "AFC Bournemouth" is "Bournemouth"); narrow rows use the short
 * form ("Man City", "Forest", "Spurs"). Mirrors platform
 * `app/lib/team-short-name.ts` and game-service `gameblocks/clubs.go`: keep
 * the three in step.
 */

/** A leading "F.C."/"A.F.C." or a trailing "F.C."/"A.F.C."/"C.F.", dots optional. */
const CLUB_FORM = /^(?:A\.?F\.?C\.?|F\.?C\.?)\s+|\s+(?:A\.?F\.?C\.?|F\.?C\.?|C\.?F\.?)$/gi;

/**
 * Bare names (lower case) whose club form stays: without it the name is a
 * city another club is known by ("Paris FC" is not Paris Saint-Germain).
 */
const FORM_KEPT = new Set(['paris']);

const SHORT: Record<string, string> = {
  Bournemouth: "B'mouth",
  'AFC Bournemouth': "B'mouth",
  'Brighton & Hove Albion': 'Brighton',
  'Brighton and Hove Albion': 'Brighton',
  'Manchester United': 'Man United',
  'Manchester City': 'Man City',
  'Tottenham Hotspur': 'Spurs',
  Tottenham: 'Spurs',
  'Nottingham Forest': 'Forest',
  'Wolverhampton Wanderers': 'Wolves',
  'West Ham United': 'West Ham',
  'Newcastle United': 'Newcastle',
  'Leeds United': 'Leeds',
  'Aston Villa': 'Villa',
  'Crystal Palace': 'Palace',
  'Hull City': 'Hull',
  'Leicester City': 'Leicester',
  'Ipswich Town': 'Ipswich',
  'Luton Town': 'Luton',
  'Norwich City': 'Norwich',
  'Stoke City': 'Stoke',
  'Swansea City': 'Swansea',
  'Cardiff City': 'Cardiff',
  'Coventry City': 'Coventry',
  'Sheffield United': 'Sheffield Utd',
  'Sheffield Wednesday': 'Sheffield Wed',
  'West Bromwich Albion': 'West Brom',
  'Queens Park Rangers': 'QPR',
  'Preston North End': 'Preston',
  'Blackburn Rovers': 'Blackburn',
  'Bolton Wanderers': 'Bolton',
  'Huddersfield Town': 'Huddersfield',
  'Derby County': 'Derby',
  'Birmingham City': 'Birmingham',
  'Plymouth Argyle': 'Plymouth',
  'Oxford United': 'Oxford',
  'Wycombe Wanderers': 'Wycombe',
  'Paris Saint-Germain': 'PSG',
  'Paris Saint Germain': 'PSG',
  'Olympique de Marseille': 'Marseille',
  'Olympique Lyonnais': 'Lyon',
  'Borussia Dortmund': 'Dortmund',
  'Borussia Mönchengladbach': 'Gladbach',
  'Bayer 04 Leverkusen': 'Leverkusen',
  'Bayer Leverkusen': 'Leverkusen',
  'Bayern München': 'Bayern',
  'Bayern Munich': 'Bayern',
  'Eintracht Frankfurt': 'Frankfurt',
  'Real Madrid': 'Madrid',
  'Real Madrid CF': 'Madrid',
  'Atlético Madrid': 'Atlético',
  'Atletico Madrid': 'Atlético',
  'Club Atlético de Madrid': 'Atlético',
  'Athletic Club': 'Athletic',
  'Real Sociedad': 'La Real',
  Internazionale: 'Inter',
  'Inter Milan': 'Inter',
  'PSV Eindhoven': 'PSV',
  'AZ Alkmaar': 'AZ',
  'Sporting CP': 'Sporting',
};

/** "Liverpool F.C." to "Liverpool"; "Paris FC" stays "Paris FC". */
export function clubName(name: string | undefined): string {
  const full = (name ?? '').trim();
  const bare = full.replace(CLUB_FORM, '').trim();
  if (!bare || FORM_KEPT.has(bare.toLowerCase())) return full;
  return bare;
}

/** The curated short form ("Man City"), else the display name. */
export function clubShort(name: string | undefined): string {
  const bare = clubName(name);
  return SHORT[bare] ?? SHORT[(name ?? '').trim()] ?? bare;
}

/**
 * The name a row prints: the display name, or the short form on a narrow
 * block when the display name is longer than `max` characters.
 */
export function clubFit(name: string | undefined, narrow: boolean, max = 16): string {
  const full = clubName(name);
  return narrow && full.length > max ? clubShort(name) : full;
}

const PARTICLES = new Set([
  'van',
  'von',
  'de',
  'der',
  'den',
  'da',
  'dos',
  'das',
  'di',
  'del',
  'la',
  'le',
  'mac',
  'ter',
  'ten',
  'el',
]);

/** A player's surname with its particle: "Virgil van Dijk" is "van Dijk". */
export function surname(name: string | undefined): string {
  const p = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (p.length < 2) return p[0] ?? '';
  let i = p.length - 1;
  while (i > 1 && PARTICLES.has(p[i - 1]!.toLowerCase())) i--;
  return p.slice(i).join(' ');
}

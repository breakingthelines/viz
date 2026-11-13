import type {
  GameBlockAbsenceJson,
  GameBlockHonourJson,
  GameBlockRefJson,
  GameBlockResultJson,
  GameBlockTransferJson,
  GameBlockValueJson,
  GameBlockVenueJson,
} from '../player/data';
import type { GameBlockConfig } from '../types';

// Shared with the player blocks: defined once in `player/data.ts`.
export type {
  GameBlockAbsenceJson,
  GameBlockHonourJson,
  GameBlockRefJson,
  GameBlockResultJson,
  GameBlockTransferJson,
  GameBlockValueJson,
  GameBlockVenueJson,
};

/**
 * Shared wire shapes and formatting for the team, manager, league and match
 * blocks. The `*Json` types mirror `btl.game.v1.types` (protos 0.209.0) as
 * `toJson()` writes them; `team-league-match.pin.test.ts` pins them.
 */

export type GameBlockSideJson =
  | 'GAME_BLOCK_SIDE_UNSPECIFIED'
  | 'GAME_BLOCK_SIDE_HOME'
  | 'GAME_BLOCK_SIDE_AWAY';

export type GameBlockMatchStatusJson =
  | 'GAME_BLOCK_MATCH_STATUS_UNSPECIFIED'
  | 'GAME_BLOCK_MATCH_STATUS_SCHEDULED'
  | 'GAME_BLOCK_MATCH_STATUS_LIVE'
  | 'GAME_BLOCK_MATCH_STATUS_FINISHED'
  | 'GAME_BLOCK_MATCH_STATUS_POSTPONED'
  | 'GAME_BLOCK_MATCH_STATUS_CANCELLED'
  | 'GAME_BLOCK_MATCH_STATUS_ABANDONED';

export interface GameBlockMatchSideJson {
  team?: GameBlockRefJson;
  score?: number;
  penalties?: number;
}

export interface GameBlockMatchJson {
  gameId?: string;
  home?: GameBlockMatchSideJson;
  away?: GameBlockMatchSideJson;
  status?: GameBlockMatchStatusJson;
  competition?: GameBlockRefJson;
  roundLabel?: string;
  /** RFC 3339. */
  kickoff?: string;
  venue?: string;
  url?: string;
}

export interface GameBlockTeamMatchJson {
  gameId?: string;
  date?: string;
  opponent?: GameBlockRefJson;
  venue?: GameBlockVenueJson;
  result?: GameBlockResultJson;
  score?: string;
  competitionLabel?: string;
  url?: string;
}

export interface GameBlockPlayerGradeJson {
  player?: GameBlockRefJson;
  team?: GameBlockRefJson;
  /** BTL fan grade, 1 (best) to 6 (worst). */
  grade?: number;
  votes?: number;
  position?: string;
  shirtNumber?: number;
  grid?: string;
}

// ---------------------------------------------------------------------------
// Formatting: short labels only, British English, no sentences.
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ordinal(n: number): string {
  const r = Math.round(n);
  const t = r % 100;
  if (t >= 11 && t <= 13) return `${r}th`;
  return `${r}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[r % 10] ?? 'th'}`;
}

/** "2025-10-04" to "4 Oct 2025"; "2025-10" to "Oct 2025". Unknown input passes through. */
export function formatDay(day: string | undefined, opts: { year?: boolean } = {}): string {
  if (!day) return '';
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(day);
  if (!m) return day;
  const month = MONTHS[Number(m[2]) - 1] ?? '';
  const year = opts.year === false ? '' : ` ${m[1]}`;
  if (!m[3]) return `${month}${year}`;
  return `${Number(m[3])} ${month}${year}`;
}

/** "2019-12" to "2019". */
export function yearOf(day: string | undefined): string {
  return /^(\d{4})/.exec(day ?? '')?.[1] ?? '';
}

const KICKOFF_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** A kickoff as London day and time, the same on server and client. */
export function kickoffParts(ts: string | undefined): { day: string; time: string } | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(KICKOFF_PARTS.formatToParts(d).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function refName(ref: GameBlockRefJson | undefined, short = false): string {
  if (!ref) return '';
  return (short && ref.shortName) || ref.name || ref.shortName || '';
}

export function isPlayed(status: GameBlockMatchStatusJson | undefined): boolean {
  return status === 'GAME_BLOCK_MATCH_STATUS_FINISHED' || status === 'GAME_BLOCK_MATCH_STATUS_LIVE';
}

/** "2-1", with "(4-3 pens)" after a shoot-out. Empty before kick-off. */
export function matchScore(match: GameBlockMatchJson | undefined): string {
  const h = match?.home?.score;
  const a = match?.away?.score;
  if (typeof h !== 'number' || typeof a !== 'number') return '';
  return `${h}-${a}`;
}

export function penaltiesNote(match: GameBlockMatchJson | undefined): string {
  const h = match?.home?.penalties;
  const a = match?.away?.penalties;
  if (typeof h !== 'number' || typeof a !== 'number') return '';
  return `${h}-${a} pens`;
}

const STATUS_LABEL: Partial<Record<GameBlockMatchStatusJson, string>> = {
  GAME_BLOCK_MATCH_STATUS_LIVE: 'Live',
  GAME_BLOCK_MATCH_STATUS_FINISHED: 'Full time',
  GAME_BLOCK_MATCH_STATUS_POSTPONED: 'Postponed',
  GAME_BLOCK_MATCH_STATUS_CANCELLED: 'Cancelled',
  GAME_BLOCK_MATCH_STATUS_ABANDONED: 'Abandoned',
};

export function statusLabel(status: GameBlockMatchStatusJson | undefined): string {
  return (status && STATUS_LABEL[status]) ?? '';
}

export const RESULT_LETTER: Record<GameBlockResultJson, string> = {
  GAME_BLOCK_RESULT_UNSPECIFIED: '',
  GAME_BLOCK_RESULT_WIN: 'W',
  GAME_BLOCK_RESULT_DRAW: 'D',
  GAME_BLOCK_RESULT_LOSS: 'L',
};

export const RESULT_WORD: Record<GameBlockResultJson, string> = {
  GAME_BLOCK_RESULT_UNSPECIFIED: '',
  GAME_BLOCK_RESULT_WIN: 'Won',
  GAME_BLOCK_RESULT_DRAW: 'Drew',
  GAME_BLOCK_RESULT_LOSS: 'Lost',
};

export function venueLetter(venue: GameBlockVenueJson | undefined): string {
  if (venue === 'GAME_BLOCK_VENUE_HOME') return 'H';
  if (venue === 'GAME_BLOCK_VENUE_AWAY') return 'A';
  if (venue === 'GAME_BLOCK_VENUE_NEUTRAL') return 'N';
  return '';
}

/** One decimal place: 2.13 to "2.1", 2 to "2.0". */
export function oneDecimal(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** A rank on the 0 to 100 scale: 1st of 20 is 100, 20th is 0. */
export function rankToScale(rank: number, n: number): number {
  if (n <= 1 || rank <= 0) return 0;
  return Math.max(0, Math.min(100, ((n - rank) / (n - 1)) * 100));
}

/** BTL fan grades run from 1, the best, to 6, the worst. */
export const GRADE_BEST = 1;
export const GRADE_WORST = 6;

/** A fan grade on the 0 to 100 scale, best at the full end: 1 is 100, 6 is 0. */
export function gradeToScale(grade: number): number {
  const v = ((GRADE_WORST - grade) / (GRADE_WORST - GRADE_BEST)) * 100;
  return Math.max(0, Math.min(100, v));
}

/** A fan grade as the scale's accessible label: "Grade 1.6 of 6, 1 is best". */
export function gradeScaleLabel(grade: number): string {
  return `Grade ${oneDecimal(grade)} of ${GRADE_WORST}, ${GRADE_BEST} is best`;
}

// ---------------------------------------------------------------------------
// Frame basics every block in these submenus shares.
// ---------------------------------------------------------------------------

/** "Premier League, 2025/26": the scope as one plain line, else the stored context. */
export function scopeLine(
  config: GameBlockConfig<unknown>,
  ...extra: (string | undefined)[]
): string {
  const parts = [config.scope.competitionLabel, config.scope.seasonLabel, ...extra].filter(
    (p): p is string => !!p
  );
  return parts.length > 0 ? parts.join(', ') : config.context;
}

/** "Premier League, 4 Oct 2025" for a match block. */
export function matchLine(
  config: GameBlockConfig<unknown>,
  match: GameBlockMatchJson | undefined
): string {
  const ko = kickoffParts(match?.kickoff);
  const comp = match?.competition?.name || config.scope.competitionLabel;
  const parts = [comp, match?.roundLabel, ko ? formatDay(ko.day) : undefined].filter(
    (p): p is string => !!p
  );
  return parts.length > 0 ? parts.join(', ') : config.context;
}

/** "Arsenal v Liverpool". */
export function matchTitle(match: GameBlockMatchJson | undefined): string {
  const h = refName(match?.home?.team);
  const a = refName(match?.away?.team);
  return h && a ? `${h} v ${a}` : '';
}

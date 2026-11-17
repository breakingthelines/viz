import { clubName, surname } from '../skin/names';
import type { GameBlockMatchEventJson, MatchTimelineDataJson } from '../match/types';
import type { GameBlockRefJson } from './team-league-match-common';

/**
 * The match timeline's model (direction B, owner pick 17 Nov 2026): the
 * goals and red cards in true minute order, each with how it came and the
 * running score. game-service cleans the feed the same way; this pass keeps
 * a stored block right when it was built before that:
 *
 * - sorts by base then added minute (the feed lists 90+6' before 90+2');
 * - drops substitutions, VAR checks and yellow cards;
 * - drops bench and staff cards, where the player slot holds the club;
 * - folds a yellow and a red for one player in one minute into one red,
 *   "Second yellow";
 * - drops duplicate events and self-assists, and any assist on an own goal;
 * - drops a scorer-less goal in the minute of a VAR check when the goals
 *   would otherwise outrun the final score (a goal ruled out);
 * - takes penalty shootout kicks out of the rows, the running score, the
 *   strip and the stoppage reach, and lists them apart in `shootout`.
 *
 * game-service marks a shootout kick: a penalty goal or a missed penalty
 * whose detail is "Penalty shootout" (`SHOOTOUT_DETAIL`). When any event
 * carries the mark, the marked ones are the kicks and nothing else is. Blocks
 * stored before the mark have none; for them a kick is, in a match with a
 * shootout score, one of the penalty events from 120' on (API-Football stamps
 * kicks 120+1' onwards), counted back from the last until the scored ones
 * make the shootout score.
 */

export type TimelineKind = 'goal' | 'pen' | 'og' | 'red' | 'penmiss';
export type TimelineSide = 'home' | 'away';

export interface TimelineRow {
  kind: TimelineKind;
  side: TimelineSide;
  /** "90+2". */
  minute: string;
  base: number;
  added: number;
  /** 1 first half, 2 second half, 3 and 4 extra time. */
  phase: 1 | 2 | 3 | 4;
  player?: GameBlockRefJson;
  assist?: GameBlockRefJson;
  /** A red card that was a second yellow. */
  second?: boolean;
  /** Goals only: the score after it, home first. */
  score?: [number, number];
}

export interface ShootoutKick {
  side: TimelineSide;
  player?: GameBlockRefJson;
  scored: boolean;
  /** The kick's place in the shootout: 1 for the first. */
  order: number;
  /** The shootout score after this kick, home first. */
  score: [number, number];
}

export interface TimelineModel {
  rows: TimelineRow[];
  /** The penalty shootout, kick by kick. Empty without one. */
  shootout: ShootoutKick[];
  /** Stoppage time reached in each half, in minutes (from every event). */
  reach: [number, number];
  /** Whether the game went to extra time. */
  extraTime: boolean;
}

export function parseMinute(m: string | undefined): { base: number; added: number } {
  const [b, a] = String(m ?? '')
    .split('+')
    .map((x) => Number(x.replace(/[^\d]/g, '')));
  return { base: Number.isFinite(b) ? b! : 0, added: Number.isFinite(a) ? a! : 0 };
}

function phaseOf(base: number): 1 | 2 | 3 | 4 {
  return base <= 45 ? 1 : base <= 90 ? 2 : base <= 105 ? 3 : 4;
}

const GOALS = new Set(['KIND_GOAL', 'KIND_PENALTY_GOAL', 'KIND_OWN_GOAL']);

export function isGoalRow(r: TimelineRow): boolean {
  return r.kind === 'goal' || r.kind === 'pen' || r.kind === 'og';
}

/** A player's name as a row prints it: identity's short name, else the surname. */
export function shortName(ref: GameBlockRefJson | undefined): string {
  return ref?.shortName || surname(ref?.name);
}

export function timelineModel(data: MatchTimelineDataJson): TimelineModel {
  const match = data.match;
  const clubs = new Set(
    [match?.home?.team?.name, match?.away?.team?.name]
      .filter((n): n is string => !!n)
      .flatMap((n) => [n, clubName(n)])
  );
  const isClub = (ref: GameBlockRefJson | undefined) => !ref?.name || clubs.has(ref.name);
  const sorted = (data.events ?? [])
    .map((e, i) => ({ e, i, ...parseMinute(e.minute) }))
    .sort((x, y) => x.base - y.base || x.added - y.added || x.i - y.i);
  const kicks = shootoutKicks(sorted, match);
  const events = sorted.filter((x) => !kicks.has(x));
  const reach: [number, number] = [0, 0];
  let extraTime = false;
  for (const { base, added } of events) {
    if (base === 45) reach[0] = Math.max(reach[0], added);
    if (base === 90) reach[1] = Math.max(reach[1], added);
    if (base > 90) extraTime = true;
  }
  const seen = new Set<string>();
  const rows: TimelineRow[] = [];
  for (const { e, base, added } of events) {
    const key = `${e.kind}|${e.player?.id || e.player?.name}|${e.minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const side: TimelineSide = e.side === 'GAME_BLOCK_SIDE_AWAY' ? 'away' : 'home';
    const at = { side, minute: e.minute ?? '', base, added, phase: phaseOf(base) };
    const kind = e.kind ?? 'KIND_UNSPECIFIED';
    if (GOALS.has(kind)) {
      const k: TimelineKind =
        kind === 'KIND_OWN_GOAL' ? 'og' : kind === 'KIND_PENALTY_GOAL' ? 'pen' : 'goal';
      const rel = e.relatedPlayer;
      const assist =
        k === 'goal' && rel?.name && !isClub(rel) && !samePlayer(rel, e.player) ? rel : undefined;
      rows.push({ ...at, kind: k, player: isClub(e.player) ? undefined : e.player, assist });
    } else if (kind === 'KIND_MISSED_PENALTY') {
      if (!isClub(e.player)) rows.push({ ...at, kind: 'penmiss', player: e.player });
    } else if (kind === 'KIND_RED_CARD') {
      if (isClub(e.player)) continue;
      const second =
        /second yellow/i.test(e.detail ?? '') || yellowSameMinute(data.events ?? [], e);
      const i = rows.findIndex((r) => r.kind === 'red' && samePlayer(r.player, e.player));
      if (i >= 0) continue;
      rows.push({ ...at, kind: 'red', player: e.player, second });
    }
  }
  const finalScore = [match?.home?.score ?? 0, match?.away?.score ?? 0];
  const goals = () => rows.filter(isGoalRow);
  if (goals().length > finalScore[0]! + finalScore[1]!) {
    const varMinutes = new Set(
      (data.events ?? []).filter((e) => e.kind === 'KIND_VAR').map((e) => e.minute)
    );
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i]!;
      if (isGoalRow(r) && !r.player && varMinutes.has(r.minute)) rows.splice(i, 1);
    }
  }
  let h = 0;
  let a = 0;
  for (const r of rows) {
    if (!isGoalRow(r)) continue;
    if (r.side === 'home') h++;
    else a++;
    r.score = [h, a];
  }
  const shootout: ShootoutKick[] = [];
  let sh = 0;
  let sa = 0;
  for (const x of sorted) {
    if (!kicks.has(x)) continue;
    const e = x.e;
    const side: TimelineSide = e.side === 'GAME_BLOCK_SIDE_AWAY' ? 'away' : 'home';
    const scored = e.kind === 'KIND_PENALTY_GOAL';
    if (scored && side === 'home') sh++;
    else if (scored) sa++;
    shootout.push({
      side,
      player: isClub(e.player) ? undefined : e.player,
      scored,
      order: shootout.length + 1,
      score: [sh, sa],
    });
  }
  return { rows, shootout, reach, extraTime };
}

type SortedEvent = { e: GameBlockMatchEventJson; i: number; base: number; added: number };

const KICKS = new Set(['KIND_PENALTY_GOAL', 'KIND_MISSED_PENALTY']);

/** The detail game-service writes on a shootout kick (gameblocks.ShootoutDetail). */
export const SHOOTOUT_DETAIL = 'Penalty shootout';

/** The shootout kicks among the sorted events (see the model's notes). */
function shootoutKicks(
  sorted: SortedEvent[],
  match: MatchTimelineDataJson['match']
): Set<SortedEvent> {
  // The mark wins. Older blocks may name the shootout in other words, so
  // any detail naming it counts too.
  const flagged = sorted.filter(
    (x) =>
      KICKS.has(x.e.kind ?? '') &&
      (x.e.detail === SHOOTOUT_DETAIL || /shoot-?out/i.test(x.e.detail ?? ''))
  );
  if (flagged.length > 0) return new Set(flagged);
  // No mark: a block stored before game-service marked kicks.
  const ph = match?.home?.penalties;
  const pa = match?.away?.penalties;
  if (typeof ph !== 'number' || typeof pa !== 'number') return new Set();
  const out = new Set<SortedEvent>();
  let scored = 0;
  const candidates = sorted.filter((x) => KICKS.has(x.e.kind ?? '') && x.base >= 120);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const x = candidates[i]!;
    const goal = x.e.kind === 'KIND_PENALTY_GOAL';
    // Once the scored kicks make the shootout score, only misses before them
    // can still be kicks.
    if (scored >= ph + pa && goal) break;
    out.add(x);
    if (goal) scored++;
  }
  return out;
}

function samePlayer(a: GameBlockRefJson | undefined, b: GameBlockRefJson | undefined): boolean {
  if (!a || !b) return false;
  return (!!a.id && a.id === b.id) || (!!a.name && a.name === b.name);
}

function yellowSameMinute(
  events: GameBlockMatchEventJson[],
  red: GameBlockMatchEventJson
): boolean {
  return events.some(
    (e) =>
      e.kind === 'KIND_YELLOW_CARD' && e.minute === red.minute && samePlayer(e.player, red.player)
  );
}

/** How a row came: "Penalty", "Own goal", "Assist Mazraoui", "Second yellow", "Red card". */
export function howLine(r: TimelineRow): string {
  switch (r.kind) {
    case 'pen':
      return 'Penalty';
    case 'og':
      return 'Own goal';
    case 'goal':
      return r.assist ? `Assist ${shortName(r.assist)}` : '';
    case 'red':
      return r.second ? 'Second yellow' : 'Red card';
    case 'penmiss':
      return 'Penalty missed';
  }
}

/** The heading over the shootout kicks. */
export const SHOOTOUT_LABEL = 'Penalty shootout';

export const PHASE_LABEL: Record<number, string> = {
  1: 'First half',
  2: 'Second half',
  3: 'Extra time, first half',
  4: 'Extra time, second half',
};

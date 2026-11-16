/**
 * Similarity orbits (owner, 2026-11-16): a player's headshot at the centre
 * and every other player in his position group in the top five leagues as a
 * dot around him, nearer meaning more alike. This module is the pure half:
 * the data shape, the labels and the layout. `similarity-orbit.tsx` draws it.
 *
 * The data is plain, so game-service's `SimilarityOrbit` (the Compare page,
 * the Stats tab) and the game block's `GameBlockOrbit` both map onto it:
 * members closest first with their ranks, no scores.
 *
 * The layout is a golden-angle sunflower with equal area per player: the
 * k-th closest sits at radius sqrt(r1² + (R² - r1²)(k + ½) / n), so rank is
 * the radius and direction means nothing. The spiral is turned so the player
 * who matters (the compared player, else the closest) points straight up.
 * Faces sit on stems out from their own dots, pushed further along the stem
 * when they would overlap another face or the centre. Everything is a pure
 * function of the data, so a server render and the first browser render
 * draw the same picture.
 */
import { ordinal } from './format';

export interface OrbitPlayer {
  /** Any stable id; the two orbits of a pair must use the same ids. */
  id: string;
  name: string;
  /** His club, short form. */
  club?: string;
  /** His page. */
  url?: string;
  /** A headshot address; the caller can resolve faces another way. */
  imageUrl?: string;
}

export interface OrbitMember extends OrbitPlayer {
  /**
   * 1 is closest; equal scores share a rank. Counts pool members only: a
   * member outside the pool takes no one's place.
   */
  rank: number;
  /**
   * The pair's other player when he is not in this pool (another position
   * group, a league outside the top five): placed against the anchor for the
   * pair only, and left out of the pool's size and everyone else's place.
   */
  outsidePool?: boolean;
}

export interface OrbitData {
  anchor: OrbitPlayer;
  /** The pool, plural and lower case: "strikers". */
  plural: string;
  /** Everyone else in the pool, closest first. */
  members: OrbitMember[];
  /**
   * The pool's caption under the orbit: "Strikers". A pair shows its two
   * captions only when they differ (a striker v an attacking midfielder).
   */
  poolLabel?: string;
}

/** The pool's size: the members, without anyone from outside it. */
export function poolSize(data: OrbitData): number {
  return data.members.filter((m) => !m.outsidePool).length;
}

/** The closest member of the pool itself. */
function closestInPool(data: OrbitData): OrbitMember | undefined {
  return data.members.find((m) => !m.outsidePool);
}

/** The index of a player among the members, -1 when he is not one. */
export function memberIndex(data: OrbitData, id: string): number {
  return data.members.findIndex((m) => m.id === id);
}

/**
 * A pool member shares his rank (his score). Ranks count pool members only,
 * so equal ranks mean equal scores among them; an outsider is never joint.
 */
export function isJoint(data: OrbitData, index: number): boolean {
  const m = data.members[index];
  if (!m || m.outsidePool) return false;
  return data.members.some((o, i) => i !== index && !o.outsidePool && o.rank === m.rank);
}

/**
 * The strip's place: "Closest to Mbappé", "49th closest to Haaland". Ties
 * are broken by the members' order (the player page's order, then the id;
 * owner, 2026-11-16), so the strip never reads "joint". The accessible
 * labels do.
 */
export function rankPhrase(data: OrbitData, index: number, anchorShort: string): string {
  const m = data.members[index];
  if (!m) return '';
  if (m.outsidePool) {
    // Where he would sit among the pool: "43rd closest to Haaland among strikers".
    const among = data.plural ? ` among ${data.plural}` : '';
    return m.rank === 1
      ? `Closest to ${anchorShort}${among}`
      : `${ordinal(m.rank)} closest to ${anchorShort}${among}`;
  }
  const place = 1 + data.members.slice(0, index).filter((o) => !o.outsidePool).length;
  if (place === 1) return `Closest to ${anchorShort}`;
  return `${ordinal(place)} closest to ${anchorShort}`;
}

/**
 * A pair's orbit, for screen readers: "Erling Haaland is joint 85th closest
 * of the 157 other strikers to Kylian Mbappé. Closest: Donyell Malen."
 */
export function pairOrbitLabel(data: OrbitData, compared: OrbitPlayer): string {
  const pool = `the ${poolSize(data)} other ${data.plural || 'players'}`;
  const closest = closestInPool(data)?.name ?? '';
  const i = memberIndex(data, compared.id);
  if (i < 0) return `${data.anchor.name} among ${pool}. Closest: ${closest}.`;
  const joint = isJoint(data, i);
  const rank = data.members[i]!.rank;
  if (data.members[i]!.outsidePool) {
    // No "joint" here: his rank leaves him out of the pool's count, so a
    // pool member just below him can share the number without his score.
    const place = rank === 1 ? 'closest' : `${ordinal(rank)} closest`;
    return `${compared.name}, from outside this pool, would be ${place} of ${pool} to ${data.anchor.name}. Closest: ${closest}.`;
  }
  if (rank === 1 && !joint)
    return `${compared.name} is the closest of ${pool} to ${data.anchor.name}.`;
  const place = rank === 1 ? 'closest' : `${ordinal(rank)} closest`;
  return `${compared.name} is ${joint ? 'joint ' : ''}${place} of ${pool} to ${data.anchor.name}. Closest: ${closest}.`;
}

/**
 * One orbit, for screen readers: "Kylian Mbappé at the centre, the 157 other
 * strikers in the top five leagues around him, nearer means more alike.
 * Closest: Donyell Malen, Nicolas Jackson, Georges Mikautadze."
 */
export function singleOrbitLabel(data: OrbitData): string {
  const top = data.members
    .filter((m) => !m.outsidePool)
    .slice(0, 3)
    .map((m) => m.name)
    .filter(Boolean)
    .join(', ');
  return `${data.anchor.name} at the centre, the ${poolSize(data)} other ${data.plural || 'players'} in the top five leagues around him, nearer means more alike. Closest: ${top}.`;
}

/**
 * Where a selected player sits in each orbit he is a member of, joined:
 * "Closest to Mbappé · Joint 49th closest to Haaland". A centre player gets
 * the other direction only.
 */
export function placesLine(
  orbits: readonly OrbitData[],
  shortNames: readonly string[],
  id: string
): string {
  return placeLines(orbits, shortNames, id).join(' · ');
}

/** His place in each orbit he is in, one phrase per orbit: the strip's lines. */
export function placeLines(
  orbits: readonly OrbitData[],
  shortNames: readonly string[],
  id: string
): string[] {
  return orbits
    .map((o, k) => {
      const i = memberIndex(o, id);
      return i >= 0 ? rankPhrase(o, i, shortNames[k] ?? o.anchor.name) : '';
    })
    .filter(Boolean);
}

/**
 * The dot to ring in an orbit for a pick in another (or the same) orbit:
 * the player himself, or, when he is this orbit's centre, the other centre's
 * dot here (the same pair, seen from this side).
 */
export function linkedDot(
  pickId: string | null,
  pickOrbit: number,
  orbits: readonly OrbitData[],
  orbit: number
): string | null {
  const here = orbits[orbit];
  if (!pickId || !here) return null;
  if (pickId === here.anchor.id) {
    return orbit === pickOrbit ? null : (orbits[pickOrbit]?.anchor.id ?? null);
  }
  return memberIndex(here, pickId) >= 0 ? pickId : null;
}

/* ── geometry ───────────────────────────────────────────────────────────── */

export interface OrbitScale {
  /** The square's side, in its own units (the SVG viewBox). */
  size: number;
  /** The centre headshot's diameter. */
  face: number;
  /** A small headshot's diameter. */
  head: number;
  /** A dot's radius. */
  dot: number;
}

/** 380 wide: a desktop orbit of a pair (mock build3.py's design size). */
export const ORBIT_REGULAR: OrbitScale = { size: 380, face: 76, head: 30, dot: 3.4 };
/**
 * About 170 wide: a pair side by side on a phone, faces enlarged as the
 * mock does under 250 px so they stay recognisable.
 */
export const ORBIT_COMPACT: OrbitScale = { size: 170, face: 40, head: 18.5, dot: 1.8 };
/** One orbit alone: one column, faces as mock build5.py. */
export const ORBIT_SINGLE: OrbitScale = { size: 340, face: 68, head: 29, dot: 2.9 };

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Gap kept between faces, and between a face and the centre. */
const FACE_GAP = 3;

export interface DotPlace {
  x: number;
  y: number;
  /** Distance from the centre. */
  r: number;
  /** Angle from the centre, radians. */
  a: number;
}

export interface FacePlace {
  index: number;
  size: number;
  /** The face's centre. */
  x: number;
  y: number;
  /** Where the stem leaves the dot and where it meets the face. */
  stem: [x1: number, y1: number, x2: number, y2: number];
}

export interface OrbitLayout {
  scale: OrbitScale;
  cx: number;
  cy: number;
  /** The field's radius. */
  R: number;
  dots: DotPlace[];
  faces: FacePlace[];
  /** Units the faces reach past the square on each side, for margins. */
  overflow: { top: number; right: number; bottom: number; left: number };
}

function innerRadius(scale: OrbitScale): number {
  return scale.face / 2 + scale.dot * 2 + 4;
}

/** The sunflower: one place per member, closest first, `up` pointing up. */
export function orbitDots(n: number, scale: OrbitScale, up: number): DotPlace[] {
  const c = scale.size / 2;
  const R = c - 2;
  const r1 = innerRadius(scale);
  const rot = -Math.PI / 2 - Math.max(0, up) * GOLDEN_ANGLE;
  const out: DotPlace[] = [];
  for (let k = 0; k < n; k++) {
    const r = Math.sqrt(r1 * r1 + ((R * R - r1 * r1) * (k + 0.5)) / n);
    const a = k * GOLDEN_ANGLE + rot;
    out.push({ x: c + r * Math.cos(a), y: c + r * Math.sin(a), r, a });
  }
  return out;
}

/**
 * Places faces on stems out from their dots, in the order given (the first
 * keeps the shortest stem). A face that would overlap the centre face or a
 * face already placed is pushed further out along its stem.
 */
export function placeFaces(
  dots: readonly DotPlace[],
  wanted: readonly { index: number; size: number }[],
  scale: OrbitScale
): FacePlace[] {
  const c = scale.size / 2;
  const placed: FacePlace[] = [];
  for (const { index, size } of wanted) {
    const d = dots[index];
    if (!d) continue;
    const ux = Math.cos(d.a);
    const uy = Math.sin(d.a);
    const clear = (x: number, y: number) =>
      Math.hypot(x - c, y - c) >= scale.face / 2 + size / 2 + FACE_GAP &&
      placed.every((f) => Math.hypot(x - f.x, y - f.y) >= f.size / 2 + size / 2 + FACE_GAP);
    let L = scale.dot + 4 + size / 2;
    let x = d.x + L * ux;
    let y = d.y + L * uy;
    for (let step = 0; step < 400 && !clear(x, y); step++) {
      L += 0.5;
      x = d.x + L * ux;
      y = d.y + L * uy;
    }
    const s1 = scale.dot + 0.5;
    const s2 = L - size / 2;
    placed.push({
      index,
      size,
      x,
      y,
      stem: [d.x + s1 * ux, d.y + s1 * uy, d.x + s2 * ux, d.y + s2 * uy],
    });
  }
  return placed;
}

export function orbitLayout(
  n: number,
  scale: OrbitScale,
  up: number,
  wanted: readonly { index: number; size: number }[]
): OrbitLayout {
  const dots = orbitDots(n, scale, up);
  const faces = placeFaces(dots, wanted, scale);
  const s = scale.size;
  const ring = 4;
  const overflow = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const f of faces) {
    const h = f.size / 2 + ring;
    overflow.top = Math.max(overflow.top, h - f.y);
    overflow.left = Math.max(overflow.left, h - f.x);
    overflow.bottom = Math.max(overflow.bottom, f.y + h - s);
    overflow.right = Math.max(overflow.right, f.x + h - s);
  }
  return { scale, cx: s / 2, cy: s / 2, R: s / 2 - 2, dots, faces, overflow };
}

/** The nearest dot within `reach` units of (x, y), else -1. */
export function nearestDot(dots: readonly DotPlace[], x: number, y: number, reach: number): number {
  let best = -1;
  let bestD = reach;
  dots.forEach((d, i) => {
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist <= bestD) {
      best = i;
      bestD = dist;
    }
  });
  return best;
}

/* ── ambient drift ──────────────────────────────────────────────────────── */

/** FNV-1a: a stable 32-bit hash of the player id. */
function hash(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Drift {
  /** Seconds for one loop. */
  period: number;
  /** Seconds into the loop it starts at. */
  phase: number;
  /** Half-widths of the loop, in units; the sign of `ry` is the direction. */
  rx: number;
  ry: number;
}

/**
 * A dot's slow loop around its home, seeded from the player id so it is the
 * same on every render. At most `maxShare` of the spacing between dots in
 * each direction, so neighbours never cross and the order never changes.
 */
export function driftFor(id: string, n: number, scale: OrbitScale, maxShare = 0.14): Drift {
  const R = scale.size / 2 - 2;
  const r1 = innerRadius(scale);
  const spacing = Math.sqrt((Math.PI * (R * R - r1 * r1)) / Math.max(1, n));
  const amp = spacing * maxShare;
  const h = hash(id);
  const u = (shift: number) => ((h >>> shift) & 0xff) / 255;
  const period = 9 + u(0) * 7;
  return {
    period,
    phase: u(8) * period,
    rx: amp * (0.55 + 0.45 * u(16)),
    ry: amp * (0.55 + 0.45 * u(24)) * (h & 1 ? 1 : -1),
  };
}

/** The four corners of a drift loop, for an animation's keyframes. */
export function driftKeyframes(d: Drift, unit: (v: number) => string): Keyframe[] {
  const t = (x: number, y: number) => ({ transform: `translate(${unit(x)}, ${unit(y)})` });
  return [
    { ...t(d.rx, 0), offset: 0 },
    { ...t(0, d.ry), offset: 0.25 },
    { ...t(-d.rx, 0), offset: 0.5 },
    { ...t(0, -d.ry), offset: 0.75 },
    { ...t(d.rx, 0), offset: 1 },
  ];
}

/**
 * A combined pair's accessible name, both directions whichever orbit is
 * drawn: "Haaland is Mbappé's 85th closest of the 157 other strikers.
 * Mbappé is Haaland's 67th closest."
 */
export function combinedOrbitLabel(
  orbits: readonly [OrbitData, OrbitData],
  shortNames: readonly [string, string]
): string {
  const place = (o: OrbitData, id: string) => {
    const m = o.members[memberIndex(o, id)];
    if (!m) return '';
    return m.rank === 1 ? 'closest' : `${ordinal(m.rank)} closest`;
  };
  const [a, b] = orbits;
  const ab = place(a, b.anchor.id);
  const ba = place(b, a.anchor.id);
  const pool = `the ${poolSize(a)} other ${a.plural || 'players'}`;
  const first = ab
    ? `${shortNames[1]} is ${shortNames[0]}'s ${ab} of ${pool}.`
    : `${shortNames[0]} among ${pool}.`;
  const second = ba ? ` ${shortNames[0]} is ${shortNames[1]}'s ${ba}.` : '';
  return first + second;
}

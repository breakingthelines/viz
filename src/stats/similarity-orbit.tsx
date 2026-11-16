import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import {
  ORBIT_COMPACT,
  ORBIT_REGULAR,
  ORBIT_SINGLE,
  combinedOrbitLabel,
  driftFor,
  driftKeyframes,
  linkedDot,
  memberIndex,
  nearestDot,
  orbitLayout,
  pairOrbitLabel,
  placeLines,
  placesLine,
  rankPhrase,
  singleOrbitLabel,
  type OrbitData,
  type OrbitLayout,
  type OrbitPlayer,
  type OrbitScale,
} from './similarity-orbit-model';

/* ────────────────────────────────────────────────────────────────────────────
 * Similarity orbits (owner, 2026-11-16; mocks build3.py and build5.py): the
 * anchor's headshot at the centre, every other player in his pool as a dot,
 * faces on stems from their own dots. No text on the field.
 *
 *   SimilarityOrbit      one player: the nearest three as faces (the player
 *                        page's Stats tab, the "who is he like?" block).
 *   SimilarityOrbitPair  two players side by side, each the other's compared
 *                        player: his dot in his own colour with his face,
 *                        the disc inside his radius lit (the Compare page).
 *
 * Interactive (the default): a name shows beside a dot under the pointer or
 * keyboard focus; a tap or Enter selects a player, lights the disc to his
 * radius, gives him a face and opens the detail strip under the orbits (the
 * caller supplies its actions). Arrow keys move through the dots in rank
 * order. Escape, the same dot again, the strip's close control or a tap
 * outside closes it. `interactive={false}` draws the static picture only,
 * for an article or a share card.
 *
 * The static picture is the server HTML. Once hydrated, dots drift slowly
 * round their homes (Web Animations, seeded from the player id, never so far
 * that two dots cross; faces and stems follow their dot, the centre stays).
 * The drift is off under prefers-reduced-motion and with `motion={false}`,
 * and pauses off screen and while anything is hovered, focused or selected.
 * ──────────────────────────────────────────────────────────────────────── */

export const ORBIT_RED = '#ff3b3b';
export const ORBIT_WHITE = '#ffffff';
const SURFACE = '#151515';
const LABEL = '#d9d6d6';
const MUTED = '#a29e9e';
const FAINT_RING = 'rgba(255,255,255,0.25)';
const DIM: Record<string, string> = {
  [ORBIT_RED]: 'rgba(255,59,59,0.3)',
  [ORBIT_WHITE]: 'rgba(255,255,255,0.22)',
};
const SINGLE_DIM = 'rgba(255,255,255,0.32)';
const EASE = 'cubic-bezier(.23,1,.32,1)';

/** Pointer reach for a dot, in CSS px: a mouse needs less than a finger. */
const MOUSE_REACH_PX = 10;
const TOUCH_REACH_PX = 16;

/** A layout and the class that shows it (one per breakpoint, the caller's CSS). */
export interface OrbitScaleChoice {
  scale: OrbitScale;
  className?: string;
}

/** Headshot addresses for a player, tried in order. */
export type OrbitFaceSources = (player: OrbitPlayer) => readonly string[];

const defaultSources: OrbitFaceSources = (p) => (p.imageUrl ? [p.imageUrl] : []);

/* ── motion ─────────────────────────────────────────────────────────────── */

/**
 * Whether the dots may drift: never in the server render or the first
 * browser render (so hydration matches), never under reduced motion, and
 * only while the element is on screen.
 */
export function useOrbitMotion(ref: RefObject<HTMLElement | null>, enabled = true): boolean {
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setAllowed(false);
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAllowed(!query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, [enabled]);
  useEffect(() => {
    const node = ref.current;
    if (!allowed || !node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setVisible(e.isIntersecting);
    });
    io.observe(node);
    return () => io.disconnect();
  }, [allowed, ref]);
  return allowed && visible;
}

/**
 * Runs every `[data-orbit-drift]` element under `root` round its loop while
 * `moving`, paused while `still`. One animation per dot, on the compositor
 * where the browser can; nothing is created under reduced motion.
 */
function useDrift(
  root: RefObject<HTMLElement | null>,
  moving: boolean,
  still: boolean,
  key: string
) {
  const anims = useRef<Animation[]>([]);
  // A breakpoint change shows the other layout: animate that one instead.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!moving || typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setWidth(window.innerWidth), 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [moving]);
  useEffect(() => {
    const node = root.current;
    if (!moving || !node) return;
    const view = node.ownerDocument.defaultView;
    // Only the layout on screen: another breakpoint's is display: none.
    const shown = [...node.querySelectorAll<HTMLElement>('[data-orbit-layout]')].filter(
      (l) => !view || view.getComputedStyle(l).display !== 'none'
    );
    const els = shown.flatMap((l) => [
      ...l.querySelectorAll<HTMLElement | SVGElement>('[data-orbit-drift]'),
    ]);
    const list: Animation[] = [];
    els.forEach((el) => {
      if (typeof el.animate !== 'function') return;
      const [period, phase, rx, ry, size, unit] = (el.getAttribute('data-orbit-drift') ?? '').split(
        ' '
      );
      const p = Number(period);
      const s = Number(size);
      const len =
        unit === 'html'
          ? (v: number) => `${((v / s) * 100).toFixed(3)}cqw`
          : (v: number) => `${v.toFixed(2)}px`;
      const a = el.animate(
        driftKeyframes({ period: p, phase: Number(phase), rx: Number(rx), ry: Number(ry) }, len),
        {
          duration: p * 1000,
          iterations: Infinity,
          easing: 'ease-in-out',
          delay: -Number(phase) * 1000,
        }
      );
      list.push(a);
    });
    anims.current = list;
    return () => {
      for (const a of list) a.cancel();
      anims.current = [];
    };
  }, [root, moving, key, width]);
  useEffect(() => {
    for (const a of anims.current) {
      if (still) a.pause();
      else a.play();
    }
  }, [still, moving, key, width]);
}

function driftAttr(id: string, n: number, scale: OrbitScale, unit: 'svg' | 'html'): string {
  const d = driftFor(id, n, scale);
  return `${d.period.toFixed(3)} ${d.phase.toFixed(3)} ${d.rx.toFixed(3)} ${d.ry.toFixed(3)} ${scale.size} ${unit}`;
}

/* ── headshots ──────────────────────────────────────────────────────────── */

/**
 * Walks a headshot's addresses: the next on an error, including one that
 * failed before hydration (a settled image with no pixels).
 */
function useSourceChain(sources: readonly string[]) {
  const key = sources.join('\n');
  const [cursor, setCursor] = useState({ key, index: 0 });
  const index = cursor.key === key ? cursor.index : 0;
  const advance = useCallback(() => setCursor({ key, index: index + 1 }), [key, index]);
  return {
    src: sources[index],
    onError: advance,
    imgRef: (node: HTMLImageElement | null) => {
      if (!node || !node.getAttribute('src')) return;
      if (node.complete && node.naturalWidth === 0) advance();
    },
  };
}

function Headshot({
  sources,
  style,
  className,
}: {
  sources: readonly string[];
  style?: CSSProperties;
  className?: string;
}) {
  const { src, onError, imgRef } = useSourceChain(sources);
  if (!src) return null;
  return (
    <img
      key={src}
      ref={imgRef}
      src={src}
      alt=""
      draggable={false}
      onError={onError}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        borderRadius: 9999,
        background: '#ffffff',
        objectFit: 'cover',
        ...style,
      }}
    />
  );
}

function Face({
  sources,
  size,
  ring,
  dim = false,
  label,
  onClick,
  slot,
}: {
  sources: readonly string[];
  /** Diameter as a share of the orbit's width, 0 to 1. */
  size: number;
  ring: string;
  dim?: boolean;
  /** The face's button name; without it the face is decoration. */
  label?: string;
  onClick?: () => void;
  slot: string;
}) {
  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'block',
    width: `${(size * 100).toFixed(3)}cqw`,
    height: `${(size * 100).toFixed(3)}cqw`,
    transform: 'translate(-50%, -50%)',
    borderRadius: 9999,
    overflow: 'hidden',
    padding: 0,
    border: 0,
    background: '#2a2828',
    boxShadow: `0 0 0 2px ${SURFACE}, 0 0 0 ${size > 0.15 ? 3.5 : 3}px ${ring}`,
    opacity: dim ? 0.55 : 1,
  };
  const img = <Headshot sources={sources} />;
  if (!onClick) {
    return (
      <span data-slot={slot} aria-hidden="true" style={style}>
        {img}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-slot={slot}
      aria-label={label}
      tabIndex={-1}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ ...style, cursor: 'pointer' }}
    >
      {img}
    </button>
  );
}

/* ── one orbit's field ──────────────────────────────────────────────────── */

export interface OrbitFaceRole {
  /** The ring colour. */
  ring: string;
  /** The stem and the dot under the face. */
  ink: string;
  dim?: boolean;
  /** Bigger than a nearest-three face: the compared or selected player. */
  big?: boolean;
  /** The selected player's face, drawn only while he is selected. */
  temp?: boolean;
}

interface FieldProps {
  data: OrbitData;
  label: string;
  /** The orbit's colour: lit disc, the dots inside it, the centre ring. */
  ink: string;
  /** Dots outside the lit disc. */
  dim: string;
  /** The field behind the dots. */
  field: string;
  scales: readonly OrbitScaleChoice[];
  /** The member the spiral points up at. */
  up: number;
  /** Members drawn as faces, in placing order, with their look. */
  faces: readonly { id: string; role: OrbitFaceRole }[];
  /** The member whose radius the disc is lit to, or -1. */
  lit: number;
  /** Dots inside the lit disc take the orbit's colour. */
  inkInside: boolean;
  /** The first this-many dots take the orbit's colour whatever the disc. */
  inked?: number;
  /** Dots with a ring. */
  ringed: readonly string[];
  selected: string | null;
  hover: string | null;
  interactive: boolean;
  moving: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null, keyboard: boolean) => void;
  /** Selects the centre player; without it the centre face is decoration. */
  onAnchor?: () => void;
  /** A tap on a member's face; without it a face selects as its dot does. */
  onFace?: (id: string) => void;
  /** Crayon loops round these players' faces (members or the centre). */
  loops?: readonly { id: string; color: string }[];
  /** Stem weight, as a multiple of the default. */
  stemWeight?: number;
  sources: OrbitFaceSources;
  slot: string;
}

function faceSize(role: OrbitFaceRole, scale: OrbitScale): number {
  return role.big ? scale.head + 4 : scale.head;
}

function OrbitField(props: FieldProps) {
  const { data, scales } = props;
  const n = data.members.length;
  const faceIndices = useMemo(
    () =>
      props.faces
        .map((f) => ({ index: memberIndex(data, f.id), role: f.role }))
        .filter((f) => f.index >= 0),
    [data, props.faces]
  );
  const layouts = useMemo(
    () =>
      scales.map(({ scale, className }) => ({
        className,
        layout: orbitLayout(
          n,
          scale,
          props.up,
          faceIndices.map((f) => ({ index: f.index, size: faceSize(f.role, scale) }))
        ),
      })),
    [scales, n, props.up, faceIndices]
  );
  return (
    <div
      data-slot={props.slot}
      role={props.interactive ? 'group' : 'img'}
      aria-label={props.label}
      style={{ position: 'relative', width: '100%', minWidth: 0 }}
    >
      {layouts.map(({ className, layout }) => (
        <ScaleView
          key={layout.scale.size}
          {...props}
          className={className}
          layout={layout}
          faceRoles={faceIndices}
        />
      ))}
    </div>
  );
}

function ScaleView({
  className,
  layout,
  faceRoles,
  ...p
}: FieldProps & {
  className?: string;
  layout: OrbitLayout;
  faceRoles: readonly { index: number; role: OrbitFaceRole }[];
}) {
  const { data, interactive } = p;
  const { scale, dots, faces, cx, cy, R } = layout;
  const size = scale.size;
  const n = data.members.length;
  const svgRef = useRef<SVGSVGElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);

  const selectedIndex = p.selected ? memberIndex(data, p.selected) : -1;
  const hoverIndex = p.hover ? memberIndex(data, p.hover) : -1;
  const roleAt = new Map(faceRoles.map((f) => [f.index, f.role]));
  const faceAt = new Map(faces.map((f) => [f.index, f]));
  const ringed = new Set(p.ringed.map((id) => memberIndex(data, id)).filter((i) => i >= 0));
  const active = focused ?? (selectedIndex >= 0 ? selectedIndex : Math.max(0, p.up));
  const big = size > 250;

  const pct = (v: number) => `${((v / size) * 100).toFixed(3)}%`;
  const unitsAt = (e: { clientX: number; clientY: number; pointerType?: string }) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const k = size / rect.width;
    return {
      x: (e.clientX - rect.left) * k,
      y: (e.clientY - rect.top) * k,
      reach: (e.pointerType === 'mouse' ? MOUSE_REACH_PX : TOUCH_REACH_PX) * k,
    };
  };

  const focusDot = (i: number) => {
    const next = Math.max(0, Math.min(n - 1, i));
    setFocused(next);
    dotRefs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent<SVGCircleElement>, i: number) => {
    const id = data.members[i]!.id;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusDot(i + 1);
        return;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusDot(i - 1);
        return;
      case 'Home':
        e.preventDefault();
        focusDot(0);
        return;
      case 'End':
        e.preventDefault();
        focusDot(n - 1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        p.onSelect(id, true);
        return;
      case 'Escape':
        if (p.selected) {
          e.preventDefault();
          p.onSelect(null, true);
        }
        return;
      default:
    }
  };

  const litR = p.lit >= 0 && dots[p.lit] ? dots[p.lit]!.r : -1;
  const hoverAt = hoverIndex >= 0 ? hoverIndex : focused;
  const hoverDot = hoverAt !== null && hoverAt >= 0 ? dots[hoverAt] : undefined;
  const hoverName = hoverAt !== null && hoverAt >= 0 ? (data.members[hoverAt]?.name ?? '') : '';

  const handlers = interactive
    ? {
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          if (e.pointerType !== 'mouse') return;
          const at = unitsAt(e);
          if (!at) return;
          const i = nearestDot(dots, at.x, at.y, at.reach);
          const id = i >= 0 ? data.members[i]!.id : null;
          if (id !== p.hover) p.onHover(id);
        },
        onPointerLeave: () => {
          if (p.hover) p.onHover(null);
        },
        onClick: (e: { clientX: number; clientY: number; nativeEvent: Event }) => {
          const at = unitsAt({
            clientX: e.clientX,
            clientY: e.clientY,
            pointerType: (e.nativeEvent as globalThis.PointerEvent).pointerType,
          });
          const i = at ? nearestDot(dots, at.x, at.y, at.reach) : -1;
          const id = i >= 0 ? data.members[i]!.id : null;
          p.onSelect(id && id === p.selected ? null : id, false);
        },
      }
    : {};

  return (
    <div
      data-orbit-layout={size}
      className={className}
      style={{ marginTop: pct(layout.overflow.top), marginBottom: pct(layout.overflow.bottom) }}
    >
      <div
        data-slot={`${p.slot}-field`}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          containerType: 'inline-size',
          touchAction: 'manipulation',
          userSelect: 'none',
        }}
        {...handlers}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden={interactive ? undefined : true}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            overflow: 'visible',
          }}
        >
          <circle cx={cx} cy={cy} r={R} fill={p.field} fillOpacity={0.035} />
          {litR > 0 ? (
            <circle
              data-slot={`${p.slot}-lit`}
              cx={cx}
              cy={cy}
              r={litR}
              fill={p.ink}
              fillOpacity={0.16}
              style={p.moving ? { transition: `r 220ms ${EASE}` } : undefined}
            />
          ) : null}
          {dots.map((d, i) => {
            const m = data.members[i]!;
            const role = roleAt.get(i);
            const face = faceAt.get(i);
            const litRank = data.members[p.lit]?.rank ?? 0;
            const inside = p.inkInside && p.lit >= 0 && m.rank < litRank;
            const fill = role
              ? role.ink
              : inside || (p.inked !== undefined && i < p.inked)
                ? p.ink
                : p.dim;
            const isSelected = i === selectedIndex;
            const ring = ringed.has(i) || isSelected;
            return (
              <g
                key={m.id}
                data-orbit-drift={p.moving ? driftAttr(m.id, n, scale, 'svg') : undefined}
              >
                {face ? (
                  <line
                    x1={face.stem[0]}
                    y1={face.stem[1]}
                    x2={face.stem[2]}
                    y2={face.stem[3]}
                    stroke={role?.ink ?? ORBIT_WHITE}
                    strokeWidth={(big ? 1.25 : 1) * (p.stemWeight ?? 1)}
                    strokeOpacity={role?.dim ? 0.55 : 1}
                  />
                ) : null}
                {ring ? (
                  <circle
                    data-slot={`${p.slot}-ring`}
                    data-player={m.id}
                    cx={d.x}
                    cy={d.y}
                    r={scale.dot + (big ? 3.5 : 2.4)}
                    fill="none"
                    stroke={ORBIT_WHITE}
                    strokeWidth={big ? 1.5 : 1}
                  />
                ) : null}
                {i === focused ? (
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={scale.dot + (big ? 5.5 : 3.5)}
                    fill="none"
                    stroke={LABEL}
                    strokeOpacity={0.7}
                    strokeWidth={1}
                  />
                ) : null}
                <circle
                  ref={(node) => {
                    dotRefs.current[i] = node;
                  }}
                  data-slot={`${p.slot}-dot`}
                  data-player={m.id}
                  data-rank={m.rank}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? (i === active ? 0 : -1) : undefined}
                  aria-label={interactive ? (m.club ? `${m.name}, ${m.club}` : m.name) : undefined}
                  aria-pressed={interactive ? isSelected : undefined}
                  cx={d.x}
                  cy={d.y}
                  r={role || isSelected ? scale.dot + 0.8 : scale.dot}
                  fill={isSelected ? ORBIT_WHITE : fill}
                  style={{ outline: 'none' }}
                  onFocus={interactive ? () => setFocused(i) : undefined}
                  onBlur={interactive ? () => setFocused((f) => (f === i ? null : f)) : undefined}
                  onKeyDown={interactive ? (e) => onKey(e, i) : undefined}
                />
              </g>
            );
          })}
        </svg>
        {faces.map((f) => {
          const m = data.members[f.index]!;
          const role = roleAt.get(f.index)!;
          return (
            <span
              key={`face-${m.id}`}
              data-orbit-drift={p.moving ? driftAttr(m.id, n, scale, 'html') : undefined}
              style={{
                position: 'absolute',
                display: 'block',
                left: pct(f.x),
                top: pct(f.y),
                width: 0,
                height: 0,
              }}
            >
              <Face
                slot={`${p.slot}-face`}
                sources={p.sources(m)}
                size={f.size / size}
                ring={role.ring}
                dim={role.dim}
                label={m.name}
                onClick={
                  interactive
                    ? p.onFace
                      ? () => p.onFace!(m.id)
                      : () => p.onSelect(m.id === p.selected ? null : m.id, false)
                    : undefined
                }
              />
            </span>
          );
        })}
        <span
          style={{
            position: 'absolute',
            display: 'block',
            left: pct(cx),
            top: pct(cy),
            width: 0,
            height: 0,
          }}
        >
          <Face
            slot={`${p.slot}-anchor`}
            sources={p.sources(data.anchor)}
            size={scale.face / size}
            ring={p.ink}
            label={interactive && p.onAnchor ? data.anchor.name : undefined}
            onClick={interactive ? p.onAnchor : undefined}
          />
        </span>
        {p.loops && p.loops.length > 0 ? (
          <CrayonLoops
            loops={p.loops}
            at={(id) => {
              if (id === data.anchor.id) return { x: cx, y: cy, size: scale.face };
              const f = faces.find((x) => data.members[x.index]?.id === id);
              return f ? { x: f.x, y: f.y, size: f.size } : null;
            }}
            size={size}
            big={big}
            slot={p.slot}
          />
        ) : null}
        {interactive && hoverDot && hoverName ? (
          <span
            data-slot={`${p.slot}-name`}
            aria-hidden="true"
            style={{
              position: 'absolute',
              zIndex: 10,
              left: pct(hoverDot.x),
              top: pct(hoverDot.y),
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              borderRadius: 3,
              padding: '2px 6px',
              fontSize: 12,
              lineHeight: 1.25,
              color: LABEL,
              background: 'rgba(21,21,21,0.88)',
              transform:
                hoverDot.x > size * 0.6
                  ? 'translate(calc(-100% - 8px), -50%)'
                  : 'translate(8px, -50%)',
            }}
          >
            {hoverName}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Hand-drawn loops round faces (the annotated crayon): an ellipse a little
 * wider than the face, drawn once round with a short overrun and a rough
 * edge. Decoration only.
 */
function CrayonLoops({
  loops,
  at,
  size,
  big,
  slot,
}: {
  loops: readonly { id: string; color: string }[];
  at: (id: string) => { x: number; y: number; size: number } | null;
  size: number;
  big: boolean;
  slot: string;
}) {
  const filter = `${slot}-crayon`.replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      data-slot={`${slot}-loops`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <defs>
        <filter id={filter}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} />
          <feDisplacementMap in="SourceGraphic" scale={1.6} />
        </filter>
      </defs>
      {loops.map((lp) => {
        const f = at(lp.id);
        if (!f) return null;
        const r = f.size / 2 + (big ? 7 : 5);
        const pts: string[] = [];
        for (let k = 0; k <= 46; k++) {
          const t = (k / 40) * Math.PI * 2 - 0.9;
          const wob = 1 + 0.06 * Math.sin(k * 1.7) + (k > 40 ? 0.1 : 0);
          pts.push(
            `${(f.x + r * 1.08 * wob * Math.cos(t)).toFixed(1)},${(f.y + r * 0.96 * wob * Math.sin(t)).toFixed(1)}`
          );
        }
        return (
          <polyline
            key={lp.id}
            data-player={lp.id}
            points={pts.join(' ')}
            fill="none"
            stroke={lp.color}
            strokeWidth={big ? 2.4 : 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
            filter={`url(#${filter})`}
          />
        );
      })}
    </svg>
  );
}

/* ── the detail strip ───────────────────────────────────────────────────── */

export interface OrbitDetailStripProps {
  open: boolean;
  sources: readonly string[];
  /** "Donyell Malen, AS Roma". */
  title: string;
  /** Where he sits. */
  line: string;
  /**
   * The layout with a line each: name, his club (quieter), then one line per
   * place. When set they replace `title` and `line` on screen; `title` stays
   * the region's name.
   */
  name?: string;
  club?: string;
  lines?: readonly string[];
  actions?: ReactNode;
  onClose: () => void;
  focusRef: RefObject<HTMLDivElement | null>;
  slot: string;
  ring?: string;
  /** Expand smoothly; off under reduced motion. */
  animate: boolean;
  /**
   * The quieter place lines: smaller and muted, tucked under the club on
   * the name's text edge. The combined orbit's layout.
   */
  quietPlaces?: boolean;
}

/**
 * The selected player under the orbits: headshot, "Name, Club", where he
 * sits, and the caller's actions. It opens by expanding its own row, so
 * nothing above it moves.
 */
export function OrbitDetailStrip({
  open,
  sources,
  title,
  line,
  name,
  club,
  lines,
  actions,
  onClose,
  focusRef,
  slot,
  ring = ORBIT_WHITE,
  animate,
  quietPlaces = false,
}: OrbitDetailStripProps) {
  return (
    <div
      data-slot={`${slot}-wrap`}
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: animate ? `grid-template-rows 200ms ${EASE}` : undefined,
      }}
    >
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        {open ? (
          <div
            ref={focusRef}
            tabIndex={-1}
            data-slot={slot}
            role="region"
            aria-label={title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderRadius: 4,
              padding: 12,
              outline: 'none',
              background: 'rgba(255,255,255,0.04)',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: 9999,
                  background: '#2a2828',
                  boxShadow: `0 0 0 2px ${SURFACE}, 0 0 0 3px ${ring}`,
                }}
              >
                <Headshot sources={sources} />
              </span>
              <div
                style={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column', gap: 2 }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#ffffff',
                  }}
                >
                  {name ?? title}
                </span>
                {name !== undefined ? (
                  club ? (
                    <span data-slot={`${slot}-club`} style={{ fontSize: 12.5, color: MUTED }}>
                      {club}
                    </span>
                  ) : null
                ) : line ? (
                  <span style={{ fontSize: 12.5, color: MUTED }}>{line}</span>
                ) : null}
              </div>
              <button
                type="button"
                data-slot={`${slot}-close`}
                aria-label="Close"
                onClick={onClose}
                style={{
                  display: 'flex',
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 0,
                  borderRadius: 3,
                  padding: 0,
                  background: 'transparent',
                  color: MUTED,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            {name !== undefined && lines && lines.length > 0 ? (
              <div
                data-slot={`${slot}-places`}
                style={
                  quietPlaces
                    ? {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0,
                        marginTop: -6,
                        paddingLeft: 48,
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: MUTED,
                      }
                    : {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        fontSize: 13,
                        color: LABEL,
                      }
                }
              >
                {lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            ) : null}
            {actions ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: 16,
                  rowGap: 8,
                  fontSize: 13,
                }}
              >
                {actions}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── selection state ────────────────────────────────────────────────────── */

interface Pick {
  id: string;
  orbit: number;
}

/**
 * The shared selection and hover of an orbit group: Escape anywhere or a
 * tap outside closes, Enter moves focus into the strip and closing from the
 * keyboard gives focus back to the dot.
 */
function useOrbitSelection(initial: Pick | null) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const lastDot = useRef<Element | null>(null);
  const [pick, setPick] = useState<Pick | null>(initial);
  const [hover, setHover] = useState<Pick | null>(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const [toStrip, setToStrip] = useState(false);

  const close = (keyboard: boolean) => {
    setPick(null);
    if (keyboard) (lastDot.current as HTMLElement | null)?.focus?.();
  };
  const select = (orbit: number) => (id: string | null, keyboard: boolean) => {
    if (!id) {
      close(keyboard);
      return;
    }
    if (pick && pick.id === id && pick.orbit === orbit && !keyboard) {
      setPick(null);
      return;
    }
    if (keyboard && typeof document !== 'undefined') lastDot.current = document.activeElement;
    setPick({ id, orbit });
    setToStrip(keyboard);
  };

  useEffect(() => {
    if (pick && toStrip) {
      stripRef.current?.focus();
      setToStrip(false);
    }
  }, [pick, toStrip]);

  useEffect(() => {
    if (!pick) return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPick(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setPick(null);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pick]);

  const rootProps = {
    ref: rootRef,
    onFocus: () => setFocusWithin(true),
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
    },
  };
  return {
    rootRef,
    stripRef,
    rootProps,
    pick,
    hover,
    setHover,
    select,
    close,
    still: !!pick || !!hover || focusWithin,
  };
}

/* ── one orbit ──────────────────────────────────────────────────────────── */

const NEAR: OrbitFaceRole = { ring: ORBIT_RED, ink: ORBIT_RED };
const TEMP: OrbitFaceRole = { ring: ORBIT_WHITE, ink: ORBIT_WHITE, big: true, temp: true };

/** One orbit's faces: the nearest three, then the selected player. */
export function singleOrbitFaces(
  data: OrbitData,
  selected: string | null
): { id: string; role: OrbitFaceRole }[] {
  const out = data.members
    .filter((m) => !m.outsidePool)
    .slice(0, 3)
    .map(({ id }) => ({ id, role: NEAR }));
  if (selected && !out.some((f) => f.id === selected) && memberIndex(data, selected) >= 0) {
    out.push({ id: selected, role: TEMP });
  }
  return out;
}

export interface SimilarityOrbitProps {
  orbit: OrbitData;
  /** The centre player's short name in the strip ("Closest to Mbappé"). */
  anchorShort?: string;
  /** Layouts by breakpoint; one 340-unit layout by default. */
  scales?: readonly OrbitScaleChoice[];
  /** Taps, hover names, keyboard and the strip. Default true. */
  interactive?: boolean;
  /** The ambient drift (still off under reduced motion). Default true. */
  motion?: boolean;
  /** Dots that keep a ring (the player on the wheel). */
  ringed?: readonly string[];
  /** Selected on first render (arriving with someone on the wheel). */
  initialSelected?: string | null;
  faceSources?: OrbitFaceSources;
  /** The strip's actions for the selected member. */
  renderActions?: (member: OrbitPlayer) => ReactNode;
  /** The accessible name; a sentence naming the closest three by default. */
  label?: string;
  slot?: string;
}

/** One player's orbit: the nearest three as faces, no lit disc until a tap. */
export function SimilarityOrbit({
  orbit,
  anchorShort,
  scales = [{ scale: ORBIT_SINGLE }],
  interactive = true,
  motion = true,
  ringed = [],
  initialSelected = null,
  faceSources = defaultSources,
  renderActions,
  label,
  slot = 'similarity-orbit',
}: SimilarityOrbitProps) {
  const start =
    interactive && initialSelected && memberIndex(orbit, initialSelected) >= 0
      ? { id: initialSelected, orbit: 0 }
      : null;
  const s = useOrbitSelection(start);
  const moving = useOrbitMotion(s.rootRef, motion && interactive);
  useDrift(s.rootRef, moving, s.still, `${orbit.anchor.id}:${orbit.members.length}`);
  const selected = s.pick?.id ?? null;
  const index = selected ? memberIndex(orbit, selected) : -1;
  const member = index >= 0 ? orbit.members[index] : undefined;
  return (
    <div
      {...s.rootProps}
      data-slot={slot}
      data-orbit-still={s.still ? 'true' : 'false'}
      style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 12 }}
    >
      <OrbitField
        slot={`${slot}-orbit`}
        data={orbit}
        label={label ?? singleOrbitLabel(orbit)}
        ink={ORBIT_RED}
        dim={SINGLE_DIM}
        field={ORBIT_WHITE}
        scales={scales}
        up={0}
        faces={singleOrbitFaces(orbit, selected)}
        lit={index}
        inkInside={false}
        inked={3}
        ringed={ringed}
        selected={selected}
        hover={s.hover?.id ?? null}
        interactive={interactive}
        moving={moving}
        onHover={(id) => s.setHover(id ? { id, orbit: 0 } : null)}
        onSelect={s.select(0)}
        sources={faceSources}
      />
      {interactive ? (
        <OrbitDetailStrip
          open={!!member}
          slot={`${slot}-detail`}
          focusRef={s.stripRef}
          animate={moving}
          ring={index >= 0 && index < 3 ? ORBIT_RED : ORBIT_WHITE}
          sources={member ? faceSources(member) : []}
          title={member ? [member.name, member.club].filter(Boolean).join(', ') : ''}
          line={member ? rankPhrase(orbit, index, anchorShort ?? orbit.anchor.name) : ''}
          name={member?.name ?? ''}
          club={member?.club}
          lines={member ? [rankPhrase(orbit, index, anchorShort ?? orbit.anchor.name)] : []}
          onClose={() => s.close(true)}
          actions={member && renderActions ? renderActions(member) : undefined}
        />
      ) : null}
    </div>
  );
}

/* ── a pair ─────────────────────────────────────────────────────────────── */

/**
 * A pair orbit's faces: the compared player first (he keeps the shortest
 * stem), then the nearest three, those closer than him ringed in the orbit's
 * colour and the rest dimmed, then the selected player.
 */
export function pairOrbitFaces(
  data: OrbitData,
  comparedId: string,
  ink: string,
  comparedInk: string,
  selected: string | null
): { id: string; role: OrbitFaceRole }[] {
  const m = memberIndex(data, comparedId);
  const comparedRank = data.members[m]?.rank ?? Infinity;
  const out: { id: string; role: OrbitFaceRole }[] = [];
  if (m >= 0)
    out.push({ id: comparedId, role: { ring: comparedInk, ink: comparedInk, big: true } });
  // The pool's nearest three: someone from outside it is never one of them.
  const pool = data.members.filter((p) => !p.outsidePool);
  const outside = !!data.members[m]?.outsidePool;
  const nearest = outside ? pool.slice(0, 3) : data.members.slice(0, 3);
  nearest.forEach(({ id, rank }) => {
    if (id === comparedId) return;
    const closer = m < 0 || rank < comparedRank;
    out.push({
      id,
      role: closer ? { ring: ink, ink } : { ring: FAINT_RING, ink: DIM[ink] ?? ink, dim: true },
    });
  });
  if (selected && !out.some((f) => f.id === selected) && memberIndex(data, selected) >= 0) {
    out.push({ id: selected, role: TEMP });
  }
  return out;
}

/** Two layouts for a pair: 380 wide, and 170 under the caller's breakpoint. */
export const PAIR_SCALES = (regular?: string, compact?: string): OrbitScaleChoice[] => [
  { scale: ORBIT_REGULAR, className: regular },
  { scale: ORBIT_COMPACT, className: compact },
];

export interface SimilarityOrbitPairProps {
  /** The first player's orbit, then the second's: each the other's anchor. */
  orbits: readonly [OrbitData, OrbitData];
  /** Short names for the strip ("Mbappé", "Haaland"). */
  shortNames: readonly [string, string];
  /** Layouts by breakpoint; the caller's classes show one. */
  scales?: readonly OrbitScaleChoice[];
  interactive?: boolean;
  motion?: boolean;
  faceSources?: OrbitFaceSources;
  /**
   * The strip's actions for the selected player; `main` when he is one of
   * the two centre players.
   */
  renderActions?: (player: OrbitPlayer, main: boolean) => ReactNode;
  /** Each orbit cell's width style; two halves with a gap by default. */
  cellStyle?: CSSProperties;
  /** Each orbit cell's class (its width by breakpoint); replaces the default width. */
  cellClassName?: string;
  /** The class on the row of orbits (its gap by breakpoint); 12 px without one. */
  rowClassName?: string;
  slot?: string;
}

/** Two players' orbits side by side: red for the first, white for the second. */
export function SimilarityOrbitPair({
  orbits,
  shortNames,
  scales = [{ scale: ORBIT_REGULAR }],
  interactive = true,
  motion = true,
  faceSources = defaultSources,
  renderActions,
  cellStyle,
  cellClassName,
  rowClassName,
  slot = 'similarity-orbits',
}: SimilarityOrbitPairProps) {
  const s = useOrbitSelection(null);
  const moving = useOrbitMotion(s.rootRef, motion && interactive);
  useDrift(s.rootRef, moving, s.still, `${orbits[0].anchor.id}:${orbits[1].anchor.id}`);
  const inks = [ORBIT_RED, ORBIT_WHITE] as const;
  const anchors = [orbits[0].anchor, orbits[1].anchor] as const;
  // Two pools (a striker v an attacking midfielder): each orbit names its own.
  const captioned =
    !!orbits[0].poolLabel && !!orbits[1].poolLabel && orbits[0].poolLabel !== orbits[1].poolLabel;
  const pick = s.pick;
  const picked: OrbitPlayer | undefined = pick
    ? (anchors.find((a) => a.id === pick.id) ??
      orbits[0].members.find((m) => m.id === pick.id) ??
      orbits[1].members.find((m) => m.id === pick.id))
    : undefined;
  const main = !!pick && anchors.some((a) => a.id === pick.id);
  return (
    <div
      {...s.rootProps}
      data-slot={slot}
      data-orbit-still={s.still ? 'true' : 'false'}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div
        className={rowClassName}
        style={{ display: 'flex', justifyContent: 'center', ...(rowClassName ? {} : { gap: 12 }) }}
      >
        {([0, 1] as const).map((o) => {
          const other = (1 - o) as 0 | 1;
          const d = orbits[o];
          const compared = anchors[other];
          const selectedHere = pick && pick.orbit === o ? pick.id : null;
          const selIndex = selectedHere ? memberIndex(d, selectedHere) : -1;
          const comparedIndex = memberIndex(d, compared.id);
          const ringed = [
            linkedDot(pick?.id ?? null, pick?.orbit ?? 0, orbits, o),
            linkedDot(s.hover?.id ?? null, s.hover?.orbit ?? 0, orbits, o),
          ].filter((x): x is string => !!x);
          return (
            <div
              key={o}
              className={cellClassName}
              style={
                cellStyle ??
                (cellClassName ? { minWidth: 0 } : { width: 'calc(50% - 6px)', maxWidth: 380 })
              }
            >
              <OrbitField
                slot={`${slot}-orbit`}
                data={d}
                label={pairOrbitLabel(d, compared)}
                ink={inks[o]}
                dim={DIM[inks[o]]!}
                field={inks[o]}
                scales={scales}
                up={comparedIndex >= 0 ? comparedIndex : 0}
                faces={pairOrbitFaces(d, compared.id, inks[o], inks[other], selectedHere)}
                lit={selIndex >= 0 ? selIndex : comparedIndex}
                inkInside
                ringed={ringed}
                selected={selectedHere}
                hover={s.hover && s.hover.orbit === o ? s.hover.id : null}
                interactive={interactive}
                moving={moving}
                onHover={(id) => s.setHover(id ? { id, orbit: o } : null)}
                onSelect={s.select(o)}
                onAnchor={() => s.select(o)(anchors[o].id, false)}
                sources={faceSources}
              />
              {captioned ? (
                <span
                  data-slot={`${slot}-pool`}
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    marginTop: 8,
                    textAlign: 'center',
                    fontSize: 12.5,
                    color: MUTED,
                  }}
                >
                  {d.poolLabel}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {interactive ? (
        <OrbitDetailStrip
          open={!!picked}
          slot={`${slot}-detail`}
          focusRef={s.stripRef}
          animate={moving}
          sources={picked ? faceSources(picked) : []}
          title={picked ? [picked.name, picked.club].filter(Boolean).join(', ') : ''}
          line={pick ? placesLine(orbits, shortNames, pick.id) : ''}
          name={picked?.name ?? ''}
          club={picked?.club}
          lines={pick ? placeLines(orbits, shortNames, pick.id) : []}
          onClose={() => s.close(true)}
          actions={picked && renderActions ? renderActions(picked, main) : undefined}
        />
      ) : null}
    </div>
  );
}

/* ── a pair in one orbit ────────────────────────────────────────────────── */

/** The crayon on the two compared faces. */
const LOOP_INK = 'rgb(250, 128, 114)';

/** Whether the viewer asked for reduced motion (false on the server). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface SimilarityOrbitCombinedProps {
  /** The first-named player's orbit, then the second's: each the other's anchor, one pool. */
  orbits: readonly [OrbitData, OrbitData];
  /** Short names for the switch, the strip and the label ("Mbappé", "Haaland"). */
  shortNames: readonly [string, string];
  /** Layouts by breakpoint; one 380-unit layout by default. */
  scales?: readonly OrbitScaleChoice[];
  /**
   * Taps, hover names, keyboard, the swap and the strip. Default true. Off,
   * it draws the first-named player's orbit only.
   */
  interactive?: boolean;
  motion?: boolean;
  faceSources?: OrbitFaceSources;
  /** The strip's actions; `main` when he is one of the two players. */
  renderActions?: (player: OrbitPlayer, main: boolean) => ReactNode;
  slot?: string;
}

/**
 * Two players in one pool, in one orbit: centred on the first (red), the
 * second is his dot at his rank with his face on a stem and the disc lit to
 * his radius; crayon loops on both faces. A tap on the second player's face,
 * or the name switch under the orbit, re-centres it on him (white), where
 * the first is the dot; again swaps back. The accessible name gives both
 * directions whichever is drawn.
 */
export function SimilarityOrbitCombined({
  orbits,
  shortNames,
  scales = [{ scale: ORBIT_REGULAR }],
  interactive = true,
  motion = true,
  faceSources = defaultSources,
  renderActions,
  slot = 'similarity-orbit-combined',
}: SimilarityOrbitCombinedProps) {
  const [centre, setCentre] = useState<0 | 1>(0);
  const shown: 0 | 1 = interactive ? centre : 0;
  const s = useOrbitSelection(null);
  const moving = useOrbitMotion(s.rootRef, motion && interactive);
  useDrift(s.rootRef, moving, s.still, `${orbits[0].anchor.id}:${orbits[1].anchor.id}:${shown}`);
  const morphRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = morphRef.current;
    if (!el || typeof el.animate !== 'function' || prefersReducedMotion()) return;
    el.animate(
      [
        { opacity: 0.2, transform: 'scale(0.94) rotate(-6deg)' },
        { opacity: 1, transform: 'scale(1) rotate(0deg)' },
      ],
      { duration: 280, easing: EASE }
    );
  }, [shown]);

  const inks = [ORBIT_RED, ORBIT_WHITE] as const;
  const d = orbits[shown];
  const other = orbits[(1 - shown) as 0 | 1].anchor;
  const ink = inks[shown];
  const otherInk = inks[1 - shown]!;
  const otherIndex = memberIndex(d, other.id);
  const selected = s.pick?.id ?? null;
  const selIndex = selected ? memberIndex(d, selected) : -1;
  const anchors = [orbits[0].anchor, orbits[1].anchor];
  const picked: OrbitPlayer | undefined = selected
    ? (anchors.find((a) => a.id === selected) ?? d.members.find((m) => m.id === selected))
    : undefined;
  const main = !!picked && anchors.some((a) => a.id === picked.id);

  const swap = (to: 0 | 1) => {
    if (to === centre) return;
    s.close(false);
    setCentre(to);
  };

  return (
    <div
      {...s.rootProps}
      data-slot={slot}
      data-orbit-still={s.still ? 'true' : 'false'}
      data-orbit-centre={d.anchor.id}
      style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 12 }}
    >
      <div ref={morphRef} key={shown}>
        <OrbitField
          slot={`${slot}-orbit`}
          data={d}
          label={combinedOrbitLabel(orbits, shortNames)}
          ink={ink}
          dim={DIM[ink]!}
          field={ink}
          scales={scales}
          up={otherIndex >= 0 ? otherIndex : 0}
          faces={pairOrbitFaces(d, other.id, ink, otherInk, selected)}
          lit={selIndex >= 0 ? selIndex : otherIndex}
          inkInside
          ringed={selected ? [selected] : []}
          selected={selected}
          hover={s.hover?.id ?? null}
          interactive={interactive}
          moving={moving}
          onHover={(id) => s.setHover(id ? { id, orbit: 0 } : null)}
          onSelect={s.select(0)}
          onFace={(id) => {
            if (id === other.id) swap((1 - shown) as 0 | 1);
            else s.select(0)(id, false);
          }}
          loops={[
            { id: d.anchor.id, color: LOOP_INK },
            { id: other.id, color: LOOP_INK },
          ]}
          stemWeight={1.8}
          sources={faceSources}
        />
      </div>
      {interactive ? (
        <div
          role="group"
          aria-label="Centre the orbit on"
          data-slot={`${slot}-switch`}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: 8,
            fontSize: 13,
          }}
        >
          {([0, 1] as const).map((o) => (
            <span key={o} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
              {o === 1 ? (
                <span aria-hidden="true" style={{ color: MUTED }}>
                  ·
                </span>
              ) : null}
              <button
                type="button"
                aria-pressed={shown === o}
                data-slot={`${slot}-switch-option`}
                onClick={() => swap(o)}
                style={{
                  cursor: shown === o ? 'default' : 'pointer',
                  border: 0,
                  padding: '2px 0',
                  background: 'transparent',
                  font: 'inherit',
                  fontWeight: shown === o ? 600 : 400,
                  color: shown === o ? (o === 0 ? ORBIT_RED : ORBIT_WHITE) : MUTED,
                }}
              >
                {shortNames[o]}
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {interactive ? (
        <OrbitDetailStrip
          open={!!picked}
          slot={`${slot}-detail`}
          focusRef={s.stripRef}
          animate={moving}
          ring={selIndex >= 0 && selIndex < 3 ? ink : ORBIT_WHITE}
          sources={picked ? faceSources(picked) : []}
          title={picked ? [picked.name, picked.club].filter(Boolean).join(', ') : ''}
          line={selected ? placesLine(orbits, shortNames, selected) : ''}
          name={picked?.name ?? ''}
          club={picked?.club}
          lines={selected ? placeLines(orbits, shortNames, selected) : []}
          quietPlaces
          onClose={() => s.close(true)}
          actions={picked && renderActions ? renderActions(picked, main) : undefined}
        />
      ) : null}
    </div>
  );
}

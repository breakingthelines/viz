import { useId, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';
import { Crest } from '#/football/lib/crest';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { finite } from '#/football/lib/finite';
import { usePersistedSelection } from '#/football/lib/use-persisted-selection';
import { RevealOnScroll } from '#/football/lib/reveal-on-scroll';

/** Which side the moment's actor belongs to. `home` attacks left→right. */
export type MomentTeam = 'home' | 'away';

/** The on-ball event being frozen. */
export interface MomentEvent {
  /** Event type, e.g. "Pass", "Carry", "Through Ball". */
  type: string;
  /** Actor (ball-carrier) display name. */
  player: string;
  /** Which side the actor plays for. */
  team: MomentTeam;
  /** Match minute. */
  minute: number;
  /** Actor headshot URL. When set, the ball-carrier shows the photo (dot fallback). */
  imageUrl?: string;
}

/** A point in StatsBomb 120×80 pitch coordinates. */
export interface MomentPoint {
  /** StatsBomb x (0–120, own goal line → opposition goal line). */
  x: number;
  /** StatsBomb y (0–80, left touchline → right). */
  y: number;
}

/** One of the other twenty-one players in the 360 freeze-frame. */
export interface MomentPlayer extends MomentPoint {
  /** True when this player is a team-mate of the actor. */
  teammate: boolean;
  /** True when this player is a goalkeeper. */
  keeper: boolean;
}

/** A pass the actor could play, with whether the receiver is in space. */
export interface MomentPassingOption extends MomentPoint {
  /**
   * Override for whether the receiver is in space. Omit it (the default) to let
   * the block COMPUTE coverage from the freeze-frame — a receiver is "covered"
   * when an opponent is within `coverRadius`, otherwise "in space". Set it only
   * to override the geometry (e.g. a run in behind the line that a pure distance
   * check would misread). In-space lanes glow and carry a "space" halo.
   */
  inSpace?: boolean;
  /** Optional receiver name, surfaced in the lane callout on hover. */
  player?: string;
}

/**
 * One self-contained 360 freeze-frame: a single on-ball moment and everything
 * needed to render it — the event, the ball-carrier, every tracked player, the
 * camera's lit polygon and the actor's passing options. A {@link Moment360} is
 * given a list of these and a picker chooses which one to show.
 */
export interface Moment {
  /** Stable identifier (matched against {@link Moment360Selection.momentId}). */
  id: string;
  /** Short label for the picker, e.g. "Messi · 62'". */
  label: string;
  /** The on-ball event being frozen. */
  event: MomentEvent;
  /** The ball-carrier's position. */
  actor: MomentPoint;
  /** Every other tracked player at the instant of the freeze-frame. */
  players: MomentPlayer[];
  /**
   * The polygon the broadcast camera tracked — the lit zone. Everything
   * outside it is dimmed and desaturated ("what they saw"). StatsBomb coords.
   */
  visibleArea: MomentPoint[];
  /** Passes the actor could play from this position. */
  passingOptions?: MomentPassingOption[];
  /**
   * Distance (StatsBomb units, ~metres) within which an opponent is treated as
   * covering a receiver, when coverage is computed. Defaults to 6.5.
   */
  coverRadius?: number;
}

/**
 * The Moment ("The Moment") block's full user-selectable state: which freeze-
 * frame is shown. Keyed on the stable {@link Moment.id}; `null` opens on the
 * first moment (the default). Seed it via {@link Moment360Props.initialSelection}
 * and observe changes via {@link Moment360Props.onSelectionChange}.
 */
export interface Moment360Selection {
  /** Selected moment id (matches a {@link Moment.id}), or `null` for the first moment. */
  momentId: string | null;
}

export interface Moment360Props {
  /** One or more freeze-frames to step through; the first is shown by default. */
  moments: Moment[];
  /** Home accent. Defaults to BTL home red. */
  homeColor?: string;
  /** Away accent. Defaults to BTL away blue. */
  awayColor?: string;
  /** Optional team crest URL, shown ~16px next to the title. */
  crestUrl?: string;
  /** Additional CSS classes on the outer panel. */
  className?: string;
  /**
   * BTL wordmark for the footer colophon. A design-system-aware host (the
   * editor) passes the real `BtlWordmark`; omitted in Storybook/standalone,
   * where the footer falls back to viz's inlined replica.
   */
  wordmark?: ReactNode;
  /**
   * Optional builder-only controls (e.g. the editor's match picker) rendered in
   * the footer colophon row, to the LEFT of the wordmark. Purely additive: the
   * reader path passes nothing and the footer is unchanged. Forwarded straight
   * to {@link PanelFooter}.
   */
  builderControls?: ReactNode;
  /**
   * Seeds which moment is shown on mount (e.g. the author's saved choice). When
   * omitted, opens on the first moment — exactly as before. Read once on mount;
   * later changes don't re-seed.
   */
  initialSelection?: Moment360Selection;
  /**
   * Fires whenever the user picks a different moment, with the full new
   * selection object. When omitted, no-op (today's behaviour).
   */
  onSelectionChange?: (selection: Moment360Selection) => void;
}

const HOME_COLOR = '#eb0000';
const AWAY_COLOR = '#0091eb';

// Stable empty fallbacks for the no-moment case — referencing the same array
// identity each render keeps the freeze-frame `useMemo` deps from churning.
const EMPTY_PLAYERS: MomentPlayer[] = [];
const EMPTY_AREA: MomentPoint[] = [];
const EMPTY_OPTIONS: MomentPassingOption[] = [];

// StatsBomb pitch is 120 (x) × 80 (y); the Pitch primitive is 100 × 100.
const SB_X = 120;
const SB_Y = 80;

/** Normalise a StatsBomb point to 0–100 pitch coords, mirroring the away side. */
function toPitch(p: MomentPoint, team: MomentTeam): { x: number; y: number } {
  const px = finite((p.x * 100) / SB_X);
  const py = finite((p.y * 100) / SB_Y);
  // Home attacks left→right (keep). Away attacks right→left (mirror both axes
  // so the camera geometry reads coherently toward the goal being attacked).
  return team === 'home' ? { x: px, y: py } : { x: 100 - px, y: 100 - py };
}

/** Build an SVG polygon point string from normalised points. */
function toPolygon(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

// Settle choreography (seconds): the lit area + world ease to their resting
// opacity, the actor settles, and the in-space halo blooms. These are now pure
// enhancement on top of an already-visible first paint (initial={false}); no
// element's base visibility depends on the choreography running.
const T_AREA = 0.9;
const T_FIELD = 0.5;
const T_PLAYER_BASE = 0.95;
const T_LANES = 1.7;

/**
 * The Moment — a cinematic 360 freeze-frame on the BTL dark surface, in the
 * same quiet panel as the Shot map. The still the broadcast camera held is
 * reframed as "what the player saw": the tracked camera polygon is the lit
 * zone, everything outside it dimmed and desaturated. Team-mates wear the team
 * colour, opponents cool grey, the keeper is ringed, and the ball-carrier (a
 * circular headshot when a photo is supplied, otherwise a pulsing dot) holds
 * the ball at their feet. Dashed passing lanes fan out to the actor's options —
 * the runs in behind glow and halo, the covered balls stay faint. Hovering a
 * lane emphasises it.
 */
export function Moment360({
  moments,
  homeColor = HOME_COLOR,
  awayColor = AWAY_COLOR,
  crestUrl,
  className,
  wordmark,
  builderControls,
  initialSelection,
  onSelectionChange,
}: Moment360Props) {
  const maskId = useId();
  const desatId = useId();
  const glowId = useId();
  const actorClipId = useId();
  const [hoverLane, setHoverLane] = useState<number | null>(null);
  // Flips when the actor headshot 404s, so it falls back to the accent dot.
  const [actorPhotoFailed, setActorPhotoFailed] = useState(false);

  // Consolidated selection (seeded by the host, emits every change): which
  // freeze-frame is shown. `null` = the first moment (the default).
  const [selection, setSelection] = usePersistedSelection<Moment360Selection>(
    initialSelection,
    { momentId: null },
    onSelectionChange
  );
  const { momentId } = selection;

  // Resolve the selected moment (fall back to the first); everything below
  // renders this single frame. `moment` can be undefined when `moments` is empty
  // — guarded after the hooks so hook order stays stable.
  const moment = useMemo(
    () => moments.find((m) => m.id === momentId) ?? moments[0],
    [moments, momentId]
  );

  // Pull the selected frame's fields out (with safe fallbacks) so the hooks
  // below run unconditionally — the empty-`moments` case is guarded after them,
  // keeping hook order stable. When a frame is present these are exactly the
  // values the single-moment props used to carry.
  const event = moment?.event;
  const team: MomentTeam = event?.team ?? 'home';
  const actor = moment?.actor;
  const players = moment?.players ?? EMPTY_PLAYERS;
  const visibleArea = moment?.visibleArea ?? EMPTY_AREA;
  const passingOptions = moment?.passingOptions ?? EMPTY_OPTIONS;
  const coverRadius = moment?.coverRadius ?? 6.5;

  const accent = team === 'home' ? homeColor : awayColor;

  const origin = useMemo(() => (actor ? toPitch(actor, team) : { x: 50, y: 50 }), [actor, team]);

  const litPolygon = useMemo(
    () => toPolygon(visibleArea.map((p) => toPitch(p, team))),
    [visibleArea, team]
  );

  // Opponents in the freeze-frame (outfield, not the keeper) — used to decide
  // whether each passing option's receiver is covered.
  const opponents = useMemo(() => players.filter((p) => !p.teammate && !p.keeper), [players]);

  const lanes = useMemo(
    () =>
      passingOptions.map((opt) => {
        // Covered = an opponent within coverRadius of the receiver; otherwise in
        // space. The author can override with an explicit `inSpace` (e.g. a run
        // in behind the line that a pure distance check would miss).
        const nearest = opponents.reduce(
          (min, o) => Math.min(min, Math.hypot(opt.x - o.x, opt.y - o.y)),
          Infinity
        );
        const inSpace = opt.inSpace ?? nearest >= coverRadius;
        return { opt, target: toPitch(opt, team), inSpace };
      }),
    [passingOptions, team, opponents, coverRadius]
  );

  const spaceCount = useMemo(() => lanes.filter((l) => l.inSpace).length, [lanes]);

  // Picker options + the selected frame's label (mirrors the goal-sequence
  // header dropdown). The picker only renders when there's more than one frame.
  const momentOptions = moments.map((m) => ({ value: m.id, label: m.label }));

  // Nothing to render without a moment (empty list) — render nothing, like the
  // other selectable blocks guard their empty case. All hooks have run above.
  if (!moment || !event || !actor) return null;

  // Quiet caption under the title: who, when, what they were doing.
  const caption = `${event.player} · ${event.minute}' · ${event.type}`;

  // The hovered lane's callout is painted last (section 6 below) so it always
  // sits above the actor headshot and every marker, never hidden behind them.
  const hovered = hoverLane !== null ? lanes[hoverLane] : undefined;

  return (
    <figure
      // Inter-first sans (product decision): opt out of the host page's
      // editorial serif so all block text/labels/ticks render in Inter.
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: title (+ optional crest) and a quiet caption on the left, an
          optional moment picker on the right (shown only with >1 moment). */}
      <figcaption className="mb-3 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {crestUrl && <Crest url={crestUrl} className="shrink-0 rounded-none" />}
          <span className="text-[13px] font-semibold tracking-tight text-white">The Moment</span>
          <span className="truncate text-[11px] tabular-nums text-white/45">{caption}</span>
        </span>

        {momentOptions.length > 1 && (
          <ControlDropdown label="Moment" valueLabel={moment.label}>
            {(close) =>
              momentOptions.map((o) => (
                <DropdownItem
                  key={o.value}
                  selected={o.value === moment.id}
                  onSelect={() => {
                    setSelection({ momentId: o.value });
                    close();
                  }}
                >
                  {o.label}
                </DropdownItem>
              ))
            }
          </ControlDropdown>
        )}
      </figcaption>

      {/* The freeze-frame still. `padding` insets the pitch inside the frame so
          an actor headshot or a player marker sitting ON the goal line / touchline
          (e.g. a shooter right on the byline, the lone bottom-corner dot) renders
          fully instead of being clipped at the block edge. ~6 units clears the
          actor's headshot bubble (r 2.4) and its breathing pulse ring.
          RevealOnScroll plays the entrance when the block scrolls into view (pure
          enhancement — the freeze-frame is always visible regardless). */}
      <RevealOnScroll className="relative">
        <Pitch variant="full" theme="dark" padding={6}>
          <defs>
            {/* Clip: the lit zone the camera tracked. */}
            <clipPath id={maskId}>
              <polygon points={litPolygon} />
            </clipPath>
            {/* Clip: the actor's circular headshot. */}
            <clipPath id={actorClipId}>
              <circle cx={origin.x} cy={origin.y} r={2.4} />
            </clipPath>
            {/* Desaturate filter for the out-of-shot world. */}
            <filter id={desatId}>
              <feColorMatrix type="saturate" values="0" />
            </filter>
            {/* Soft bloom for in-space receivers + the live ball. */}
            <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="1.3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* (1) Out-of-shot world: every player rendered cool + dim, drawn
              first so the lit overlay sits on top. The whole layer is
              desaturated. */}
          <motion.g
            filter={`url(#${desatId})`}
            initial={false}
            animate={{ opacity: 0.16 }}
            transition={{ duration: T_FIELD, ease: 'easeOut' }}
            style={{ pointerEvents: 'none' }}
          >
            {players.map((pl, i) => {
              const p = toPitch(pl, event.team);
              return (
                <circle key={`dim-${i}`} cx={p.x} cy={p.y} r={1.3} fill="white" opacity={0.7} />
              );
            })}
          </motion.g>

          {/* (2) The lit zone: a faint warm wash + crisp edge marking the
              camera's tracked area. Visible on first paint (no entrance gate). */}
          <motion.g
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: T_AREA, ease: 'easeOut' }}
            style={{ pointerEvents: 'none' }}
          >
            <polygon
              points={litPolygon}
              fill="white"
              fillOpacity={0.035}
              stroke="white"
              strokeOpacity={0.14}
              strokeWidth={0.3}
              strokeDasharray="1.6 1.4"
            />
          </motion.g>

          {/* (3) Players inside the lit zone — full colour, clipped to the lit
              polygon so only the tracked actors are bright. Staggered reveal. */}
          <g clipPath={`url(#${maskId})`}>
            {players.map((pl, i) => {
              const p = toPitch(pl, event.team);

              if (pl.keeper) {
                return (
                  <motion.g
                    key={`lit-${i}`}
                    initial={false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, ease: 'backOut' }}
                    style={{ transformOrigin: `${p.x}px ${p.y}px`, pointerEvents: 'none' }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={1.7}
                      fill="none"
                      stroke="white"
                      strokeWidth={0.5}
                      opacity={0.9}
                    />
                    <circle cx={p.x} cy={p.y} r={0.8} fill="white" opacity={0.9} />
                  </motion.g>
                );
              }

              // Team-mates in team colour; opponents cool white/grey.
              return (
                <motion.circle
                  key={`lit-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={pl.teammate ? 1.5 : 1.4}
                  fill={pl.teammate ? accent : '#c9d4de'}
                  fillOpacity={pl.teammate ? 0.95 : 0.7}
                  stroke={pl.teammate ? 'white' : 'none'}
                  strokeWidth={pl.teammate ? 0.3 : 0}
                  strokeOpacity={0.6}
                  initial={false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: 'backOut' }}
                  style={{ transformOrigin: `${p.x}px ${p.y}px`, pointerEvents: 'none' }}
                />
              );
            })}
          </g>

          {/* (4) Passing lanes — drawn last, after the players have settled. */}
          <g>
            {lanes.map(({ opt, target, inSpace }, i) => {
              const isHover = hoverLane === i;
              const dimmedByHover = hoverLane !== null && !isHover;
              const live = inSpace;
              const laneColor = live ? accent : 'white';
              const baseOpacity = live ? 0.7 : 0.32;
              const opacity = dimmedByHover ? 0.14 : isHover ? 1 : baseOpacity;

              return (
                <motion.g
                  key={`lane-${i}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Pass to ${
                    opt.player ? opt.player : `option ${i + 1}`
                  }${live ? ', in space' : ', covered'}`}
                  className="cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHoverLane(i)}
                  onMouseLeave={() => setHoverLane(null)}
                  onFocus={() => setHoverLane(i)}
                  onBlur={() => setHoverLane(null)}
                  initial={false}
                  animate={{ opacity }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  {/* Invisible continuous hit area: a fat band the length of the
                      lane plus the receiver, so the pointer never drops into the
                      dashed-line gaps (which caused enter/leave flicker). */}
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="transparent"
                    strokeWidth={3.6}
                    strokeLinecap="round"
                    style={{ pointerEvents: 'stroke' }}
                  />
                  <circle
                    cx={target.x}
                    cy={target.y}
                    r={3.8}
                    fill="transparent"
                    style={{ pointerEvents: 'all' }}
                  />

                  {/* Soft "space" halo behind an in-space receiver. */}
                  {live && (
                    <motion.circle
                      cx={target.x}
                      cy={target.y}
                      r={3.4}
                      fill={accent}
                      filter={`url(#${glowId})`}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{
                        opacity: isHover ? 0.32 : 0.18,
                        scale: 1,
                      }}
                      transition={{
                        duration: 0.6,
                        ease: 'easeOut',
                        delay: isHover ? 0 : T_LANES + i * 0.12 + 0.1,
                      }}
                      style={{ transformOrigin: `${target.x}px ${target.y}px` }}
                    />
                  )}

                  {/* The lane itself — dashed, from actor to receiver. No
                      `pathLength` animation: framer-motion drives pathLength via
                      strokeDasharray, which would clobber this literal dash. The
                      lane is present on first paint (the receiver + lane are the
                      core "passing option" content). */}
                  <line
                    x1={origin.x}
                    y1={origin.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={laneColor}
                    strokeWidth={isHover ? 0.6 : live ? 0.5 : 0.35}
                    strokeOpacity={0.95}
                    strokeLinecap="round"
                    strokeDasharray="1.4 1.3"
                  />

                  {/* Receiver node at the lane's end. */}
                  <circle
                    cx={target.x}
                    cy={target.y}
                    r={live ? 1.3 : 1}
                    fill={live ? accent : 'none'}
                    fillOpacity={0.95}
                    stroke={live ? 'white' : laneColor}
                    strokeWidth={0.35}
                    strokeOpacity={live ? 0.7 : 0.6}
                  />
                </motion.g>
              );
            })}
          </g>

          {/* (5) The actor — ball-carrier, highlighted with a subtle pulse and
              the ball at their feet. A circular headshot when a photo is
              supplied, otherwise the accent dot. Sits above everything. */}
          <motion.g
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'backOut' }}
            style={{ transformOrigin: `${origin.x}px ${origin.y}px`, pointerEvents: 'none' }}
          >
            {/* Slow breathing pulse ring. Animates `scale` (a transform), NOT the
                `r` attribute: animating an SVG geometry attribute like `r` via
                `animate` makes framer-motion take over the attribute, and on the
                transition's setup frame it resolves to `undefined` before the
                keyframes apply — React then renders `r="undefined"` for a frame
                (the `<circle> attribute r: Expected length, "undefined"` dev
                warning). A static `r` + an animated `scale` keeps `r` fixed and
                is also cheaper. Scale 1→1.75 reaches the same 4.2 outer radius
                (2.4 × 1.75 = 4.2); `transformOrigin` pins the swell to the
                ring's centre. Matches every other ring/halo in the package. */}
            <motion.circle
              cx={origin.x}
              cy={origin.y}
              r={2.4}
              fill="none"
              stroke={accent}
              strokeWidth={0.4}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.75], opacity: [0.5, 0] }}
              transition={{
                duration: 2.4,
                ease: 'easeOut',
                repeat: Infinity,
                repeatDelay: 0.4,
                delay: T_PLAYER_BASE + 0.3,
              }}
              style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
            />
            {/* Actor marker — headshot photo clipped to the circle, or the
                accent dot when no photo is supplied or the photo fails to load. */}
            {event.imageUrl && !actorPhotoFailed ? (
              <>
                <circle cx={origin.x} cy={origin.y} r={2.4} fill={accent} />
                <image
                  href={event.imageUrl}
                  x={origin.x - 2.4}
                  y={origin.y - 2.4}
                  width={4.8}
                  height={4.8}
                  clipPath={`url(#${actorClipId})`}
                  preserveAspectRatio="xMidYMid slice"
                  onError={() => setActorPhotoFailed(true)}
                  style={{ pointerEvents: 'none' }}
                />
                <circle
                  cx={origin.x}
                  cy={origin.y}
                  r={2.4}
                  fill="none"
                  stroke="white"
                  strokeWidth={0.5}
                  strokeOpacity={0.95}
                />
              </>
            ) : (
              <circle
                cx={origin.x}
                cy={origin.y}
                r={2}
                fill={accent}
                stroke="white"
                strokeWidth={0.5}
                filter={`url(#${glowId})`}
              />
            )}
            {/* The ball at the carrying foot — a small football. */}
            <Football cx={origin.x + 1.9} cy={origin.y + 1.6} r={1.15} />
          </motion.g>

          {/* (6) Hover callout — painted last of all, so it always sits above
              the actor headshot and every marker, never clipped behind them. */}
          {hovered && (
            <LaneCallout
              x={hovered.target.x}
              y={hovered.target.y}
              label={
                hovered.opt.player ? surname(hovered.opt.player) : `Option ${(hoverLane ?? 0) + 1}`
              }
              sub={hovered.inSpace ? 'In space' : 'Covered'}
              color={hovered.inSpace ? accent : 'white'}
            />
          )}
        </Pitch>
      </RevealOnScroll>

      {/* Legend — small data dots + plain words. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/90">
        <LegendDot color={accent} label="Team-mate" />
        <LegendDot color="#c9d4de" label="Opponent" ring />
        <LegendDot color="transparent" label="Keeper" hollow />
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-px w-4"
            style={{
              backgroundImage: `repeating-linear-gradient(to right, ${accent} 0 3px, transparent 3px 5px)`,
            }}
          />
          <span>{spaceCount > 0 ? `In-space pass (${spaceCount})` : 'In-space pass'}</span>
        </span>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} builderControls={builderControls} />
    </figure>
  );
}

/** A small football — white with a central dark pentagon and short seams. */
function Football({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const rp = r * 0.42; // central pentagon radius
  const verts = Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return { x: cx + rp * Math.cos(a), y: cy + rp * Math.sin(a), a };
  });
  const pentPoints = verts.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#0a0a0a" strokeWidth={0.14} />
      <polygon points={pentPoints} fill="#0a0a0a" />
      {verts.map((v, i) => (
        <line
          key={i}
          x1={v.x}
          y1={v.y}
          x2={cx + r * 0.95 * Math.cos(v.a)}
          y2={cy + r * 0.95 * Math.sin(v.a)}
          stroke="#0a0a0a"
          strokeWidth={0.14}
        />
      ))}
    </g>
  );
}

/** Small data key: a colour dot + a plain label. */
function LegendDot({
  color,
  label,
  ring = false,
  hollow = false,
}: {
  color: string;
  label: string;
  ring?: boolean;
  hollow?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block size-2 rounded-full"
        style={{
          backgroundColor: hollow ? 'transparent' : color,
          border: hollow
            ? '1px solid rgba(255,255,255,0.85)'
            : ring
              ? '1px solid rgba(255,255,255,0.5)'
              : 'none',
        }}
      />
      <span>{label}</span>
    </span>
  );
}

/** Floating callout at a passing lane's receiver: name + space state. */
function LaneCallout({
  x,
  y,
  label,
  sub,
  color,
}: {
  x: number;
  y: number;
  label: string;
  sub: string;
  color: string;
}) {
  const w = 26;
  const h = 9.5;
  const gap = 2.6;
  // Place the card to the right of the receiver (open pitch, clear of the
  // ball-carrier) unless it would overflow the right edge — only then flip
  // left. Flip down near the top edge.
  const flipX = x + gap + w > 100;
  const flipY = y < 16;
  const boxX = flipX ? x - w - gap : x + gap;
  const boxY = flipY ? y + gap : y - h - gap;

  return (
    <motion.g
      initial={{ opacity: 0, y: 1.2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ pointerEvents: 'none' }}
    >
      <rect
        x={boxX}
        y={boxY}
        width={w}
        height={h}
        rx={1.2}
        fill="#0a0a0a"
        fillOpacity={0.92}
        stroke={color}
        strokeOpacity={0.55}
        strokeWidth={0.3}
      />
      {/* Accent tick. */}
      <rect x={boxX} y={boxY} width={0.9} height={h} rx={0.4} fill={color} />
      <text x={boxX + 2.2} y={boxY + 3.7} fontSize={2.6} fontWeight="bold" fill="white">
        {label}
      </text>
      <text x={boxX + 2.2} y={boxY + 7} fontSize={2} fill="white" fillOpacity={0.55}>
        {sub}
      </text>
    </motion.g>
  );
}

// ── Share-menu-style dropdown ────────────────────────────────────────────────
// Mirrors the goal-sequence / shot-map blocks' self-contained ControlDropdown
// (viz is a standalone AGPL package with no design-system dependency; the
// classes match the editor's game-block kit).
const TRIGGER_CLS =
  'flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white transition-colors hover:border-white/25';
const CONTENT_CLS =
  'absolute right-0 top-[calc(100%+6px)] z-50 flex min-w-[150px] flex-col gap-0.5 rounded-[8px] border border-white/10 bg-[#161616]/95 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl';

function ControlDropdown({
  label,
  valueLabel,
  children,
}: {
  label: string;
  valueLabel: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={TRIGGER_CLS}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <span className="text-white/50">{label}</span>
        <span className="font-semibold">{valueLabel}</span>
        <Caret />
      </button>
      {open && (
        <div role="listbox" className={CONTENT_CLS}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()} // keep trigger focus so blur-close doesn't beat the click
      onClick={onSelect}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-[6px] px-2.5 py-1.5 text-left text-[12px] text-white transition-colors hover:bg-white/[0.06]"
    >
      <span className="truncate">{children}</span>
      {selected && <Check />}
    </button>
  );
}

/** Tiny caret glyph (no icon dependency in this package). */
function Caret() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" className="text-white/40">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tiny check glyph for the selected dropdown row. */
function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-[#eb0000]">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

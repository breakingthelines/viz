import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { surname } from '#/football/lib/player-name';
import { PanelFooter } from '#/football/lib/panel-footer';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { SvgHeadshot } from '#/football/lib/headshot';
import { finite } from '#/football/lib/finite';

/** Which kind of dead-ball the freeze-frame is taken from. */
export type SetPieceKind = 'corner' | 'free-kick';

/**
 * Delivery flight. An inswinger bends toward the goal mouth, an outswinger away
 * from it. Defaults to inswinger when unset (the common, dangerous corner).
 */
export type SetPieceSwing = 'in' | 'out';

/** Which side a player is on for a given set piece. */
export type SetPieceTeam = 'attacking' | 'defending';

/** A single freeze-frame actor, in StatsBomb 120×80 pitch coordinates. */
export interface SetPiecePlayer {
  /** StatsBomb x (0–120), own goal line → the goal the attacking side targets. */
  x: number;
  /** StatsBomb y (0–80), left touchline → right. */
  y: number;
  /** Side this actor is on. */
  team: SetPieceTeam;
  /** True for the goalkeeper (ringed, regardless of side). */
  keeper?: boolean;
  /** Display name. Used for the headshot monogram + marking labels. */
  name?: string;
  /** Headshot URL. Rendered as a circular photo for the taker / target (monogram fallback). */
  imageUrl?: string;
  /** True for the player taking the delivery (headshot, sits out by the flag/spot). */
  isTaker?: boolean;
  /** True for the key target attacking the delivery (headshot, highlighted). */
  isTarget?: boolean;
}

/** One dead-ball freeze-frame around the box. */
export interface SetPiece {
  /** Stable identifier. */
  id: string;
  /** Short label for the switcher, e.g. "73' Corner". */
  label: string;
  /** Corner or free-kick. */
  kind: SetPieceKind;
  /** Delivery flight; defaults to an inswinger (bends toward the goal mouth). */
  swing?: SetPieceSwing;
  /** Where the delivery is struck from (StatsBomb 120×80). */
  deliveryFrom: { x: number; y: number };
  /** Where the delivery is aimed (the target zone, StatsBomb 120×80). */
  deliveryTo: { x: number; y: number };
  /** Attackers + defenders + GK in and around the box. */
  players: SetPiecePlayer[];
}

export interface SetPieceProps {
  /** The set pieces to step through (one shown at a time). */
  setPieces: SetPiece[];
  /** Attacking-side accent. Defaults to BTL home red. */
  attackingColor?: string;
  /** Defending-side colour. Defaults to a neutral grey. */
  defendingColor?: string;
  /** Id of the set piece to show. Controlled when paired with `onSelect`. */
  activeId?: string;
  /** Notified when the in-block switcher changes the active set piece. */
  onSelect?: (id: string) => void;
  /** Additional CSS classes on the outer panel. */
  className?: string;
  /**
   * BTL wordmark for the footer colophon. A design-system-aware host (the
   * editor) passes the real `BtlWordmark`; omitted in Storybook/standalone,
   * where the footer falls back to viz's inlined replica.
   */
  wordmark?: ReactNode;
}

const ATTACKING_COLOR = '#eb0000';
const DEFENDING_COLOR = '#7d7d83';

// StatsBomb pitch is 120 (x) × 80 (y); the Pitch primitive is 100 × 100.
const SB_X = 120;
const SB_Y = 80;

interface Pt {
  x: number;
  y: number;
}

/**
 * Normalise a StatsBomb point onto the 0–100 pitch. The attacking side always
 * targets the right-hand goal (x→120 → x→100), so the `half` viewBox frames the
 * defended penalty box. The y-axis (touchline) maps straight through.
 */
function toPitch(x: number, y: number): Pt {
  return { x: finite((x * 100) / SB_X), y: finite((y * 100) / SB_Y) };
}

const KIND_LABEL: Record<SetPieceKind, string> = {
  corner: 'Corner',
  'free-kick': 'Free-kick',
};

/**
 * Set-piece freeze-frame — an interactive read of a corner or free-kick around
 * the box, styled to sit quietly next to the Shot map and Lineup builder on the
 * BTL dark surface. The defended penalty area is framed by the half-pitch; the
 * attacking side is rendered in team colour against grey defenders (the keeper
 * ringed). A curved delivery arc draws in from the flag/spot to the target zone,
 * and faint marking lines (defender → nearest attacker) show who is picked up
 * and who is free. The taker and the key target render as circular headshots; a
 * clean dropdown steps between set pieces.
 */
export function SetPiece({
  setPieces,
  attackingColor = ATTACKING_COLOR,
  defendingColor = DEFENDING_COLOR,
  activeId: activeIdProp,
  onSelect,
  className,
  wordmark,
}: SetPieceProps) {
  const first = setPieces[0];

  // Active set piece is controllable; falls back to local state for a standalone block.
  const [activeIdState, setActiveIdState] = useState<string | undefined>(first?.id);
  const activeId = activeIdProp ?? activeIdState;
  const setActiveId = (next: string) => {
    if (activeIdProp === undefined) setActiveIdState(next);
    onSelect?.(next);
  };

  const active = useMemo(
    () => setPieces.find((sp) => sp.id === activeId) ?? first,
    [setPieces, activeId, first]
  );

  // Defender → nearest attacker marking pairs (outfield only), in pitch coords.
  const markingLines = useMemo(() => {
    if (!active) return [];
    const attackers = active.players
      .filter((p) => p.team === 'attacking' && !p.keeper && !p.isTaker)
      .map((p) => toPitch(p.x, p.y));
    if (attackers.length === 0) return [];

    return active.players
      .filter((p) => p.team === 'defending' && !p.keeper)
      .map((d) => {
        const from = toPitch(d.x, d.y);
        let nearest = attackers[0]!;
        let best = Infinity;
        for (const a of attackers) {
          const dist = (a.x - from.x) ** 2 + (a.y - from.y) ** 2;
          if (dist < best) {
            best = dist;
            nearest = a;
          }
        }
        // A defender is "free of" an attacker once the nearest is far away — fade
        // those lines so tight marking reads as the strong signal.
        const slack = Math.min(1, Math.sqrt(best) / 18);
        return { from, to: nearest, opacity: 0.42 * (1 - slack) + 0.06 };
      });
  }, [active]);

  if (!active) {
    return null;
  }

  const options = setPieces.map((sp) => ({ value: sp.id, label: sp.label }));
  const valueLabel = options.find((o) => o.value === active.id)?.label ?? active.label;

  const from = toPitch(active.deliveryFrom.x, active.deliveryFrom.y);
  const to = toPitch(active.deliveryTo.x, active.deliveryTo.y);

  // The delivery is rendered fresh per set piece so the draw-in replays on switch.
  return (
    <div
      // Inter-first sans (product decision): opt out of the host page's
      // editorial serif so all block text/labels/ticks render in Inter.
      style={{ fontFamily: BLOCK_FONT_STACK }}
      className={cn(
        'my-6 rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + clean set-piece switcher. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Set piece</span>
        <ControlDropdown label="Showing" valueLabel={valueLabel}>
          {(close) =>
            options.map((o) => (
              <DropdownItem
                key={o.value}
                selected={o.value === active.id}
                onSelect={() => {
                  setActiveId(o.value);
                  close();
                }}
              >
                {o.label}
              </DropdownItem>
            ))
          }
        </ControlDropdown>
      </div>

      {/* Pitch + freeze-frame. Keyed on the active id so the reveal + arc replay. */}
      <div className="relative">
        <Pitch key={active.id} variant="half" theme="dark">
          {/* Marking lines sit beneath the players. */}
          <g style={{ pointerEvents: 'none' }}>
            {markingLines.map((m, i) => (
              <motion.line
                key={`mark-${i}`}
                x1={m.from.x}
                y1={m.from.y}
                x2={m.to.x}
                y2={m.to.y}
                stroke="white"
                strokeWidth={0.3}
                strokeDasharray="1.1 1"
                initial={{ opacity: 0 }}
                animate={{ opacity: m.opacity }}
                transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
              />
            ))}
          </g>

          {/* Players — staggered fade/scale-in. */}
          {active.players.map((player, i) => (
            <PlayerNode
              key={`p-${i}`}
              player={player}
              index={i}
              attackingColor={attackingColor}
              defendingColor={defendingColor}
            />
          ))}

          {/* Delivery arc, drawn last so it sweeps over the frame. */}
          <DeliveryArc
            from={from}
            to={to}
            kind={active.kind}
            swing={active.swing ?? 'in'}
            color={attackingColor}
            delay={0.15 + active.players.length * 0.04 + 0.1}
          />
        </Pitch>
      </div>

      {/* Key — small data dots + the set-piece kind. */}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/90">
        <Key color={attackingColor} label="Attacking" />
        <Key color={defendingColor} label="Defending" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full ring-1 ring-white/70" />
          <span className="truncate">Keeper</span>
        </span>
        <span className="ml-auto tabular-nums text-white/70">{KIND_LABEL[active.kind]}</span>
      </div>

      <PanelFooter provider="statsbomb" wordmark={wordmark} />
    </div>
  );
}

/** Small data key: a colour dot + a label. */
function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * A single freeze-frame player. The taker and the key target render as circular
 * headshots (monogram fallback); everyone else is a dot. The keeper is ringed,
 * the target carries a soft highlight bloom.
 */
function PlayerNode({
  player,
  index,
  attackingColor,
  defendingColor,
}: {
  player: SetPiecePlayer;
  index: number;
  attackingColor: string;
  defendingColor: string;
}) {
  const p = toPitch(player.x, player.y);
  const color = player.team === 'attacking' ? attackingColor : defendingColor;
  const isHeadshot = Boolean(player.isTaker || player.isTarget);
  // Headshots read larger; plain actors are compact dots.
  const r = isHeadshot ? 3.4 : 1.7;

  return (
    <motion.g
      role="img"
      aria-label={player.name ?? (player.team === 'attacking' ? 'Attacker' : 'Defender')}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, delay: index * 0.04, ease: 'backOut' }}
      style={{ transformOrigin: `${p.x}px ${p.y}px`, pointerEvents: 'none' }}
    >
      {/* Target highlight bloom. */}
      {player.isTarget && (
        <circle
          cx={p.x}
          cy={p.y}
          r={r + 2.4}
          fill={color}
          opacity={0.22}
          style={{ filter: 'blur(1.1px)' }}
        />
      )}

      {isHeadshot ? (
        // Headshot actor: the photo, or a filled disc + monogram when no photo
        // is supplied or the supplied one fails to load.
        <SvgHeadshot
          cx={p.x}
          cy={p.y}
          r={r}
          name={player.name ?? '?'}
          imageUrl={player.imageUrl}
          color={color}
          ringColor={color}
          ringWidth={0.6}
          monogramFill="white"
          monogramSizeRatio={0.85}
          fallbackStroke="white"
          fallbackStrokeWidth={0.3}
        />
      ) : player.keeper ? (
        // Keeper — a ringed dot, in the defending colour by default.
        <>
          <circle
            cx={p.x}
            cy={p.y}
            r={r}
            fill="none"
            stroke="white"
            strokeWidth={0.5}
            opacity={0.9}
          />
          <circle cx={p.x} cy={p.y} r={r * 0.5} fill="white" opacity={0.9} />
        </>
      ) : (
        // Plain outfield actor — a compact filled dot.
        <circle
          cx={p.x}
          cy={p.y}
          r={r}
          fill={color}
          fillOpacity={player.team === 'attacking' ? 0.92 : 0.7}
          stroke={player.team === 'attacking' ? 'white' : color}
          strokeWidth={0.3}
          strokeOpacity={0.8}
        />
      )}

      {/* Surname label under the headshot players. */}
      {isHeadshot && player.name && (
        <text
          x={p.x}
          y={p.y + r + 2.6}
          textAnchor="middle"
          fill="white"
          fontSize="2.3"
          fontWeight="600"
          opacity={0.9}
        >
          {surname(player.name)}
        </text>
      )}
    </motion.g>
  );
}

/**
 * The delivery: a curved, animated arc from the flag/spot to the target zone.
 * The control point is offset perpendicular to the straight line so the ball
 * bends. An inswinger bows toward the goal mouth, an outswinger away from it —
 * picked by comparing the two perpendicular control points to the goal, not by
 * a fixed axis (which used to bow corners off the pitch). The path strokes
 * itself in via `pathLength`, with a small ball riding the end.
 */
function DeliveryArc({
  from,
  to,
  kind,
  swing,
  color,
  delay,
}: {
  from: Pt;
  to: Pt;
  kind: SetPieceKind;
  swing: SetPieceSwing;
  color: string;
  delay: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Unit normal to the delivery line.
  const nx = -dy / len;
  const ny = dx / len;
  // Corners whip harder than free-kicks.
  const bend = (kind === 'corner' ? 0.3 : 0.2) * len;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  // The attacking side targets the right-hand goal mouth (pitch x=100, y=50).
  const GOAL_X = 100;
  const GOAL_Y = 50;
  // Two candidate control points, perpendicular to either side of the line.
  const cA = { x: midX + nx * bend, y: midY + ny * bend };
  const cB = { x: midX - nx * bend, y: midY - ny * bend };
  const distToGoal = (p: Pt) => (p.x - GOAL_X) ** 2 + (p.y - GOAL_Y) ** 2;
  const toward = distToGoal(cA) <= distToGoal(cB) ? cA : cB;
  const away = toward === cA ? cB : cA;
  const ctrl = swing === 'out' ? away : toward;
  // Clamp into the pitch so the bow never sweeps off-frame.
  const mx = Math.max(0, Math.min(100, ctrl.x));
  const my = Math.max(0, Math.min(100, ctrl.y));
  const d = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Spot marker at the flag / dead-ball point. */}
      <motion.circle
        cx={from.x}
        cy={from.y}
        r={0.8}
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 0.2, delay: delay - 0.1 }}
      />
      {/* The drawn arc. */}
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={0.6}
        strokeLinecap="round"
        strokeDasharray="1.6 1.3"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.95 }}
        transition={{
          pathLength: { duration: 0.7, delay, ease: 'easeInOut' },
          opacity: { duration: 0.2, delay },
        }}
      />
      {/* Ball arriving at the target zone. */}
      <motion.circle
        cx={to.x}
        cy={to.y}
        r={1}
        fill="white"
        stroke={color}
        strokeWidth={0.4}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, delay: delay + 0.6, ease: 'backOut' }}
        style={{ transformOrigin: `${to.x}px ${to.y}px` }}
      />
    </g>
  );
}

// ── Share-menu-style dropdown ────────────────────────────────────────────────
// Mirrors the Shot map / editor game-block ControlDropdown (anchored trigger +
// glass content). Self-contained because viz is a standalone AGPL package with
// no design-system dependency; the classes match the kit.
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
    <div className="relative">
      <button
        type="button"
        className={TRIGGER_CLS}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          // Close when focus leaves the dropdown entirely.
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

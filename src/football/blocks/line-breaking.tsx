import { useId, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';

/** A single completed pass, in StatsBomb event coordinates (120×80). */
export interface LineBreakingPass {
  /** Stable identifier. */
  id: string;
  /** Origin x in StatsBomb units (0 = own goal line, 120 = opposition goal line). */
  startX: number;
  /** Origin y in StatsBomb units (0 = left touchline, 80 = right touchline). */
  startY: number;
  /** Destination x in StatsBomb units. */
  endX: number;
  /** Destination y in StatsBomb units. */
  endY: number;
  /**
   * Whether this pass broke a defensive line: it advances ≥10% toward goal and
   * either splits a defender pair or ends behind the opposition back line.
   */
  lineBreaking: boolean;
  /** Passer's display name, shown in the hover callout. */
  player: string;
  /** Passer headshot URL. When set, the hover callout shows the photo (monogram fallback). */
  imageUrl?: string;
  /** Defenders the pass cut through, in StatsBomb units. Flash as the line draws. */
  brokenDefenders: { x: number; y: number }[];
}

export interface LineBreakingProps {
  /** Team display name. */
  team: string;
  /** Team crest URL. When set, a small crest sits before the team name. */
  crestUrl?: string;
  /** Team accent colour for line-breaking passes. Defaults to the home red. */
  color?: string;
  /** Completed passes to plot. */
  passes: LineBreakingPass[];
  /** Additional CSS classes for the outer panel. */
  className?: string;
}

/** StatsBomb pitch is 120 long × 80 wide; the Pitch primitive is 100 × 100. */
const SB_LENGTH = 120;
const SB_WIDTH = 80;
const normX = (x: number) => (x * 100) / SB_LENGTH;
const normY = (y: number) => (y * 100) / SB_WIDTH;

type ViewMode = 'all' | 'breaks';

/** Up-to-two initials for the passer monogram ("Enzo Fernández" → "EF"). */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'all', label: 'All passes' },
  { value: 'breaks', label: 'Only line breaks' },
];

/**
 * Line-breaking passes — the brand-defining BTL viz, on the quiet BTL dark
 * surface so it sits next to the Shot map. Completed passes are drawn on a dark
 * editorial pitch: ordinary passes sit faint and quiet, while line-breaking
 * passes ignite in the team colour, drawing through the defensive line with an
 * arrowhead while the defenders they split flash hot red. A clean dropdown
 * isolates the line-breakers; hovering any pass focuses it and its broken
 * defenders and names the passer.
 */
export function LineBreaking({
  team,
  crestUrl,
  color = '#eb0000',
  passes,
  className,
}: LineBreakingProps) {
  const uid = useId();
  const arrowId = `${uid}-arrow`;
  const [mode, setMode] = useState<ViewMode>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const breakCount = useMemo(() => passes.filter((p) => p.lineBreaking).length, [passes]);

  // Ordinary passes draw first (underneath), line-breakers on top so their
  // colour and the defender pulses are never occluded by quiet lines.
  const ordered = useMemo(
    () => [...passes].sort((a, b) => Number(a.lineBreaking) - Number(b.lineBreaking)),
    [passes]
  );

  const hovered = hoveredId ? (passes.find((p) => p.id === hoveredId) ?? null) : null;

  const modeValueLabel = MODE_OPTIONS.find((o) => o.value === mode)?.label ?? 'All passes';

  return (
    <div
      className={cn(
        'my-6 w-full max-w-[640px] rounded-[12px] border border-white/[0.06] bg-white/[0.03] p-4',
        'shadow-[0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[12px] [border-top-color:rgba(255,255,255,0.10)]',
        className
      )}
    >
      {/* Header: one plain title + clean view dropdown. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight text-white">Line breaks</span>
        <ControlDropdown label="Showing" valueLabel={modeValueLabel}>
          {(close) =>
            MODE_OPTIONS.map((o) => (
              <DropdownItem
                key={o.value}
                selected={o.value === mode}
                onSelect={() => {
                  setMode(o.value);
                  close();
                }}
              >
                {o.label}
              </DropdownItem>
            ))
          }
        </ControlDropdown>
      </div>

      {/* Pitch */}
      <div className="relative">
        <Pitch variant="full" theme="dark">
          <defs>
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill={color} />
            </marker>
          </defs>

          {/* Attack-direction cue, low-key. */}
          <text
            x="50"
            y="97"
            textAnchor="middle"
            fill="white"
            fillOpacity="0.22"
            fontSize="2.4"
            letterSpacing="0.6"
          >
            Attacking →
          </text>

          {ordered.map((pass, index) => {
            const visible = mode === 'all' || pass.lineBreaking;
            return (
              <PassLine
                key={pass.id}
                pass={pass}
                visible={visible}
                color={color}
                arrowId={arrowId}
                hoveredId={hoveredId}
                anyHovered={hovered !== null}
                drawIndex={index}
                onHover={setHoveredId}
              />
            );
          })}

          {/* Broken-defender pulses — drawn above the lines, only for
              line-breaking passes; flash on reveal and on hover-focus. */}
          {ordered.map((pass) => {
            if (!pass.lineBreaking) return null;
            const visible = mode === 'all' || pass.lineBreaking;
            const dim = hovered !== null && hoveredId !== pass.id;
            return (
              <BrokenDefenders
                key={`${pass.id}-def`}
                pass={pass}
                visible={visible}
                dim={dim}
                focused={hoveredId === pass.id}
              />
            );
          })}
        </Pitch>

        {/* Hover callout — the passer's name, with an optional headshot. */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#161616]/95 py-1 pl-1 pr-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <PasserAvatar
                name={hovered.player}
                imageUrl={hovered.imageUrl}
                color={hovered.lineBreaking ? color : 'rgba(255,255,255,0.25)'}
              />
              <span className="text-[12px] font-semibold leading-none text-white">
                {hovered.player}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Team key + count read-out — small + plain, mirrors the shot-map team key row. */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-white/60">
        <span className="flex items-center gap-1.5">
          {crestUrl && (
            <img
              src={crestUrl}
              alt=""
              aria-hidden
              width={16}
              height={16}
              className="inline-block size-4 shrink-0 rounded object-contain align-middle"
            />
          )}
          <span className="truncate text-white/80">{team}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="tabular-nums text-white/80">{breakCount}</span>
          <span>line {breakCount === 1 ? 'break' : 'breaks'}</span>
        </span>
      </div>
    </div>
  );
}

/** Small circular passer headshot for the hover callout; monogram fallback. */
function PasserAvatar({
  name,
  imageUrl,
  color,
}: {
  name: string;
  imageUrl?: string;
  color: string;
}) {
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ boxShadow: `inset 0 0 0 1px ${color}` }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-[9px] font-semibold leading-none text-white/70">
          {monogram(name)}
        </span>
      )}
    </span>
  );
}

// ── Share-menu-style dropdown ────────────────────────────────────────────────
// Mirrors the Shot-map block's ControlDropdown (the anchored share-menu trigger
// + glass content). Self-contained here because viz is a standalone AGPL
// package with no design-system dependency; the classes match the kit.
const TRIGGER_CLS =
  'flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white transition-colors hover:border-white/25';
const CONTENT_CLS =
  'absolute right-0 top-[calc(100%+6px)] z-50 flex min-w-[170px] flex-col gap-0.5 rounded-[8px] border border-white/10 bg-[#161616]/95 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl';

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

interface PassLineProps {
  pass: LineBreakingPass;
  visible: boolean;
  color: string;
  arrowId: string;
  hoveredId: string | null;
  anyHovered: boolean;
  drawIndex: number;
  onHover: (id: string | null) => void;
}

function PassLine({
  pass,
  visible,
  color,
  arrowId,
  hoveredId,
  anyHovered,
  drawIndex,
  onHover,
}: PassLineProps) {
  const x1 = normX(pass.startX);
  const y1 = normY(pass.startY);
  const x2 = normX(pass.endX);
  const y2 = normY(pass.endY);

  const isHovered = hoveredId === pass.id;
  const dimmed = anyHovered && !isHovered;
  const breaking = pass.lineBreaking;

  // Opacity: ordinary passes are quiet; line-breakers are confident. Hover
  // focus pushes the active pass forward and pulls the rest back.
  const baseOpacity = breaking ? 0.92 : 0.16;
  const targetOpacity = !visible
    ? 0
    : dimmed
      ? breaking
        ? 0.18
        : 0.05
      : isHovered
        ? 1
        : baseOpacity;

  // Line-breakers draw in (pathLength 0→1) on reveal, staggered; ordinary
  // passes just fade so they don't compete with the headline moment.
  const drawDelay = breaking ? 0.25 + drawIndex * 0.045 : 0;

  return (
    <g
      onMouseEnter={() => visible && onHover(pass.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: visible ? 'pointer' : 'default' }}
    >
      {/* Invisible fat hit-line for comfortable hovering. */}
      {visible && (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}

      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={breaking ? color : 'white'}
        strokeWidth={breaking ? (isHovered ? 1.15 : 0.9) : 0.4}
        strokeLinecap="round"
        markerEnd={breaking ? `url(#${arrowId})` : undefined}
        initial={breaking ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: targetOpacity,
        }}
        transition={{
          pathLength: { duration: 0.55, ease: 'easeOut', delay: drawDelay },
          opacity: { duration: 0.3, ease: 'easeOut', delay: drawDelay },
        }}
      />

      {/* Origin dot — anchors each pass to where it was played from. */}
      <motion.circle
        cx={x1}
        cy={y1}
        r={breaking ? 0.9 : 0.6}
        fill={breaking ? color : 'white'}
        initial={{ opacity: 0 }}
        animate={{ opacity: targetOpacity }}
        transition={{ duration: 0.3, delay: drawDelay }}
      />
    </g>
  );
}

interface BrokenDefendersProps {
  pass: LineBreakingPass;
  visible: boolean;
  dim: boolean;
  focused: boolean;
}

function BrokenDefenders({ pass, visible, dim, focused }: BrokenDefendersProps) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {pass.brokenDefenders.map((d, i) => {
        const cx = normX(d.x);
        const cy = normY(d.y);
        const targetOpacity = !visible ? 0 : dim ? 0.18 : 1;
        return (
          <g key={`${pass.id}-${i}`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
            {/* Pulsing ring — the "broken" flash. */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={1.6}
              fill="none"
              stroke="#ff2a2a"
              strokeWidth={0.4}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={
                focused
                  ? { scale: [1, 2.2, 1], opacity: [0.9, 0, 0.9] }
                  : { scale: [0.6, 1.8], opacity: [0.85, 0] }
              }
              transition={
                focused
                  ? { duration: 1.1, repeat: Infinity, ease: 'easeOut' }
                  : {
                      duration: 0.9,
                      delay: 0.45 + i * 0.12,
                      repeat: 1,
                      repeatType: 'loop',
                      ease: 'easeOut',
                    }
              }
            />
            {/* Solid defender dot. */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={0.85}
              fill="#ff2a2a"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: targetOpacity, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.45 + i * 0.12 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          </g>
        );
      })}
    </g>
  );
}

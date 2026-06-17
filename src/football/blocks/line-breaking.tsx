import { useId, useMemo, useState } from 'react';
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
  /** Defenders the pass cut through, in StatsBomb units. Flash as the line draws. */
  brokenDefenders: { x: number; y: number }[];
}

export interface LineBreakingProps {
  /** Team display name — the masthead title. */
  team: string;
  /** Team accent colour for line-breaking passes. Defaults to the home red. */
  color?: string;
  /** Completed passes to plot. */
  passes: LineBreakingPass[];
  /** Additional CSS classes for the outer plate. */
  className?: string;
}

/** StatsBomb pitch is 120 long × 80 wide; the Pitch primitive is 100 × 100. */
const SB_LENGTH = 120;
const SB_WIDTH = 80;
const normX = (x: number) => (x * 100) / SB_LENGTH;
const normY = (y: number) => (y * 100) / SB_WIDTH;

type ViewMode = 'all' | 'breaks';

/**
 * Line-breaking passes — the brand-defining BTL viz. Completed passes are drawn
 * on a dark editorial pitch: ordinary passes sit faint and quiet, while
 * line-breaking passes ignite in the team colour, drawing through the defensive
 * line with an arrowhead while the defenders they split flash hot red. A
 * segmented toggle isolates the line-breakers; hovering any pass focuses it and
 * its broken defenders and names the passer.
 */
export function LineBreaking({ team, color = '#eb0000', passes, className }: LineBreakingProps) {
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

  return (
    <div
      className={cn(
        'relative isolate w-full max-w-[640px] overflow-hidden rounded-[14px] border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-white/[0.012] p-5 shadow-[0_30px_70px_-32px_rgba(0,0,0,0.75)]',
        className
      )}
    >
      {/* Faint red top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#eb0000]/70 to-transparent" />

      {/* Masthead */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
            Line Breaks
          </div>
          <h3
            className="mt-1 text-[26px] leading-none text-white"
            style={{ fontFamily: '"le-monde-journal-std", Georgia, serif' }}
          >
            {team}
          </h3>
        </div>

        {/* Count read-out */}
        <div className="text-right">
          <div className="text-[34px] leading-none text-white tabular-nums">{breakCount}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">
            Line {breakCount === 1 ? 'Break' : 'Breaks'}
          </div>
        </div>
      </div>

      {/* Segmented toggle — house style */}
      <div className="mb-4 inline-flex rounded-full border border-white/[0.08] bg-white/[0.02] p-0.5 text-[10px] uppercase tracking-[0.18em]">
        <SegmentButton active={mode === 'all'} onClick={() => setMode('all')} label="All passes" />
        <SegmentButton
          active={mode === 'breaks'}
          onClick={() => setMode('breaks')}
          label="Only line breaks"
          activeColor={color}
        />
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

          {/* Attack-direction hint, low-key */}
          <text
            x="50"
            y="97"
            textAnchor="middle"
            fill="white"
            fillOpacity="0.22"
            fontSize="2.4"
            letterSpacing="0.6"
            style={{ textTransform: 'uppercase' }}
          >
            Attacking direction →
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

        {/* Hover callout — the passer's name */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/[0.1] bg-black/70 px-3 py-1 backdrop-blur-sm"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                {hovered.lineBreaking ? 'Line break · ' : 'Pass · '}
              </span>
              <span className="text-[12px] font-semibold text-white">{hovered.player}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Colophon */}
      <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/40">
        <span>Completed passes</span>
        <span>Data · StatsBomb</span>
      </div>
    </div>
  );
}

interface SegmentButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  activeColor?: string;
}

function SegmentButton({ active, onClick, label, activeColor }: SegmentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-full px-3 py-1.5 transition-colors',
        active ? 'text-white' : 'text-white/45 hover:text-white/70'
      )}
    >
      {active && (
        <motion.span
          layoutId="line-breaking-segment"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-full bg-white/[0.07]"
          style={activeColor ? { boxShadow: `inset 0 0 0 1px ${activeColor}55` } : undefined}
        />
      )}
      <span className="relative">{label}</span>
    </button>
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

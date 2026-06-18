import { useId } from 'react';
import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import type { PitchTheme } from '#/football/primitives/pitch';
import { formatFormationLabel } from '#/football/compositions/formation-label';
import { monogram, surname } from '#/football/lib/player-name';

/** A player assigned to a lineup slot. */
export interface LineupSlotPlayer {
  /** Stable identifier (squad/provider id, or a generated id for custom names). */
  id: string;
  /** Display name. */
  name: string;
  /** Shirt number, shown inside the marker in `number` mode. */
  shirtNumber?: number;
  /** Headshot URL, shown inside the marker in `headshot` mode (monogram fallback). */
  imageUrl?: string;
}

/** A single position on the lineup board — filled or empty. */
export interface LineupSlot {
  /** x on the 0–100 pitch scale (low = own half). */
  x: number;
  /** y on the 0–100 pitch scale (0 = left touchline, 100 = right). */
  y: number;
  /** Positional role label (e.g. "GK", "CB", "ST"), shown in empty slots. */
  role?: string;
  /** Assigned player, or undefined for an empty slot. */
  player?: LineupSlotPlayer;
}

/** What fills a player marker: the shirt number, or the player's headshot. */
export type LineupMarkerContent = 'number' | 'headshot';

export interface LineupPitchProps {
  /** Slots to render (filled + empty). */
  slots: LineupSlot[];
  /** Team display name (used for the chip when no short name is set). */
  teamName?: string;
  /** Short name shown in the chip. Falls back to {@link teamName}. */
  teamShortName?: string;
  /** Formation label string, e.g. "4-3-3". */
  formation?: string;
  /** Marker fill / ring colour for filled slots. */
  teamColor?: string;
  /** Kit-number / monogram text colour. Defaults to white. */
  numberColor?: string;
  /** Pitch theme. Defaults to `dark` (the editor / reader surface). */
  theme?: PitchTheme;
  /** Additional CSS classes. */
  className?: string;
  /** Marker radius in viewBox units. */
  markerSize?: number;
  /** What a filled marker shows. Defaults to `number`. */
  markerContent?: LineupMarkerContent;
  /** Show the surname under each filled marker. */
  showNames?: boolean;
  /**
   * Interactive mode. When true, every slot is clickable and empty slots
   * render a dashed, inviting placeholder. When false (the published reader),
   * empty slots render as faint static circles and nothing is clickable.
   */
  editable?: boolean;
  /** Fires with the slot index when a slot is clicked (only when editable). */
  onSlotClick?: (index: number) => void;
  /** Index of the currently selected slot (highlight ring). */
  selectedSlotIndex?: number;
}

/**
 * Interactive formation board for building a lineup. Unlike `FormationBoard`
 * (which renders a confirmed, fully-populated team sheet), every slot here can
 * be empty and clickable so a creator can assign players one at a time — the
 * pitch primitive of the editor's Lineup block. Markers show either the shirt
 * number or the player's headshot (with a monogram fallback).
 */
export function LineupPitch({
  slots,
  teamName,
  teamShortName,
  formation,
  teamColor,
  numberColor = 'white',
  theme = 'dark',
  className,
  markerSize = 3.4,
  markerContent = 'number',
  showNames = true,
  editable = false,
  onSlotClick,
  selectedSlotIndex,
}: LineupPitchProps) {
  const color = teamColor ?? 'var(--color-team-home)';
  const chipLabel = teamShortName ?? teamName;
  const formationLabel = formatFormationLabel(formation);
  const clipPrefix = useId();

  return (
    <div className={cn('flex flex-col', className)}>
      {!editable && (chipLabel || formationLabel) && (
        <div
          data-slot="lineup-pitch-chip"
          className="pointer-events-none mb-2 flex items-baseline justify-center gap-1.5 text-[12px] tracking-tight"
          style={{ fontFamily: 'inherit' }}
        >
          {chipLabel && <span className="font-semibold text-white/90">{chipLabel}</span>}
          {formationLabel && <span className="tabular-nums text-white/55">{formationLabel}</span>}
        </div>
      )}

      <Pitch variant="full" theme={theme}>
        {slots.map((slot, index) => {
          const position = { x: slot.x, y: slot.y };
          const isSelected = selectedSlotIndex === index;
          const interactive = editable && Boolean(onSlotClick);
          const handleClick = interactive ? () => onSlotClick?.(index) : undefined;

          if (slot.player) {
            const player = slot.player;
            const showHeadshot = markerContent === 'headshot' && Boolean(player.imageUrl);
            const clipId = `${clipPrefix}-${index}`;
            return (
              <g
                key={`slot-${index}`}
                onClick={handleClick}
                role={interactive ? 'button' : undefined}
                aria-label={player.name}
                className={cn('transition-transform', interactive && 'cursor-pointer')}
              >
                {isSelected && (
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={markerSize + 1}
                    fill="none"
                    stroke="white"
                    strokeWidth="0.3"
                    opacity="0.6"
                  />
                )}

                {showHeadshot ? (
                  <>
                    <defs>
                      <clipPath id={clipId}>
                        <circle cx={position.x} cy={position.y} r={markerSize} />
                      </clipPath>
                    </defs>
                    <circle cx={position.x} cy={position.y} r={markerSize} fill={color} />
                    <image
                      href={player.imageUrl}
                      x={position.x - markerSize}
                      y={position.y - markerSize}
                      width={markerSize * 2}
                      height={markerSize * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ pointerEvents: 'none' }}
                    />
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={markerSize}
                      fill="none"
                      stroke={color}
                      strokeWidth="0.5"
                    />
                  </>
                ) : (
                  <>
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={markerSize}
                      fill={color}
                      stroke="white"
                      strokeWidth="0.3"
                    />
                    <text
                      x={position.x}
                      y={position.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={numberColor}
                      fontSize={
                        markerContent === 'number' && player.shirtNumber !== undefined
                          ? markerSize
                          : markerSize * 0.8
                      }
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {markerContent === 'number' && player.shirtNumber !== undefined
                        ? player.shirtNumber
                        : monogram(player.name)}
                    </text>
                  </>
                )}

                {showNames && (
                  <text
                    x={position.x}
                    y={position.y + markerSize + 2.7}
                    textAnchor="middle"
                    fill="white"
                    fontSize="2.4"
                    fontWeight="600"
                    opacity="0.9"
                    style={{ pointerEvents: 'none' }}
                  >
                    {surname(player.name)}
                  </text>
                )}
              </g>
            );
          }

          // Empty slot — a placeholder circle. Dashed + inviting when editable,
          // faint and static in the reader.
          return (
            <g
              key={`slot-${index}`}
              onClick={handleClick}
              role={interactive ? 'button' : undefined}
              aria-label={interactive ? `Add ${slot.role ?? 'player'}` : slot.role}
              className={cn(
                'transition-opacity',
                interactive ? 'cursor-pointer opacity-70 hover:opacity-100' : 'opacity-30'
              )}
            >
              {isSelected && (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={markerSize + 1}
                  fill="none"
                  stroke="white"
                  strokeWidth="0.3"
                  opacity="0.5"
                />
              )}
              <circle
                cx={position.x}
                cy={position.y}
                r={markerSize}
                fill="rgba(255,255,255,0.04)"
                stroke="white"
                strokeWidth="0.3"
                strokeDasharray="0.8 0.7"
              />
              {interactive && (
                <text
                  x={position.x}
                  y={position.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={markerSize}
                  fontWeight="300"
                  opacity="0.8"
                  style={{ pointerEvents: 'none' }}
                >
                  +
                </text>
              )}
              {slot.role && (
                <text
                  x={position.x}
                  y={position.y + markerSize + 2.7}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.2"
                  fontWeight="600"
                  opacity="0.55"
                  style={{ pointerEvents: 'none' }}
                >
                  {slot.role}
                </text>
              )}
            </g>
          );
        })}
      </Pitch>
    </div>
  );
}

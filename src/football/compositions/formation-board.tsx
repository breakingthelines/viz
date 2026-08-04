import { cn } from '#/lib/utils';
import { Pitch, toScreen } from '#/football/primitives/pitch';
import type { PitchTheme, PitchOrientation } from '#/football/primitives/pitch';
import { PlayerMarker } from '#/football/primitives/player-marker';
import type { Formation, FormationPosition } from '#/football/types';
import { formatFormationLabel } from '#/football/compositions/formation-label';
import { BLOCK_FONT_STACK } from '#/football/lib/font';
import { surname } from '#/football/lib/player-name';

export interface FormationBoardProps {
  /** Formation data to display */
  formation: Formation;
  /** Pitch visual theme. Defaults to `grass`. Pass `dark` for the Match Centre. */
  theme?: PitchTheme;
  /** Additional CSS classes */
  className?: string;
  /** Marker size */
  markerSize?: number;
  /** Whether to show player numbers */
  showNumbers?: boolean;
  /** Whether to show player names below markers */
  showNames?: boolean;
  /** Team color override */
  teamColor?: string;
  /** Click handler for players */
  onPlayerClick?: (position: FormationPosition) => void;
  /** Selected player ID */
  selectedPlayerId?: string;
  /** Whether to flip the formation (show defending) */
  flip?: boolean;
  /**
   * Marker variant. 'confirmed' (default) for actual team sheets;
   * 'predicted' for derived lineups (e.g. last-played XI shown on a
   * SCHEDULED match's Lineups tab).
   */
  markerVariant?: 'confirmed' | 'predicted';
  /**
   * Pitch orientation. Defaults to `landscape`. `portrait` rotates the pitch
   * a quarter-turn so the own goal sits at the bottom and the front line at
   * the top. Forwarded to the underlying {@link Pitch}; applied AFTER
   * `flip`, so the two compose exactly as their names suggest — `flip`
   * mirrors which end of the (still-normalized) pitch a team is shown
   * attacking, `orientation` then places that normalized pitch on screen.
   * Marker content (numbers, names) is never rotated, only repositioned.
   *
   * This default deliberately did NOT flip to `portrait` alongside
   * `LineupPitch`'s in 0.10.0, for two reasons. `FormationBoard` renders its
   * `Pitch` WITHOUT `fillEdgeToEdge`, so its viewBox stays square: in
   * portrait the browser's `meet` fit letterboxes that square inside the
   * `aspect-[2/3]` box and the pitch draws as a square with dead bands above
   * and below it (see the `Portrait` story, which asserts exactly that
   * outer box). And unlike `LineupPitch` it has no consumer outside this
   * package's own stories, so there is no shared-image or phone-viewport
   * case pulling the default over. Portrait here remains opt-in and
   * correct-but-letterboxed; making it the default would ship that letterbox
   * to whoever picks this component up next.
   */
  orientation?: PitchOrientation;
}

/**
 * Formation board showing team lineup on a full pitch
 */
export function FormationBoard({
  formation,
  theme = 'grass',
  className,
  markerSize = 3,
  showNumbers = true,
  showNames = false,
  teamColor,
  onPlayerClick,
  selectedPlayerId,
  flip = false,
  markerVariant = 'confirmed',
  orientation = 'landscape',
}: FormationBoardProps) {
  const color = teamColor ?? formation.team.primaryColor ?? 'var(--color-team-home)';

  const getPosition = (pos: FormationPosition) => {
    // `flip` operates in normalized pitch space first (unchanged logic);
    // `toScreen` then places that normalized point on screen for the
    // requested orientation — identity in `landscape`, so this returns
    // exactly what `flip` alone produced before this prop existed.
    const semantic = flip ? { x: 100 - pos.position.x, y: 100 - pos.position.y } : pos.position;
    return toScreen(semantic.x, semantic.y, orientation);
  };

  return (
    // Inter-first sans (product decision): opt out of the host page's editorial
    // serif so the chip + the pitch's SVG labels render in Inter.
    <div className={cn('flex flex-col', className)} style={{ fontFamily: BLOCK_FONT_STACK }}>
      {/* Formation chip — Wave 6.4.8 moved out of the pitch corner and onto
          its own row above the pitch frame; mirrors `PlayerRatingBoard`. */}
      <div
        data-slot="formation-board-chip"
        className="pointer-events-none mb-2 flex items-baseline justify-center gap-1.5 font-sans text-[12px] tracking-tight text-white/70"
      >
        <span className="font-semibold text-white/85">
          {formation.team.shortName ?? formation.team.name}
        </span>
        {formatFormationLabel(formation.formation) ? (
          <span className="tabular-nums text-white/60">
            {formatFormationLabel(formation.formation)}
          </span>
        ) : null}
      </div>
      <Pitch variant="full" theme={theme} orientation={orientation}>
        {formation.positions.map((pos) => {
          const position = getPosition(pos);
          const isSelected = pos.player.id === selectedPlayerId;

          return (
            <g
              key={pos.player.id}
              onClick={() => onPlayerClick?.(pos)}
              className={cn(onPlayerClick && 'cursor-pointer')}
            >
              <PlayerMarker
                position={position}
                size={markerSize}
                color={color}
                number={showNumbers ? pos.player.shirtNumber : undefined}
                name={pos.player.name}
                selected={isSelected}
                variant={markerVariant}
              />

              {showNames && (
                <text
                  x={position.x}
                  y={position.y + markerSize + 2}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2"
                  opacity="0.8"
                >
                  {surname(pos.player.name)}
                </text>
              )}
            </g>
          );
        })}
      </Pitch>
    </div>
  );
}

import { cn } from '#/lib/utils';
import { Pitch } from '#/football/primitives/pitch';
import { PlayerMarker } from '#/football/primitives/player-marker';
import type { Formation, FormationPosition } from '#/football/types';

export interface FormationBoardProps {
  /** Formation data to display */
  formation: Formation;
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
}

/**
 * Formation board showing team lineup on a full pitch
 */
export function FormationBoard({
  formation,
  className,
  markerSize = 3,
  showNumbers = true,
  showNames = false,
  teamColor,
  onPlayerClick,
  selectedPlayerId,
  flip = false,
}: FormationBoardProps) {
  const color = teamColor ?? formation.team.color ?? 'var(--color-team-home)';

  const getPosition = (pos: FormationPosition) => {
    if (!flip) return pos.position;
    return {
      x: 100 - pos.position.x,
      y: 100 - pos.position.y,
    };
  };

  return (
    <div className={cn('relative', className)}>
      <Pitch variant="full">
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
                number={showNumbers ? pos.player.number : undefined}
                name={pos.player.name}
                selected={isSelected}
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
                  {pos.player.name.split(' ').pop()}
                </text>
              )}
            </g>
          );
        })}
      </Pitch>

      {/* Formation label */}
      <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
        {formation.team.shortName ?? formation.team.name} ({formation.formation})
      </div>
    </div>
  );
}

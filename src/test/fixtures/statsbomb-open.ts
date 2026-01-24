import type { MatchEvent, Team, Player, Formation } from '#/football/types';
import { EventType, ShotOutcome, BodyPart } from '#/football/types';
import { fromStatsBomb } from '#/utils/coordinates';

/**
 * Sample data from StatsBomb Open Data
 * Argentina vs France - 2022 World Cup Final
 *
 * Data source: https://github.com/statsbomb/open-data
 * Licensed under CC BY 4.0
 */

export const argentinaTeam: Team = {
  id: 'arg',
  name: 'Argentina',
  shortName: 'ARG',
  primaryColor: '#75AADB',
  secondaryColor: '#FFFFFF',
  meta: {},
};

export const franceTeam: Team = {
  id: 'fra',
  name: 'France',
  shortName: 'FRA',
  primaryColor: '#002654',
  secondaryColor: '#FFFFFF',
  meta: {},
};

// Helper to create a player
const player = (id: string, name: string, shirtNumber: number): Player => ({
  id,
  name,
  shirtNumber,
  meta: {},
});

// Helper to create a shot event
const shotEvent = (
  id: string,
  timestamp: number,
  team: Team,
  p: Player,
  locationRaw: { x: number; y: number },
  outcome: ShotOutcome,
  xg: number,
  bodyPart: BodyPart
): MatchEvent => {
  const location = fromStatsBomb(locationRaw.x, locationRaw.y);
  return {
    id,
    type: EventType.SHOT,
    timestamp,
    player: p,
    team,
    location,
    meta: {},
    eventData: {
      case: 'shot',
      value: {
        xg,
        outcome,
        bodyPart,
      },
    },
  } as MatchEvent;
};

/**
 * Argentina shots (simplified from StatsBomb data)
 * Coordinates converted to BTL normalized format (0-100)
 */
export const argentinaShots: MatchEvent[] = [
  shotEvent(
    'shot-1',
    23,
    argentinaTeam,
    player('messi', 'Lionel Messi', 10),
    { x: 102, y: 38 },
    ShotOutcome.GOAL,
    0.76,
    BodyPart.RIGHT_FOOT
  ),
  shotEvent(
    'shot-2',
    36,
    argentinaTeam,
    player('di-maria', 'Ángel Di María', 11),
    { x: 108, y: 42 },
    ShotOutcome.GOAL,
    0.38,
    BodyPart.LEFT_FOOT
  ),
  shotEvent(
    'shot-3',
    73,
    argentinaTeam,
    player('messi', 'Lionel Messi', 10),
    { x: 100, y: 35 },
    ShotOutcome.SAVED,
    0.12,
    BodyPart.LEFT_FOOT
  ),
  shotEvent(
    'shot-4',
    108,
    argentinaTeam,
    player('messi', 'Lionel Messi', 10),
    { x: 114, y: 40 },
    ShotOutcome.GOAL,
    0.08,
    BodyPart.LEFT_FOOT
  ),
];

/**
 * France shots (simplified from StatsBomb data)
 */
export const franceShots: MatchEvent[] = [
  shotEvent(
    'shot-5',
    80,
    franceTeam,
    player('mbappe', 'Kylian Mbappé', 10),
    { x: 108, y: 38 },
    ShotOutcome.GOAL,
    0.41,
    BodyPart.LEFT_FOOT
  ),
  shotEvent(
    'shot-6',
    81,
    franceTeam,
    player('mbappe', 'Kylian Mbappé', 10),
    { x: 102, y: 40 },
    ShotOutcome.GOAL,
    0.78,
    BodyPart.RIGHT_FOOT
  ),
  shotEvent(
    'shot-7',
    97,
    franceTeam,
    player('mbappe', 'Kylian Mbappé', 10),
    { x: 95, y: 30 },
    ShotOutcome.BLOCKED,
    0.05,
    BodyPart.RIGHT_FOOT
  ),
  shotEvent(
    'shot-8',
    118,
    franceTeam,
    player('mbappe', 'Kylian Mbappé', 10),
    { x: 102, y: 38 },
    ShotOutcome.GOAL,
    0.76,
    BodyPart.RIGHT_FOOT
  ),
];

/**
 * All shots from the match
 */
export const allShots: MatchEvent[] = [...argentinaShots, ...franceShots].sort(
  (a, b) => a.timestamp - b.timestamp
);

/**
 * Argentina starting formation (4-3-3)
 */
export const argentinaFormation: Formation = {
  team: argentinaTeam,
  formation: '4-3-3',
  positions: [
    { player: player('martinez', 'E. Martínez', 23), position: { x: 5, y: 50 } },
    { player: player('molina', 'N. Molina', 26), position: { x: 25, y: 15 } },
    { player: player('romero', 'C. Romero', 13), position: { x: 20, y: 35 } },
    { player: player('otamendi', 'N. Otamendi', 19), position: { x: 20, y: 65 } },
    { player: player('acuna', 'M. Acuña', 8), position: { x: 25, y: 85 } },
    { player: player('de-paul', 'R. De Paul', 7), position: { x: 40, y: 30 } },
    { player: player('fernandez', 'E. Fernández', 24), position: { x: 40, y: 50 } },
    { player: player('mac-allister', 'A. Mac Allister', 20), position: { x: 40, y: 70 } },
    { player: player('di-maria', 'Á. Di María', 11), position: { x: 60, y: 20 } },
    { player: player('messi', 'L. Messi', 10), position: { x: 65, y: 50 } },
    { player: player('alvarez', 'J. Álvarez', 9), position: { x: 60, y: 80 } },
  ],
};

/**
 * France starting formation (4-2-3-1)
 */
export const franceFormation: Formation = {
  team: franceTeam,
  formation: '4-2-3-1',
  positions: [
    { player: player('lloris', 'H. Lloris', 1), position: { x: 5, y: 50 } },
    { player: player('kounde', 'J. Koundé', 5), position: { x: 25, y: 15 } },
    { player: player('varane', 'R. Varane', 4), position: { x: 20, y: 35 } },
    { player: player('upamecano', 'D. Upamecano', 4), position: { x: 20, y: 65 } },
    { player: player('hernandez', 'T. Hernández', 22), position: { x: 25, y: 85 } },
    { player: player('tchouameni', 'A. Tchouaméni', 8), position: { x: 35, y: 40 } },
    { player: player('rabiot', 'A. Rabiot', 14), position: { x: 35, y: 60 } },
    { player: player('dembele', 'O. Dembélé', 11), position: { x: 55, y: 20 } },
    { player: player('griezmann', 'A. Griezmann', 7), position: { x: 55, y: 50 } },
    { player: player('mbappe', 'K. Mbappé', 10), position: { x: 55, y: 80 } },
    { player: player('giroud', 'O. Giroud', 9), position: { x: 70, y: 50 } },
  ],
};

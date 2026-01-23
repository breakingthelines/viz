import type { ShotEvent, Formation, Team, MatchInfo } from '#/football/types';
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
  color: '#75AADB',
};

export const franceTeam: Team = {
  id: 'fra',
  name: 'France',
  shortName: 'FRA',
  color: '#002654',
};

export const matchInfo: MatchInfo = {
  id: 'wc-2022-final',
  homeTeam: argentinaTeam,
  awayTeam: franceTeam,
  date: '2022-12-18',
  competition: 'FIFA World Cup',
  season: '2022',
  venue: 'Lusail Stadium',
};

/**
 * Argentina shots (simplified from StatsBomb data)
 * Coordinates converted to BTL normalized format (0-100)
 */
export const argentinaShots: ShotEvent[] = [
  {
    id: 'shot-1',
    type: 'shot',
    timestamp: 23,
    period: 'first_half',
    team: argentinaTeam,
    player: { id: 'messi', name: 'Lionel Messi', number: 10 },
    location: fromStatsBomb(102, 38),
    outcome: 'goal',
    xg: 0.76,
    bodyPart: 'right_foot',
    technique: 'penalty',
  },
  {
    id: 'shot-2',
    type: 'shot',
    timestamp: 36,
    period: 'first_half',
    team: argentinaTeam,
    player: { id: 'di-maria', name: 'Ángel Di María', number: 11 },
    location: fromStatsBomb(108, 42),
    outcome: 'goal',
    xg: 0.38,
    bodyPart: 'left_foot',
  },
  {
    id: 'shot-3',
    type: 'shot',
    timestamp: 73,
    period: 'second_half',
    team: argentinaTeam,
    player: { id: 'messi', name: 'Lionel Messi', number: 10 },
    location: fromStatsBomb(100, 35),
    outcome: 'saved',
    xg: 0.12,
    bodyPart: 'left_foot',
  },
  {
    id: 'shot-4',
    type: 'shot',
    timestamp: 108,
    period: 'extra_first',
    team: argentinaTeam,
    player: { id: 'messi', name: 'Lionel Messi', number: 10 },
    location: fromStatsBomb(114, 40),
    outcome: 'goal',
    xg: 0.08,
    bodyPart: 'left_foot',
  },
];

/**
 * France shots (simplified from StatsBomb data)
 */
export const franceShots: ShotEvent[] = [
  {
    id: 'shot-5',
    type: 'shot',
    timestamp: 80,
    period: 'second_half',
    team: franceTeam,
    player: { id: 'mbappe', name: 'Kylian Mbappé', number: 10 },
    location: fromStatsBomb(108, 38),
    outcome: 'goal',
    xg: 0.41,
    bodyPart: 'left_foot',
  },
  {
    id: 'shot-6',
    type: 'shot',
    timestamp: 81,
    period: 'second_half',
    team: franceTeam,
    player: { id: 'mbappe', name: 'Kylian Mbappé', number: 10 },
    location: fromStatsBomb(102, 40),
    outcome: 'goal',
    xg: 0.78,
    bodyPart: 'right_foot',
    technique: 'penalty',
  },
  {
    id: 'shot-7',
    type: 'shot',
    timestamp: 97,
    period: 'extra_first',
    team: franceTeam,
    player: { id: 'mbappe', name: 'Kylian Mbappé', number: 10 },
    location: fromStatsBomb(95, 30),
    outcome: 'blocked',
    xg: 0.05,
    bodyPart: 'right_foot',
  },
  {
    id: 'shot-8',
    type: 'shot',
    timestamp: 118,
    period: 'extra_second',
    team: franceTeam,
    player: { id: 'mbappe', name: 'Kylian Mbappé', number: 10 },
    location: fromStatsBomb(102, 38),
    outcome: 'goal',
    xg: 0.76,
    bodyPart: 'right_foot',
    technique: 'penalty',
  },
];

/**
 * All shots from the match
 */
export const allShots: ShotEvent[] = [...argentinaShots, ...franceShots].sort(
  (a, b) => a.timestamp - b.timestamp
);

/**
 * Argentina starting formation (4-3-3)
 */
export const argentinaFormation: Formation = {
  team: argentinaTeam,
  formation: '4-3-3',
  positions: [
    { player: { id: 'martinez', name: 'E. Martínez', number: 23 }, position: { x: 5, y: 50 } },
    { player: { id: 'molina', name: 'N. Molina', number: 26 }, position: { x: 25, y: 15 } },
    { player: { id: 'romero', name: 'C. Romero', number: 13 }, position: { x: 20, y: 35 } },
    { player: { id: 'otamendi', name: 'N. Otamendi', number: 19 }, position: { x: 20, y: 65 } },
    { player: { id: 'acuna', name: 'M. Acuña', number: 8 }, position: { x: 25, y: 85 } },
    { player: { id: 'de-paul', name: 'R. De Paul', number: 7 }, position: { x: 40, y: 30 } },
    { player: { id: 'fernandez', name: 'E. Fernández', number: 24 }, position: { x: 40, y: 50 } },
    {
      player: { id: 'mac-allister', name: 'A. Mac Allister', number: 20 },
      position: { x: 40, y: 70 },
    },
    { player: { id: 'di-maria', name: 'Á. Di María', number: 11 }, position: { x: 60, y: 20 } },
    { player: { id: 'messi', name: 'L. Messi', number: 10 }, position: { x: 65, y: 50 } },
    { player: { id: 'alvarez', name: 'J. Álvarez', number: 9 }, position: { x: 60, y: 80 } },
  ],
};

/**
 * France starting formation (4-2-3-1)
 */
export const franceFormation: Formation = {
  team: franceTeam,
  formation: '4-2-3-1',
  positions: [
    { player: { id: 'lloris', name: 'H. Lloris', number: 1 }, position: { x: 5, y: 50 } },
    { player: { id: 'kounde', name: 'J. Koundé', number: 5 }, position: { x: 25, y: 15 } },
    { player: { id: 'varane', name: 'R. Varane', number: 4 }, position: { x: 20, y: 35 } },
    { player: { id: 'upamecano', name: 'D. Upamecano', number: 4 }, position: { x: 20, y: 65 } },
    { player: { id: 'hernandez', name: 'T. Hernández', number: 22 }, position: { x: 25, y: 85 } },
    { player: { id: 'tchouameni', name: 'A. Tchouaméni', number: 8 }, position: { x: 35, y: 40 } },
    { player: { id: 'rabiot', name: 'A. Rabiot', number: 14 }, position: { x: 35, y: 60 } },
    { player: { id: 'dembele', name: 'O. Dembélé', number: 11 }, position: { x: 55, y: 20 } },
    { player: { id: 'griezmann', name: 'A. Griezmann', number: 7 }, position: { x: 55, y: 50 } },
    { player: { id: 'mbappe', name: 'K. Mbappé', number: 10 }, position: { x: 55, y: 80 } },
    { player: { id: 'giroud', name: 'O. Giroud', number: 9 }, position: { x: 70, y: 50 } },
  ],
};

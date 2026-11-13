import type { GameBlockHonourJson } from './team-league-match-common';
import { BlockGrid, RefName } from './team-league-match-ui';

export interface HonourGroup {
  key: string;
  competition: GameBlockHonourJson['competition'];
  place: string;
  seasons: string[];
}

/** Honours grouped by competition and place, newest season first, in first-seen order. */
export function groupHonours(honours: GameBlockHonourJson[]): HonourGroup[] {
  const out = new Map<string, HonourGroup>();
  for (const h of honours) {
    const comp = h.competition?.id || h.competition?.name || '';
    const place = h.place || 'Winner';
    const key = `${comp}|${place}`;
    const g = out.get(key) ?? { key, competition: h.competition, place, seasons: [] };
    if (h.seasonLabel) g.seasons.push(h.seasonLabel);
    out.set(key, g);
  }
  return [...out.values()];
}

/** Trophies by competition: the count and the seasons. Placings other than winner are named. */
export function HonourRows({ honours }: { honours: GameBlockHonourJson[] }) {
  const groups = groupHonours(honours);
  return (
    <BlockGrid
      label="Honours"
      columns={[{ label: '' }, { label: '', strong: true }, { label: 'Seasons', wide: true }]}
      rows={groups.map((g) => ({
        key: g.key,
        cells: [
          <>
            <RefName value={g.competition} />
            {g.place !== 'Winner' ? `, ${g.place.toLowerCase()}` : ''}
          </>,
          String(g.seasons.length || 1),
          g.seasons.join(', '),
        ],
      }))}
    />
  );
}

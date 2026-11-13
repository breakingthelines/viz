import type { GameBlockSquadGroupJson } from '../team/types';
import { BlockGrid, RefName, SectionLabel } from './team-league-match-ui';

/** A squad by position: shirt number, name and age under each position label. */
export function SquadList({ groups }: { groups: GameBlockSquadGroupJson[] }) {
  return (
    <div>
      {groups.map((g, gi) => (
        <section key={g.label ?? gi}>
          <SectionLabel first={gi === 0}>{g.label}</SectionLabel>
          <BlockGrid
            dense
            label={g.label}
            columns={[
              { label: '', align: 'right', width: '26px' },
              { label: '', width: 'minmax(0, 1fr)' },
              { label: gi === 0 ? 'Age' : '' },
            ]}
            rows={(g.players ?? []).map((p, i) => ({
              key: p.player?.id || `${gi}-${i}`,
              cells: [
                p.shirtNumber ? String(p.shirtNumber) : '',
                <RefName value={p.player} image={false} />,
                typeof p.age === 'number' ? String(p.age) : '',
              ],
            }))}
          />
        </section>
      ))}
    </div>
  );
}

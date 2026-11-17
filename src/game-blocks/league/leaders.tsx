import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, Section } from '../skin/index';
import { StatBoard } from '../parts/league-board';
import { frameBase } from '../parts/team-league-match-ui';
import type { LeagueLeadersDataJson } from './types';

/** League › Leaders: one stat's board under its name ("Goals"), the leader's bar full. */
export function LeagueLeadersBlock(props: GameBlockComponentProps<LeagueLeadersDataJson>) {
  const data = props.config.data ?? {};
  const rows = data.rows ?? [];
  const label = data.categoryLabel || data.category || '';
  const max = Math.max(0, ...rows.map((r) => r.value?.value ?? 0));
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'leaders' })}
      annotate={{ target: '[data-board-row] [data-num]' }}
    >
      {rows.length > 0 ? (
        <Section heading={label}>
          <StatBoard
            rows={rows.map((r, i) => ({ key: r.player?.id || String(i), ...r }))}
            max={max}
          />
        </Section>
      ) : null}
    </BlockFrame>
  );
}

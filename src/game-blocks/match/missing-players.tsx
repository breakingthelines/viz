import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { AbsenceRows } from '../parts/team-absences';
import { refName } from '../parts/team-league-match-common';
import { SectionLabel } from '../parts/team-league-match-ui';
import type { MatchMissingPlayersDataJson } from './types';

/** Match › Missing players: each side's absentees as of kick-off. A list, so no hero. */
export function MatchMissingPlayersBlock(
  props: GameBlockComponentProps<MatchMissingPlayersDataJson>
) {
  const data = props.config.data ?? {};
  const sides = [
    { name: refName(data.match?.home?.team), rows: data.home ?? [] },
    { name: refName(data.match?.away?.team), rows: data.away ?? [] },
  ].filter((s) => s.rows.length > 0);
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'missing-players')}
      aside={
        sides.length > 0 ? (
          <div>
            {sides.map((s, i) => (
              <section key={s.name || i} aria-label={s.name}>
                <SectionLabel first={i === 0}>{`${s.name}, ${s.rows.length} out`}</SectionLabel>
                <AbsenceRows rows={s.rows} back={false} label={s.name} />
              </section>
            ))}
          </div>
        ) : null
      }
    />
  );
}

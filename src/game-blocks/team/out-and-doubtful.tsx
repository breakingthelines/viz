import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { formatDay, scopeLine } from '../parts/team-league-match-common';
import { AbsenceRows } from '../parts/team-absences';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamOutAndDoubtfulDataJson } from './types';

/**
 * Team › Out and doubtful: players out or doubtful now. The hero is the count
 * out, with the doubtful count beside it.
 */
export function TeamOutAndDoubtfulBlock(
  props: GameBlockComponentProps<TeamOutAndDoubtfulDataJson>
) {
  const { config } = props;
  const players = config.data?.players ?? [];
  const doubtful = players.filter((p) => /doubt/i.test(p.status ?? '')).length;
  const out = players.length - doubtful;
  const hero: BlockHero | undefined =
    players.length > 0
      ? {
          figure: String(out),
          label: 'out',
          baseline: doubtful > 0 ? [`${doubtful} doubtful`] : undefined,
        }
      : undefined;
  // Availability is dated: the context names the day, not the season.
  const day = formatDay(config.source.asOf?.slice(0, 10));
  const context = day
    ? [config.subject.subtitle || config.scope.competitionLabel, day].filter(Boolean).join(', ')
    : scopeLine(config);
  return (
    <BlockFrame
      {...frameBase(props, { context, noun: 'absences' })}
      hero={hero}
      aside={players.length > 0 ? <AbsenceRows rows={players} /> : null}
    />
  );
}

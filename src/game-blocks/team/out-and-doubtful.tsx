import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, Section, Sections } from '../skin/index';
import { AbsentRows } from '../parts/team-rows';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamOutAndDoubtfulDataJson } from './types';

/** Team › Out and doubtful: an "Out" section and a "Doubtful" section, each player with the reason. */
export function TeamOutAndDoubtfulBlock(
  props: GameBlockComponentProps<TeamOutAndDoubtfulDataJson>
) {
  const players = props.config.data?.players ?? [];
  const doubtful = players.filter((p) => /doubt/i.test(p.status ?? ''));
  const out = players.filter((p) => !/doubt/i.test(p.status ?? ''));
  return (
    <BlockFrame {...frameBase(props, { noun: 'absences' })}>
      {players.length > 0 ? (
        <Sections>
          {out.length > 0 ? (
            <Section heading="Out">
              <AbsentRows rows={out} label="Out" />
            </Section>
          ) : null}
          {doubtful.length > 0 ? (
            <Section heading="Doubtful">
              <AbsentRows rows={doubtful} label="Doubtful" />
            </Section>
          ) : null}
        </Sections>
      ) : null}
    </BlockFrame>
  );
}

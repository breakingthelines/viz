import { Fragment } from 'react';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  LabelCell,
  NameCell,
  NumCell,
  Row,
  Rows,
  SectionHeading,
  useBlockLayout,
  useBlockScale,
} from '../skin/index';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockSquadGroupJson, TeamSquadDataJson } from './types';

/**
 * Team › Squad: by position group. Wide, the group names the first row of
 * its players in the shared label column; narrow, each group is a section
 * heading. Each row: shirt number, name, and age when the data has it.
 */
export function TeamSquadBlock(props: GameBlockComponentProps<TeamSquadDataJson>) {
  const { config } = props;
  const groups = (config.data?.groups ?? []).filter((g) => (g.players ?? []).length > 0);
  return (
    <BlockFrame {...frameBase(props, { noun: 'squad' })}>
      {groups.length > 0 ? <SquadRows groups={groups} /> : null}
    </BlockFrame>
  );
}

function SquadRows({ groups }: { groups: GameBlockSquadGroupJson[] }) {
  const { narrow } = useBlockLayout();
  const scale = useBlockScale();
  const ages = groups.some((g) => (g.players ?? []).some((p) => typeof p.age === 'number'));
  const cols = narrow
    ? `26px minmax(0, 1fr)${ages ? ' 32px' : ''}`
    : `${scale.labelCol}px 26px minmax(0, 1fr)${ages ? ' 44px' : ''}`;
  return (
    <Rows label="Squad">
      {ages ? (
        <Row cols={cols} head>
          {narrow ? null : <span />}
          <span />
          <span />
          <LabelCell small align="right">
            Age
          </LabelCell>
        </Row>
      ) : null}
      {groups.map((g, gi) => (
        <Fragment key={g.label || gi}>
          {narrow ? (
            <div style={{ marginTop: gi === 0 ? 12 : 16 }}>
              <SectionHeading>{g.label}</SectionHeading>
            </div>
          ) : null}
          {(g.players ?? []).map((p, i, list) => (
            <Row
              key={p.player?.id || i}
              cols={cols}
              last={narrow && i === list.length - 1}
              style={
                !narrow && i === list.length - 1 && gi < groups.length - 1
                  ? { borderBottom: '1px solid var(--btl-block-line-strong)' }
                  : !narrow && i === list.length - 1
                    ? { borderBottom: 0 }
                    : undefined
              }
            >
              {narrow ? null : <LabelCell>{i === 0 ? g.label : ''}</LabelCell>}
              <NumCell dim>{p.shirtNumber ?? ''}</NumCell>
              <NameCell>{p.player?.name}</NameCell>
              {ages ? <NumCell dim>{p.age ?? ''}</NumCell> : null}
            </Row>
          ))}
        </Fragment>
      ))}
    </Rows>
  );
}

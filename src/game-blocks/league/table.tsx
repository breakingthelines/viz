import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  CrestCell,
  InFrame,
  LabelCell,
  NameCell,
  NumCell,
  Row,
  Rows,
  clubFit,
  teamCrestSrc,
} from '../skin/index';
import { frameBase } from '../parts/team-league-match-ui';
import type { GameBlockStandingRowJson, LeagueTableDataJson } from './types';

/** "+12", "−3" (a true minus), "0". */
export function goalDifference(gd: number | undefined): string {
  const n = gd ?? 0;
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

/**
 * League › Table: the rows the view chose (`top_six`, `around` a team, or
 * `full`): place, crest, club, then P, W, D, L, GD and Pts (P, GD and Pts on
 * a narrow block), points in bold. The highlighted club's name is bold.
 */
export function LeagueTableBlock(props: GameBlockComponentProps<LeagueTableDataJson>) {
  const rows = props.config.data?.rows ?? [];
  const highlight = props.config.options.highlight;
  return (
    <BlockFrame
      {...frameBase(props, { noun: 'table' })}
      annotate={{ target: '[data-table-row="0"] [data-points] [data-num]' }}
    >
      {rows.length > 0 ? (
        <InFrame>
          {({ narrow }) => <Standings rows={rows} narrow={narrow} highlight={highlight} />}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}

function Standings({
  rows,
  narrow,
  highlight,
}: {
  rows: GameBlockStandingRowJson[];
  narrow: boolean;
  highlight?: string;
}) {
  const cols = narrow
    ? '22px 18px minmax(0, 1fr) 24px 30px 34px'
    : '30px 20px minmax(0, 1fr) 34px 34px 34px 34px 44px 44px';
  const heads = narrow ? ['P', 'GD', 'Pts'] : ['P', 'W', 'D', 'L', 'GD', 'Pts'];
  return (
    <Rows label="Table">
      <Row cols={cols} head>
        <span />
        <span />
        <span />
        {heads.map((h) => (
          <LabelCell key={h} small align="right">
            {h}
          </LabelCell>
        ))}
      </Row>
      {rows.map((r, i) => {
        const subject = !!highlight && r.team?.id === highlight;
        return (
          <Row
            key={r.team?.id || i}
            cols={cols}
            last={i === rows.length - 1}
            data-table-row={String(i)}
            data-table-subject={subject ? '' : undefined}
          >
            <NumCell dim>{r.rank ?? i + 1}</NumCell>
            <CrestCell src={teamCrestSrc(r.team)} />
            <NameCell style={subject ? { fontWeight: 700 } : undefined}>
              {clubFit(r.team?.name, narrow, 15)}
            </NameCell>
            <NumCell dim>{r.played ?? 0}</NumCell>
            {narrow ? null : (
              <>
                <NumCell dim>{r.won ?? 0}</NumCell>
                <NumCell dim>{r.drawn ?? 0}</NumCell>
                <NumCell dim>{r.lost ?? 0}</NumCell>
              </>
            )}
            <NumCell dim>{goalDifference(r.goalDifference)}</NumCell>
            <span data-points="" style={{ textAlign: 'right' }}>
              <NumCell>{r.points ?? 0}</NumCell>
            </span>
          </Row>
        );
      })}
    </Rows>
  );
}

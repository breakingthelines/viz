import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  InFrame,
  LabelCell,
  NameCell,
  NumCell,
  Row,
  Rows,
  StatCell,
  clubName,
} from '../skin/index';
import type { GameBlockCareerRowJson, PlayerCareerDataJson } from './data';
import { baseFrame } from './shared';

/** The total row the builder sent, else the sum of the spells. */
export function careerTotal(data: PlayerCareerDataJson): GameBlockCareerRowJson {
  if (data.total) return data.total;
  const rows = data.rows ?? [];
  return {
    appearances: rows.reduce((a, r) => a + (r.appearances ?? 0), 0),
    goals: rows.reduce((a, r) => a + (r.goals ?? 0), 0),
    assists: rows.reduce((a, r) => a + (r.assists ?? 0), 0),
  };
}

/** "2022 to now" reads "2022 onwards". */
export function careerYears(years: string | undefined): string {
  return (years ?? '').replace(/ to now$/, ' onwards');
}

/**
 * Player › Career (block style): one row per spell, newest first: the club
 * (wide: its years beside it), appearances, goals and assists; a Total row
 * under a strong hairline. Wholly public.
 */
export function PlayerCareerBlock(props: GameBlockComponentProps<PlayerCareerDataJson>) {
  const data = props.config.data ?? {};
  const spells = data.rows ?? [];
  const total = careerTotal(data);
  return (
    <BlockFrame
      {...baseFrame(props, 'career')}
      annotate={{ target: '[data-career-total] [data-num]' }}
    >
      {spells.length > 0 ? (
        <InFrame>
          {({ narrow }) => {
            const cols = `minmax(0, 1fr) ${narrow ? '' : '110px '}44px 52px 44px`;
            const nums = (r: GameBlockCareerRowJson) => (
              <>
                <NumCell>{r.appearances ?? 0}</NumCell>
                <NumCell>{r.goals ?? 0}</NumCell>
                <NumCell>{r.assists ?? 0}</NumCell>
              </>
            );
            return (
              <Rows label="Career">
                <Row cols={cols} head>
                  <span />
                  {narrow ? null : <span />}
                  {['Apps', 'Goals', 'Assists'].map((h) => (
                    <LabelCell key={h} small align="right">
                      {h}
                    </LabelCell>
                  ))}
                </Row>
                {spells.map((r, i) => (
                  <Row key={`${r.team?.id ?? r.team?.name}-${i}`} cols={cols} last={spells.length < 2 && i === spells.length - 1}>
                    <NameCell>{clubName(r.team?.name)}</NameCell>
                    {narrow ? null : <LabelCell small>{careerYears(r.years)}</LabelCell>}
                    {nums(r)}
                  </Row>
                ))}
                {spells.length > 1 ? (
                  <Row
                    cols={cols}
                    last
                    data-career-total=""
                    style={{ borderTop: '1px solid var(--btl-block-line-strong)' }}
                  >
                    <StatCell>Total</StatCell>
                    {narrow ? null : <span />}
                    {nums(total)}
                  </Row>
                ) : null}
              </Rows>
            );
          }}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}

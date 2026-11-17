import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  LabelCell,
  NumCell,
  Row,
  Rows,
  StatCell,
  clubShort,
  useBlockLayout,
} from '../skin/index';
import { matchFrame } from '../parts/match-common';
import type { GameBlockMatchStatJson, MatchStatsDataJson } from './types';

/**
 * Match › Match stats: each stat as two bars from a shared centre, the
 * leading side in red and its figure bold, the other in ink 4. The column
 * heads are the two clubs' short names.
 */
export function MatchStatsBlock(props: GameBlockComponentProps<MatchStatsDataJson>) {
  const data = props.config.data ?? {};
  const stats = data.stats ?? [];
  const { narrow } = useBlockLayout();
  const half = narrow ? 70 : 150;
  const cols = `minmax(0, 1fr) 44px ${half}px ${half}px 44px`;
  return (
    <BlockFrame
      {...matchFrame(props, data.match, 'match-stats')}
      annotate={{ target: '[data-stat-row="1"] [data-lead] [data-num]' }}
    >
      {stats.length > 0 ? (
        <Rows label="Match stats">
          <Row cols={cols} head>
            <span />
            <LabelCell small align="right" style={{ gridColumn: '2 / span 2', color: 'var(--btl-block-ink-1)' }}>
              {clubShort(data.match?.home?.team?.name)}
            </LabelCell>
            <LabelCell small style={{ gridColumn: '4 / span 2', color: 'var(--btl-block-ink-1)' }}>
              {clubShort(data.match?.away?.team?.name)}
            </LabelCell>
          </Row>
          {stats.map((s, i) => (
            <StatRow key={s.key || i} stat={s} cols={cols} index={i} last={i === stats.length - 1} />
          ))}
        </Rows>
      ) : null}
    </BlockFrame>
  );
}

function StatRow({
  stat,
  cols,
  index,
  last,
}: {
  stat: GameBlockMatchStatJson;
  cols: string;
  index: number;
  last: boolean;
}) {
  const h = stat.home?.value ?? 0;
  const a = stat.away?.value ?? 0;
  const total = Math.max(h + a, 1e-9);
  const homeLeads = h >= a;
  return (
    <Row cols={cols} last={last} data-stat-row={String(index)}>
      <StatCell>{stat.label}</StatCell>
      <span data-lead={homeLeads ? '' : undefined} style={{ textAlign: 'right' }}>
        <NumCell dim={!homeLeads}>{stat.home?.display ?? ''}</NumCell>
      </span>
      <HalfBar frac={h / total} lead={homeLeads} toLeft />
      <HalfBar frac={a / total} lead={!homeLeads} />
      <span data-lead={!homeLeads ? '' : undefined}>
        <NumCell dim={homeLeads} align="left">
          {stat.away?.display ?? ''}
        </NumCell>
      </span>
    </Row>
  );
}

/** One side's bar, growing from the shared centre. */
function HalfBar({ frac, lead, toLeft }: { frac: number; lead: boolean; toLeft?: boolean }) {
  const f = Math.max(0, Math.min(1, frac));
  return (
    <span
      aria-hidden
      style={{ display: 'flex', justifyContent: toLeft ? 'flex-end' : 'flex-start', height: 8 }}
    >
      <span
        style={{
          width: `${f * 100}%`,
          background: lead ? 'var(--btl-block-subject)' : 'var(--btl-block-ink-4)',
        }}
      />
    </span>
  );
}

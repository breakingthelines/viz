import { GatedValue, LabelCell, NumCell, Row, Rows, StatCell, useBlockLayout } from '../skin/index';
import { useGatedCell } from '../values';
import type { GameBlockComparisonMetricJson } from '../player/data';

/**
 * Two players, one stat per row, as bars from a shared centre (the block
 * style's comparison): the subject's value and bar on the left, the second
 * player's on the right. The leader's bar is solid (red for the subject,
 * white for the other) and the value bold; the other is ink 4 and regular.
 * `percentile` draws the bars to each player's percentile; `value` draws
 * them to the larger of the two values (season totals, per 90 with no
 * percentile).
 */
export function MirrorRows({
  metrics,
  subject,
  comparison,
  mode,
  extra,
}: {
  metrics: GameBlockComparisonMetricJson[];
  subject: string;
  comparison: string;
  mode: 'percentile' | 'value';
  /** A leading plain row, such as minutes played. */
  extra?: { label: string; a: string; b: string };
}) {
  const { narrow } = useBlockLayout();
  const half = narrow ? 42 : 120;
  const cols = `minmax(0, 1fr) 58px ${half}px ${half}px 58px`;
  return (
    <Rows label={`${subject} v ${comparison}`}>
      <Row cols={cols} head>
        <span />
        <LabelCell
          small
          align="right"
          style={{ gridColumn: '2 / span 2', color: 'var(--btl-block-ink-1)' }}
        >
          {subject}
        </LabelCell>
        <LabelCell small style={{ gridColumn: '4 / span 2', color: 'var(--btl-block-ink-1)' }}>
          {comparison}
        </LabelCell>
      </Row>
      {extra ? (
        <Row cols={cols}>
          <StatCell>{extra.label}</StatCell>
          <NumCell dim>{extra.a}</NumCell>
          <span />
          <span />
          <NumCell dim align="left">
            {extra.b}
          </NumCell>
        </Row>
      ) : null}
      {metrics.map((m, i) => (
        <MirrorRow key={m.key || i} m={m} cols={cols} mode={mode} last={i === metrics.length - 1} />
      ))}
    </Rows>
  );
}

function pct(state: string | undefined, p: number | undefined): number | null {
  return state === 'METRIC_STATE_VALUE' && typeof p === 'number' ? p : null;
}

function MirrorRow({
  m,
  cols,
  mode,
  last,
}: {
  m: GameBlockComparisonMetricJson;
  cols: string;
  mode: 'percentile' | 'value';
  last: boolean;
}) {
  const av = useGatedCell(m.subjectValueCell || undefined);
  const bv = useGatedCell(m.comparisonValueCell || undefined);
  let a: number | null;
  let b: number | null;
  if (mode === 'percentile') {
    a = pct(m.subjectState, m.subjectPercentile);
    b = pct(m.comparisonState, m.comparisonPercentile);
    a = a === null ? null : a / 100;
    b = b === null ? null : b / 100;
  } else {
    const x = av.state === 'value' && typeof av.value === 'number' ? av.value : null;
    const y = bv.state === 'value' && typeof bv.value === 'number' ? bv.value : null;
    const max = Math.max(x ?? 0, y ?? 0);
    a = x === null || max <= 0 ? (x === null ? null : 0) : x / max;
    b = y === null || max <= 0 ? (y === null ? null : 0) : y / max;
  }
  const aLeads = a !== null && (b === null || a >= b);
  const bLeads = b !== null && !aLeads && (a === null || b > a);
  return (
    <Row cols={cols} last={last} data-k={m.key}>
      <StatCell>{m.label}</StatCell>
      <NumCell dim={!aLeads}>
        {m.subjectValueCell ? <GatedValue cell={m.subjectValueCell} width={28} /> : '–'}
      </NumCell>
      <HalfBar
        frac={a}
        color={aLeads ? 'var(--btl-block-subject)' : 'var(--btl-block-ink-4)'}
        toLeft
      />
      <HalfBar frac={b} color={bLeads ? 'var(--btl-block-ink-1)' : 'var(--btl-block-ink-4)'} />
      <NumCell dim={!bLeads} align="left">
        {m.comparisonValueCell ? <GatedValue cell={m.comparisonValueCell} width={28} /> : '–'}
      </NumCell>
    </Row>
  );
}

function HalfBar({
  frac,
  color,
  toLeft,
}: {
  frac: number | null;
  color: string;
  toLeft?: boolean;
}) {
  const f = frac === null ? 0 : Math.max(0, Math.min(1, frac));
  return (
    <span
      aria-hidden
      style={{
        display: 'flex',
        justifyContent: toLeft ? 'flex-end' : 'flex-start',
        height: 8,
        padding: toLeft ? '0 4px 0 0' : '0 0 0 4px',
      }}
    >
      {frac === null ? null : <span style={{ width: `${f * 100}%`, background: color }} />}
    </span>
  );
}

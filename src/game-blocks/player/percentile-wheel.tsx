import type { ReactNode } from 'react';
import { PercentileWheel } from '../../stats/percentile-wheel';
import type { MetricState, StatMetric } from '../../stats/stat-metric';
import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  GatedValue,
  NumCell,
  Row,
  Rows,
  Section,
  StatCell,
  useBlockLayout,
  useBlockScale,
  useBlockSkin,
} from '../skin/index';
import type { GameBlockMetricJson, MetricStateJson, PlayerPercentileWheelDataJson } from '../types';

/**
 * Player › Percentile wheel, the reference block for the skin. Percentiles are
 * public (as on the player card); per 90 values and group medians are gated
 * cells. No ordinals, medians or pool counts are drawn: the wheel's slices
 * carry the percentiles.
 *
 * Views: `wheel` (default) and `wheel_rows`, the wheel and every metric's
 * per 90 value under the pool ("vs Premier League wingers, per 90");
 * `compact`, the wheel alone, for card sets; `rows`, the rows alone.
 */

const STATE: Record<MetricStateJson, MetricState> = {
  METRIC_STATE_UNSPECIFIED: 'no-data',
  METRIC_STATE_VALUE: 'value',
  METRIC_STATE_NO_DATA: 'no-data',
  METRIC_STATE_LOCKED: 'locked',
  METRIC_STATE_PENDING: 'pending',
};

export function ordinal(n: number): string {
  const r = Math.round(n);
  const t = r % 100;
  if (t >= 11 && t <= 13) return `${r}th`;
  return `${r}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[r % 10] ?? 'th'}`;
}

/** "Key passes" to "key passes"; "xG" and "PPDA" keep their case. */
export function lowerFirst(label: string): string {
  if (label.length > 1 && label[1] === label[1].toLowerCase()) {
    return label[0].toLowerCase() + label.slice(1);
  }
  return label;
}

/**
 * "Premier League wingers with 900 or more minutes" to "vs Premier League
 * wingers". Never a pool count: `size` is kept for the signature only.
 */
export function groupLabel(phrase: string | undefined, _size?: number): string | null {
  const head = (phrase ?? '').replace(/\s+with\s.*$/i, '').trim();
  if (!head) return null;
  return `vs ${head}`;
}

function hasPercentile(m: GameBlockMetricJson): m is GameBlockMetricJson & { percentile: number } {
  return m.state === 'METRIC_STATE_VALUE' && typeof m.percentile === 'number';
}

/** The highlight the author chose, or the highest percentile. */
export function pickHighlight(
  metrics: GameBlockMetricJson[],
  highlight: string | undefined
): GameBlockMetricJson | undefined {
  const chosen = highlight ? metrics.find((m) => m.key === highlight) : undefined;
  if (chosen) return chosen;
  let best: GameBlockMetricJson | undefined;
  for (const m of metrics) {
    if (hasPercentile(m) && (!best || m.percentile > (best.percentile ?? -1))) best = m;
  }
  return best ?? metrics[0];
}

export function toStatMetric(m: GameBlockMetricJson, family: Map<string, string>): StatMetric {
  return {
    key: m.key ?? '',
    label: m.label ?? '',
    shortLabel: m.shortLabel || m.label || '',
    group: family.get(m.family ?? '') ?? m.family ?? '',
    unit: 'per90',
    // Values and medians are gated: the wheel draws percentiles only.
    value: null,
    percentile: hasPercentile(m) ? m.percentile : null,
    median: null,
    state: STATE[m.state ?? 'METRIC_STATE_UNSPECIFIED'] ?? 'no-data',
  };
}

/**
 * Every metric under the pool ("vs Premier League strikers, per 90"): its
 * name, the per 90 value (bold from the 50th percentile up) and a bar to
 * the percentile, red from the 50th up, ink 4 below. No ordinal is printed.
 */
function MetricRows({ metrics, group }: { metrics: GameBlockMetricJson[]; group: string | null }) {
  const { narrow } = useBlockLayout();
  const cols = `minmax(0, 1fr) 64px ${narrow ? 110 : 96}px`;
  return (
    <Section heading={group ? `${group}, per 90` : 'Per 90'}>
      <div data-wheel-pool="">
        <Rows label="Per 90">
          {metrics.map((m, i) => {
            const pct = hasPercentile(m) ? m.percentile : undefined;
            const high = pct !== undefined && pct >= 50;
            return (
              <Row key={m.key || i} cols={cols} last={i === metrics.length - 1} data-k={m.key}>
                <StatCell>{m.label}</StatCell>
                <NumCell dim={!high}>
                  {m.valueCell ? <GatedValue cell={m.valueCell} width={28} /> : '–'}
                </NumCell>
                {pct !== undefined ? <Bar frac={pct / 100} dim={!high} /> : <span />}
              </Row>
            );
          })}
        </Rows>
      </div>
    </Section>
  );
}

/** The wheel and its rows: side by side on a wide block, stacked on a narrow one. */
function WheelAndRows({ wheel, rows }: { wheel: ReactNode; rows: ReactNode }) {
  const { narrow } = useBlockLayout();
  const scale = useBlockScale();
  if (narrow || !rows) {
    return (
      <>
        {wheel}
        {rows ? <div style={{ marginTop: scale.sectionGap }}>{rows}</div> : null}
      </>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '300px minmax(0, 1fr)',
        columnGap: 40,
        alignItems: 'start',
      }}
    >
      <div style={{ minWidth: 0, paddingTop: 24 }}>{wheel}</div>
      <div style={{ minWidth: 0 }}>{rows}</div>
    </div>
  );
}

export function PlayerPercentileWheelBlock({
  config,
  titleSlot,
  density,
}: GameBlockComponentProps<PlayerPercentileWheelDataJson>) {
  const skin = useBlockSkin();
  const data = config.data ?? {};
  const metrics = data.metrics ?? [];
  const families = data.families ?? [];
  const familyLabel = new Map(families.map((f) => [f.key ?? '', f.label ?? f.key ?? '']));
  const look = config.look ?? 'editorial';
  const view = config.options.view || 'wheel';
  const top = pickHighlight(metrics, config.options.highlight);
  const group = groupLabel(data.groupPhrase, data.groupSize);

  // `compact` (card sets): the wheel alone. `wheel` (the default) and
  // `wheel_rows`: the wheel, then every metric's per 90 value under the pool
  // (the approved design). `rows`: the rows alone. No lead stat in any view.
  const rowsUnder = view === 'wheel' || view === 'wheel_rows' || view === 'rows';
  const rows =
    rowsUnder && metrics.length > 0 ? <MetricRows metrics={metrics} group={group} /> : null;
  const wheel =
    view !== 'rows' && metrics.length > 0 ? (
      <PercentileWheel
        metrics={metrics.map((m) => toStatMetric(m, familyLabel))}
        groupOrder={families.map((f) => f.label ?? f.key ?? '')}
        ariaLabel={`${config.subject.name}, percentiles${group ? ` ${group}` : ''}`}
        focusKeys={top?.key ? [top.key] : null}
        variant="social"
        animate={false}
        labels="short"
        surface={skin.surface}
        announce={false}
        marks={false}
      />
    ) : null;

  const subject = config.subject;

  return (
    <BlockFrame
      look={look}
      title={config.title || subject.name}
      titleSlot={titleSlot}
      subheading={config.subheading}
      media={{
        kind: 'person',
        src: subject.imageUrl,
        crestSrc: subject.crestUrl,
        personId: subject.kind === 'player' ? subject.id : undefined,
      }}
      lockedNote={config.lockedNote}
      density={density}
      exportName={`btl-${subject.name}-percentiles`}
      annotate={
        top?.key ? { target: `[data-wheel-pool] [data-k="${top.key}"] [data-num]` } : undefined
      }
    >
      <WheelAndRows wheel={wheel} rows={rows} />
    </BlockFrame>
  );
}

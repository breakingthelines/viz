import type { ReactNode } from 'react';
import { PercentileWheel } from '../../stats/percentile-wheel';
import type { MetricState, StatMetric } from '../../stats/stat-metric';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  BlockRows,
  GatedValue,
  useBlockSkin,
  type BlockHero,
  type BlockRow,
} from '../skin';
import type { GameBlockMetricJson, MetricStateJson, PlayerPercentileWheelDataJson } from '../types';
import { useGatedCell } from '../values';

/**
 * Player › Percentile wheel, the reference block for the skin. Percentiles are
 * public (as on the player card); per 90 values and group medians are gated
 * cells. The hero is the highlighted metric's per 90 figure, or its percentile
 * when the viewer cannot see the figure.
 *
 * Views: `wheel` (default), `wheel_rows` (the wheel with every metric as a
 * row), `rows` (rows only).
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

/** "Premier League wingers with 900 or more minutes" to "vs 41 Premier League wingers". */
export function groupLabel(phrase: string | undefined, size: number | undefined): string | null {
  const head = (phrase ?? '').replace(/\s+with\s.*$/i, '').trim();
  if (!head) return null;
  return size ? `vs ${size} ${head}` : `vs ${head}`;
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

function toStatMetric(m: GameBlockMetricJson, family: Map<string, string>): StatMetric {
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

function rowOf(m: GameBlockMetricJson): BlockRow {
  return {
    key: m.key ?? '',
    label: m.label ?? '',
    cells: [
      m.valueCell ? <GatedValue cell={m.valueCell} /> : '–',
      hasPercentile(m) ? ordinal(m.percentile) : '–',
    ],
  };
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
  const read = useGatedCell(top?.valueCell);
  const group = groupLabel(data.groupPhrase, data.groupSize);

  let hero: BlockHero | undefined;
  if (top) {
    const name = lowerFirst(top.label ?? '');
    const pct = hasPercentile(top) ? ordinal(top.percentile) : null;
    const median = top.medianCell ? (
      <>
        Median <GatedValue cell={top.medianCell} width={28} />
      </>
    ) : null;
    if (read.state === 'value') {
      hero = {
        figure: read.display ?? String(read.value ?? ''),
        label: `${name} per 90`,
        baseline: [pct, median, group].filter(Boolean),
      };
    } else if (pct) {
      hero = {
        figure: pct,
        label: `${name} percentile`,
        baseline: [
          top.valueCell ? (
            <>
              Per 90 <GatedValue cell={top.valueCell} width={28} />
            </>
          ) : null,
          median,
          group,
        ].filter(Boolean),
      };
    }
  }

  const others = metrics.filter((m) => m !== top && hasPercentile(m));
  const ranked = [...others].sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0));
  let aside: ReactNode = null;
  if (view === 'wheel_rows') {
    aside = <BlockRows columns={[]} rows={metrics.filter((m) => m !== top).map(rowOf)} />;
  } else if (view === 'wheel' && look === 'editorial') {
    aside = <BlockRows columns={[]} rows={ranked.slice(0, 3).map(rowOf)} />;
  }

  const visual =
    view === 'rows' ? (
      <BlockRows columns={['', 'Per 90', 'Pct']} rows={metrics.map(rowOf)} />
    ) : metrics.length > 0 ? (
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
      />
    ) : null;

  const contextParts = [config.subject.subtitle, config.scope.seasonLabel].filter(Boolean);
  const context = contextParts.length > 0 ? contextParts.join(', ') : config.context;
  const subject = config.subject;

  return (
    <BlockFrame
      look={look}
      title={config.title || subject.name}
      titleSlot={titleSlot}
      context={context}
      subheading={config.subheading}
      media={{ kind: 'person', src: subject.imageUrl, crestSrc: subject.crestUrl }}
      hero={hero}
      lockedNote={config.lockedNote}
      density={density}
      exportName={`btl-${subject.name}-percentiles`}
      annotate={top?.key ? { target: `path.btl-pw-slc[data-k="${top.key}"]` } : undefined}
      aside={aside}
    >
      {visual}
    </BlockFrame>
  );
}

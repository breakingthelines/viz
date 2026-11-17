import type { CSSProperties } from 'react';
import { GatedValue, TABULAR, useBlockLayout, useBlockSkin, useBodyFont } from '../skin/index';
import type { LeaguePlayerRankingsCategoryJson } from '../league/types';
import { refName } from './team-league-match-common';

/**
 * Several stats ranked at once (a general or position ask): one small board
 * per stat, two across when there is room. Each board is a section heading
 * over a strong hairline, then a row per player: name, club, value. Paid
 * boards read every name, club and value from their cells.
 */
export function RankingCategories({
  categories,
}: {
  categories: LeaguePlayerRankingsCategoryJson[];
}) {
  const { narrow } = useBlockLayout();
  return (
    <div
      data-ranking-categories=""
      style={{
        display: 'grid',
        gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
        columnGap: 32,
        rowGap: narrow ? 24 : 28,
      }}
    >
      {categories.map((c, i) => (
        <CategoryBoard key={c.metricKey || String(i)} category={c} />
      ))}
    </div>
  );
}

function CategoryBoard({ category }: { category: LeaguePlayerRankingsCategoryJson }) {
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const body = useBodyFont();
  const label = category.metricLabel || category.metricKey || '';
  const heading = category.per90 ? `${label} p90` : label;
  const rows = category.rows ?? [];
  const small = narrow ? 13 : 14;
  const row: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto 3.2em',
    alignItems: 'baseline',
    columnGap: 12,
    padding: '9px 0',
    borderBottom: '1px solid var(--btl-block-line)',
  };
  return (
    <section data-ranking-category={category.metricKey || ''}>
      <h3
        style={{
          margin: 0,
          paddingBottom: 8,
          borderBottom: '1px solid var(--btl-block-line-strong)',
          fontFamily: skin.fontSans,
          fontWeight: 400,
          fontSize: small,
          color: 'var(--btl-block-ink-3)',
        }}
      >
        {heading}
      </h3>
      {rows.map((r, i) => (
        <div
          key={r.player?.id || r.nameCell || String(i)}
          style={{ ...row, borderBottom: i === rows.length - 1 ? 'none' : row.borderBottom }}
        >
          <span
            style={{
              fontFamily: body,
              fontSize: narrow ? 17 : 19,
              color: 'var(--btl-block-ink-1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {r.nameCell ? <GatedValue cell={r.nameCell} width={96} /> : refName(r.player)}
          </span>
          <span
            style={{
              fontFamily: skin.fontSans,
              fontSize: narrow ? 12 : 13,
              color: 'var(--btl-block-ink-3)',
              whiteSpace: 'nowrap',
            }}
          >
            {r.teamCell ? <GatedValue cell={r.teamCell} width={56} /> : refName(r.team, true)}
          </span>
          <span
            style={{
              ...TABULAR,
              fontFamily: skin.fontSans,
              fontWeight: 600,
              fontSize: narrow ? 15 : 16,
              textAlign: 'right',
              color: 'var(--btl-block-ink-1)',
            }}
          >
            {r.valueCell ? <GatedValue cell={r.valueCell} width={28} /> : r.value?.display || '–'}
          </span>
        </div>
      ))}
    </section>
  );
}

import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, type BlockHero } from '../skin/index';
import type { GameBlockCareerRowJson, PlayerCareerDataJson } from './data';
import { baseFrame, TwoPart } from './shared';
import { countLabel } from '#/lib/count';

/**
 * Player › Career. One row per spell, newest first, then the career total.
 * Wholly public. The hero is career appearances.
 */

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

function figures(r: GameBlockCareerRowJson): string[] {
  return [String(r.appearances ?? 0), String(r.goals ?? 0), String(r.assists ?? 0)];
}

export function PlayerCareerBlock(props: GameBlockComponentProps<PlayerCareerDataJson>) {
  const data = props.config.data ?? {};
  const spells = data.rows ?? [];
  const total = careerTotal(data);
  const clubs = new Set(spells.map((r) => r.team?.id || r.team?.name).filter(Boolean)).size;

  const hero: BlockHero | undefined = spells.length
    ? {
        figure: String(total.appearances ?? 0),
        label: 'career appearances',
        baseline: [
          countLabel(total.goals ?? 0, 'goal'),
          countLabel(total.assists ?? 0, 'assist'),
          clubs > 1 ? `${clubs} teams` : null,
        ].filter(Boolean),
      }
    : undefined;

  const rows = [
    ...spells.map((r, i) => ({
      key: `${r.team?.id ?? r.team?.name ?? ''}-${i}`,
      label: <TwoPart main={r.team?.name ?? ''} quiet={r.years} />,
      cells: figures(r),
    })),
    ...(spells.length > 1
      ? [{ key: 'total', label: <strong>Total</strong>, cells: figures(total) }]
      : []),
  ];

  return (
    <BlockFrame
      {...baseFrame(props, 'career')}
      hero={hero}
      aside={rows.length > 0 ? <BlockRows columns={['', 'Apps', 'G', 'A']} rows={rows} /> : null}
    />
  );
}

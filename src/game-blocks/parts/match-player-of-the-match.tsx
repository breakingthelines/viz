import { BlockScale, TABULAR, useBlockSkin } from '../skin/index';
import { oneDecimal, refName, type GameBlockPlayerGradeJson } from './team-league-match-common';

/**
 * The winner's grade on the 0 to 100 scale (grade times ten) as the red fill,
 * the runner-up's as the outlined ring, each named under the scale.
 */
export function PlayerOfTheMatchScale({
  winner,
  runnerUp,
}: {
  winner: GameBlockPlayerGradeJson;
  runnerUp?: GameBlockPlayerGradeJson;
}) {
  const skin = useBlockSkin();
  const w = winner.grade ?? 0;
  const r = runnerUp?.grade;
  const name = (p: GameBlockPlayerGradeJson | undefined) =>
    refName(p?.player, true) || refName(p?.player);
  return (
    <div style={{ ...TABULAR, fontFamily: skin.fontSans }}>
      <BlockScale
        value={w * 10}
        comparator={typeof r === 'number' ? r * 10 : undefined}
        size="hero"
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 6,
          fontSize: 12.5,
          color: 'var(--btl-block-ink-2)',
        }}
      >
        <span>
          <strong style={{ color: 'var(--btl-block-ink-1)' }}>{name(winner)}</strong>{' '}
          {oneDecimal(w)}
        </span>
        {runnerUp && typeof r === 'number' ? (
          <span>
            {name(runnerUp)} {oneDecimal(r)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

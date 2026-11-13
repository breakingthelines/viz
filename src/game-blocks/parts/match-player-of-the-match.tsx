import { BlockScale, TABULAR, useBlockSkin } from '../skin/index';
import {
  gradeScaleLabel,
  gradeToScale,
  oneDecimal,
  refName,
  type GameBlockPlayerGradeJson,
} from './team-league-match-common';

/**
 * The winner's grade on BTL's 1 to 6 scale, lower better, drawn with 1 at the
 * full end: his as the red fill, the runner-up's as the outlined ring, each
 * named under the scale with the real grade.
 */
export function PlayerOfTheMatchScale({
  winner,
  runnerUp,
}: {
  winner: GameBlockPlayerGradeJson;
  runnerUp?: GameBlockPlayerGradeJson;
}) {
  const skin = useBlockSkin();
  const w = winner.grade;
  const r = runnerUp?.grade;
  const name = (p: GameBlockPlayerGradeJson | undefined) =>
    refName(p?.player, true) || refName(p?.player);
  return (
    <div style={{ ...TABULAR, fontFamily: skin.fontSans }}>
      {typeof w === 'number' ? (
        <BlockScale
          value={gradeToScale(w)}
          comparator={typeof r === 'number' ? gradeToScale(r) : undefined}
          size="hero"
          label={gradeScaleLabel(w)}
        />
      ) : null}
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

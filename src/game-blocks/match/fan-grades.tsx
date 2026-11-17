import type { GameBlockComponentProps } from '../block-props';
import {
  Bar,
  BlockFrame,
  NameCell,
  NumCell,
  Row,
  Rows,
  Section,
  Sections,
  clubName,
  playerShort,
  useBlockLayout,
} from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { hasGrade } from '../parts/match-fan-grades';
import {
  gradeScaleLabel,
  gradeToScale,
  oneDecimal,
  type GameBlockPlayerGradeJson,
} from '../parts/team-league-match-common';
import type { MatchFanGradesDataJson } from './types';

/**
 * Match › Fan grades: BTL reader grades on each line-up, 1 the best and 6
 * the worst. Each graded side is a section ("Arsenal, fan grade, 1 is
 * best"): the starting eleven and any graded substitute, each with shirt
 * number, name, the grade drawn on the scale (1 at the full end) and the
 * grade. A side nobody graded is left out.
 */
export function MatchFanGradesBlock(props: GameBlockComponentProps<MatchFanGradesDataJson>) {
  const data = props.config.data ?? {};
  const sides = [
    { name: clubName(data.match?.home?.team?.name), players: data.home ?? [] },
    { name: clubName(data.match?.away?.team?.name), players: data.away ?? [] },
  ].filter((s) => hasGrade(s.players));
  return (
    <BlockFrame {...matchFrame(props, data.match, 'fan-grades')}>
      {sides.length > 0 ? (
        <Sections>
          {sides.map((s, i) => (
            <Section key={s.name || i} heading={`${s.name}, fan grade, 1 is best`}>
              <GradeRows players={s.players} label={s.name} />
            </Section>
          ))}
        </Sections>
      ) : null}
    </BlockFrame>
  );
}

function GradeRows({
  players: all,
  label,
}: {
  players: GameBlockPlayerGradeJson[];
  label: string;
}) {
  const { narrow } = useBlockLayout();
  // The starting eleven in line-up order, and any graded substitute.
  const players = all.filter((p, i) => i < 11 || typeof p.grade === 'number');
  const cols = `22px minmax(0, 1fr) ${narrow ? 50 : 90}px 32px`;
  return (
    <Rows label={label}>
      {players.map((p, i) => {
        const graded = typeof p.grade === 'number';
        return (
          <Row key={p.player?.id || i} cols={cols} last={i === players.length - 1}>
            <NumCell dim>{p.shirtNumber ?? ''}</NumCell>
            <NameCell>{narrow ? playerShort(p.player) : p.player?.name}</NameCell>
            {graded ? (
              <Bar frac={gradeToScale(p.grade!) / 100} label={gradeScaleLabel(p.grade!)} />
            ) : (
              <span />
            )}
            <NumCell dim={!graded}>{graded ? oneDecimal(p.grade) : '–'}</NumCell>
          </Row>
        );
      })}
    </Rows>
  );
}

import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  FactRows,
  Num,
  QuietLines,
  clubName,
  teamCrestSrc,
  useBlockLayout,
  useBlockScale,
  useBlockSkin,
  type BlockHero,
} from '../skin/index';
import { matchFrame } from '../parts/match-common';
import {
  GRADE_BEST,
  GRADE_WORST,
  gradeScaleLabel,
  matchScore,
  matchTitle,
  oneDecimal,
} from '../parts/team-league-match-common';
import type { MatchPlayerOfTheMatchDataJson } from './types';

/**
 * Match › Player of the match: the readers' best graded player, titled by
 * name, the grade as the hero on BTL's 1 to 6 scale (1 best) and drawn to
 * scale, then the club and the votes, and the match in two quiet lines.
 */
export function MatchPlayerOfTheMatchBlock(
  props: GameBlockComponentProps<MatchPlayerOfTheMatchDataJson>
) {
  const data = props.config.data ?? {};
  const winner = data.winner;
  const graded = winner && typeof winner.grade === 'number';
  const hero: BlockHero | undefined = graded
    ? { figure: oneDecimal(winner.grade), label: 'fan grade, 1 is best' }
    : undefined;
  const base = matchFrame(props, data.match, 'player-of-the-match');
  const m = data.match;
  const score = matchScore(m);
  const title =
    props.config.titleOrigin === 'author' || props.config.titleOrigin === 'regista'
      ? base.title
      : winner?.player?.name || base.title;
  return (
    <BlockFrame
      {...base}
      title={title}
      titleNarrow={undefined}
      media={
        winner?.player?.id || winner?.player?.imageUrl
          ? {
              kind: 'person',
              src: winner.player.imageUrl,
              crestSrc: teamCrestSrc(winner.team),
              personId: winner.player.id,
            }
          : base.media
      }
      hero={hero}
    >
      {graded ? <GradeScale grade={winner.grade!} /> : null}
      <div style={{ marginTop: 18 }}>
        <FactRows
          rows={[
            winner?.team?.name ? ['Club', clubName(winner.team.name)] : null,
            data.totalVotes
              ? ['Votes', <Num>{data.totalVotes.toLocaleString('en-GB')}</Num>]
              : null,
          ]}
        />
      </div>
      <QuietLines
        lines={[
          m ? `${matchTitleClean(m)}${score ? `, ${score}` : ''}` : '',
          [m?.competition?.name, m?.roundLabel].filter(Boolean).join(', '),
        ]}
      />
    </BlockFrame>
  );
}

function matchTitleClean(m: Parameters<typeof matchTitle>[0]): string {
  return [clubName(m?.home?.team?.name), clubName(m?.away?.team?.name)].filter(Boolean).join(' v ');
}

/** The grade drawn on the 1 to 6 scale: ticks and numbers, the grade a red dot. */
function GradeScale({ grade }: { grade: number }) {
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const at = (v: number) => `${((v - GRADE_BEST) / (GRADE_WORST - GRADE_BEST)) * 100}%`;
  const ticks = [1, 2, 3, 4, 5, 6];
  return (
    <div
      role="img"
      aria-label={gradeScaleLabel(grade)}
      data-grade-scale=""
      style={{
        position: 'relative',
        width: narrow ? '100%' : 420,
        height: 36,
        marginTop: 16,
        boxSizing: 'border-box',
        padding: '0 7px',
      }}
    >
      <div style={{ position: 'relative', height: '100%' }}>
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 9,
            height: 2,
            background: 'var(--btl-block-track)',
          }}
        />
        {ticks.map((v) => (
          <span key={v} style={{ position: 'absolute', left: at(v), top: 0 }}>
            <span
              style={{
                position: 'absolute',
                left: -0.5,
                top: 5,
                width: 1,
                height: 10,
                background: 'var(--btl-block-ink-4)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: 20,
                transform: 'translateX(-50%)',
                fontFamily: skin.fontSans,
                fontSize: scale.small - 1,
                color: 'var(--btl-block-ink-3)',
              }}
            >
              {v}
            </span>
          </span>
        ))}
        <span
          data-grade-dot=""
          style={{
            position: 'absolute',
            left: at(Math.max(GRADE_BEST, Math.min(GRADE_WORST, grade))),
            top: 3,
            width: 14,
            height: 14,
            marginLeft: -7,
            borderRadius: '50%',
            background: 'var(--btl-block-subject)',
          }}
        />
      </div>
    </div>
  );
}

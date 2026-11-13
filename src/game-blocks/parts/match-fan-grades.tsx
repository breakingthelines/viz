import { BlockScale, TABULAR, useBlockLayout, useBlockSkin } from '../skin/index';
import {
  gradeScaleLabel,
  gradeToScale,
  oneDecimal,
  refName,
  type GameBlockPlayerGradeJson,
} from './team-league-match-common';
import { BlockGrid, ScaleCell, SectionLabel } from './team-league-match-ui';

/** Whether any reader graded one of these players. */
export function hasGrade(players: GameBlockPlayerGradeJson[]): boolean {
  return players.some((p) => typeof p.grade === 'number');
}

/**
 * The best graded player across both sides, the lowest grade on BTL's 1 to 6
 * scale; the earlier listed one on a tie.
 */
export function topGraded(
  players: GameBlockPlayerGradeJson[]
): GameBlockPlayerGradeJson | undefined {
  let best: GameBlockPlayerGradeJson | undefined;
  for (const p of players) {
    if (typeof p.grade !== 'number') continue;
    if (!best || p.grade < (best.grade ?? Infinity)) best = p;
  }
  return best;
}

/**
 * One side as a list, best grade first: player, grade, votes, and the grade on
 * the scale (1 at the full end) with the team average as the tick.
 */
export function GradeList({
  players,
  average,
}: {
  players: GameBlockPlayerGradeJson[];
  average?: number;
}) {
  const graded = [...players].sort((a, b) => (a.grade ?? Infinity) - (b.grade ?? Infinity));
  return (
    <BlockGrid
      label="Fan grades"
      columns={[
        { label: '' },
        { label: 'Grade', strong: true },
        { label: 'Votes', wide: true },
        { label: '', width: 'auto' },
      ]}
      rows={graded.map((p, i) => ({
        key: p.player?.id || String(i),
        cells: [
          refName(p.player, true) || refName(p.player),
          typeof p.grade === 'number' ? oneDecimal(p.grade) : '–',
          p.votes ? String(p.votes) : '',
          typeof p.grade === 'number' ? (
            <ScaleCell>
              <BlockScale
                value={gradeToScale(p.grade)}
                median={typeof average === 'number' ? gradeToScale(average) : undefined}
                size="row"
                label={gradeScaleLabel(p.grade)}
              />
            </ScaleCell>
          ) : null,
        ],
      }))}
    />
  );
}

/** "3:2" to [3, 2]. */
function gridOf(g: string | undefined): [number, number] | null {
  const m = /^(\d+):(\d+)$/.exec(g ?? '');
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * One side in its formation: a line per grid row, goalkeeper first, each
 * player's grade over his name. The match's best grade carries the red rule.
 * Substitutes, who have no grid slot, follow as one plain line.
 */
export function GradePitch({
  players,
  top,
}: {
  players: GameBlockPlayerGradeJson[];
  top?: GameBlockPlayerGradeJson;
}) {
  const skin = useBlockSkin();
  const lines = new Map<number, [number, GameBlockPlayerGradeJson][]>();
  const subs: GameBlockPlayerGradeJson[] = [];
  for (const p of players) {
    const g = gridOf(p.grid);
    if (!g) {
      if (typeof p.grade === 'number') subs.push(p);
      continue;
    }
    lines.set(g[0], [...(lines.get(g[0]) ?? []), [g[1], p]]);
  }
  const rows = [...lines.entries()].sort((a, b) => a[0] - b[0]);
  return (
    <div style={{ ...TABULAR, fontFamily: skin.fontSans }}>
      {rows.map(([row, list]) => (
        <div
          key={row}
          role="list"
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            gap: 4,
            padding: '6px 0',
            borderTop: '1px solid var(--btl-block-line)',
          }}
        >
          {list
            .sort((a, b) => a[0] - b[0])
            .map(([col, p]) => {
              const isTop = !!top && p === top;
              return (
                <span
                  key={col}
                  role="listitem"
                  data-top-grade={isTop ? '' : undefined}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 0,
                    flex: '1 1 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--btl-block-ink-1)',
                      paddingBottom: 1,
                      borderBottom: isTop
                        ? '2px solid var(--btl-block-subject)'
                        : '2px solid transparent',
                    }}
                  >
                    {typeof p.grade === 'number' ? oneDecimal(p.grade) : '–'}
                  </span>
                  <span
                    style={{
                      marginTop: 2,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 11.5,
                      color: 'var(--btl-block-ink-3)',
                    }}
                  >
                    {refName(p.player, true) || refName(p.player)}
                  </span>
                </span>
              );
            })}
        </div>
      ))}
      {subs.length > 0 ? (
        <p
          style={{
            margin: 0,
            padding: '6px 0 0',
            borderTop: '1px solid var(--btl-block-line)',
            fontSize: 12.5,
            color: 'var(--btl-block-ink-3)',
          }}
        >
          {subs
            .map((p) => `${refName(p.player, true) || refName(p.player)} ${oneDecimal(p.grade)}`)
            .join(', ')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Both sides, each under its name and average: side by side when wide, stacked
 * on a phone. A side with no graded player is left out, so no header stands
 * over an empty row.
 */
export function FanGradeSides({
  sides,
  view,
  top,
}: {
  sides: {
    name: string;
    players: GameBlockPlayerGradeJson[];
    average?: number;
    formation?: string;
  }[];
  view: 'pitch' | 'list';
  top?: GameBlockPlayerGradeJson;
}) {
  const { narrow } = useBlockLayout();
  const shown = sides.filter((s) => hasGrade(s.players));
  if (shown.length === 0) return null;
  return (
    <div
      style={{
        display: narrow || view === 'list' ? 'block' : 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 24,
      }}
    >
      {shown.map((s, i) => (
        <section key={s.name || i} aria-label={s.name}>
          <SectionLabel first={i === 0 || (!narrow && view === 'pitch')}>
            {[
              s.name,
              view === 'pitch' ? s.formation : undefined,
              typeof s.average === 'number' ? `average ${oneDecimal(s.average)}` : undefined,
            ]
              .filter(Boolean)
              .join(', ')}
          </SectionLabel>
          {view === 'pitch' ? (
            <GradePitch players={s.players} top={top} />
          ) : (
            <GradeList players={s.players} average={s.average} />
          )}
        </section>
      ))}
    </div>
  );
}

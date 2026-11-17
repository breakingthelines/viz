import { useEffect, useRef, useState } from 'react';
import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  CrestCell,
  LabelCell,
  NumCell,
  Row,
  Rows,
  SectionHeading,
  TABULAR,
  playerHeadshotUrl,
  resolveMediaSrc,
  teamCrestSrc,
  useBlockLayout,
  useBlockScale,
  useBlockSkin,
  useMediaBase,
  useWordStyle,
} from '../skin/index';
import { matchFrame } from '../parts/match-common';
import { playerPagePath } from '../player/orbit-links';
import {
  PHASE_LABEL,
  SHOOTOUT_LABEL,
  howLine,
  isGoalRow,
  shortName,
  timelineModel,
  type ShootoutKick,
  type TimelineModel,
  type TimelineRow,
} from '../parts/timeline-model';
import type { GameBlockMatchJson } from '../parts/team-league-match-common';
import type { MatchTimelineDataJson } from './types';

/**
 * Match › Timeline (direction B): the small score, a minimal strip, then the
 * goals and red cards as a list under "First half" and "Second half". The
 * strip draws dots only (an own goal a hollow ring, a red card a red card),
 * home above the line and away below, a crest at the start of each lane;
 * each half is its own segment and runs on by its stoppage time, so 90+2'
 * and 90+6' sit apart and in order. Each row: the minute, the side's crest,
 * the player's headshot, the name, how it came ("Assist Mazraoui",
 * "Penalty", "Own goal", "Second yellow") and the running score. No
 * substitutions, yellow cards or VAR checks. A match decided on penalties
 * ends with "Penalty shootout": each kick in order, Scored or Missed, and the
 * running shootout score; kicks are never on the strip or in the score.
 */
export function MatchTimelineBlock(props: GameBlockComponentProps<MatchTimelineDataJson>) {
  const data = props.config.data ?? {};
  const model = timelineModel(data);
  const match = data.match;
  return (
    <BlockFrame
      {...matchFrame(props, match, 'timeline')}
      annotate={{ target: '[data-timeline-row] [data-num]' }}
    >
      <TimelineBody model={model} match={match} />
    </BlockFrame>
  );
}

/**
 * The strip and the list share one highlight: hovering or focusing a row, or
 * hovering, focusing or tapping its dot, lights both. A saved image is drawn
 * still, with no highlight and nothing focusable.
 */
function TimelineBody({
  model,
  match,
}: {
  model: TimelineModel;
  match: GameBlockMatchJson | undefined;
}) {
  const { look, capturing } = useBlockLayout();
  const scale = useBlockScale();
  const [active, setActive] = useState<number | undefined>(undefined);
  const live = !capturing;
  const hl = live ? { active, setActive } : { active: undefined, setActive: () => {} };
  return (
    <>
      {look === 'poster' ? null : <SmallScore match={match} />}
      {model.rows.length > 0 || model.shootout.length > 0 ? (
        <>
          {model.rows.length > 0 ? (
            <div style={{ marginTop: look === 'poster' ? 0 : scale.sectionGap }}>
              <MiniStrip model={model} match={match} hl={hl} interactive={live} />
            </div>
          ) : null}
          <div style={{ marginTop: scale.sectionGap }}>
            <EventList model={model} match={match} hl={hl} interactive={live} />
          </div>
        </>
      ) : null}
    </>
  );
}

interface Highlight {
  active: number | undefined;
  setActive: (i: number | undefined) => void;
}

/** "Dorgu 90+6', 4-4": a dot's name, minute and the score after it. */
export function markLabel(r: TimelineRow): string {
  const who = r.player ? shortName(r.player) : 'Goal';
  const tail = r.score ? `, ${r.score[0]}-${r.score[1]}` : `, ${howLine(r)}`;
  return `${who} ${r.minute}'${tail}`;
}

function SmallScore({ match }: { match: GameBlockMatchJson | undefined }) {
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const { look } = useBlockLayout();
  if (!match) return null;
  return (
    <div
      data-block-anchor="hero"
      style={{
        ...TABULAR,
        fontFamily: look === 'editorial' ? skin.fontSerif : skin.fontSans,
        fontWeight: 700,
        fontSize: Math.round(scale.hero * 0.6),
        lineHeight: 0.9,
        letterSpacing: '-0.02em',
        color: 'var(--btl-block-ink-1)',
        display: 'inline-block',
      }}
    >
      {match.home?.score ?? 0}-{match.away?.score ?? 0}
    </div>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** The strip's x for a row, in px from the left. */
export function stripX(
  r: Pick<TimelineRow, 'base' | 'added' | 'phase'>,
  reach: [number, number],
  width: number,
  x0: number,
  gap: number
): number {
  const w1 = 45 + reach[0];
  const w2 = 45 + reach[1];
  const sc = (width - x0 - gap) / (w1 + w2);
  if (r.phase === 1) return x0 + (Math.min(r.base, 45) + r.added) * sc;
  return x0 + w1 * sc + gap + (Math.min(r.base, 90) - 45 + r.added) * sc;
}

function MiniStrip({
  model,
  match,
  hl,
  interactive,
}: {
  model: TimelineModel;
  match: GameBlockMatchJson | undefined;
  hl: Highlight;
  interactive: boolean;
}) {
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const [ref, measured] = useWidth<HTMLDivElement>();
  const width = measured || (narrow ? 358 : 680);
  const x0 = narrow ? 26 : 30;
  const gap = 8;
  const { reach } = model;
  const w1 = 45 + reach[0];
  const w2 = 45 + reach[1];
  const sc = (width - x0 - gap) / (w1 + w2);
  const e1 = x0 + 45 * sc;
  const e1s = x0 + w1 * sc;
  const s2 = e1s + gap;
  const e2 = s2 + 45 * sc;
  const e2s = s2 + w2 * sc;
  const LY = 22;
  const H = 52;
  const crest = narrow ? 15 : 16;
  const last = { home: -99, away: -99 };
  const marks = model.rows
    .map((r, index) => ({ r, index }))
    .filter(({ r }) => (isGoalRow(r) || r.kind === 'red') && r.phase <= 2)
    .map(({ r, index }) => {
      let px = stripX(r, reach, width, x0, gap);
      if (px - last[r.side] < 11) px = last[r.side] + 11;
      last[r.side] = px;
      return { r, index, px, y: r.side === 'home' ? LY - 10 : LY + 10 };
    });
  const mediaBase = useMediaBase();
  const crestOf = (side: 'home' | 'away') =>
    resolveMediaSrc(teamCrestSrc(match?.[side]?.team), mediaBase);
  const line = (a: number, b: number, dotted?: boolean) => (
    <line
      x1={a}
      x2={b}
      y1={LY}
      y2={LY}
      stroke={dotted ? 'var(--btl-block-ink-4)' : 'var(--btl-block-line-strong)'}
      strokeWidth={1}
      strokeDasharray={dotted ? '1 3' : undefined}
    />
  );
  return (
    <div
      ref={ref}
      data-mini-strip=""
      role={interactive ? 'group' : 'img'}
      aria-label={
        interactive ? 'Goals and red cards' : marks.map(({ r }) => markLabel(r)).join('; ')
      }
      style={{ position: 'relative', height: H }}
    >
      {(['home', 'away'] as const).map((side) => {
        const src = crestOf(side);
        return src ? (
          <img
            key={side}
            src={src}
            alt=""
            style={{
              position: 'absolute',
              left: 0,
              top: (side === 'home' ? LY - 10 : LY + 10) - crest / 2,
              width: crest,
              height: crest,
              objectFit: 'contain',
            }}
          />
        ) : null;
      })}
      <svg
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        aria-hidden={!interactive}
        style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
      >
        {line(x0, e1)}
        {reach[0] ? line(e1, e1s, true) : null}
        {line(s2, e2)}
        {reach[1] ? line(e2, e2s, true) : null}
        {[e1, e2].map((x) => (
          <line key={x} x1={x} x2={x} y1={LY - 3} y2={LY + 3} stroke="var(--btl-block-ink-4)" />
        ))}
        {[
          [e1, "45'"],
          [e2, "90'"],
        ].map(([x, t]) => (
          <text
            key={t as string}
            x={x as number}
            y={H - 4}
            textAnchor="middle"
            fontFamily={skin.fontSans}
            fontSize={11}
            fill="var(--btl-block-ink-3)"
          >
            {t}
          </text>
        ))}
        {marks.map(({ r, index, px, y }) => {
          const on = hl.active === index;
          const shape =
            r.kind === 'red' ? (
              <rect
                x={px - 3}
                y={y - 4.5}
                width={6}
                height={9}
                rx={1}
                fill="var(--btl-block-card-red)"
              />
            ) : r.kind === 'og' ? (
              <circle
                cx={px}
                cy={y}
                r={4}
                fill="none"
                stroke="var(--btl-block-ink-1)"
                strokeWidth={1.5}
              />
            ) : (
              <circle cx={px} cy={y} r={4.5} fill="var(--btl-block-ink-1)" />
            );
          if (!interactive) return <g key={index}>{shape}</g>;
          return (
            <g
              key={index}
              role="button"
              tabIndex={0}
              aria-label={markLabel(r)}
              data-strip-mark={index}
              onMouseEnter={() => hl.setActive(index)}
              onMouseLeave={() => hl.setActive(undefined)}
              onFocus={() => hl.setActive(index)}
              onBlur={() => hl.setActive(undefined)}
              onClick={() => hl.setActive(index)}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <circle cx={px} cy={y} r={11} fill="transparent" />
              {on ? (
                <circle
                  cx={px}
                  cy={y}
                  r={8}
                  fill="none"
                  stroke="var(--btl-block-ink-3)"
                  strokeWidth={1}
                />
              ) : null}
              {shape}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EventList({
  model,
  match,
  hl,
  interactive,
}: {
  model: TimelineModel;
  match: GameBlockMatchJson | undefined;
  hl: Highlight;
  interactive: boolean;
}) {
  const { narrow } = useBlockLayout();
  const phases = [...new Set(model.rows.map((r) => r.phase))];
  const cols = `${narrow ? 44 : 56}px 16px 24px minmax(0, 1fr) auto`;
  return (
    <div style={{ display: 'grid', rowGap: 24 }}>
      {phases.map((p) => {
        const rows = model.rows.map((r, index) => ({ r, index })).filter(({ r }) => r.phase === p);
        return (
          <section key={p}>
            <SectionHeading>{PHASE_LABEL[p]}</SectionHeading>
            <Rows label={PHASE_LABEL[p]}>
              {rows.map(({ r, index }, i) => (
                <EventRow
                  key={index}
                  r={r}
                  match={match}
                  cols={cols}
                  last={i === rows.length - 1}
                  active={hl.active === index}
                  onActive={(on) => hl.setActive(on ? index : undefined)}
                  interactive={interactive}
                />
              ))}
            </Rows>
          </section>
        );
      })}
      {model.shootout.length > 0 ? (
        <section data-timeline-shootout="">
          <SectionHeading>{SHOOTOUT_LABEL}</SectionHeading>
          <Rows label={SHOOTOUT_LABEL}>
            {model.shootout.map((k, i) => (
              <EventRow
                key={`kick-${k.order}`}
                r={kickRow(k)}
                kick={k}
                match={match}
                cols={cols}
                last={i === model.shootout.length - 1}
                active={false}
                onActive={() => {}}
                interactive={interactive}
              />
            ))}
          </Rows>
        </section>
      ) : null}
    </div>
  );
}

/** A kick as a list row: the side and taker, with no minute or match score. */
function kickRow(k: ShootoutKick): TimelineRow {
  return {
    kind: k.scored ? 'pen' : 'penmiss',
    side: k.side,
    minute: '',
    base: 120,
    added: 0,
    phase: 4,
    player: k.player,
  };
}

function EventRow({
  r,
  kick,
  match,
  cols,
  last,
  active,
  onActive,
  interactive,
}: {
  r: TimelineRow;
  /** A shootout kick: its number leads, "Scored" or "Missed", the shootout score. */
  kick?: ShootoutKick;
  match: GameBlockMatchJson | undefined;
  cols: string;
  last: boolean;
  active: boolean;
  onActive: (on: boolean) => void;
  interactive: boolean;
}) {
  const { narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const word = useWordStyle();
  const how = kick ? (kick.scored ? 'Scored' : 'Missed') : howLine(r);
  const score = kick ? kick.score : r.score;
  const team = match?.[r.side]?.team;
  const href =
    interactive && r.player?.id
      ? playerPagePath({ id: r.player.id, name: r.player.name ?? '', url: r.player.url })
      : undefined;
  const row = (
    <Row
      cols={cols}
      last={last}
      style={{
        padding: '7px 0',
        boxSizing: 'border-box',
        background: active ? 'var(--btl-block-line)' : undefined,
        transition: 'background 120ms ease',
      }}
      data-timeline-row={!kick && isGoalRow(r) ? '' : undefined}
      data-timeline-kick={kick ? (kick.scored ? 'scored' : 'missed') : undefined}
      data-timeline-active={active ? '' : undefined}
    >
      <LabelCell>{kick ? String(kick.order) : `${r.minute}'`}</LabelCell>
      <CrestCell src={teamCrestSrc(team)} />
      <Headshot player={r.player} fallback={teamCrestSrc(team)} />
      <span
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: narrow ? 'column' : 'row',
          alignItems: narrow ? 'flex-start' : 'baseline',
          columnGap: 12,
        }}
      >
        <span
          style={{
            ...word,
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            maxWidth: '100%',
          }}
        >
          {r.player ? shortName(r.player) : 'Goal'}
          {r.kind === 'red' ? (
            <i
              aria-hidden
              style={{
                display: 'inline-block',
                width: 7,
                height: 10,
                borderRadius: 1,
                marginLeft: 8,
                background: 'var(--btl-block-card-red)',
              }}
            />
          ) : null}
        </span>
        {how ? (
          <span
            style={{
              fontFamily: skin.fontSans,
              fontSize: scale.small,
              color: 'var(--btl-block-ink-3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {how}
          </span>
        ) : null}
      </span>
      {score ? <NumCell>{`${score[0]}-${score[1]}`}</NumCell> : <span />}
    </Row>
  );
  if (!interactive) return row;
  const events = {
    onMouseEnter: () => onActive(true),
    onMouseLeave: () => onActive(false),
    onFocus: () => onActive(true),
    onBlur: () => onActive(false),
  };
  return href ? (
    <a
      href={href}
      data-timeline-link=""
      {...events}
      style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
    >
      {row}
    </a>
  ) : (
    <div {...events}>{row}</div>
  );
}

/** The player's headshot, small and round; the club's crest when there is none. */
function Headshot({ player, fallback }: { player: TimelineRow['player']; fallback?: string }) {
  const mediaBase = useMediaBase();
  const head =
    resolveMediaSrc(player?.imageUrl, mediaBase) ??
    (player?.id ? playerHeadshotUrl(mediaBase, player.id) : undefined);
  const crest = resolveMediaSrc(fallback, mediaBase);
  const [failed, setFailed] = useState(false);
  const src = !failed && head ? head : crest;
  const round = !failed && !!head;
  return (
    <span role="cell" style={{ display: 'flex', alignItems: 'center' }}>
      {src ? (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          style={{
            width: 24,
            height: 24,
            borderRadius: round ? '50%' : 0,
            objectFit: round ? 'cover' : 'contain',
            objectPosition: 'top',
            background: round ? 'var(--btl-block-track)' : 'transparent',
          }}
        />
      ) : null}
    </span>
  );
}

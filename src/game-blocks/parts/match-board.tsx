import type { CSSProperties } from 'react';
import { TABULAR, surname, useBlockLayout, useBlockScale, useBlockSkin, useWordStyle } from '../skin/index';
import type { GameBlockScorerJson } from '../match/types';
import {
  formatDay,
  kickoffParts,
  type GameBlockMatchJson,
  type GameBlockSideJson,
} from './team-league-match-common';

/**
 * A match's score board (style.md, Match result): each side's score with its
 * scorers under it, mirrored from the centre. The home team's scorers are
 * right-aligned under its score, the away team's left-aligned under its
 * score, one line per scorer with minutes joined ("Barry 56', 61'").
 */

/** One line per scorer, in first-goal order: "Barry 56', 61'", "Cunha 34' og". */
export function scorerRuns(scorers: GameBlockScorerJson[], side: GameBlockSideJson): string[] {
  const out = new Map<string, string[]>();
  for (const s of scorers) {
    if (s.side !== side) continue;
    const name = s.player?.name ? surname(s.player.name) : (s.player?.shortName ?? '');
    const key = `${name}${s.detail === 'og' ? ' og' : ''}`;
    const minute = `${s.minute ?? ''}'${s.detail === 'pen' ? ' pen' : ''}`;
    out.set(key, [...(out.get(key) ?? []), minute]);
  }
  return [...out.entries()].map(([name, mins]) =>
    name.endsWith(' og') ? `${name.slice(0, -3)} ${mins.join(', ')} og` : `${name} ${mins.join(', ')}`
  );
}

/**
 * The two scores and the scorers. `size` is the figure size: the hero
 * (default), or `small` over a timeline. On the poster the board sits on the
 * art's lower edge in the condensed face.
 */
export function ScoreBoard({
  match,
  scorers = [],
  small,
}: {
  match: GameBlockMatchJson | undefined;
  scorers?: GameBlockScorerJson[];
  small?: boolean;
}) {
  const { look, narrow } = useBlockLayout();
  const skin = useBlockSkin();
  const scale = useBlockScale();
  const word = useWordStyle();
  const h = match?.home?.score;
  const a = match?.away?.score;
  if (typeof h !== 'number' || typeof a !== 'number') return null;
  const poster = look === 'poster';
  const serif = look === 'editorial';
  const size = small ? Math.round(scale.hero * 0.55) : poster ? Math.round(scale.hero * 1.4) : scale.hero;
  const fig: CSSProperties = {
    ...TABULAR,
    fontFamily: serif ? skin.fontSerif : skin.fontCondensed,
    fontWeight: 700,
    fontSize: size,
    lineHeight: 0.9,
    letterSpacing: '-0.02em',
    color: 'var(--btl-block-ink-1)',
  };
  const lines = (side: GameBlockSideJson) => scorerRuns(scorers, side);
  const home = lines('GAME_BLOCK_SIDE_HOME');
  const away = lines('GAME_BLOCK_SIDE_AWAY');
  const winner = h > a ? 'home' : a > h ? 'away' : undefined;
  const scorerList = (runs: string[], align: 'left' | 'right', label: string) =>
    runs.length > 0 ? (
      <ul
        aria-label={label}
        style={{
          listStyle: 'none',
          margin: '10px 0 0',
          padding: 0,
          textAlign: align,
          ...word,
          lineHeight: 1.35,
        }}
      >
        {runs.map((r) => (
          <li key={r} style={{ whiteSpace: 'nowrap' }}>
            {r}
          </li>
        ))}
      </ul>
    ) : null;
  return (
    <div
      data-score-board=""
      role="group"
      aria-label={`Score ${h}-${a}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto auto',
        justifyContent: 'start',
        columnGap: small ? 12 : narrow ? 14 : 16,
        alignItems: 'start',
        marginTop: poster ? -Math.round(size * 0.32) : 0,
        paddingLeft: poster ? (narrow ? 14 : 20) : 0,
        position: 'relative',
      }}
    >
      <div style={{ textAlign: 'right' }}>
        <div data-score="home" data-block-anchor={winner === 'home' ? 'hero' : undefined} style={fig}>
          {h}
        </div>
        {small ? null : scorerList(home, 'right', 'Home scorers')}
      </div>
      <div
        aria-hidden
        style={{ ...fig, fontWeight: serif ? 400 : 700, color: 'var(--btl-block-ink-3)' }}
      >
        -
      </div>
      <div style={{ textAlign: 'left' }}>
        <div data-score="away" data-block-anchor={winner === 'away' ? 'hero' : undefined} style={fig}>
          {a}
        </div>
        {small ? null : scorerList(away, 'left', 'Away scorers')}
      </div>
    </div>
  );
}

/** "Premier League, Matchday 9" and "1 Nov 2026, Anfield": the two quiet lines under a score. */
export function matchQuietLines(match: GameBlockMatchJson | undefined): string[] {
  if (!match) return [];
  const ko = kickoffParts(match.kickoff);
  const first = [match.competition?.name, match.roundLabel].filter(Boolean).join(', ');
  const second = [ko ? formatDay(ko.day) : '', match.venue].filter(Boolean).join(', ');
  return [first, second].filter(Boolean);
}

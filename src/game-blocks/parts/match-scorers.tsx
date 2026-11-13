import { useBlockLayout, useBodyFont } from '../skin/index';
import type { GameBlockScorerJson } from '../match/types';
import { refName, type GameBlockSideJson } from './team-league-match-common';

/** "Saka 23', 67' pen" per scorer, in first-goal order. */
export function scorerLines(scorers: GameBlockScorerJson[], side: GameBlockSideJson): string[] {
  const out = new Map<string, string[]>();
  for (const s of scorers) {
    if (s.side !== side) continue;
    const name = refName(s.player, true) || refName(s.player);
    const minute = `${s.minute ?? ''}'${s.detail ? ` ${s.detail}` : ''}`;
    out.set(name, [...(out.get(name) ?? []), minute]);
  }
  return [...out.entries()].map(([name, mins]) => `${name} ${mins.join(', ')}`);
}

/** Scorers under each side: home left, away right. */
export function ScorerColumns({ scorers }: { scorers: GameBlockScorerJson[] }) {
  const font = useBodyFont();
  const { look } = useBlockLayout();
  const home = scorerLines(scorers, 'GAME_BLOCK_SIDE_HOME');
  const away = scorerLines(scorers, 'GAME_BLOCK_SIDE_AWAY');
  const list = (lines: string[], align: 'left' | 'right', label: string) => (
    <ul
      aria-label={label}
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        textAlign: align,
        fontFamily: font,
        fontSize: look === 'editorial' ? 16 : 14,
        lineHeight: 1.45,
        color: 'var(--btl-block-ink-2)',
      }}
    >
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 16,
        borderTop: '1px solid var(--btl-block-line-strong)',
        paddingTop: 8,
      }}
    >
      {list(home, 'left', 'Home scorers')}
      {list(away, 'right', 'Away scorers')}
    </div>
  );
}

import type { GameBlockComponentProps } from '../block-props';
import type { BlockFrameProps, BlockHero } from '../skin/index';
import {
  kickoffParts,
  matchLine,
  matchScore,
  matchTitle,
  penaltiesNote,
  statusLabel,
  type GameBlockMatchJson,
} from './team-league-match-common';
import { frameBase } from './team-league-match-ui';

/**
 * The score as the hero once a match is under way ("2-1", "full time"), else
 * the kick-off time, else nothing.
 */
export function matchHero(match: GameBlockMatchJson | undefined): BlockHero | undefined {
  if (!match) return undefined;
  const score = matchScore(match);
  if (score) {
    const pens = penaltiesNote(match);
    return {
      figure: score,
      label: (statusLabel(match.status) || 'score').toLowerCase(),
      baseline: pens ? [pens] : undefined,
    };
  }
  const status = statusLabel(match.status);
  if (status) return undefined;
  const ko = kickoffParts(match.kickoff);
  return ko ? { figure: ko.time, label: 'kick-off' } : undefined;
}

/** Frame props for a match block: both crests, the match line as context. */
export function matchFrame(
  props: GameBlockComponentProps<unknown>,
  match: GameBlockMatchJson | undefined,
  noun: string
): Omit<BlockFrameProps, 'children'> {
  const home = match?.home?.team?.imageUrl;
  const away = match?.away?.team?.imageUrl;
  const base = frameBase(props, {
    context: matchLine(props.config, match),
    noun,
    media: home || away ? { kind: 'pair', src: home || away, pairSrc: away } : undefined,
  });
  return { ...base, title: props.config.title || matchTitle(match) || base.title };
}

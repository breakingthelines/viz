import type { GameBlockComponentProps } from '../block-props';
import { clubFit, teamCrestSrc, type BlockFrameProps, type BlockHero } from '../skin/index';
import {
  kickoffParts,
  matchLine,
  matchScore,
  matchTitle,
  penaltiesNote,
  statusLabel,
  type GameBlockMatchJson,
} from './team-league-match-common';
import { blockTitle, frameBase } from './team-league-match-ui';

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

/** Frame props for a match block: both crests as the title art, "Home v Away" as the title. */
export function matchFrame(
  props: GameBlockComponentProps<unknown>,
  match: GameBlockMatchJson | undefined,
  noun: string
): Omit<BlockFrameProps, 'children'> {
  const home = teamCrestSrc(match?.home?.team);
  const away = teamCrestSrc(match?.away?.team);
  const base = frameBase(props, {
    context: matchLine(props.config, match),
    noun,
    media:
      home || away
        ? { kind: 'pair', src: home || away, pairSrc: home ? away : undefined }
        : undefined,
  });
  const title = blockTitle(props.config, matchTitle(match));
  const origin = props.config.titleOrigin;
  const authored = origin === 'author' || origin === 'regista';
  const fit = (n: string | undefined) => clubFit(n, true);
  const titleNarrow =
    !authored && match?.home?.team?.name && match?.away?.team?.name
      ? `${fit(match.home.team.name)} v ${fit(match.away.team.name)}`
      : undefined;
  return { ...base, title, titleNarrow };
}

import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, type BlockHero } from '../skin/index';
import { TenureRows } from '../parts/team-manager-tenures';
import { frameBase } from '../parts/team-league-match-ui';
import type { ManagerRecordDataJson } from './types';

/**
 * Team › Manager record: a coach's spells, newest first. The hero is his
 * career win rate, the tick every spell's scale is read against.
 */
export function ManagerRecordBlock(props: GameBlockComponentProps<ManagerRecordDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const tenures = data.tenures ?? [];
  const rate = data.careerWinRate;
  const games = tenures.reduce((n, t) => n + (t.played ?? 0), 0);
  const hero: BlockHero | undefined =
    typeof rate === 'number'
      ? {
          figure: `${Math.round(rate)}%`,
          label: 'career win rate',
          baseline: games > 0 ? [`${games} games`] : undefined,
        }
      : undefined;
  const coach = data.coach;
  const subject = config.subject;
  // A team subject still shows its current manager's name as the title.
  const title =
    config.titleOrigin === 'default' && subject.kind === 'team' && coach?.name
      ? coach.name
      : config.title || subject.name;
  const current = tenures.find((t) => !t.to)?.team?.name;
  const context =
    subject.kind === 'coach' ? current || subject.subtitle || config.context : subject.name;
  const image = coach?.imageUrl || (subject.kind === 'coach' ? subject.imageUrl : undefined);
  return (
    <BlockFrame
      {...frameBase(props, {
        context: context || config.context,
        noun: 'manager',
        media: { kind: 'person', src: image, crestSrc: subject.crestUrl },
      })}
      title={title}
      hero={hero}
      aside={tenures.length > 0 ? <TenureRows tenures={tenures} careerWinRate={rate} /> : null}
    />
  );
}

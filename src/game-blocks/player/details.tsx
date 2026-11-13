import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, type BlockHero } from '../skin/index';
import type { PlayerDetailsDataJson } from './data';
import { baseFrame, oneDecimal, shortDate } from './shared';

/**
 * Player › Details. Age, height, foot, nationality, position and contract.
 * Wholly public. The hero is his age, against his squad's average age.
 */

export function detailRows(
  d: PlayerDetailsDataJson
): { key: string; label: string; value: string }[] {
  const dob = d.dateOfBirth ? `${shortDate(d.dateOfBirth)} ${d.dateOfBirth.slice(0, 4)}` : '';
  return [
    { key: 'team', label: 'Team', value: d.team?.name ?? '' },
    { key: 'position', label: 'Position', value: d.position ?? '' },
    { key: 'nationality', label: 'Nationality', value: d.nationality ?? '' },
    { key: 'born', label: 'Born', value: dob },
    { key: 'height', label: 'Height', value: d.heightCm ? `${d.heightCm} cm` : '' },
    { key: 'foot', label: 'Foot', value: d.foot ?? '' },
    {
      key: 'contract',
      label: 'Contract',
      value: d.contractEnd ? shortDate(d.contractEnd, true) : '',
    },
  ].filter((r) => r.value);
}

export function PlayerDetailsBlock(props: GameBlockComponentProps<PlayerDetailsDataJson>) {
  const data = props.config.data ?? {};
  const hero: BlockHero | undefined =
    typeof data.age === 'number'
      ? {
          figure: String(data.age),
          label: 'age',
          baseline:
            typeof data.squadAverageAge === 'number'
              ? [`Squad average ${oneDecimal(data.squadAverageAge)}`]
              : [],
        }
      : undefined;
  const rows = detailRows(data).map((r) => ({ key: r.key, label: r.label, cells: [r.value] }));

  return (
    <BlockFrame
      {...baseFrame(props, 'details')}
      context={props.config.subject.subtitle || props.config.context}
      hero={hero}
      aside={rows.length > 0 ? <BlockRows columns={[]} rows={rows} /> : null}
    />
  );
}

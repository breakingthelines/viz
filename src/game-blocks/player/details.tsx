import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, FactRows, Num, clubName } from '../skin/index';
import type { PlayerDetailsDataJson } from './data';
import { baseFrame, shortDate } from './shared';

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Player › Details (block style): genuine label and value pairs, the title
 * and art on the left of a wide block: Club, Position, "Born: 5 Sep 2001,
 * age 25", Nationality, Height, Foot and "Contract: to June 2027". Wholly
 * public.
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
  const d = props.config.data ?? {};
  const born = d.dateOfBirth ? `${shortDate(d.dateOfBirth)} ${d.dateOfBirth.slice(0, 4)}` : '';
  const contract = /^(\d{4})-(\d{2})/.exec(d.contractEnd ?? '');
  return (
    <BlockFrame {...baseFrame(props, 'details')} split>
      <FactRows
        rows={[
          d.team?.name ? (['Club', clubName(d.team.name)] as const) : null,
          d.position ? (['Position', d.position] as const) : null,
          born
            ? ([
                'Born',
                <>
                  {born}
                  {typeof d.age === 'number' ? (
                    <>
                      , age <Num>{d.age}</Num>
                    </>
                  ) : null}
                </>,
              ] as const)
            : null,
          d.nationality ? (['Nationality', d.nationality] as const) : null,
          d.heightCm
            ? ([
                'Height',
                <>
                  <Num>{d.heightCm}</Num> cm
                </>,
              ] as const)
            : null,
          d.foot ? (['Foot', d.foot.charAt(0).toUpperCase() + d.foot.slice(1)] as const) : null,
          contract
            ? (['Contract', `to ${MONTHS_LONG[Number(contract[2]) - 1]} ${contract[1]}`] as const)
            : null,
        ]}
      />
    </BlockFrame>
  );
}

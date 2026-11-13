import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, BlockRows, type BlockHero } from '../skin/index';
import type { PlayerTransfersDataJson } from './data';
import { baseFrame, shortDate, TwoPart } from './shared';

/**
 * Player › Transfers. His moves, newest first: from and to, month, type and
 * fee as reported. Wholly public. The hero is the number of moves.
 */

export function PlayerTransfersBlock(props: GameBlockComponentProps<PlayerTransfersDataJson>) {
  const data = props.config.data ?? {};
  const moves = [...(data.transfers ?? [])].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  );
  const hasFee = moves.some((m) => m.fee);

  const hero: BlockHero | undefined = moves.length
    ? { figure: String(moves.length), label: moves.length === 1 ? 'move' : 'moves' }
    : undefined;

  const rows = moves.map((m, i) => ({
    key: `${m.date ?? ''}-${i}`,
    label: (
      <TwoPart
        main={`${m.from?.name ?? '–'} to ${m.to?.name ?? '–'}`}
        quiet={shortDate(m.date, true)}
      />
    ),
    cells: [m.type || '–', ...(hasFee ? [m.fee || '–'] : [])],
  }));

  return (
    <BlockFrame
      {...baseFrame(props, 'transfers')}
      hero={hero}
      aside={
        rows.length > 0 ? (
          <BlockRows columns={['', 'Type', ...(hasFee ? ['Fee'] : [])]} rows={rows} />
        ) : null
      }
    />
  );
}

import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame } from '../skin/index';
import { TransferWindow } from '../parts/team-transfers';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamTransfersDataJson } from './types';

/** Team › Transfers: one window's ins and outs. A list, so no hero. */
export function TeamTransfersBlock(props: GameBlockComponentProps<TeamTransfersDataJson>) {
  const { config } = props;
  const data = config.data ?? {};
  const ins = data.ins ?? [];
  const outs = data.outs ?? [];
  const context = data.windowLabel || config.scope.seasonLabel || config.context;
  return (
    <BlockFrame
      {...frameBase(props, { context, noun: 'transfers' })}
      aside={ins.length + outs.length > 0 ? <TransferWindow ins={ins} outs={outs} /> : null}
    />
  );
}

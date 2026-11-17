import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  LabelCell,
  NameCell,
  Row,
  Rows,
  Section,
  Sections,
  clubFit,
  clubName,
  useBlockLayout,
  useBlockScale,
} from '../skin/index';
import { dayMonth } from '../parts/team-rows';
import type { GameBlockTransferJson } from '../parts/team-league-match-common';
import { frameBase } from '../parts/team-league-match-ui';
import type { TeamTransfersDataJson } from './types';

/**
 * Permanent moves only: loans and returns from loan are left out, a player
 * listed twice once, and a move between a club and itself dropped.
 */
export function permanentMoves(
  moves: GameBlockTransferJson[] | undefined
): GameBlockTransferJson[] {
  const seen = new Set<string>();
  return (moves ?? []).filter((m) => {
    if (/loan/i.test(m.type ?? '')) return false;
    const id = m.player?.id || m.player?.name || '';
    if (seen.has(id)) return false;
    seen.add(id);
    return clubName(m.from?.name) !== clubName(m.to?.name);
  });
}

/** "€63.5m" for a fee; a move type other than a transfer in lower case. */
function moveNote(m: GameBlockTransferJson): string {
  const fee = (m.fee ?? '').replace(/^€\s+/, '€').trim();
  const type = m.type && !/^transfer$/i.test(m.type) ? m.type.toLowerCase() : '';
  return [fee, type].filter(Boolean).join(', ');
}

/**
 * Team › Transfers: "In, Summer 2025" and "Out", permanent moves only. Each
 * row: the date in the label column, the player, and the other club with
 * the fee or move type.
 */
export function TeamTransfersBlock(props: GameBlockComponentProps<TeamTransfersDataJson>) {
  const data = props.config.data ?? {};
  const ins = permanentMoves(data.ins);
  const outs = permanentMoves(data.outs);
  return (
    <BlockFrame {...frameBase(props, { noun: 'transfers' })}>
      {ins.length + outs.length > 0 ? (
        <Sections>
          {ins.length > 0 ? (
            <Section heading={data.windowLabel ? `In, ${data.windowLabel}` : 'In'}>
              <MoveRows moves={ins} dir="in" />
            </Section>
          ) : null}
          {outs.length > 0 ? (
            <Section heading="Out">
              <MoveRows moves={outs} dir="out" />
            </Section>
          ) : null}
        </Sections>
      ) : null}
    </BlockFrame>
  );
}

function MoveRows({ moves, dir }: { moves: GameBlockTransferJson[]; dir: 'in' | 'out' }) {
  const { narrow } = useBlockLayout();
  const scale = useBlockScale();
  return (
    <Rows label={dir === 'in' ? 'In' : 'Out'}>
      {moves.map((m, i) => {
        const other = dir === 'in' ? m.from : m.to;
        return (
          <Row
            key={m.player?.id || i}
            cols={`${scale.labelCol}px minmax(0, 1fr) auto`}
            last={i === moves.length - 1}
          >
            <LabelCell>{dayMonth(m.date)}</LabelCell>
            <NameCell>{m.player?.name}</NameCell>
            <LabelCell small>
              {[clubFit(other?.name, narrow, 14), moveNote(m)].filter(Boolean).join(', ')}
            </LabelCell>
          </Row>
        );
      })}
    </Rows>
  );
}

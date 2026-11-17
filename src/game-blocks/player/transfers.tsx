import type { GameBlockComponentProps } from '../block-props';
import { BlockFrame, InFrame, LabelCell, NameCell, NumCell, Row, Rows, clubFit } from '../skin/index';
import type { PlayerTransfersDataJson } from './data';
import { baseFrame, shortDate } from './shared';

/**
 * Player › Transfers (block style): his moves, newest first: the month in
 * the label column ("Jul 2022"), "Dortmund to Man City", and the fee as
 * reported. Wholly public.
 */
export function PlayerTransfersBlock(props: GameBlockComponentProps<PlayerTransfersDataJson>) {
  const data = props.config.data ?? {};
  const moves = [...(data.transfers ?? [])].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? '')
  );
  return (
    <BlockFrame {...baseFrame(props, 'transfers')}>
      {moves.length > 0 ? (
        <InFrame>
          {({ narrow, scale }) => (
            <Rows label="Transfers">
              {moves.map((m, i) => (
                <Row
                  key={`${m.date ?? ''}-${i}`}
                  cols={`${scale.labelCol}px minmax(0, 1fr) auto`}
                  last={i === moves.length - 1}
                >
                  <LabelCell>{shortDate(m.date, true)}</LabelCell>
                  <NameCell>
                    {clubFit(m.from?.name, narrow, 13) || '–'} to {clubFit(m.to?.name, narrow, 13) || '–'}
                  </NameCell>
                  {m.fee ? (
                    <NumCell>{m.fee.replace(/^€\s+/, '€')}</NumCell>
                  ) : (
                    <LabelCell small>{m.type && !/^transfer$/i.test(m.type) ? m.type.toLowerCase() : ''}</LabelCell>
                  )}
                </Row>
              ))}
            </Rows>
          )}
        </InFrame>
      ) : null}
    </BlockFrame>
  );
}

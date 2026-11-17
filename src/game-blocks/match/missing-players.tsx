import type { GameBlockComponentProps } from '../block-props';
import {
  BlockFrame,
  LabelCell,
  NameCell,
  Row,
  Rows,
  Section,
  Sections,
  clubName,
} from '../skin/index';
import { matchFrame } from '../parts/match-common';
import type { GameBlockAbsenceJson } from '../parts/team-league-match-common';
import type { MatchMissingPlayersDataJson } from './types';

/** "injury" to "Injury"; a reason in sentence case. */
export function sentenceCase(s: string | undefined): string {
  const t = (s ?? '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
}

/** Match › Missing players: each side's absentees, its club as the section heading. */
export function MatchMissingPlayersBlock(
  props: GameBlockComponentProps<MatchMissingPlayersDataJson>
) {
  const data = props.config.data ?? {};
  const sides = [
    { name: clubName(data.match?.home?.team?.name), rows: data.home ?? [] },
    { name: clubName(data.match?.away?.team?.name), rows: data.away ?? [] },
  ].filter((s) => s.rows.length > 0);
  return (
    <BlockFrame {...matchFrame(props, data.match, 'missing-players')}>
      {sides.length > 0 ? (
        <Sections columns={2}>
          {sides.map((s, i) => (
            <Section key={s.name || i} heading={s.name}>
              <MissingRows rows={s.rows} label={s.name} />
            </Section>
          ))}
        </Sections>
      ) : null}
    </BlockFrame>
  );
}

function MissingRows({ rows, label }: { rows: GameBlockAbsenceJson[]; label: string }) {
  return (
    <Rows label={label}>
      {rows.map((r, i) => (
        <Row key={r.player?.id || i} cols="minmax(0, 1fr) auto" last={i === rows.length - 1}>
          <NameCell>{r.player?.name}</NameCell>
          <LabelCell small>{sentenceCase(r.reason)}</LabelCell>
        </Row>
      ))}
    </Rows>
  );
}

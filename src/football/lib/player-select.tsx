import { useMemo, type ReactNode } from 'react';
import { ControlDropdown, DropdownGroupLabel, DropdownItem } from '#/football/lib/control-dropdown';

/**
 * The shared player/team selector used by every StatsBomb block that can drill
 * from a whole-team view into a single player (Heat Map, Line-breaking, Pass
 * Sonar, Pass Network, Progression).
 *
 * The control is two pieces:
 *   1. A dropdown: a "Whole team" default at the top, then the players split
 *      into team groups (e.g. Argentina / France). Selecting a player calls
 *      `onSelect(id)`; "Whole team" calls `onSelect(null)`.
 *   2. An optional segmented Starters / Subs toggle, shown only when the block
 *      opts in (Pass Sonar + Pass Network, where rendering every player at once
 *      — subs included — is cramped). It scopes the *whole-team* view to the
 *      starting XI by default.
 *
 * The component is presentational: the owning block holds the selected id and
 * the starters/subs scope in its own state and re-renders its plot accordingly.
 */

/** A player as offered in the selector. */
export interface SelectablePlayer {
  /** Stable id, passed back to {@link PlayerSelectProps.onSelect}. */
  id: string;
  /** Display name shown in the dropdown. */
  name: string;
  /**
   * Team display name used as the group heading (e.g. "Argentina"). When every
   * player shares one team — or none carry a team — the players render as a
   * single flat list with no headings (the pre-split single-team behaviour).
   */
  team?: string;
}

/** Which players the whole-team view shows, when the starters/subs toggle is on. */
export type SquadScope = 'starters' | 'subs' | 'all';

export interface PlayerSelectProps {
  /** Players to offer, in display order. Grouped by {@link SelectablePlayer.team}. */
  players: SelectablePlayer[];
  /** Currently-selected player id, or `null` for the "Whole team" default. */
  selectedId: string | null;
  /** Fires with a player id, or `null` when "Whole team" is chosen. */
  onSelect: (id: string | null) => void;
  /** Trigger prefix label. Defaults to "Player". */
  label?: string;
  /** Label for the all-players default row + trigger value. Defaults to "Whole team". */
  allLabel?: string;
  /**
   * Starters/subs scope. Omit `scope`/`onScopeChange` to hide the segmented
   * toggle entirely (Heat Map, Line-breaking, Progression). Provide both to show
   * it (Pass Sonar, Pass Network).
   */
  scope?: SquadScope;
  /** Fires when the Starters/Subs segmented control changes. */
  onScopeChange?: (scope: SquadScope) => void;
}

/** Distinct team headings in first-seen order (skips players with no team). */
function teamOrder(players: SelectablePlayer[]): string[] {
  const seen: string[] = [];
  for (const p of players) {
    if (p.team && !seen.includes(p.team)) seen.push(p.team);
  }
  return seen;
}

export function PlayerSelect({
  players,
  selectedId,
  onSelect,
  label = 'Player',
  allLabel = 'Whole team',
  scope,
  onScopeChange,
}: PlayerSelectProps) {
  const teams = useMemo(() => teamOrder(players), [players]);
  // Group only when more than one team is present; otherwise a flat list reads
  // cleaner (and matches the old single-team dropdown).
  const grouped = teams.length > 1;
  // Players with no `team` (or a team not in `teams`, which can't happen but is
  // cheap to guard) must still appear when grouping — they previously dropped
  // out entirely, silently hiding rows whenever the data mixed tagged and
  // untagged players. They render in a trailing un-headed section.
  const unteamed = useMemo(
    () => (grouped ? players.filter((p) => !p.team || !teams.includes(p.team)) : []),
    [players, teams, grouped]
  );

  const selected = selectedId !== null ? players.find((p) => p.id === selectedId) : undefined;
  const valueLabel = selected?.name ?? allLabel;

  const showScopeToggle = scope !== undefined && onScopeChange !== undefined;

  return (
    <div className="flex items-center gap-1.5">
      {showScopeToggle && <SquadScopeToggle scope={scope} onChange={onScopeChange} />}
      <ControlDropdown label={label} valueLabel={valueLabel}>
        {(close) => (
          <>
            <DropdownItem
              selected={selectedId === null}
              onSelect={() => {
                onSelect(null);
                close();
              }}
            >
              {allLabel}
            </DropdownItem>
            {grouped ? (
              <>
                {teams.map((team) => (
                  <div key={team}>
                    <DropdownGroupLabel>{team}</DropdownGroupLabel>
                    {players
                      .filter((p) => p.team === team)
                      .map((p) => (
                        <DropdownItem
                          key={p.id}
                          selected={p.id === selectedId}
                          onSelect={() => {
                            onSelect(p.id);
                            close();
                          }}
                        >
                          {p.name}
                        </DropdownItem>
                      ))}
                  </div>
                ))}
                {/* Any players without a recognised team — never dropped. */}
                {unteamed.map((p) => (
                  <DropdownItem
                    key={p.id}
                    selected={p.id === selectedId}
                    onSelect={() => {
                      onSelect(p.id);
                      close();
                    }}
                  >
                    {p.name}
                  </DropdownItem>
                ))}
              </>
            ) : (
              players.map((p) => (
                <DropdownItem
                  key={p.id}
                  selected={p.id === selectedId}
                  onSelect={() => {
                    onSelect(p.id);
                    close();
                  }}
                >
                  {p.name}
                </DropdownItem>
              ))
            )}
          </>
        )}
      </ControlDropdown>
    </div>
  );
}

/**
 * A compact two-segment Starters / Subs control. Mirrors the dropdown trigger's
 * pill styling so the two controls read as a set. Only the team-level view uses
 * it; once a single player is selected it has no effect (the block shows that
 * player regardless), so blocks may keep it visible for a stable layout.
 */
function SquadScopeToggle({
  scope,
  onChange,
}: {
  scope: SquadScope;
  onChange: (scope: SquadScope) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Squad scope"
      className="flex items-center rounded-[6px] border border-white/10 bg-white/[0.04] p-0.5 text-[11px]"
    >
      <ScopeSegment
        label="Starters"
        active={scope === 'starters'}
        onClick={() => onChange('starters')}
      />
      <ScopeSegment label="Subs" active={scope === 'subs'} onClick={() => onChange('subs')} />
    </div>
  );
}

function ScopeSegment({
  label,
  active,
  onClick,
}: {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? 'cursor-pointer rounded-[4px] bg-white/[0.12] px-2 py-0.5 font-semibold text-white'
          : 'cursor-pointer rounded-[4px] px-2 py-0.5 text-white/55 transition-colors hover:text-white/80'
      }
    >
      {label}
    </button>
  );
}

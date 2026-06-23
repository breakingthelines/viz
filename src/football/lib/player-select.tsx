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
 * Team-aware mode (when both sides' data is supplied): pass `selectedTeam` +
 * `onSelectTeam` and each team group gains a "{Team} — whole team" row at its
 * top, so the reader can switch the panel to the OTHER side's whole-team view
 * (e.g. "France — whole team") rather than only the home side's. Picking any
 * single player still calls `onSelect(id)`; the owning block reads that player's
 * own `team` off its data to switch sides. The top "Whole team" default row
 * clears both selections back to the home side.
 *
 * The component is presentational: the owning block holds the selected id (and,
 * in team-aware mode, the selected team) and the starters/subs scope in its own
 * state and re-renders its plot accordingly.
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
  /**
   * The team whose whole-team view is active, or `null` for the default (home)
   * side. Provide with {@link PlayerSelectProps.onSelectTeam} to enable
   * team-aware mode: each team group gains a "{Team} — whole team" row so the
   * reader can switch the panel to the other side's whole-team view. Only takes
   * effect when the players span more than one team (so the list is grouped).
   */
  selectedTeam?: string | null;
  /**
   * Fires with a team name when a "{Team} — whole team" row is chosen, or `null`
   * for the top "Whole team" default (the home side). Enables team-aware mode
   * together with {@link PlayerSelectProps.selectedTeam}.
   */
  onSelectTeam?: (team: string | null) => void;
}

/** Distinct team headings in first-seen order (skips players with no team). */
function teamOrder(players: SelectablePlayer[]): string[] {
  const seen: string[] = [];
  for (const p of players) {
    if (p.team && !seen.includes(p.team)) seen.push(p.team);
  }
  return seen;
}

/**
 * Resolve the ACTIVE team a block should render, from the selector's two pieces
 * of state plus the panel's home `team`. Shared by every team-aware block so the
 * rule lives in one place:
 *
 *   • a player is selected → that player's own team (the drill-down switches
 *     sides automatically, so picking a France player renders France's data);
 *   • no player but a team chosen via "{Team} — whole team" → that team;
 *   • neither → the panel's home `team` (the default whole-team view).
 *
 * `playerTeamOf` maps the selected id to its team (the caller knows its own data
 * shape — players, passes or actions — so it supplies the lookup).
 */
export function resolveActiveTeam(
  homeTeam: string,
  selectedId: string | null,
  selectedTeam: string | null | undefined,
  playerTeamOf: (id: string) => string | undefined
): string {
  if (selectedId !== null) return playerTeamOf(selectedId) ?? selectedTeam ?? homeTeam;
  return selectedTeam ?? homeTeam;
}

/**
 * Pick the crest to show for whichever side is currently active. The team-aware
 * blocks carry BOTH sides' crests now — the home crest (`homeCrest`) and,
 * optionally, the away crest (`awayCrest`) — so the panel can badge France's
 * whole-team view (or a France player's read-out) with France's flag rather than
 * dropping to a name-only label.
 *
 *   • active side IS the home `team` → the home crest;
 *   • active side is the OTHER side  → the away crest, when supplied;
 *   • away crest absent (legacy / single-team data, or only the home crest was
 *     baked) → `undefined`, so the away view shows the name alone — the prior
 *     behaviour, never a wrong (home) badge.
 *
 * The single-team / legacy case stays correct: `activeTeam` then always equals
 * the home `team`, so the home crest applies as before.
 */
export function activeCrest(
  activeTeam: string,
  homeTeam: string,
  homeCrest: string | undefined,
  awayCrest: string | undefined
): string | undefined {
  return activeTeam === homeTeam ? homeCrest : awayCrest;
}

export function PlayerSelect({
  players,
  selectedId,
  onSelect,
  label = 'Player',
  allLabel = 'Whole team',
  scope,
  onScopeChange,
  selectedTeam,
  onSelectTeam,
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

  // Team-aware mode: a per-group "{Team} — whole team" row lets the reader switch
  // the panel to the other side. Only meaningful once the list is grouped.
  const teamAware = grouped && onSelectTeam !== undefined;
  const wholeTeamLabel = (team: string) => `${team} — whole team`;

  const selected = selectedId !== null ? players.find((p) => p.id === selectedId) : undefined;
  // Trigger label: a selected player wins; else a selected team's whole-team
  // label (team-aware mode); else the default all-players label.
  const valueLabel =
    selected?.name ?? (teamAware && selectedTeam ? wholeTeamLabel(selectedTeam) : allLabel);

  const showScopeToggle = scope !== undefined && onScopeChange !== undefined;

  // Selecting a player clears any team-only selection (the player drives the
  // side); the top default clears both back to the home side.
  const pickPlayer = (id: string, close: () => void) => {
    onSelect(id);
    if (teamAware) onSelectTeam(null);
    close();
  };

  return (
    <div className="flex items-center gap-1.5">
      {showScopeToggle && <SquadScopeToggle scope={scope} onChange={onScopeChange} />}
      <ControlDropdown label={label} valueLabel={valueLabel}>
        {(close) => (
          <>
            <DropdownItem
              selected={selectedId === null && !(teamAware && selectedTeam)}
              onSelect={() => {
                onSelect(null);
                if (teamAware) onSelectTeam(null);
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
                    {/* Team-aware: a whole-team row per side, so the panel can
                        switch to the other team's full view (not only a player). */}
                    {teamAware && (
                      <DropdownItem
                        selected={selectedId === null && selectedTeam === team}
                        onSelect={() => {
                          onSelectTeam(team);
                          onSelect(null);
                          close();
                        }}
                      >
                        {wholeTeamLabel(team)}
                      </DropdownItem>
                    )}
                    {players
                      .filter((p) => p.team === team)
                      .map((p) => (
                        <DropdownItem
                          key={p.id}
                          selected={p.id === selectedId}
                          onSelect={() => pickPlayer(p.id, close)}
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
                    onSelect={() => pickPlayer(p.id, close)}
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
                  onSelect={() => pickPlayer(p.id, close)}
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

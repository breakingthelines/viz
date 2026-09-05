# Changelog

All notable changes to `@breakingthelines/viz` are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.16.0]

### Changed (breaking): the football types follow the current proto contract

viz's vendored `btl.game.v1.types.football` code had been frozen since January,
five months behind the contract. protos `0d440a4` (2026-05-08) redesigned the
package: `EventType` became `FootballActionType`, `MatchEvent` became
`FootballActionPayload`, its `event_data` oneof became `action_data`, and
`Team`, `Player`, `NormalizedMatchData` and `DataSource` were removed with no
in-package successor. The automated sync PR had been red since 2026-09-04
because the regenerated file no longer exported the names viz imported
(viz#77). This release moves viz onto the contract as it stands.

**Removed.** `EventType`, `MatchEvent`, `NormalizedMatchData`, and their
`*Schema` counterparts — all deleted upstream. `NormalizedMatchDataSchema`,
`MatchEventSchema`, `TeamSchema`, `PlayerSchema`, `DataSourceSchema` and
`PitchCoordinatesSchema` go with them. Nothing in viz consumed
`NormalizedMatchData` or `DataSource`, and `eventTypeName` had no importer
outside this repo, so no deprecated aliases are shipped: a name that resolved to
a deleted enum would be worse than its absence.

**Renamed.**

| 0.15.0                       | 0.16.0                  |
| ---------------------------- | ----------------------- |
| `EventType`                  | `FootballActionType`    |
| `MatchEvent` (proto message) | `FootballActionPayload` |
| `event.eventData`            | `action.actionData`     |
| `eventTypeName`              | `actionTypeName`        |
| `DataSource` (attribution)   | `DataProvider`          |

`FootballActionType` keeps values 0-5 byte-identical to `EventType` and adds
nine members (card, duel, goalkeeper, clearance, substitution, foul_committed,
take_on, recovery, pressure). `actionTypeName` names all fifteen. The
`actionData` oneof keeps the five original case names — `shot`, `pass`,
`tackle`, `carry`, `interception` — and adds nine more, so `isShot`, `isPass`,
`isTackle`, `isCarry` and `isInterception` narrow exactly as before, only on the
new field. They are generic now, so they narrow a `MatchAction` and a bare
`FootballActionPayload` alike.

**`Team`, `Player` and `PitchCoordinates` are viz's own types now, not proto
messages.** The first two were deleted upstream; the third still exists, but as
a `Message<…>` it forced a `$typeName` brand onto every coordinate literal a
host writes. All three are plain structural interfaces here, shaped to what the
components actually read:

```typescript
interface PitchCoordinates { x: number; y: number }
interface Team   { id: string; name: string; shortName?: string; primaryColor?: string; secondaryColor?: string }
interface Player { id: string; name: string; shirtNumber?: number }
```

A decoded proto `PitchCoordinates` is still assignable to viz's — the brand is
an extra property, and viz never passes one back — so the change is permissive
in the direction that matters.

**`MatchEvent` is replaced by `MatchAction`, which is not the same shape.**
`FootballActionPayload` identifies actors by id (`teamId`, `playerId`) and
carries no id and no clock, because on the wire those are resolved elsewhere.
Rendering needs names, kit colours and a stable React key, so `MatchAction`
pairs the proto oneof with the identity a host has already resolved:

```typescript
interface MatchAction {
  id: string;
  timestamp: number;
  type: FootballActionType;
  location?: PitchCoordinates;
  team?: Team;
  player?: Player;
  actionData: FootballActionPayload['actionData'];
}
```

`ShotMap` takes `MatchAction[]`. Its `selectedShotId`, `onShotClick` and
`getColor` props are unchanged.

**`DataAttribution`'s `source` prop is typed `DataProvider`.** It was typed as
the proto `DataSource` _message_, which made `Record<DataSource, string>` and
`source === 'custom'` type errors that nothing caught. The README always
documented it as the string union it has always been at runtime; only the name
has moved, so no call site changes.

### Fixed: `bun check` typechecked nothing, and CI never ran it

`check` was `tsc --noEmit` against the root `tsconfig.json`, which is
`"files": []` plus project references — build mode is what walks those, so the
command compiled zero files and exited 0. It is `tsc --build --noEmit` now, and
it runs in the quality workflow and before publish.

Turning it on surfaced 115 pre-existing errors across 23 files, all of them invisible for as
long as the command was a no-op. Most were the proto drift above. The rest are
fixed here:

- `src/football/index.ts` re-exported eleven names that no longer existed
  (`MatchInfo`, `ShotEvent`, `PassEvent`, `TackleEvent`, `CarryEvent`,
  `InterceptionEvent`, `isShotEvent`, `isPassEvent`, `isTackleEvent`,
  `isCarryEvent`, `isInterceptionEvent`), so `@breakingthelines/viz/football`
  was a broken subpath. It exports what exists.
- `formation-board.stories.tsx` read `player.number`, which is `shirtNumber`.
- `shot-map.stories.tsx` read `.outcome` and `.xg` straight off an event and
  treated `.team` as non-optional — leftovers from a viz-local type that had
  been gone for months.
- `withReducedMotion` is typed as a Storybook `Decorator` rather than as a bare
  `ReactNode` function, which six block story files were failing on.
- Six story files with `render`-only stories now declare default `args` on their
  `meta`, the pattern `StoryObj<typeof meta>` requires.
- `erasableSyntaxOnly` is off: protoc-gen-es emits `export enum`, which is not
  erasable. Both bundlers viz uses compile enums, so nothing downstream depended
  on it.
- `tsconfig.node.json` sets `jsx`, so `.storybook/vitest.setup.ts` can resolve
  `preview.tsx`.

### Added: a unit test project

`vite.config.ts` gains a node `unit` project alongside the browser `storybook`
one, and `src/football/types/types.test.ts` pins the type guards and
`actionTypeName` directly. Every test viz had was a Storybook play function, so
a pure-logic regression could only be caught through a rendered component.

### Changed: the vendored types are generated from one file, not the whole tree

`src/generated` holds `game/v1/types/football/football_pb.ts` and nothing else.
The sync workflow used to copy all of `gen/ts/btl/game`, which drags in
`game_service_pb.ts`, `game_pb.ts`, `stats_pb.ts`, `engagement_pb.ts` and
`entity_pages_pb.ts` — files whose imports reach `../../common`, `../../context`,
`../../identity`, `../../notification` and `../../squad`, packages the copy step
never writes. Those five arrived in sync PR #2 permanently broken. protos now
generates the sync from a template scoped to `football.proto`, which is
self-contained. See breakingthelines/protos.

Vendored at protos `8e0c6e9` (v0.159.0), generated by protoc-gen-es v2.14.1 —
byte-identical to protos' own committed `gen/ts`.

### Migrating platform

`src/lib/viz-adapters.ts` is the only consumer that touches any of this, and it
is exact-pinned at `0.15.0`, so nothing breaks until it bumps. When it does, it
already half-uses `FootballActionType`, so most of the work is renaming
`EventType` to it and `eventData` to `actionData`, and building the local `Team`
/ `Player` objects it was already shaping by hand. Check
`shotOccurrencesToMatchEvents` and `hasShotCoordinates` before porting either:
both are dead code there, and deleting them is likely cheaper than migrating
them.

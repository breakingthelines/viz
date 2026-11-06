# Changelog

All notable changes to `@breakingthelines/viz` are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.19.0]

### Changed: form chart labels, no wordmark behind the profile charts

- `FormChart` draws the opponent and result under each bar as HTML in the
  bar's own column, not as svg text, so ten names no longer run into each
  other. A wide chart shows `opponent.shortLabel` (new, optional) or the
  full name cut with an ellipsis, then "W 3-2, A". Under 36rem the chart
  shows the crest from `opponent.crestSources` (new, optional, tried in
  order) and the score; with no crest, or when every address fails, a
  three-letter mark (`formOpponentCode`, new). The full name stays in the
  tooltip and the accessible name.
- The opponent name is no longer underlined. A linked label turns BTL red
  on hover and focus. Each match has one link, on its label; the bar keeps
  its link for the pointer only, and the chart's svg is always
  `role="img"`.
- `FormChart` and `SeasonLines` no longer draw `ChartWatermark` behind the
  data. `ChartWatermark` itself still ships from `./brand`.
- New exports: the `FormChartOpponent` type and `formOpponentCode`.

## [0.17.0]

### Added: `./stats` subpath (the full player-profile stat chart set)

`@breakingthelines/viz/stats` ships all eight player-profile stat charts
(spec §4.1, `profile-spec.md`), pixel-matched to the approved mocks
(`scratchpad/prof/`):

- **`PercentileWheel`**: one wedge per metric on the rating wheel, length
  and colour set by the metric's percentile against the shared colour ramp,
  on a faint full-length track with a dashed median ring and the BTL mark at
  centre. A comparison player draws as an outline wedge ramping toward
  white. Pending and locked event metrics draw as dashed outlines with no
  number. `focusKeys` dims every wedge but the ones an archetype calls out;
  a `social` variant renders the static export card (mock:
  `scratchpad/prof/wheel2.py:wheel`).
- **`ComparisonBars`** ("Side by side"): mirrored bars ramping to full BTL
  red for the subject and full white for the compared player, grouped, each
  row's stronger value highlighted, a fixed median tick, names carrying a
  season label when the caller passes one.
- **`PercentileRows`**: the per-90 table rows, value, ramp bar, median
  tick, ordinal, with `pending`/`locked` event-only rows rendered dashed and
  muted, no number, and the muted "Event data" state label.
- **`ArchetypeList`**: held archetypes bright, the rest muted, sorted by
  percentile with event-only rows always last. Click selects and pins,
  click again deselects, Enter/Space act the same, hover previews through
  `onHover`, all gated on `onToggle` being passed: a row with no toggle
  handler, such as a read-only `compact` placement, is never tabbable or
  hoverable.
- **`SimilarList`**: quick picks reading "N% similar", the one being
  compared against reading "On the wheel". As compare buttons the name
  never links; as a plain list it does.
- **`FormChart`**: the Overview form strip, rating bars on the rating ramp
  (`ratingColour`), goal/assist marks, opponent and result rows, paging
  earlier/later through the loaded matches in steps of 5 (default window
  10), a date range and window stats (average rating, goals, assists,
  minutes) computed from whatever is currently visible. Paging past the
  oldest loaded match calls `onOlder` instead of running out of data, so a
  host can keep fetching further back across seasons (mock:
  `prof/page2.py:form_chart` and its JS at `page2.py:365-384`).
- **`SeasonLines`**: per-90 output by season as one or more lines, each
  point labelled, season labels carrying a club-and-minutes caption. A
  `null` value breaks a series' line for that season rather than
  interpolating across the gap or drawing a zero (2023/2024 pass accuracy
  and similar rates are frequently absent, spec §1.5). Generalised beyond
  the mock's fixed two-series, fixed-`ymax` chart (`prof/build.py:seasons_chart`)
  so the entity-agnostic compare engine's later team/manager templates (spec
  §3.6) can reuse it.
- **`LeagueLadder`**: the league-strength ladder in "Next move", index
  bars with the subject's own league picked out in red and bold (mock:
  `prof/nextmove.py:ladder`). Takes an optional `renderName` render prop so
  a host can route a league's name through its own link component (e.g. a
  router `Link`) instead of a plain anchor, on top of the plain `href` every
  other chart in this subpath uses.

`FormChart` and `SeasonLines` render a faint `ChartWatermark` behind their
data per spec §4.4; copy follows `btl-copy-register` (no hint lines, no em
dashes, no mono fonts). Both render bare by default: a `framed` prop opts
into the card-style border, so a host panel that already supplies its own
card chrome does not get a card inside a card. `FormChart`'s bars switch the
chart's `<svg>` from `role="img"` to `role="group"` whenever any bar links,
so a keyboard user's focus lands on an accessible name (date, result,
rating, G/A), not a presentational image's single label; `SeasonLines`
carries the same values as a visually hidden table, and both take an
`ariaLabel` override. The subject's red is `#eb0000` for fills, strokes and
bars throughout the subpath; red text (`SeasonLines`'s per-point value
label) uses the brighter `#ff3b3b` instead, since `#eb0000` on the dark
panel background fails colour contrast.

Every block in this subpath shares one set of plain-data types
(`StatMetric`, `MetricState`, `EntityLink`, `src/stats/stat-metric.ts`) and
formatting helpers (`ordinal`, `formatMetricValue`, `formatPercentile`,
`src/stats/format.ts`) so a host adapts its RPC response once rather than
once per chart.

### Added (PF-V1): `./brand` subpath (mark, wordmark, percentile ramp, `SocialFrame`)

`@breakingthelines/viz/brand`: `BtlMark`, `Wordmark`, `ChartWatermark`,
`PanelSignature` (pure SVG, so they compose inside an SVG chart: the player
profile wheel's centre mark, a watermark painted behind a chart's data), the
percentile colour ramp `ramp(p, target)` (muted grey up to full BTL red at
the 90th percentile for the subject, full white for a comparison player,
geometry taken verbatim from the approved player-profile mock,
`scratchpad/prof/wheel2.py`), and `SocialFrame` / `useSocialFrameExport`, the
shared 1080x1350 social-card shell every profile panel will export through,
built on the existing `useImageSave`.

## [0.16.1]

### Fixed: crests and Line breaking hover headshots load in any cache order

`Crest` and the Line breaking hover avatar set `crossOrigin="anonymous"`. The
same CDN URLs are also loaded plainly: by `SvgHeadshot`, the Pass Sonar
focus-card crest, and hosts' own lineup and match-stats blocks. The CDN sends
`Access-Control-Allow-Origin` only when a request carries `Origin`, and its
plain response is cacheable for 4h with no `Vary: Origin`. After a plain load,
the CORS load was served the cached plain copy and blocked, so the crest or
headshot never rendered. On origins missing from the CDN's CORS allowlist
(admin, localhost, Storybook) it failed on every load.

Both are plain `<img>` elements now. Save as image is unaffected:
`captureElementToPng` never reads pixels from a live element. html-to-image
fetches every image again with `{ mode: 'cors', cache: 'no-cache' }`, which
revalidates with the CDN and gets the CORS headers.

No API change.

**Guards.** `src/football/lib/remote-images.test.ts` fails if `Crest` or the
hover avatar renders `crossorigin` again. `src/utils/crest-capture.stories.tsx`
reproduces the collision in Chromium against a fixture origin that answers like
the CDN (`cdnFixture` in `vite.config.ts`, dev server only). It checks that the
on-screen crest loads after a plain load of the same URL, and that the crest's
pixels reach the exported PNG.

**Internal.** The hover avatar moved from `line-breaking.tsx` to
`src/football/lib/passer-avatar.tsx` so the test can render it. It is not
exported from the package.

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

# Changelog

All notable changes to `@breakingthelines/viz` are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.36.0]

### Changed: no ordinals, medians or pool counts on any block

- **Percentile wheel.** The lead line ("99th Median 1.21 vs 49 Premier
  League wingers") is gone. `wheel` (the default) is now the compact view
  for card sets: the wheel only, no lead stat, no rows. `wheel_rows` shows
  the highlighted metric's per 90 figure, the wheel, and every metric's per
  90 value under the pool heading ("vs Premier League wingers, per 90", no
  count); `rows` is the rows alone. Rows show the value only. The wheel's
  slices keep their percentiles. `groupLabel` never prints a count.
- **Comparison.** Heroes are the subject's per 90 value with the second
  player's beside it, never an ordinal; the rows view drops its percentile
  columns.
- **Season trend.** The hero is the latest per 90 value; the rows view shows
  per 90 values by season, not percentile ordinals.
- **Player rankings.** No Pct column, no median line, no median tick, no
  pool count in the scope ("Key passes, wingers").
- **Team season totals and stats.** No rank ordinal, no "1st of 20", no
  Median column, no median tick. League team stats drops its median row.
- **League strength** drops "10 of 52 leagues".
- **Median ticks** are no longer passed to any scale (manager tenures, fan
  grades, rankings).

## [0.35.1]

### Added

- **Player rankings draws several stats.** When the block carries
  `categories` (protos v0.231.0: a general ask's leaders across goals,
  assists, key passes and tackles, or a position's key stats), it draws one
  small board per stat, two across from 480px and one under another below.
  Each board is a section heading over a strong hairline, then five rows:
  the name, the club in its short form and the value. Paid boards read
  names, clubs and values from their cells. A one-stat ranking draws as
  before.
- `LeaguePlayerRankingsCategoryJson`, and `categories` on
  `LeaguePlayerRankingsDataJson`.
- The generated `game_block_pb.ts` is synced to protos v0.231.0.

## [0.35.0]

### Changed: the Player season card

- **Season totals is rebuilt as the season card.** One stat leads: its
  total, then "1.02 per 90" (never "Per 90 1.02"). The other stats are
  bars headed by the group they are ranked in ("vs Serie A strikers"):
  each stat, its per 90 value and a bar whose fill is the percentile.
  - No ordinals ("97th"), no median ticks or labels, no group counts, no
    team rank line and no appearances or minutes line.
  - A stat with no percentile (a cup, too few minutes) draws its per 90
    value with no bar.
- **The poster is the default look.** `GameBlockRegistryEntry.defaultLook`
  (`'poster'` for `player-season-totals`), `defaultLookFor(id)`, and
  `toGameBlockConfig` uses it when the spec has no look. A player with no
  cut-out (no pre-rendered halftone and no headshot) draws his percentile
  wheel for the same season from `data.wheel`, inside
  `[data-season-fallback="wheel"]`; with no wheel either, the editorial
  look. The `wheel` view (`options.view`, Regista's "show it as a wheel")
  draws the wheel whatever the look. A crest alone no longer makes a season poster.
- **`PercentileWheel` `marks`**: `false` draws the wedges and labels with
  no percentile numbers and no dashed median ring. The season card's wheel
  and the Percentile wheel block pass it (owner: the season card's wheel
  style for every player wheel block).
- `PlayerSeasonTotalsDataJson.groupPhrase` and `.wheel` (protos#321).
  `src/generated/game` carries the new fields.
- The wheel's and the season trend's locked hero read "1.02 per 90".

### Added: a face beside the name

- **`BlockFrame` `titleFace`**: in the editorial and annotated looks, a
  small round headshot (or the crest) beside the title, from `media`; the
  BTL mark when there is no picture (owner: player and team blocks show the
  headshot or crest with the name). The season card's editorial and wheel
  looks and the Percentile wheel block pass it; the poster keeps its
  cut-out.

### Added: one set of actions per surface

- **`GameBlockView` `actions`**: `'frame'` (default) draws the quiet
  download icon on hover, as in an article; `'host'` draws none, for a
  host that draws its own Share and Save image row under the block
  (Regista). `BlockActionsContext` and `BlockActions` from the skin.
- **`usePersonArtStatus(media)`**: whether one player can have a poster
  cut-out (`'working' | 'ok' | 'none'`), the single-player twin of
  `usePairArtStatus`.

## [0.34.1]

### Changed

- **Orbit block labels**, as agreed for the Compare page:
  - A pair's rows stand alone, with no "Roles" or "Areas" headings: "Both:",
    "Mbappé:", "Haaland:", then one quiet gap, then "Similar:" and
    "Different:", all on one label column.
  - The single orbit's three closest show as names with clubs, with no
    heading (the list keeps "Closest to Kylian Mbappé" as its accessible
    name).
  - The strip's "Compare with" dropdown starts on the player the orbit is
    centred on now (the first-named, or whoever a swap centred).
    `SimilarityOrbitCombined`'s `renderActions` gets that player as a third
    argument.

## [0.34.0]

### Added: one orbit for a pair in one pool

- **`SimilarityOrbitCombined`** (`@breakingthelines/viz/stats`): two
  players in the same pool drawn as one orbit.
  - It is centred on the first-named player (red). The second is his dot at
    his rank, with his face on a stronger stem and the disc lit to his
    radius. Crayon loops sit on both faces.
  - A tap on the second player's face, or the quiet name switch under the
    orbit ("Mbappé · Haaland"), re-centres it on him (white). The swap is a
    short morph, instant under reduced motion. Again swaps back.
  - The accessible name gives both directions: "Haaland is Mbappé's 85th
    closest of the 157 other strikers. Mbappé is Haaland's 67th closest."
  - Off (`interactive={false}`, Save image) it draws the first-named
    player's orbit only, with no switch or strip.
- `combinedOrbitLabel`. Opt-in additions to the shared field and strip:
  `onFace`, `loops`, `stemWeight` and `OrbitDetailStrip.quietPlaces`.
  `SimilarityOrbit` and `SimilarityOrbitPair` are unchanged.

### Changed: the Orbit block

- A pair in one pool draws with `SimilarityOrbitCombined`. A pair across two
  pools keeps `SimilarityOrbitPair` with its pool captions.
- No scope line.
- Beside the orbit: the verdict, then Roles ("Both:", "<Mbappé>:",
  "<Haaland>:", no "Only") and Areas ("Similar:", "Different:"). Each group
  has one quiet heading and one label column, with no ruled rows.
- The single orbit names its three closest beside it ("Closest to Mbappé":
  name, club).
- Strip actions: "Player page", then "Compare with [Mbappé ▾] Show" (the
  Stats tab's menu select and bordered button), or a plain "Compare with
  Mbappé" when there is one choice.

## [0.33.1]

### Changed

- **`player-similarity-orbit` is labelled "Orbit"** in the registry, so the
  palette, the picker and every host name it that way. The type id and data
  are unchanged.
- **A pair across two pools** (a striker v an attacking midfielder): the
  block maps `outside_pool` to `OrbitMember.outsidePool` and each orbit's
  pool to `OrbitData.poolLabel`, so the shared orbit (0.33.0) leaves the
  outsider out of counts and places and captions the two pools. The scope
  line then reads "Top five leagues, 2026/27". `game_block_pb.ts` synced
  from protos 0.229.0.

## [0.33.0]

### Added: orbits across two pools

- `OrbitMember.outsidePool`: the pair's other player when he is not in the
  orbit's pool (a striker v an attacking midfielder, or a league outside the
  top five). He keeps his dot and face, and is left out of the pool's size
  ("the 157 other strikers"), of everyone else's place and of the nearest
  three. His label reads "Martin Ødegaard, from outside this pool, would be
  43rd closest of the 157 other strikers to Erling Haaland" and his strip
  line "43rd closest to Haaland among strikers". Never "joint": his rank
  leaves him out of the count, so it cannot say whether a pool member shares
  his score.
- `OrbitData.poolLabel`: the pool's caption. `SimilarityOrbitPair` shows one
  under each orbit when both have one and they differ, and none otherwise.
- `poolSize` is exported.

## [0.32.2]

### Changed

- **Similarity orbit pair:** the family line ("Alike in … · Differ on …")
  becomes two rows under "Both / Only <surname>", in the same form:
  "Similar: Shooting" and "Different: Dribbling, Creating". Each row shows
  only when it names a family.
- **Pair verdict** reads "Very similar profiles", "Similar profiles",
  "Different profiles" or "Very different profiles" (`orbitVerdict`), stored
  blocks included, so it never reads as a row.
- **Detail strip** (`OrbitDetailStrip` `name`, `club`, `lines`; `placeLines`):
  his name, his club on its own quieter line, one line per place ("Closest
  to Mbappé", "3rd closest to Haaland"), then the links with spacing and no
  separators. The block's links read "Player page" and "Compare with
  <surname>". The region keeps "Name, Club" as its accessible name.

## [0.32.1]

### Fixed

- The orbits' drift runs only on the layout on screen. A pair renders one
  layout per breakpoint and hides the other, and both were animating (644
  animations on a Compare page instead of about 320). A resize re-runs it
  for the layout that is then shown.

## [0.32.0]

### Added: similarity orbit game block

- **`player-similarity-orbit`** (Player › Similarity orbit, protos 0.227.0):
  one player's orbit ("who is he like?"), or, when the spec names a
  comparison, both players' orbits side by side with the Compare page's
  verdict, "Both / Only" archetype rows and "Alike in · Differ on" line.
  Drawn with the shared `SimilarityOrbit` and `SimilarityOrbitPair`; no text
  on the orbit. The context line is the pool and season ("Strikers, top five
  leagues, 2026/27").
- Interactive in an article and in chat (drift, names on hover, a tap opens
  the strip with "Player page" and "vs <surname>" links to the comparison
  page); still in a picker tile and in a saved image.
- `toOrbitData`, `orbitContext`, and the link helpers `playerPagePath`,
  `playerComparePath`, `playerRouteId`, `identitySlug` and `orbitSurname`
  (platform's route and slug rules).
- Types: `PlayerSimilarityOrbitDataJson`, `GameBlockOrbitJson`,
  `GameBlockOrbitMemberJson`, `GameBlockArchetypeRowJson`;
  `game_block_pb.ts` synced from protos 0.227.0.
- `BlockLayout.capturing`: true while Save image captures a block, so a
  block with motion or taps draws its still picture for the file.

## [0.31.0]

### Added: similarity orbits

- **`SimilarityOrbit`** (one player) and **`SimilarityOrbitPair`** (two side
  by side, each the other's compared player) in `@breakingthelines/viz/stats`:
  the anchor's headshot at the centre and his position group as a golden-angle
  sunflower of dots, rank as the radius. Faces sit on stems from their own
  dots (the nearest three; in a pair the compared player in his colour, the
  disc inside his radius lit), nudged out along the stem when they would
  overlap. No text on the field.
- Interactions behind `interactive` (default on): names on hover and focus,
  tap or Enter to select (lit disc, a face on a stem, the dot ringed in both
  orbits of a pair) and open `OrbitDetailStrip` with the caller's actions
  (`renderActions`); arrows move through the dots by rank; Escape, the same
  dot, the close control or a tap outside closes. Ambient drift (Web
  Animations, seeded per player id, under a seventh of the dot spacing) is
  off under reduced motion and with `motion={false}`, and pauses off screen
  and during any interaction.
- Plain data (`OrbitData`: anchor, plural, members closest first with
  `rank`, `name`, `club`, `url`, `imageUrl`), so game-service's
  `SimilarityOrbit` and the game block's `GameBlockOrbit` both map onto it.
  Ties are equal ranks: the accessible labels read "joint", the strip reads
  the plain position in the members' order. The geometry, labels and drift are
  exported from `similarity-orbit-model.ts`.

## [0.30.0]

### Added: comparison views

- **`player-comparison` views** (`options.view`): `wheel` (default, one
  wheel with the second player as outlines), `differ` (the annotated look on
  the widest gap in each family, the crayon ringing the widest), `bars` (the
  Stats tab's side by side bars on the eight widest gaps), `strip` (three
  stats across), `two_wheels` (each player on his own wheel) and `duel` (the
  poster with both cut-outs and three figures). `scales` and `rows` stay.
  `comparisonView`, `widestGaps` and `COMPARISON_VIEWS` are exported.
- **Pair poster.** `BlockMedia.pairPersonId` with `personId` draws two
  players' cut-outs facing each other (`pickPairArt`, `usePairArtStatus`).
  The duel needs both pictures; without them a comparison draws its wheel.
- **`PercentileWheel.tone`**: `comparison` ramps the wedges to white, for a
  second player's wheel.
- **`ComparisonBarsRow.left.display` / `right.display`** draw a node (a
  gated cell) in place of the formatted value.

### Changed

- A comparison's context line is the scope its figures cover ("Bundesliga
  2026/27", "All competitions 2026/27"), not the two clubs.
- The default comparison view is the wheel. Stored blocks with no view now
  draw the wheel; pass `view: 'scales'` for the old rows with a hero.

### Fixed

- A comparison asked for as a poster drew the first player's headshot where
  a crest goes and left the second player out. It now draws the duel, or
  the wheel when either player has no picture, and never a crest.

## [0.29.1]

### Fixed: `SeasonTrend` keeps "not ranked" without ordinals

- With `ordinals={false}`, a season with a value but no ranking still reads
  "1.84 per 90, not ranked" in its tooltip and the hidden table; only the
  percentile ordinal is dropped.

## [0.29.0]

### Added: `ordinals` on the percentile charts

- **`PercentileRows`**, **`ComparisonBars`** and **`SeasonTrend`** take
  `ordinals` (default `true`). `false` drops the percentile ordinal ("90th"):
  rows keep the value and the bar, the side by side keeps the values and the
  bars, and a season point reads its value alone ("0.83 per 90").

## [0.28.1]

### Fixed: `StyleMap` edge tick labels

- The x tick labels at the plot's left and right edges anchor inward
  (`tickAnchor`), so "70%" is no longer clipped at phone width.

## [0.28.0]

### Added: `StyleMap`

- **`StyleMap`** draws teams as crests on two axes for one league season
  (the league style map: possession against PPDA). The league mean of each
  axis is a dotted line; `invertY` puts lower values at the top. Crests that
  overlap are nudged apart (`nudgeStyleMap`) and kept inside the plot. The
  chart measures its container, so crests and type keep their size from
  phone to desktop; a crest with `href` links to the team.

## [0.27.0]

### Added: club context in the form chart

- **`FormChartMatch.team`** names the club the player played each match for.
  When the visible window spans more than one club, a thin divider sits
  between the bars where the club changes and each club's short name sits
  small and muted over its run of bars. A window at one club draws nothing
  extra. Each bar's accessible name adds "for <club>".
- **Opens on the current club.** When the newest ten cross a change of club
  and the latest club has at least `latestClubMinimum` (default 5) matches,
  the chart opens on those alone. "Earlier matches" widens to the full window
  with the divider, then pages back as before. Below the minimum it opens on
  the last ten with the divider.

### Fixed: rating read twice in a bar's link text

- A bar's link held both its title ("..., rating 6.7") and the rating numeral,
  so its text read "rating 6.76.7". The numerals now sit outside the link,
  and the whole column is the pointer target.

## [0.26.1]

### Added: the drawn look, for hosts

- **`GameBlockView` `onLookDrawn`** is called with the look the block draws,
  on mount and when it changes. A poster with no usable headshot or crest
  draws as editorial, so an editor can say the chosen look fell back without
  reading `data-game-block-look`.

### Added: a comparison of season totals

- **Player › Comparison** of two players the cards cannot rank together
  (different leagues or position groups) arrives as season totals and per 90,
  all competitions of the same season, with no percentiles: families
  `season_totals` and `per_90`, schema 2. It draws as two plain tables with
  minutes on top, and the hero is the highlighted total beside the second
  player's.
- **`SUPPORTED_DATA_VERSION`** is 2. Builds before this one show "Update to
  see this block" for a totals comparison.

## [0.26.0]

### Fixed: poster with no photo for most players

- **Poster look** showed no photo for players such as Kylian Mbappé because
  the block's subject card carries no headshot for most players (game-service
  leaves `imageUrl` empty; the platform draws headshots from the entity asset
  chain by id). The poster now builds the addresses from the player's id when
  the block has none.
- **Pre-rendered halftone first.** The poster reads
  `resolved/player-halftone/<id>` from the media CDN, drawn by
  content-service's player-cutouts job from an ML cut-out. Then it falls back
  to the halftone computed in the browser from the headshot, then the crest,
  then the editorial look. A skin with its own halftone inks skips the
  pre-rendered image.
- **Sharper in-browser halftone.** It is drawn at the device pixels the
  cut-out occupies (918 px for a phone at 3x) instead of a 600 px canvas the
  browser stretched, with the same number of dots.
- **Relative CDN keys** (`media/...`) in block images resolve on the media
  base, not the page's origin.
- New: `GameBlockAssetsProvider` (`mediaBase`, default
  `https://cdn.breakingthelines.app/media`), `BlockMedia.personId`,
  `playerHalftoneUrl`, `playerHeadshotUrl`, `resolveMediaSrc`.

## [0.25.3]

### Fixed: poster with no usable headshot

- **Poster look** drew bare colour wedges and the hero number when the
  headshot was missing or could not be cut out and no crest was drawn. It now
  falls back in order: the halftone cut-out of the headshot, then the crest,
  large and flat in the cut-out position, then the editorial look when there is
  no crest or it does not load.
- **`data-game-block-look`** names the look drawn. A poster drawn as editorial
  also carries `data-game-block-look-fallback="poster"`.
- Season totals stories for a poster with only a crest, with no image and with
  images that fail to load.

## [0.25.2]

### Fixed: fan grades with few votes

- **`MatchFanGradesBlock`** drew a side header (team, formation) with nothing
  under it when no reader had graded any of that side's players. A side with
  no graded player is now left out, and `FanGradeSides` skips such a side too.
- **Counts read singular for one**: "1 vote", not "1 votes". A new
  `countLabel` helper words every labelled count in the blocks: fan grades and
  player of the match votes, predictions readers, league strength leagues,
  career goals and assists, season totals apps and minutes, squad players,
  manager record games, and the pass network, pass sonar and press map
  labels.

## [0.25.1]

### Fixed: fan grades read on BTL's 1 to 6 scale, lower better

- **`MatchFanGradesBlock` and `MatchPlayerOfTheMatchBlock`** drew grades as
  0 to 10, higher better (the scale filled to grade times ten, the hero was the
  highest grade). BTL fan grades run 1 (best) to 6 (worst), and game-service
  passes them through as cast. The scale now fills to 100 at 1 and empties at
  6, the best (lowest) grade is the hero with the red rule, lists sort best
  first, and the team average tick sits on the same scale. Figures show the real
  grade; the scale's accessible label reads "Grade 1.3 of 6, 1 is best" instead
  of "87 out of 100".
- **`BlockScale`** takes an optional `label` for its accessible name when the
  drawn value is not itself out of 100.
- Example fixtures for both blocks now use grades on the 1 to 6 scale.

### Added: team, league and match parts exported

- `@breakingthelines/viz/game-blocks` now exports the team, league and match
  parts under `parts/` (for example `StandingsTable`, `FixtureList`,
  `TeamFormRows`, `TransferRows`, `MatchStatRows`, `TimelineRows`,
  `FanGradeSides`, `PlayerOfTheMatchScale`), the shared `BlockGrid`,
  `SectionLabel`, `ScaleCell`, `SplitBar`, `ResultStrip` and `RefName`, and the
  grade helpers `gradeToScale`, `gradeScaleLabel`, `GRADE_BEST` and
  `GRADE_WORST`.

## [0.25.0]

### Added: player game blocks

- **Every Player › block except the wheel** under `src/game-blocks/player/`,
  registered in `PLAYER_BLOCKS`: Season totals, Form, Comparison, Career,
  Match log, Archetypes, Season trend, Similar players, Transfers, Honours,
  Absences and Details. Each draws in the three looks through `BlockFrame`,
  titled by the subject, with short labels only and no default prose. Paid
  figures are `GatedValue` cells, drawn as the viewer's cells say; nothing
  hardcodes which cells lock.
- **Player parts** under `src/game-blocks/parts/`, for blocks and the player
  page: `PlayerScaleRows` and `PlayerScaleKey` (0 to 100 scales with a
  comparator ring), `PlayerFormBars` (match ratings against the season
  average) and `PlayerTrendChart` (percentiles by season).
- **Player data JSON types** (`player/data.ts`), pinned to protos 0.209.0 by
  `player/data.pin.test.ts`.
- **Example fixtures** for each player type (`fixtures/player-*.example.json`,
  `fixtures/player.ts`). Example figures only.

### Added: team, manager, league and match game blocks

- **Team ›** Season totals, Form, Goal timing, Squad, Out and doubtful,
  Transfers, Honours and Manager record (`TEAM_BLOCKS`); **League ›** Table,
  Team stats, Leaders, Player rankings, Fixtures, Bracket and League strength
  (`LEAGUE_BLOCKS`); **Match ›** Match stats, Result, Timeline, Fan grades,
  Player of the match, Predictions and Missing players (`MATCH_BLOCKS`). Each
  draws in the three looks through `BlockFrame`, titled by the subject
  ("Arsenal", "Premier League", "Arsenal v Liverpool"), short labels only.
  One visual language: the subject as the red fill or rule, the comparator as
  the outlined ring or bar, the median as a tick. Player rankings and League
  strength read every paid value from the row's cell keys, so a free reader
  sees exactly the cells the snapshot locks.
- **Parts** under `src/game-blocks/parts/` (`team-*`, `league-*`, `match-*`),
  redrawn on the skin from the platform entity page visuals: `BlockGrid` (one
  grid per table, subject row, no zebra rows), `TeamSeasonStatRows`,
  `TeamFormRows`, `ResultStrip`, `GoalTimingChart`, `SquadList`,
  `AbsenceRows`, `TransferWindow`, `HonourRows`, `TenureRows`,
  `StandingsTable`, `TeamStatsTable`, `LeaderRows`, `RankingRows`,
  `FixtureList`, `KnockoutBracket` (stacked at phone width, never a
  scroller), `StrengthRows`, `MatchStatRows`, `ScorerColumns`,
  `TimelineRows`, `GradePitch`, `GradeList` and `PredictionRows`.
- **Data JSON types** per submenu (`team/types.ts`, `league/types.ts`,
  `match/types.ts`), pinned to protos 0.209.0 by
  `parts/team-league-match.pin.test.ts`; shared shapes reuse `player/data.ts`.
- **Example fixtures** for each type (`fixtures/{team,league,match}-*` and
  `manager-record.example.json`, `fixtures/team-league-match.ts`). Example
  figures only.

### Added: game blocks, the skin and the percentile wheel

- **`@breakingthelines/viz/game-blocks`**, a new subpath for the round 4
  game blocks. Hosts lazy-load it.
- **The block skin** (`src/game-blocks/skin/`), the only place a block makes
  a visual decision. `BlockFrame` draws a block in the author's look:
  `editorial` (the default: Le Monde run-in name, the figure on the words'
  baseline, no rule or box), `poster` (flat colour wedges, the hero number in
  Helvetica Neue condensed across the diagonal, a halftone cut-out of the
  headshot computed in the browser, falling back to the crest or the number
  alone) and `annotated` (plain Inter data with at most two seeded crayon
  marks anchored to the highlighted stat). Every look ends in the BTL mark
  and wordmark bottom left; a provider mark appears only where a licence
  requires one (Hudl StatsBomb). Save image is a hover or focus action that
  captures the block on the skin surface, logo included. Primitives:
  `BlockFigure`, `BlockBaseline`, `BlockRows`, `BlockScale`, `GatedValue`,
  `LockedRule`. Tokens live in `BlockSkinTokens` and the `--btl-block-*`
  custom properties; `GameBlockSkinProvider` overrides them.
- **`GameBlockValuesProvider`**, `GameBlockScope`, `useGatedCell` and
  `useBlockLocked`: gated cells resolve per viewer. Every snapshot on a page
  is read in one batched `fetchValues` call after hydration; server rendering
  shows pending rules and no locked note; an anonymous reader sees locked
  cells at once with no call.
- **`GAME_BLOCK_REGISTRY`** for all 35 block types (id, proto enum, data key,
  label, submenu, keywords, subject kinds, editor node), `GameBlockView`
  (renders any stored block, "Update to see this block" for an unknown type
  or a newer data version), `toGameBlockConfig` (protos `GameBlock` JSON to
  the stored `GameBlockConfig`, gated values never copied) and
  `gatedValuesFromJson`.
- **Player › Percentile wheel**, the reference block: the highlighted
  metric's per 90 figure as the hero, or its public percentile when the
  figure is locked; the median and a terse comparison group ("vs 41 Premier
  League wingers") as short labels; views `wheel`, `wheel_rows` and `rows`.
- `BtlWordmark` and `ProviderMark` are exported from the panel footer module
  for reuse.

### Changed

- The protos 0.209.0 generated code for `game_block.proto` and its imports
  (`profile`, `context`, `common`) is synced into `src/generated`, for the
  type pin test and the `toGameBlockConfig` round trip. Tests only; nothing
  in the published entries imports it.
- `@breakingthelines/design-system` >=0.107.0 is an optional peer, for game
  blocks that embed design-system parts.

## [0.24.0]

### Added: blocks are control surfaces

- **`MinuteRange`** (`@breakingthelines/viz/football/primitives`): a
  controlled two-thumb minute range with `value`, `onChange`, `onCommit`,
  `min`/`max` (0-90 or 0-120), `step`, `pageStep`, `minGap` and optional
  `marks` (goals, cards). Built on two native range inputs labelled "From
  minute" and "To minute". Arrows step one minute, Page Up/Down five,
  Home/End jump to the limit, and clicking the track moves the nearer thumb.
  Visible focus ring, 2px/4px radii, 24px thumbs on a 44px row under
  `pointer: coarse`, and no motion beyond a 140ms ease-out thumb press,
  which `prefers-reduced-motion` turns off.
- **`subject` on every selection report.** Every selectable block's
  `onSelectionChange` payload keeps its own fields and adds
  `subject: { playerId, playerName, team }`, resolved by the block to the
  player and team it shows. `team` is a display name ("France"), not
  `'home'`/`'away'`, and `null` while ShotMap shows both sides.
  `SelectionSubject`, `SelectionChange<T>` and `MinuteWindow` are exported
  from `@breakingthelines/viz/football/blocks`.
- **`window={{ from, to }}`** on the blocks whose items carry a minute:
  `ShotMap`, `XgMomentum`, `GoalSequence` and `Moment360`. The block filters
  itself (inclusive at both ends). `XgMomentum` keeps the full-match axis and
  shades outside the window; `GoalSequence` and `Moment360` show the first
  item in the window and keep their frame with a "No goals between 60' and
  90'" line when nothing is in it. `ShotMap` shots take an optional
  `playerId`, reported as `subject.playerId`.

### Fixed: `onSelectionChange` reported changes twice, and during render

- It never fired on mount or for `initialSelection`; that is now covered by
  a test across all ten selectable blocks, under StrictMode.
- It did fire from inside React's state updater. Picking a team's "Whole
  team" row or a player in the team-aware selector (HeatMap, LineBreaking,
  Progression, PassNetwork, PassSonar) reported twice, first with an
  intermediate selection that never rendered (the new side still paired with
  the old player). Re-picking the current option reported again. StrictMode
  doubled every report. A host that set its own state in the handler got
  React's "Cannot update a component while rendering a different component"
  warning.
- Reports now go out after commit: once per change, with the selection the
  block renders, and nothing for a no-op.

## [0.23.1]

### Fixed: a cleaner focus state on `PercentileWheel`

- Hover, tap and keyboard focus used to read as a hard size jump: nothing
  on the focused wedge itself changed, but the comparison outline (always
  `stroke-width:2`, ramping toward white) snapped from 22% opacity to
  fully visible on top of it, while every other wedge dropped to 22%
  opacity in one step. Against a full-strength subject wedge (the ramp
  reaches BTL red at the 90th percentile) this read as a thick white ring
  clashing with a bright red fill and a crude jump everywhere else.
- Unfocused wedges, their labels and the comparison outline now dim to
  40-50% instead of 22%, so the wheel still reads as one shape.
- The focused wedge gets its own thin, soft edge
  (`rgba(255,255,255,0.4)`, 1 unit) instead of borrowing the comparison
  outline's weight. The comparison outline itself thins and softens
  slightly when it sits on the focused wedge (`stroke-width` 1.5 to 1,
  `stroke-opacity` .9 to .8), so the two stay legible without clashing.
- All of the above transitions over 140ms (was 180ms), inside the
  120-160ms band, and the wedge's own path is never touched by focus, so
  there is no layout shift. `prefers-reduced-motion` now also turns off
  the dim and label transitions, not just the grow-in and comparison
  animations.
- The keyboard focus ring (`:focus-visible`) is slightly softer
  (`rgba(255,255,255,0.55)`, 3px offset, 6px radius) to match.

## [0.23.0]

### Added: a link and title on a shared image

`useImageSave`'s `save()` takes `share: { title?, text?, url? }`, and
`useSocialFrameExport(fileName, { share })` passes it through. The touch
overlay's Share sends the image with that link and title. When the browser's
`canShare` refuses a file with a link, the image goes alone. A share target
that drops the file or the link after the sheet opens cannot be detected
here. Callers that pass nothing share exactly as before.

## [0.22.1]

### Fixed: in-wedge percentile numbers too big on phones

- 0.22.0's curved labels fit the wheel's view box to the label rings instead
  of the old fixed 720-unit frame, shrinking it to about 497 units on a
  phone. The phone's rendered wheel width did not change, so the narrow
  tip's fixed 22 user units, unchanged since the 0.20.0 size cut, started
  drawing about 1.45x bigger there (about 9.7 px before, about 14 px after,
  nearly 1.5x the curved label beside it).
- The narrow (`<=760px`, or `labels="short"`) in-wedge number is now 15.5
  user units, recalibrated to the new view box: about 9.6 px on a 390 px
  phone, a touch under the pre-0.22.0 size and still clearly above the
  curved label's own ~9.5 px there. The desktop size (11, the `tipSize`
  prop's default) is unchanged: desktop always renders the wheel at its
  view box's native size, so it never saw this regression.

## [0.22.0]

### Changed: curved wheel labels with family arcs on `PercentileWheel`

- Each metric label follows the arc outside its wedge, centred on it. Labels
  in the bottom half run the other way so they read left to right. They
  replace both horizontal label sets (the desktop long labels and the phone
  short labels).
- A thin arc per family (Shooting, Creating, Passing, Carrying, Defending,
  the metrics' `group`) runs outside the labels and carries the family name.
- Labels use plain words: Goals, Shots, On target, Assists, Key passes,
  Passes, Accuracy, Dribbles, Success, Fouled, Tackles, Interceptions,
  Duels, Win rate. Under its family a rate reads as a noun ("Accuracy"
  under Passing). A key with no word uses its `shortLabel`.
- Label sizes are set so neighbours never touch: 12.5 px on desktop and
  about 9.5 px on a 390 px phone. Each pair keeps at least 0.5 em clear,
  measured conservatively; "Tackles" and "Interceptions", the tightest pair,
  draw about 0.8 em apart on a phone. Family names are about 9.2 px on a
  phone and 11.5 px on desktop. A crowded wheel (the 22-metric event board) swaps a clashing
  label to its `shortLabel`, then shrinks all labels together.
- The view box is a square fitted to the rings (about 497 units, was
  720 x 488), so the wheel draws larger on phones: a 316 px column now
  scales it by 0.64, up from 0.44. On the web the wheel is at most its view
  box wide, so desktop sizes are pixels. The social variant still fills its
  column.
- When two neighbouring percentile numbers would touch, both move out to one
  shared radius, clear of the hub; one pushed past its wedge tip gets the
  halo.
- `labels` keeps its values: `long` draws the desktop sizes, `short` the
  phone sizes, `auto` both, switched by CSS at 760 px. The phone percentile
  numbers are their own elements now, not a CSS font-size override.

## [0.21.1]

### Fixed: a bare age reads like a season

- `SimilarList`'s context line now renders an age as "age 24", not a bare
  number. Next to a player, a bare "24" reads like a season (24/25). Entity
  search already uses this wording (`hitSecondaryLabel`).

## [0.21.0]

### Changed: the Seasons chart is a percentile trend (breaking)

- New `SeasonTrend` replaces `SeasonLines`. One row per metric, seasons
  oldest to newest on x, the season's percentile in its ranked-against group
  (0 to 100) on y, so every metric reads on the same scale. Points take the
  wheel's ramp and carry their value as the label; the percentile ordinal is
  in the hover tooltip and the hidden table. A season with a value but no
  ranking draws hollow under the scale and breaks the line. `renderLabel`
  lets the host draw a row's name as a control (the profile's metric
  dropdown).
- It fits its container. Up to `visibleSeasons` (default 5) share the
  width; more scroll inside the chart, opening on the newest, with the row
  names and the 0 / 50 / 100 scale pinned. Captions wrap, nothing clips.
- Removed: `SeasonLines` and its `SeasonLinesProps`, `SeasonLinesSeason`
  and `SeasonLinesSeries` types.

### Changed: no underlined links in the profile lists

- `LeagueLadder` and `SimilarList` links are no longer underlined. They turn
  BTL red on hover and focus (`--color-red-100` when the host defines it),
  as the form chart's labels do.

## [0.20.0]

### Changed: smaller in-wedge percentile numbers on `PercentileWheel`

- The percentile number drawn inside each wedge is smaller: 11 (down from
  13, about 15% smaller) at the wheel's full (desktop/`web`) width. Weight
  stays 700.
- New `tipSize` prop (default 11) lets a caller tune the number's size.
  The narrow-screen size (`labels="short"`, or `auto` at 760 px and below)
  scales with it but never drops under 22, the shipped value: at the
  Stats tab's narrowest wheel (390 px phone width, a ~316 px rendered
  wheel) 22 already measures the smallest legible size, so a caller
  cannot shrink the narrow number past that floor.

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

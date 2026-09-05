# @breakingthelines/viz

> Open-source football visualisation components for the web

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

Beautiful, accessible React components for football data visualisation. Build graphics for your articles, dashboards, or applications.

## Why?

Football analytics has exploded in popularity, but the tooling remains largely inaccessible. Advanced data is locked behind expensive paywalls, and free resources can disappear overnight when commercial interests take priority.

We believe the community deserves open, provider-agnostic tools that:

- **Work with any data source** — StatsBomb, Opta, Wyscout, or your own
- **Can't be taken away** — Open source, AGPL-3.0 licensed
- **Lower the barrier to entry** — For analysts, journalists, researchers, and fans
- **Enable collaboration** — Build on each other's work

This package is part of our effort to keep football analytics open and accessible to everyone.

## Features

- **🏟️ Pitch Primitives** — SVG football pitch with variants (full, half, attacking-third)
- **⚽ Shot Maps** — xG-sized markers with outcome colouring
- **📋 Formation Boards** — Team formation displays with player markers
- **📤 Export Utilities** — PNG, SVG, and clipboard export
- **♿ Accessible** — Keyboard navigation and screen reader support
- **📊 Data Agnostic** — Works with any provider via normalised schema

## Installation

```bash
# bun
bun add @breakingthelines/viz
```

## Quick Start

```tsx
import { ShotMap, Pitch, PlayerMarker } from '@breakingthelines/viz/football';
import '@breakingthelines/viz/styles.css';

// Using the ShotMap composition
function MyShotMap({ shots }) {
  return <ShotMap shots={shots} showXgLabels />;
}

// Or build custom visualisations with primitives
function CustomViz({ players }) {
  return (
    <Pitch variant="half">
      {players.map((player) => (
        <PlayerMarker
          key={player.id}
          position={player.position}
          color={player.team.color}
          label={player.number}
        />
      ))}
    </Pitch>
  );
}
```

## Package Exports

```typescript
// Main entry - all components
import { Pitch, ShotMap, FormationBoard } from '@breakingthelines/viz';

// Football primitives only
import { Pitch, PlayerMarker, Arrow } from '@breakingthelines/viz/football/primitives';

// Football compositions only
import { ShotMap, FormationBoard } from '@breakingthelines/viz/football/compositions';

// Types and schemas
import type { MatchAction, PitchCoordinates } from '@breakingthelines/viz/football/types';
import { isShot, isPass } from '@breakingthelines/viz/football/types';

// Utilities
import { exportAsPng, exportAsSvg } from '@breakingthelines/viz/utils';

// Shared components
import { DataAttribution } from '@breakingthelines/viz/components';

// Styles (required)
import '@breakingthelines/viz/styles.css';
```

## Components

### Primitives

#### `<Pitch />`

SVG football pitch with configurable variants.

```tsx
import { Pitch } from '@breakingthelines/viz/football/primitives';

<Pitch
  variant="full" // 'full' | 'half' | 'attacking-third'
  showPattern    // Show grass stripe pattern
  lineColor="white"
  grassColor="#1a472a"
>
  {/* Children render on top of pitch */}
</Pitch>
```

**Coordinate System:**

- `x`: 0 = own goal line, 100 = opposition goal line
- `y`: 0 = left touchline, 100 = right touchline

#### `<PlayerMarker />`

Circle marker for player positions.

```tsx
import { PlayerMarker } from '@breakingthelines/viz/football/primitives';

<PlayerMarker
  position={{ x: 50, y: 50 }}
  color="#eb0000"
  size="md"        // 'sm' | 'md' | 'lg'
  label="10"       // Shirt number or text
  showLabel
  pulsate          // Animation effect
/>
```

#### `<Arrow />`

Line/arrow between two points.

```tsx
import { Arrow } from '@breakingthelines/viz/football/primitives';

<Arrow
  start={{ x: 30, y: 50 }}
  end={{ x: 70, y: 40 }}
  color="white"
  strokeWidth={0.5}
  showArrowhead
  dashed
  animated
/>
```

### Compositions

#### `<ShotMap />`

Shot visualisation on a half-pitch with xG sizing.

```tsx
import { ShotMap } from '@breakingthelines/viz/football/compositions';

<ShotMap
  shots={shotEvents}
  minSize={1}
  maxSize={4}
  showXgLabels
  onShotClick={(shot) => console.log(shot)}
  selectedShotId="shot-123"
/>
```

#### `<FormationBoard />`

Team formation display.

```tsx
import { FormationBoard } from '@breakingthelines/viz/football/compositions';

<FormationBoard
  formation={formation}
  showNames
  showNumbers
  interactive
  onPlayerClick={(player) => console.log(player)}
/>
```

### Shared Components

#### `<DataAttribution />`

Data provider attribution badge.

```tsx
import { DataAttribution } from '@breakingthelines/viz/components';

<DataAttribution
  source="statsbomb"
  size="sm"        // 'sm' | 'md' | 'lg'
  variant="badge"  // 'badge' | 'inline'
/>
```

## Types

viz's football types come in two layers.

The **wire contract** — the action enums and the per-action payload messages — is
re-exported verbatim from the generated `btl.game.v1.types.football` code, which
is synced into `src/generated` from the [protos](https://github.com/breakingthelines/protos)
repo. viz never redeclares it, so a contract change surfaces as a type error
rather than as drift.

The **display types** are viz's own. The proto action payload identifies actors
by id (`teamId`, `playerId`) and carries no id or clock, because on the wire
those are resolved elsewhere. Rendering needs names, kit colours and a stable
key, so viz declares plain interfaces for them — ordinary objects, built as
literals, with no protobuf runtime involved.

### Display types

```typescript
import type {
  PitchCoordinates, // { x: number; y: number }, normalised 0-100
  Player,           // { id, name, shirtNumber? }
  Team,             // { id, name, shortName?, primaryColor?, secondaryColor? }
  Formation,        // { team, formation, positions }
  FormationPosition,
  MatchAction,      // one action, ready to render
  DataProvider,     // 'statsbomb' | 'opta' | 'wyscout' | ...
} from '@breakingthelines/viz/football/types';
```

### Wire contract

```typescript
import type {
  FootballActionPayload,
  ShotEventData,
  PassEventData,
  TackleEventData,
  CarryEventData,
  InterceptionEventData,
  FreezeFramePlayer,
} from '@breakingthelines/viz/football/types';

import {
  FootballActionType,
  ShotOutcome,
  PassHeight,
  PassOutcome,
  TackleOutcome,
  DuelType,
  InterceptionOutcome,
  BodyPart,
  // one schema per message, e.g. ShotEventDataSchema, plus `create`
} from '@breakingthelines/viz/football/types';
```

### Type guards

The guards narrow on the proto `actionData` oneof, so they work on a
`MatchAction` and on a bare `FootballActionPayload` alike.

```typescript
import { isShot, isPass, isTackle, isCarry, isInterception } from '@breakingthelines/viz/football/types';

const shots = actions.filter(isShot);
shots[0].actionData.value.xg; // ShotEventData, narrowed
```

### Building a shot

```typescript
import {
  create,
  BodyPart,
  FootballActionType,
  ShotEventDataSchema,
  ShotOutcome,
  type MatchAction,
} from '@breakingthelines/viz/football/types';

const shot: MatchAction = {
  id: 'shot-123',
  type: FootballActionType.SHOT,
  timestamp: 23.5,
  location: { x: 88, y: 45 },
  player: { id: 'p-10', name: 'Lionel Messi', shirtNumber: 10 },
  team: { id: 't-1', name: 'Argentina', shortName: 'ARG', primaryColor: '#75AADB' },
  actionData: {
    case: 'shot',
    value: create(ShotEventDataSchema, {
      xg: 0.34,
      bodyPart: BodyPart.LEFT_FOOT,
      outcome: ShotOutcome.GOAL,
      endLocation: { x: 100, y: 50 },
    }),
  },
};
```

## Utilities

### Export Functions

```typescript
import {
  exportAsPng,
  exportAsSvg,
  exportAsBlob,
  copyToClipboard,
} from '@breakingthelines/viz/utils';

// Get a ref to your visualisation container
const vizRef = useRef<HTMLDivElement>(null);

// Export as PNG (2x scale by default)
await exportAsPng(vizRef.current, {
  fileName: 'shot-map',
  scale: 2,
  backgroundColor: '#0d0d0d',
});

// Export as SVG
await exportAsSvg(vizRef.current, { fileName: 'shot-map' });

// Copy to clipboard
await copyToClipboard(vizRef.current);
```

### Coordinate Utilities

```typescript
import {
  fromStatsBomb,   // Convert StatsBomb coords to 0-100
  fromOpta,        // Convert Opta coords to 0-100
  fromWyscout,     // Convert Wyscout coords to 0-100
  toSvgCoords,     // Convert to SVG viewBox coords
  toHalfPitchCoords,
  mirrorCoords,    // Mirror for opposing team
  distance,        // Distance between two points
  angle,           // Angle between two points
} from '@breakingthelines/viz/utils';
```

## Styling

Import the required CSS:

```tsx
import '@breakingthelines/viz/styles.css';
```

### CSS Variables

Customise the theme by overriding CSS variables:

```css
:root {
  --viz-bg: #0d0d0d;
  --viz-pitch: #1a472a;
  --viz-pitch-lines: #ffffff;
  --viz-primary: #eb0000;
  --viz-secondary: #6b7280;
  --viz-text: #ffffff;
  --viz-text-muted: rgba(255, 255, 255, 0.5);

  /* Shot outcomes */
  --viz-goal: #22c55e;
  --viz-saved: #eab308;
  --viz-missed: #ef4444;
  --viz-blocked: #6b7280;
  --viz-post: #f97316;
}
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Node.js >= 18

### Setup

```bash
# Clone the repository
git clone https://github.com/breakingthelines/viz.git
cd viz

# Install dependencies
bun install

# Start Storybook
bun run dev
```

### Scripts

| Script                 | Description                    |
| ---------------------- | ------------------------------ |
| `bun run dev`          | Start Storybook on port 6008   |
| `bun run build`        | Build the package with bunchee |
| `bun run lint`         | Run oxlint                     |
| `bun run format`       | Format with oxfmt              |
| `bun run format:check` | Check formatting               |
| `bun run test`         | Run Vitest tests               |

### Project Structure

```
src/
├── football/
│   ├── primitives/     # Pitch, PlayerMarker, Arrow
│   ├── compositions/   # ShotMap, FormationBoard
│   ├── experimental/   # Unstable/preview components
│   └── types/          # Zod schemas and TypeScript types
├── components/         # Shared components (DataAttribution)
├── lib/                # Internal utilities (cn)
├── utils/              # Public utilities (export, coordinates)
├── styles/             # CSS with Tailwind
└── test/
    └── fixtures/       # Test data (StatsBomb samples)
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Contribution Paths

| Type                 | Entry Points                                  |
| -------------------- | --------------------------------------------- |
| **Non-developer**    | Figma mockups, documentation                  |
| **Junior dev**       | `good-first-issue` labels, Storybook examples |
| **Experienced dev**  | New compositions, primitives, performance     |
| **Analytics person** | Viz ideas with mockups, validation            |

### Stability Model

1. New components start in `experimental/`
2. After validation with real data, promoted to `compositions/`
3. Only `compositions/` are considered stable API

## Data Sources

This package is data-agnostic. Use the coordinate utilities to normalise data from any provider:

- **StatsBomb** — `fromStatsBomb(x, y)`
- **Opta** — `fromOpta(x, y)`
- **Wyscout** — `fromWyscout(x, y)`

## License

[AGPL-3.0](./LICENSE) — Free to use, modify, and distribute. If you modify and distribute, you must share your changes under the same license.

## Links

- [Storybook Documentation](https://breakingthelines.github.io/viz/)
- [GitHub Repository](https://github.com/breakingthelines/viz)
- [Breaking The Lines](https://breakingthelines.com)

---

Built with ❤️ by [Breaking The Lines](https://breakingthelines.com)

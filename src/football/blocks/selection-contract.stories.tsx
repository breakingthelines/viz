import { StrictMode, useState, type ComponentType, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ShotMap } from './shot-map';
import { HeatMap } from './heat-map';
import { LineBreaking } from './line-breaking';
import { Progression } from './progression';
import { PassNetwork } from './pass-network';
import { PassSonar } from './pass-sonar';
import { PressMap } from './press-map';
import { SetPiece } from './set-piece';
import { GoalSequence } from './goal-sequence';
import { Moment360 } from './moment-360';
import { Default as ShotMapDefault } from './shot-map.stories';
import { BothTeams as HeatMapBothTeams } from './heat-map.stories';
import { BothTeams as LineBreakingBothTeams } from './line-breaking.stories';
import { BothTeams as ProgressionBothTeams } from './progression.stories';
import { BothTeamsWithSubs as PassNetworkBothTeams } from './pass-network.stories';
import { BothTeamsWithSubs as PassSonarBothTeams } from './pass-sonar.stories';
import { Default as PressMapDefault } from './press-map.stories';
import { Default as SetPieceDefault } from './set-piece.stories';
import { Default as GoalSequenceDefault } from './goal-sequence.stories';
import { Default as Moment360Default } from './moment-360.stories';
import type { SelectionSubject } from '#/football/lib/selection';

/**
 * The selection contract every selectable block shares, tested across blocks:
 *
 *   • `onSelectionChange` never fires on mount, for `initialSelection`, under
 *     StrictMode, or when the host re-renders with new prop identities;
 *   • one user change reports once, with the final selection (never an
 *     intermediate one), and re-picking the current option reports nothing;
 *   • every report carries `subject`, resolved to the team the block shows;
 *   • reporting happens after commit, so a host that sets its own state in the
 *     handler never trips React's "Cannot update a component while rendering a
 *     different component" warning.
 */
const meta = {
  title: 'Football/Blocks/Selection contract',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Report {
  block: string;
  payload: Record<string, unknown> & { subject: SelectionSubject };
}

/** Reports collected by the story currently rendering. Reset by each harness mount. */
let reports: Report[] = [];

// Story args are typed per block; the harness only forwards them.
type AnyProps = Record<string, unknown>;
const argsOf = (story: { args?: unknown }): AnyProps => (story.args ?? {}) as AnyProps;

interface Seeded {
  name: string;
  Component: ComponentType<AnyProps>;
  args: AnyProps;
  initialSelection: AnyProps;
}

const SEEDED: Seeded[] = [
  {
    name: 'ShotMap',
    Component: ShotMap as unknown as ComponentType<AnyProps>,
    args: argsOf(ShotMapDefault),
    initialSelection: { team: 'home', player: 'L. Messi' },
  },
  {
    name: 'HeatMap',
    Component: HeatMap as unknown as ComponentType<AnyProps>,
    args: argsOf(HeatMapBothTeams),
    initialSelection: { activePlayer: 'fra-mbappe', selectedTeam: null },
  },
  {
    name: 'LineBreaking',
    Component: LineBreaking as unknown as ComponentType<AnyProps>,
    args: argsOf(LineBreakingBothTeams),
    initialSelection: { mode: 'breaks', activePlayer: null, selectedTeam: 'France' },
  },
  {
    name: 'Progression',
    Component: Progression as unknown as ComponentType<AnyProps>,
    args: argsOf(ProgressionBothTeams),
    initialSelection: {
      filter: { kind: 'type', type: 'pass' },
      activePlayer: null,
      selectedTeam: 'France',
    },
  },
  {
    name: 'PassNetwork',
    Component: PassNetwork as unknown as ComponentType<AnyProps>,
    args: argsOf(PassNetworkBothTeams),
    initialSelection: { selectedId: 'fr-griezmann', scope: 'starters', selectedTeam: null },
  },
  {
    name: 'PassSonar',
    Component: PassSonar as unknown as ComponentType<AnyProps>,
    args: argsOf(PassSonarBothTeams),
    initialSelection: { selectedId: null, scope: 'subs', selectedTeam: 'France' },
  },
  {
    name: 'PressMap',
    Component: PressMap as unknown as ComponentType<AnyProps>,
    args: argsOf(PressMapDefault),
    initialSelection: { metric: 'pressure' },
  },
  {
    name: 'SetPiece',
    Component: SetPiece as unknown as ComponentType<AnyProps>,
    args: argsOf(SetPieceDefault),
    initialSelection: { activeId: 'free-kick-31' },
  },
  {
    name: 'GoalSequence',
    Component: GoalSequence as unknown as ComponentType<AnyProps>,
    args: argsOf(GoalSequenceDefault),
    initialSelection: { goalId: 'messi-23' },
  },
  {
    name: 'Moment360',
    Component: Moment360 as unknown as ComponentType<AnyProps>,
    args: argsOf(Moment360Default),
    initialSelection: { momentId: 'mbappe-counter-71' },
  },
];

/**
 * Renders blocks under StrictMode with a host that, like a real one, stores
 * each report in its own state. The "Re-render host" button re-renders every
 * block with fresh `initialSelection`, `onSelectionChange` and `window` objects.
 */
function Host({ blocks }: { blocks: Seeded[] }) {
  const [tick, setTick] = useState(0);
  const [, setLast] = useState<unknown>(null);
  return (
    <StrictMode>
      <div style={{ background: '#0a0a0a', padding: 24 }}>
        <button type="button" onClick={() => setTick((t) => t + 1)}>
          Re-render host
        </button>
        <span data-testid="tick">{tick}</span>
        {blocks.map(({ name, Component, args, initialSelection }) => (
          <Section key={name}>
            <Component
              {...args}
              initialSelection={{ ...initialSelection }}
              window={tick > 0 ? { from: 0, to: 120 } : undefined}
              onSelectionChange={(payload: Report['payload']) => {
                reports.push({ block: name, payload });
                setLast(payload);
              }}
            />
          </Section>
        ))}
      </div>
    </StrictMode>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 720, margin: '0 auto' }}>{children}</div>;
}

const settle = () => new Promise((r) => setTimeout(r, 250));

/** Collects console.error lines that name React's render-phase update warning. */
function trackRenderPhaseUpdates() {
  const hits: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    const line = args.map(String).join(' ');
    if (/Cannot update a component/.test(line)) hits.push(line);
    original(...args);
  };
  return {
    hits,
    restore: () => {
      console.error = original;
    },
  };
}

/**
 * No report without a user change: all ten selectable blocks mount seeded,
 * under StrictMode, then the host re-renders them with new prop identities
 * (and a `window` where the block takes one). Nothing is reported.
 */
export const NoReportOnMountOrSeed: Story = {
  render: () => {
    reports = [];
    return <Host blocks={SEEDED} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await settle();
    await expect(reports).toEqual([]);
    await userEvent.click(canvas.getByRole('button', { name: 'Re-render host' }));
    await waitFor(() => expect(canvas.getByTestId('tick')).toHaveTextContent('1'));
    await settle();
    await expect(reports).toEqual([]);
  },
};

/** The five blocks that use the shared team-aware player selector. */
const TEAM_AWARE = SEEDED.filter((b) =>
  ['HeatMap', 'LineBreaking', 'Progression', 'PassNetwork', 'PassSonar'].includes(b.name)
).map((b) => ({
  ...b,
  // Open on the home side's whole team, so the picks below are real changes.
  initialSelection: Object.fromEntries(
    Object.entries(b.initialSelection).map(([k, v]) => [
      k,
      k === 'activePlayer' || k === 'selectedId' || k === 'selectedTeam' ? null : v,
    ])
  ),
}));

async function openPlayerMenu(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: /^Player/ }));
  return within(await canvas.findByRole('listbox'));
}

/**
 * One report per pick, for each team-aware block. Picking "France — whole
 * team" calls the selector's two callbacks (side, then player) in one handler;
 * the host gets ONE report with the final selection. Picking it again reports
 * nothing. Picking a France player reports that player with `team: 'France'`.
 */
function teamAwareStory(block: Seeded): Story {
  return {
    name: `${block.name}: one report per pick`,
    render: () => {
      reports = [];
      return <Host blocks={[block]} />;
    },
    play: async ({ canvasElement }) => {
      const spy = trackRenderPhaseUpdates();
      try {
        let list = await openPlayerMenu(canvasElement);
        await userEvent.click(list.getByRole('option', { name: 'France — whole team' }));
        await waitFor(() => expect(reports).toHaveLength(1));
        await expect(reports[0]?.payload.subject).toEqual({
          playerId: null,
          playerName: null,
          team: 'France',
        });

        list = await openPlayerMenu(canvasElement);
        await userEvent.click(list.getByRole('option', { name: 'France — whole team' }));
        await settle();
        await expect(reports).toHaveLength(1);

        // The first France player: the row after France's whole-team row.
        list = await openPlayerMenu(canvasElement);
        const options = list.getAllByRole('option');
        const wholeTeam = options.findIndex(
          (o) => o.getAttribute('aria-label') === 'France — whole team'
        );
        const player = options[wholeTeam + 1];
        if (!player) throw new Error('no France player row');
        const playerName = player.textContent?.trim();
        await userEvent.click(player);
        await waitFor(() => expect(reports).toHaveLength(2));
        const subject = reports[1]?.payload.subject;
        await expect(subject?.team).toBe('France');
        await expect(subject?.playerName).toBe(playerName);
        await expect(spy.hits).toEqual([]);
      } finally {
        spy.restore();
      }
    },
  };
}

function required(story: Story | undefined): Story {
  if (!story) throw new Error('team-aware block missing from the seeded list');
  return story;
}

const [heatMap, lineBreaking, progression, passNetwork, passSonar] = TEAM_AWARE.map(teamAwareStory);
export const HeatMapReportsOncePerPick: Story = required(heatMap);
export const LineBreakingReportsOncePerPick: Story = required(lineBreaking);
export const ProgressionReportsOncePerPick: Story = required(progression);
export const PassNetworkReportsOncePerPick: Story = required(passNetwork);
export const PassSonarReportsOncePerPick: Story = required(passSonar);

/**
 * PressMap has no player: its subject names the panel's team. PassNetwork's
 * player subject carries the id the data supplies.
 */
export const SubjectWithoutPlayer: Story = {
  render: () => {
    reports = [];
    const press = SEEDED.find((b) => b.name === 'PressMap');
    return press ? <Host blocks={[{ ...press, initialSelection: { metric: 'all' } }]} /> : <></>;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /^Showing/ }));
    await userEvent.click(await canvas.findByRole('option', { name: 'Ball recoveries' }));
    await waitFor(() => expect(reports).toHaveLength(1));
    await expect(reports[0]?.payload).toEqual({
      metric: 'recovery',
      subject: { playerId: null, playerName: null, team: 'Morocco' },
    });
  },
};

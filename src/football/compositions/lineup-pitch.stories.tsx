import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import { LineupPitch } from './lineup-pitch';
import type { LineupSlot } from './lineup-pitch';
import { getFormationTemplate, FORMATION_OPTIONS } from '#/football/data/formations';

const meta = {
  title: 'Football/Compositions/LineupPitch',
  component: LineupPitch,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    theme: { control: 'select', options: ['grass', 'dark'] },
    markerSize: { control: { type: 'range', min: 2, max: 5, step: 0.2 } },
    markerContent: { control: 'select', options: ['number', 'headshot'] },
    showNames: { control: 'boolean' },
    editable: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '620px', padding: '24px', background: '#121212', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LineupPitch>;

export default meta;
type Story = StoryObj<typeof meta>;

function templateSlots(formation: string): LineupSlot[] {
  return getFormationTemplate(formation).map((t) => ({ x: t.x, y: t.y, role: t.role }));
}

const SAMPLE_NAMES = [
  'Raya',
  'White',
  'Saliba',
  'Gabriel',
  'Calafiori',
  'Ødegaard',
  'Rice',
  'Merino',
  'Saka',
  'Havertz',
  'Martinelli',
  'Trossard',
  'Jesus',
  'Jorginho',
  'Timber',
];

/** An empty 4-3-3 template — the starting point of the builder. */
export const EmptyTemplate: Story = {
  args: {
    slots: templateSlots('4-3-3'),
    teamName: 'New lineup',
    formation: '4-3-3',
    editable: true,
  },
};

/**
 * The interactive builder. Click an empty slot to fill it with the next sample
 * player; click a filled slot to clear it. Switch formations with the buttons.
 * This mirrors what the editor's Lineup block does (minus the @-mention picker).
 */
export const Builder: Story = {
  args: { slots: [], editable: true, formation: '4-3-3' },
  render: function BuilderStory() {
    const [formation, setFormation] = useState('4-3-3');
    const [slots, setSlots] = useState<LineupSlot[]>(() => templateSlots('4-3-3'));

    const pickFormation = (f: string) => {
      setFormation(f);
      setSlots(templateSlots(f));
    };

    const toggleSlot = (index: number) => {
      setSlots((prev) =>
        prev.map((slot, i) => {
          if (i !== index) return slot;
          if (slot.player) return { ...slot, player: undefined };
          const filledCount = prev.filter((s) => s.player).length;
          const name = SAMPLE_NAMES[filledCount % SAMPLE_NAMES.length];
          return { ...slot, player: { id: `p${index}`, name, shirtNumber: index + 1 } };
        })
      );
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FORMATION_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => pickFormation(f)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.12)',
                background: f === formation ? '#eb0000' : 'rgba(255,255,255,0.04)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <LineupPitch
          slots={slots}
          teamName="Arsenal"
          teamShortName="Arsenal"
          formation={formation}
          teamColor="#eb0000"
          editable
          onSlotClick={toggleSlot}
        />
      </div>
    );
  },
};

/**
 * Drag-to-swap: press and drag a filled marker onto another slot to exchange
 * the two players' assignments — the slot's position/role stay put, only
 * `player` moves. Starts nearly fully populated (one slot deliberately left
 * open) so a completed swap is obvious on screen, the empty-slot placeholder
 * is still visible for the drag-onto-empty case, and the assertions below
 * have a clean target. The readout proves the two gestures stay
 * disambiguated: a completed drag does NOT also reopen the assignment picker
 * for the slot it started from, and a plain tap (no meaningful pointer
 * movement) still does, exactly as before this gesture existed.
 */
export const DragToSwap: Story = {
  args: { slots: [], editable: true, formation: '4-3-3' },
  render: function DragToSwapStory() {
    const [slots, setSlots] = useState<LineupSlot[]>(() =>
      templateSlots('4-3-3').map((slot, i) =>
        i < 10
          ? { ...slot, player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 } }
          : slot
      )
    );
    const [lastTap, setLastTap] = useState('none');

    const handleSlotsSwap = (fromIndex: number, toIndex: number) => {
      setSlots((prev) => {
        const next = [...prev];
        const fromPlayer = next[fromIndex].player;
        next[fromIndex] = { ...next[fromIndex], player: next[toIndex].player };
        next[toIndex] = { ...next[toIndex], player: fromPlayer };
        return next;
      });
    };

    return (
      <div className="flex flex-col gap-3">
        <div data-testid="last-tap" style={{ fontSize: 12, color: 'white', opacity: 0.7 }}>
          Last tap: {lastTap}
        </div>
        <LineupPitch
          slots={slots}
          teamName="Arsenal"
          teamShortName="Arsenal"
          formation="4-3-3"
          teamColor="#eb0000"
          editable
          onSlotClick={(index) => setLastTap(slots[index]?.player?.name ?? `empty #${index}`)}
          onSlotsSwap={handleSlotsSwap}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const centerOf = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    };

    // Mouse drag: GK (Raya) onto the CB slot (Gabriel) — a swap between two
    // filled markers.
    const gk = await canvas.findByRole('button', { name: 'Raya' });
    const cb = await canvas.findByRole('button', { name: 'Gabriel' });
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: gk, coords: centerOf(gk) },
      { target: gk, coords: centerOf(cb) },
      { keys: '[/MouseLeft]', target: gk, coords: centerOf(cb) },
    ]);

    // Same DOM nodes (React keys each slot by position, not by player) now
    // carry the swapped names — the clearest proof the two assignments
    // actually exchanged rather than the query just matching something else.
    await expect(gk).toHaveAttribute('aria-label', 'Gabriel');
    await expect(cb).toHaveAttribute('aria-label', 'Raya');

    // The drag did NOT also fire onSlotClick for the slot it started from.
    await expect(canvas.getByTestId('last-tap')).toHaveTextContent('Last tap: none');

    // A plain tap (no movement) still opens the picker, unchanged.
    const saka = await canvas.findByRole('button', { name: 'Saka' });
    await userEvent.click(saka);
    await expect(canvas.getByTestId('last-tap')).toHaveTextContent('Last tap: Saka');

    // Touch drag (Pointer Events, not HTML5 DnD — the mechanism that never
    // fires on touch): the same gesture via a touch pointer, swapping two
    // more markers, proves the handlers aren't mouse-specific.
    const lw = await canvas.findByRole('button', { name: 'Saliba' });
    const st = await canvas.findByRole('button', { name: 'Calafiori' });
    await userEvent.pointer([
      { keys: '[TouchA>]', target: lw, coords: centerOf(lw) },
      // A bare move step defaults to the MOUSE pointer unless told otherwise —
      // `pointerName` is required here to keep moving the touch pointer just
      // pressed above, not a phantom mouse.
      { pointerName: 'TouchA', target: lw, coords: centerOf(st) },
      { keys: '[/TouchA]', target: lw, coords: centerOf(st) },
    ]);
    await expect(lw).toHaveAttribute('aria-label', 'Calafiori');
    await expect(st).toHaveAttribute('aria-label', 'Saliba');

    // Dragging a filled marker onto an EMPTY slot is a valid move (a swap
    // against an undefined player) — no invalid state, the vacated slot
    // simply goes empty.
    const merino = await canvas.findByRole('button', { name: 'Merino' });
    const emptySlot = await canvas.findByRole('button', { name: /^Add /i });
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: merino, coords: centerOf(merino) },
      { target: merino, coords: centerOf(emptySlot) },
      { keys: '[/MouseLeft]', target: merino, coords: centerOf(emptySlot) },
    ]);
    await expect(emptySlot).toHaveAttribute('aria-label', 'Merino');
  },
};

/** A fully-populated, read-only XI — how a published lineup renders in the reader. */
export const Reader: Story = {
  args: {
    teamName: 'Arsenal',
    teamShortName: 'Arsenal',
    formation: '4-3-3',
    teamColor: '#eb0000',
    editable: false,
    showNames: true,
    slots: templateSlots('4-3-3').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    })),
  },
};

/** Headshot markers (monogram fallback shown here, as the sample has no photos). */
export const Headshots: Story = {
  args: {
    teamName: 'Arsenal',
    teamShortName: 'Arsenal',
    formation: '4-3-3',
    teamColor: '#eb0000',
    editable: false,
    showNames: true,
    markerContent: 'headshot',
    slots: templateSlots('4-3-3').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    })),
  },
};

/**
 * Read-only markers wired to `onPlayerClick` — how a host (the editor's
 * Lineup reader) links a headshot through to the player's entity page.
 * Clicking a filled marker reports the player below (a host would navigate
 * instead); empty slots and the `editable` builder are unaffected.
 */
export const ReaderWithPlayerLinks: Story = {
  render: function ReaderWithPlayerLinksStory() {
    const [lastClicked, setLastClicked] = useState<string | null>(null);
    const slots = templateSlots('4-3-3').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    }));

    return (
      <div className="flex flex-col gap-3">
        <LineupPitch
          slots={slots}
          teamName="Arsenal"
          teamShortName="Arsenal"
          formation="4-3-3"
          teamColor="#eb0000"
          editable={false}
          onPlayerClick={(player) => setLastClicked(`${player.name} (#${player.shirtNumber})`)}
        />
        <p
          data-testid="last-clicked"
          style={{ color: 'white', fontSize: 13, textAlign: 'center', minHeight: 18 }}
        >
          {lastClicked ? `Clicked: ${lastClicked}` : 'Click a headshot marker →'}
        </p>
      </div>
    );
  },
};

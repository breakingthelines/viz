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
    orientation: { control: 'select', options: ['landscape', 'portrait'] },
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

/**
 * Drag-to-swap in `portrait`. Identical gesture coverage to {@link DragToSwap}
 * (mouse drag between two filled markers, a plain tap still opening the
 * picker, a touch drag, and a drag onto an empty slot) — proof the gesture
 * math is genuinely orientation-oblivious rather than re-tuned per
 * orientation: `toPitchPoint` converts the pointer's screen position back to
 * normalized pitch space via `fromScreen` before any hit-testing runs, so
 * every downstream calculation (`nearestSlotIndex`, the accumulated
 * `dx`/`dy` offset) is byte-identical code to the landscape gesture. The
 * same `centerOf(el)` + `getBoundingClientRect()` approach the landscape
 * story uses works unchanged here too, since it always operates in real
 * screen pixels regardless of how the pitch is internally laid out.
 */
export const PortraitDragToSwap: Story = {
  args: { slots: [], editable: true, formation: '4-3-3', orientation: 'portrait' },
  decorators: [
    (Story) => (
      <div style={{ width: '360px', padding: '24px', background: '#121212', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
  render: function PortraitDragToSwapStory() {
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
          orientation="portrait"
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

    // Mouse drag: GK (Raya, now at the BOTTOM of the box) onto the CB slot
    // (Gabriel) — a swap between two filled markers, same as the landscape
    // story, just at portrait screen positions.
    const gk = await canvas.findByRole('button', { name: 'Raya' });
    const cb = await canvas.findByRole('button', { name: 'Gabriel' });
    await userEvent.pointer([
      { keys: '[MouseLeft>]', target: gk, coords: centerOf(gk) },
      { target: gk, coords: centerOf(cb) },
      { keys: '[/MouseLeft]', target: gk, coords: centerOf(cb) },
    ]);
    await expect(gk).toHaveAttribute('aria-label', 'Gabriel');
    await expect(cb).toHaveAttribute('aria-label', 'Raya');
    await expect(canvas.getByTestId('last-tap')).toHaveTextContent('Last tap: none');

    // A plain tap still opens the picker, unchanged.
    const saka = await canvas.findByRole('button', { name: 'Saka' });
    await userEvent.click(saka);
    await expect(canvas.getByTestId('last-tap')).toHaveTextContent('Last tap: Saka');

    // Touch drag (Pointer Events).
    const lw = await canvas.findByRole('button', { name: 'Saliba' });
    const st = await canvas.findByRole('button', { name: 'Calafiori' });
    await userEvent.pointer([
      { keys: '[TouchA>]', target: lw, coords: centerOf(lw) },
      { pointerName: 'TouchA', target: lw, coords: centerOf(st) },
      { keys: '[/TouchA]', target: lw, coords: centerOf(st) },
    ]);
    await expect(lw).toHaveAttribute('aria-label', 'Calafiori');
    await expect(st).toHaveAttribute('aria-label', 'Saliba');

    // Drag onto an EMPTY slot is a valid move.
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

/**
 * Regression guard for the name-chip fix. Before the restyle, player names
 * rendered as bare white SVG `<text>` and collided badly with the pitch
 * markings underneath — in production the GK ("Pickford") sat across the
 * six-yard box, a CM pivot ("Wharton") sat across the centre circle, and the
 * ST ("Kane") sat across the penalty arc. This story recreates those same
 * three collision spots (the CM pivot nudged from its usual x:40 onto the
 * exact x:50 centre-circle centre for a guaranteed overlap) and swaps in the
 * longest ("Jude Bellingham", 'Nico O’Reilly' — an apostrophe name too) and
 * shortest ("Harry Kane") sample surnames at them, so the chip's width
 * estimate is exercised at both ends specifically where it used to fail.
 */
const NAME_COLLISION_PLAYERS = [
  'Jude Bellingham', // GK — six-yard box collision; longest name
  'Rico Lewis',
  'Marc Guéhi',
  'Ezri Konsa',
  'Tino Livramento',
  'Nico O’Reilly', // CM pivot, nudged onto the centre-circle collision; longest + apostrophe
  'Declan Rice',
  'Morgan Gibbs-White',
  'Anthony Gordon',
  'Harry Kane', // ST — penalty-arc collision; shortest name
  'Bukayo Saka',
];

export const NameCollisions: Story = {
  args: {
    teamName: 'England',
    teamShortName: 'England',
    formation: '4-3-3',
    teamColor: '#eb0000',
    editable: false,
    showNames: true,
    slots: getFormationTemplate('4-3-3').map((t, i) => ({
      x: i === 5 ? 50 : t.x, // CM pivot: x 40 → 50, dead-centre of the centre circle
      y: t.y,
      role: t.role,
      player: { id: `p${i}`, name: NAME_COLLISION_PLAYERS[i], shirtNumber: i + 1 },
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // For each collision-spot surname, the chip `<rect>` (rendered directly
    // before the `<text>`, as a sibling in the same marker `<g>`) must be at
    // least as wide as the REAL rendered glyph run — measured via the
    // browser's own `getComputedTextLength`, not our estimate — so the fix is
    // checked against actual metrics, not just re-asserting the same formula
    // the component uses. An upper bound also guards the short name isn't
    // wildly over-padded.
    const checkChip = async (surname: string) => {
      const text = (await canvas.findByText(surname)) as unknown as SVGTextElement;
      const rect = text.previousElementSibling;
      expect(rect, `${surname} chip <rect> present`).not.toBeNull();
      expect(rect!.tagName.toLowerCase()).toBe('rect');
      const chipWidth = Number(rect!.getAttribute('width'));
      const glyphWidth = text.getComputedTextLength();
      expect(chipWidth, `${surname} chip fully contains its glyph run`).toBeGreaterThanOrEqual(
        glyphWidth
      );
      expect(chipWidth, `${surname} chip isn't wildly over-padded`).toBeLessThan(
        glyphWidth * 1.6 + 10
      );
    };

    await checkChip('Bellingham');
    await checkChip('O’Reilly');
    await checkChip('Kane');
  },
};

/**
 * Portrait orientation, read-only — the pitch rotated a quarter-turn so the
 * own goal (and the goalkeeper) sit at the BOTTOM of the box and the front
 * line at the TOP, attacking up the screen, for a lineup that needs to fill
 * a phone-shaped viewport. Marker CONTENT (numbers, names) stays upright —
 * only each marker's ANCHOR POINT moves. Locks both: the GK renders visually
 * below every front-line player, and no marker or label carries a rotate
 * transform.
 */
export const PortraitReader: Story = {
  args: {
    teamName: 'Arsenal',
    teamShortName: 'Arsenal',
    formation: '4-3-3',
    teamColor: '#eb0000',
    editable: false,
    showNames: true,
    orientation: 'portrait',
    slots: templateSlots('4-3-3').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    })),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', padding: '24px', background: '#121212', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[2/3]');

    // GK (Raya, slot 0 of the 4-3-3 template) sits at the BOTTOM of the box:
    // its marker's screen `cy` is visually BELOW (a larger y) every
    // front-line player (the wide forwards + the striker).
    const gk = canvasElement.querySelector('[aria-label="Raya"]');
    expect(gk, 'GK marker present').not.toBeNull();
    const gkY = Number(gk!.querySelector('circle')!.getAttribute('cy'));

    for (const name of ['Saka', 'Havertz', 'Martinelli']) {
      const marker = canvasElement.querySelector(`[aria-label="${name}"]`);
      expect(marker, `${name} marker present`).not.toBeNull();
      const forwardY = Number(marker!.querySelector('circle')!.getAttribute('cy'));
      expect(gkY, `GK renders below ${name} (larger screen y)`).toBeGreaterThan(forwardY);
    }

    // Marker content stays upright in both orientations: no marker group or
    // its text carries an SVG rotate transform — only the anchor point
    // (cx/cy) moves, per the module doc's "content never rotates" contract.
    expect(gk!.getAttribute('transform'), 'GK marker group unrotated').toBeNull();
    const gkNumber = gk!.querySelector('text');
    expect(gkNumber, 'GK number glyph present').not.toBeNull();
    expect(gkNumber!.getAttribute('transform'), 'number glyph unrotated').toBeNull();
  },
};

/**
 * A 5-man-midfield formation (4-5-1), read-only — the other end of the
 * stylistic-formations spread from the default 4-3-3's midfield-3 triangle:
 * a flat-looking band that's actually staggered in depth (the two wide
 * mids pushed forward to x~53/y~12/88, the lone pivot dropped to x~39,
 * either side of it at x~51) so five markers don't collide or read as a
 * straight line. Landscape; see {@link FiveManMidfieldPortraitReader} for
 * the portrait counterpart.
 */
export const FiveManMidfieldReader: Story = {
  args: {
    teamName: 'Arsenal',
    teamShortName: 'Arsenal',
    formation: '4-5-1',
    teamColor: '#eb0000',
    editable: false,
    showNames: true,
    slots: templateSlots('4-5-1').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    })),
  },
};

/** {@link FiveManMidfieldReader}, rotated to `portrait` — same formation, own goal at the bottom. */
export const FiveManMidfieldPortraitReader: Story = {
  args: {
    teamName: 'Arsenal',
    teamShortName: 'Arsenal',
    formation: '4-5-1',
    teamColor: '#eb0000',
    editable: false,
    showNames: true,
    orientation: 'portrait',
    slots: templateSlots('4-5-1').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    })),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', padding: '24px', background: '#121212', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
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

/**
 * `grassColor`/`lineColor`/`labelColor` — forwarded verbatim to the underlying
 * `Pitch` (the editor's Colours panel sets these; see `pitchLineColorFor` /
 * `resolveLineupColors` there — `LineupPitch` itself has no auto-contrast
 * logic, it just renders whatever concrete colours it's given). Also doubles
 * as a regression guard that `fillEdgeToEdge` + the `padding={7}` safe-area
 * gutter + a custom background colour all compose cleanly: the grass rect
 * must fill the ENTIRE (non-square) viewBox — a leftover square-shaped fill
 * under a non-square viewBox would show as the OLD grass colour bleeding
 * through two corners.
 */
export const CustomPitchColor: Story = {
  args: {
    teamName: 'Arsenal',
    teamShortName: 'Arsenal',
    formation: '4-3-3',
    teamColor: '#ffffff',
    numberColor: '#1f6e3f',
    grassColor: '#1f6e3f',
    lineColor: 'rgba(255,255,255,0.4)',
    labelColor: '#ffcc00',
    editable: false,
    showNames: true,
    slots: templateSlots('4-3-3').map((slot, i) => ({
      ...slot,
      player: { id: `p${i}`, name: SAMPLE_NAMES[i], shirtNumber: i + 1 },
    })),
  },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();

    // Still the fillEdgeToEdge viewBox (letterbox fix), now grown by the
    // aspect-PRESERVING `padding={7}` LineupPitch always passes (the
    // safe-area gutter) — a custom colour must not fall back to the classic
    // square one, and the pad must not have thrown the ~3:2 aspect off (that
    // would reintroduce a letterbox): (121)/(80.66666666666666) ≈ 1.5, same
    // ~3:2 as the unpadded 100/66.66666666666666.
    expect(svg!.getAttribute('viewBox')).toBe('-10.500000000000002 -7 121 80.66666666666666');

    const rects = Array.from(svg!.querySelectorAll('rect'));
    const background = rects[0];
    expect(background?.getAttribute('fill'), 'grass fill is the custom colour').toBe('#1f6e3f');
    // The background rect spans the full (unpadded) pitch extent (see
    // `fullExtent` in `Pitch`) — padding only grows the viewBox AROUND it, so
    // this stays "100"/"66.66666666666666" regardless of padding — not just
    // the OLD hardcoded "100 100", which would leave two corners of a
    // non-square viewBox unpainted.
    expect(background?.getAttribute('width')).toBe('100');
    expect(background?.getAttribute('height')).toBe('66.66666666666666');

    const outline = rects[1];
    expect(outline?.parentElement?.getAttribute('stroke'), 'line colour is the custom pair').toBe(
      'rgba(255,255,255,0.4)'
    );

    // labelColor threads through to both the name label (filled slots) and
    // the role label (empty slots, none here since every slot is filled) —
    // the fix for "white pitch makes labels vanish": a caller can now pin a
    // readable label colour independent of the marker/number colours above.
    // `font-weight="400"` (Regular) — was 600/Semibold before the Figma
    // restyle dropped the weight now that the name chip carries the contrast.
    const nameLabel = svg!.querySelector('text[font-weight="400"]');
    expect(nameLabel?.getAttribute('fill'), 'name label uses labelColor').toBe('#ffcc00');
  },
};

/**
 * Regression lock for the Figma lineup restyle's (node 3047:11125) pitch
 * surface + marking geometry + formation-label fixes — cross-checked
 * against the FILE'S OWN pixel ratios (its 1109×716 pitch box), not just
 * re-asserting this component's own rounded constants:
 *  - the default (unset `grassColor`) `dark`-theme background is the
 *    Figma's `#1f1f1f`, NOT the shared near-black `--color-pitch-grass-dark`
 *    token every OTHER dark pitch in the package still defaults to (that
 *    token is untouched — see `Pitch`'s own theme doc);
 *  - the penalty box / six-yard box are re-measured against Figma's own
 *    124/430/43/198px shapes (a deliberately shallower box, wider six-yard
 *    box than a "realistic" pitch);
 *  - the centre circle radius matches Figma's 257px-diameter circle;
 *  - the formation label is a clean "4-3-3" (plain hyphens, not the
 *    previous en-dash substitution) and reads as prominent (bold,
 *    near-full-opacity), not the chip's faintest element.
 */
export const FigmaMarkingGeometry: Story = {
  args: {
    teamName: 'England',
    teamShortName: 'England',
    formation: '4-3-3',
    teamColor: '#eb0000',
    editable: false,
    showNames: false,
    slots: templateSlots('4-3-3'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();

    const rects = [...svg!.querySelectorAll('rect')];
    expect(rects[0]?.getAttribute('fill'), 'default dark grass is #1f1f1f').toBe('#1f1f1f');

    // Independently re-derived from the Figma file's own pixel measurements
    // (not this component's rounded constants) — `fillEdgeToEdge` compresses
    // the Y (touchline/width) axis by 2/3 on render; the X (goal-to-goal
    // depth) axis is untouched in `landscape`.
    const L = 1109;
    const W = 716;
    const boxDepth = (124 / L) * 100;
    const boxWidth = ((430 / W) * 100 * 2) / 3;
    const sixDepth = (43 / L) * 100;
    const sixWidth = ((198 / W) * 100 * 2) / 3;
    const centerCircleR = (128.5 / L) * 100;

    // rects[0]/[1] are the background/outline (see `CustomPitchColor` above);
    // [2]/[3] are the own penalty box / six-yard box, in JSX order.
    const ownBox = rects[2];
    expect(Number(ownBox?.getAttribute('width')), 'penalty box depth').toBeCloseTo(boxDepth, 1);
    expect(Number(ownBox?.getAttribute('height')), 'penalty box width').toBeCloseTo(boxWidth, 1);

    const ownSixYard = rects[3];
    expect(Number(ownSixYard?.getAttribute('width')), 'six-yard box depth').toBeCloseTo(
      sixDepth,
      1
    );
    expect(Number(ownSixYard?.getAttribute('height')), 'six-yard box width').toBeCloseTo(
      sixWidth,
      1
    );

    // The centre circle is the only circle with a radius bigger than any
    // marker/spot (spots r=0.6, empty-slot markers r≈3.34) — a robust way to
    // find it without depending on attribute order.
    const circles = [...svg!.querySelectorAll('circle')];
    const centreCircle = circles.find((c) => Number(c.getAttribute('r')) > 5);
    expect(centreCircle, 'centre circle present').not.toBeUndefined();
    expect(Number(centreCircle?.getAttribute('r')), 'centre circle radius').toBeCloseTo(
      centerCircleR,
      1
    );

    // Formation label: plain hyphens (not "4–3–3"), bold + near-full-opacity
    // — no longer the chip's faintest element.
    const formationSpan = await canvas.findByText('4-3-3');
    expect(formationSpan.className).toContain('font-semibold');
    expect(formationSpan.className).toContain('text-white/80');
  },
};

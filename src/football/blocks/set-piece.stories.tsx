import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { SetPiece } from './set-piece';
import type { SetPiece as SetPieceData } from './set-piece';
import { expectSvgContentVisibleOnFirstFrame, withReducedMotion } from '#/test/entrance-lock';

const meta = {
  title: 'Football/Blocks/SetPiece',
  component: SetPiece,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof SetPiece>;

export default meta;
type Story = StoryObj<typeof meta>;

const MESSI = 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg';
const ALVAREZ =
  'https://upload.wikimedia.org/wikipedia/commons/3/34/Juli%C3%A1n_%C3%81lvarez_%28footballer%29_2023.jpg';

// All coordinates are StatsBomb 120×80, in the attacking side's frame: the
// targeted goal sits at x=120, y=40 (centre), the right-hand penalty box runs
// x≈102–120, y≈18–62. The block frames that box with the half-pitch.

// 73' — Argentina inswinging corner from the right flag (120, 80) to the near
// post (≈114, 34). Messi takes; Otamendi attacks the near-post zone. ~6
// attackers + 7 defenders + GK packed into the six-yard / penalty area.
const CORNER_73: SetPieceData = {
  id: 'corner-73',
  label: "73' Corner",
  kind: 'corner',
  deliveryFrom: { x: 120, y: 80 },
  deliveryTo: { x: 114, y: 34 },
  players: [
    // Taker, out by the flag.
    { x: 119, y: 78, team: 'attacking', name: 'L. Messi', imageUrl: MESSI, isTaker: true },
    // Target attacking the near post.
    { x: 113.5, y: 35, team: 'attacking', name: 'N. Otamendi', imageUrl: ALVAREZ, isTarget: true },
    // Other attackers in the box.
    { x: 110, y: 30, team: 'attacking', name: 'C. Romero' },
    { x: 108, y: 44, team: 'attacking', name: 'L. Martínez' },
    { x: 105, y: 38, team: 'attacking', name: 'E. Fernández' },
    { x: 112, y: 50, team: 'attacking', name: 'N. Molina' },
    { x: 101, y: 33, team: 'attacking', name: 'R. De Paul' },
    // Defending GK off the line.
    { x: 117.5, y: 40, team: 'defending', keeper: true, name: 'H. Lloris' },
    // Defenders marking + zonal.
    { x: 114.5, y: 32, team: 'defending', name: 'D. Upamecano' },
    { x: 111, y: 28, team: 'defending', name: 'R. Varane' },
    { x: 109, y: 42, team: 'defending', name: 'I. Konaté' },
    { x: 106, y: 36, team: 'defending', name: 'A. Tchouaméni' },
    { x: 113, y: 48, team: 'defending', name: 'J. Koundé' },
    { x: 115, y: 24, team: 'defending', name: 'T. Hernández' },
    { x: 103, y: 30, team: 'defending', name: 'A. Griezmann' },
  ],
};

// 31' — a wide free-kick from the right half-space (≈98, 62), whipped across to
// the back of the six-yard box (≈115, 46). Tighter delivery, flatter bend.
const FREE_KICK_31: SetPieceData = {
  id: 'free-kick-31',
  label: "31' Free-kick",
  kind: 'free-kick',
  deliveryFrom: { x: 98, y: 62 },
  deliveryTo: { x: 115, y: 46 },
  players: [
    { x: 97, y: 61, team: 'attacking', name: 'Á. Di María', imageUrl: MESSI, isTaker: true },
    { x: 114.5, y: 45, team: 'attacking', name: 'L. Martínez', imageUrl: ALVAREZ, isTarget: true },
    { x: 110, y: 50, team: 'attacking', name: 'N. Otamendi' },
    { x: 112, y: 38, team: 'attacking', name: 'C. Romero' },
    { x: 107, y: 44, team: 'attacking', name: 'J. Álvarez' },
    { x: 104, y: 52, team: 'attacking', name: 'E. Fernández' },
    { x: 117, y: 41, team: 'defending', keeper: true, name: 'H. Lloris' },
    { x: 114, y: 44, team: 'defending', name: 'D. Upamecano' },
    { x: 111, y: 49, team: 'defending', name: 'R. Varane' },
    { x: 112.5, y: 40, team: 'defending', name: 'I. Konaté' },
    { x: 108, y: 46, team: 'defending', name: 'A. Tchouaméni' },
    { x: 109, y: 54, team: 'defending', name: 'J. Koundé' },
    { x: 105, y: 50, team: 'defending', name: 'A. Rabiot' },
  ],
};

/** A WC-final-flavoured pair: a 73' corner and a 31' free-kick. */
export const Default: Story = {
  args: {
    setPieces: [CORNER_73, FREE_KICK_31],
  },
};

/** The corner on its own (no switcher choice, single set piece). */
export const SingleCorner: Story = {
  args: {
    setPieces: [CORNER_73],
  },
};

/**
 * Persisted selection — seeding. A host passes `initialSelection` to open the
 * block on an author's saved set piece rather than the first. Here it opens on
 * the SECOND set piece (the 31' free-kick): the switcher trigger and the kind
 * read-out reflect the seed on first paint, with no interaction.
 */
export const SeededSelection: Story = {
  args: {
    ...Default.args,
    initialSelection: { activeId: 'free-kick-31' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The switcher trigger shows the seeded set piece's label.
    await expect(
      canvas.getByRole('button', { name: /Showing.*31' Free-kick/ })
    ).toBeInTheDocument();
    // The kind read-out matches the seeded free-kick (the default would be Corner).
    await expect(canvas.getByText('Free-kick')).toBeInTheDocument();
  },
};

/**
 * Persisted selection — change emission. `onSelectionChange` fires with the full
 * new selection object (the chosen set-piece id) whenever the user switches.
 * Picking the free-kick emits `{ activeId: 'free-kick-31' }`. This fires
 * alongside the legacy `onSelect` (kept for back-compat).
 */
export const EmitsSelectionChange: Story = {
  args: {
    ...Default.args,
    onSelectionChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Showing/ }));
    const listbox = await canvas.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: /31' Free-kick/ }));
    await expect(args.onSelectionChange).toHaveBeenCalledWith({ activeId: 'free-kick-31' });
  },
};

/**
 * Entrance-blank lock (viz #28). Every freeze-frame player, the marking lines,
 * the delivery arc and the arriving ball started at `initial={{ opacity: 0 }}` /
 * `pathLength: 0` — and the parent REMOUNTS the whole pitch on each scenario
 * switch (keyed remount) — so a dropped entrance tick left an empty pitch. This
 * renders with all framer-motion animation disabled and asserts the players
 * (circles) are visible on the first frame without the entrance firing. Locked:
 * the delivery + players use `initial={false}`.
 */
export const EntranceLock: Story = {
  args: { ...Default.args },
  decorators: [withReducedMotion],
  play: async ({ canvasElement }) => {
    await expectSvgContentVisibleOnFirstFrame(canvasElement, { selector: 'circle', min: 5 });
  },
};

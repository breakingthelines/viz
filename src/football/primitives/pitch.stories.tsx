import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Pitch } from './pitch';

const meta = {
  title: 'Football/Primitives/Pitch',
  component: Pitch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['full', 'half', 'attacking-third'],
    },
    theme: {
      control: 'select',
      options: ['grass', 'dark'],
    },
    showPattern: {
      control: 'boolean',
    },
    orientation: {
      control: 'select',
      options: ['landscape', 'portrait'],
    },
  },
} satisfies Meta<typeof Pitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  args: {
    variant: 'full',
    showPattern: true,
    lineColor: '#ffffff',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Half: Story = {
  args: {
    variant: 'half',
    showPattern: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export const AttackingThird: Story = {
  args: {
    variant: 'attacking-third',
    showPattern: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const NoPattern: Story = {
  args: {
    variant: 'full',
    showPattern: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export const CustomColors: Story = {
  args: {
    variant: 'full',
    showPattern: true,
    grassColor: '#1a472a',
    lineColor: '#ffffff',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Dark theme — near-black grass, white lines, no stripe pattern. The pitch
 * surface used across the BTL Match Centre (shot map + lineups).
 */
export const Dark: Story = {
  args: {
    variant: 'full',
    theme: 'dark',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', background: '#0d0d0d', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Edge-clip lock (review #3, item 1). A marker placed ON the pitch boundary — a
 * corner-taker at the flag, a player on the goal line, plus their headshot
 * bubbles + labels — used to be clipped by the SVG frame because the pitch filled
 * the viewBox edge-to-edge. `padding` grows the viewBox symmetrically so the
 * pitch insets and edge markers get a gutter to render into.
 *
 * This places a headshot-sized marker (r 3.4) on EACH of the four pitch corners
 * and asserts every one renders fully WITHIN the rendered SVG box — i.e. nothing
 * is clipped at the frame. Without padding the corner markers' outer halves spill
 * past the box (verified: a (0,0) marker renders ~16px above the box top); with
 * padding they sit fully inside. Re-removing the padding fails this lock.
 */
export const EdgeMarkersNotClipped: Story = {
  args: { variant: 'full', theme: 'dark', padding: 6 },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', background: '#0a0a0a', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Pitch {...args}>
      {/* Headshot-sized markers on all four pitch corners (0/100 boundary). */}
      <circle data-corner cx={0} cy={0} r={3.4} fill="red" />
      <circle data-corner cx={100} cy={0} r={3.4} fill="red" />
      <circle data-corner cx={0} cy={100} r={3.4} fill="red" />
      <circle data-corner cx={100} cy={100} r={3.4} fill="red" />
    </Pitch>
  ),
  play: async ({ canvasElement }) => {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    const box = svg!.getBoundingClientRect();
    const corners = [...canvasElement.querySelectorAll('[data-corner]')];
    expect(corners.length).toBe(4);
    // Every corner marker is fully inside the rendered SVG box (a ~1px tolerance
    // for sub-pixel rounding). If any corner spilled past the frame it'd be
    // clipped — the very bug this locks.
    for (const c of corners) {
      const b = c.getBoundingClientRect();
      expect(b.left, 'corner marker left within frame').toBeGreaterThanOrEqual(box.left - 1);
      expect(b.top, 'corner marker top within frame').toBeGreaterThanOrEqual(box.top - 1);
      expect(b.right, 'corner marker right within frame').toBeLessThanOrEqual(box.right + 1);
      expect(b.bottom, 'corner marker bottom within frame').toBeLessThanOrEqual(box.bottom + 1);
    }
  },
};

/**
 * Padding defaults to 0 → the viewBox is the exact, unchanged pitch box and the
 * rendered aspect stays `aspect-[3/2]` — locking zero behaviour change for every
 * existing caller (and, for the canvas-overlay blocks, their SVG↔canvas
 * alignment) when no padding is requested.
 */
export const DefaultPaddingUnchanged: Story = {
  args: { variant: 'full', theme: 'dark' },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', background: '#0a0a0a', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[3/2]');
  },
};

/**
 * `padding` + `fillEdgeToEdge` together (the Lineup safe-area fit): padding
 * must grow the viewBox ASPECT-PRESERVINGLY here, not by an equal pitch-unit
 * pad on every side — `fillEdgeToEdge` has already squashed the viewBox to
 * match the outer `aspect-[3/2]` box exactly, so an equal pad would throw
 * that match off and reintroduce the very letterbox `fillEdgeToEdge` exists
 * to remove. Locks the exact padded viewBox (landscape long/goal axis gets
 * `padding * 1.5`, short/touchline axis gets `padding`) AND that its aspect
 * ratio still matches `aspect-[3/2]` to within float rounding — the
 * regression this guards is subtle enough (both a letterbox AND a squashed
 * pitch look "basically fine" in a quick glance, not a broken render) that a
 * numeric lock matters more than it would for most visual props.
 */
export const FillEdgeToEdgeWithPadding: Story = {
  args: { variant: 'full', theme: 'dark', fillEdgeToEdge: true, padding: 7 },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', background: '#0a0a0a', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('-10.500000000000002 -7 121 80.66666666666666');
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[3/2]');

    const [, , w, h] = svg!.getAttribute('viewBox')!.split(' ').map(Number);
    expect(w / h, 'padded viewBox keeps the outer 3:2 aspect — no letterbox').toBeCloseTo(1.5, 5);
  },
};

/**
 * Same combination, `portrait` — the axis that gets the bigger (`* 1.5`) pad
 * swaps with the orientation (screen X in portrait, since the quarter-turn
 * already swapped which logical axis lands on which screen axis), so this
 * locks the SWAPPED viewBox rather than assuming the landscape one transposes
 * trivially.
 */
export const PortraitFillEdgeToEdgeWithPadding: Story = {
  args: {
    variant: 'full',
    theme: 'dark',
    orientation: 'portrait',
    fillEdgeToEdge: true,
    padding: 7,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px', background: '#0a0a0a', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('-7 -10.500000000000002 80.66666666666666 121');
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[2/3]');

    const [, , w, h] = svg!.getAttribute('viewBox')!.split(' ').map(Number);
    expect(h / w, 'padded viewBox keeps the outer 2:3 aspect — no letterbox').toBeCloseTo(1.5, 5);
  },
};

/**
 * Portrait orientation — the pitch rotated a quarter-turn so the own goal
 * sits at the BOTTOM and the opposition goal at the TOP (attacking UP the
 * screen), for a lineup that needs to fill a phone-shaped viewport. Locks:
 * the aspect flips to `aspect-[2/3]`, the viewBox stays `0 0 100 100` (the
 * full-pitch box is a fixed shape of the quarter-turn — see `toScreen`), and
 * the two goal markings actually land at opposite ends of the box (proof
 * this is a real rotation, not a no-op that only swapped the CSS aspect):
 * one goal's `y` sits just below the box (own goal, bottom), the other's
 * just above it (opposition goal, top).
 */
export const Portrait: Story = {
  args: {
    variant: 'full',
    orientation: 'portrait',
    showPattern: true,
    lineColor: '#ffffff',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[2/3]');

    // The two goal-mouth rects (9.6 wide x 2 deep — the same shape landscape
    // always drew) must land at opposite ends of the box after the
    // quarter-turn. Matched by APPROXIMATE size (not exact string equality):
    // `screenRect` derives width/height from a corner subtraction, which can
    // land a float epsilon off the clean authored 9.6/2 (e.g.
    // `9.600000000000001`) — a rendering non-issue, but exact string
    // equality on it would make this assertion, not the pitch, wrong.
    const rects = [...svg!.querySelectorAll('rect')];
    const goalRects = rects.filter((r) => {
      const w = Number(r.getAttribute('width'));
      const h = Number(r.getAttribute('height'));
      return Math.abs(w - 9.6) < 0.01 && Math.abs(h - 2) < 0.01;
    });
    expect(goalRects.length, 'both goal-mouth rects found').toBe(2);
    const ys = goalRects.map((r) => Number(r.getAttribute('y')));
    expect(Math.min(...ys), 'opposition goal at the top').toBeCloseTo(-2, 1);
    expect(Math.max(...ys), 'own goal at the bottom').toBeCloseTo(100, 1);
  },
};

/**
 * Portrait `half` viewBox — the attacking half (nearest the opposition goal)
 * becomes the TOP slice of the box in portrait, since the opposition goal
 * now sits at the top: `y: [0, 50]` rather than landscape's `x: [50, 100]`.
 */
export const PortraitHalf: Story = {
  args: { variant: 'half', orientation: 'portrait', showPattern: true },
  decorators: [
    (Story) => (
      <div style={{ width: '200px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 100 50');
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[2/3]');
  },
};

/**
 * Portrait `attacking-third` viewBox — same logic as `PortraitHalf`, one
 * third of the box: `y: [0, 33.33]`.
 */
export const PortraitAttackingThird: Story = {
  args: { variant: 'attacking-third', orientation: 'portrait', showPattern: true },
  decorators: [
    (Story) => (
      <div style={{ width: '200px' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg') as SVGSVGElement | null;
    expect(svg, 'pitch SVG present').not.toBeNull();
    expect(svg!.getAttribute('viewBox')).toBe('0 0 100 33.33');
    expect(svg!.getAttribute('class') ?? '').toContain('aspect-[2/3]');
  },
};

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

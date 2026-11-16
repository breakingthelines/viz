import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { SimilarityOrbit, SimilarityOrbitPair } from './similarity-orbit';
import type { OrbitData, OrbitMember } from './similarity-orbit-model';

/**
 * Similarity orbits with made-up strikers: 40 in each pool, the first
 * player's compared player joint 12th, the second's 7th.
 */
function pool(
  prefix: string,
  n: number,
  named: Record<number, [string, string, string]>
): OrbitMember[] {
  return Array.from({ length: n }, (_, i) => {
    const [id, name, club] = named[i] ?? [
      `${prefix}${i}`,
      `Striker ${prefix.toUpperCase()}${i + 1}`,
      'Somewhere FC',
    ];
    return { id, name, club, rank: i + 1 };
  });
}

const FIRST: OrbitData = {
  anchor: { id: 'ana', name: 'Ana Primera', club: 'Red FC' },
  plural: 'strikers',
  members: pool('a', 40, {
    0: ['closest', 'Carl Closest', 'Near United'],
    11: ['bo', 'Bo Segunda', 'White FC'],
  }).map((m, i) => (i === 12 ? { ...m, rank: 12 } : m)),
};

const SECOND: OrbitData = {
  anchor: { id: 'bo', name: 'Bo Segunda', club: 'White FC' },
  plural: 'strikers',
  members: pool('b', 40, {
    0: ['closest', 'Carl Closest', 'Near United'],
    6: ['ana', 'Ana Primera', 'Red FC'],
  }),
};

const meta = {
  title: 'Stats/SimilarityOrbit',
  component: SimilarityOrbitPair,
  parameters: { layout: 'padded', backgrounds: { default: 'dark' } },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 820, background: '#151515', padding: 20 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SimilarityOrbitPair>;

export default meta;
type Story = StoryObj<typeof meta>;

const links = (p: { name: string }, main: boolean) =>
  main ? null : (
    <span>
      <a href={`#vs-ana-${p.name}`}>vs Primera</a> · <a href={`#vs-bo-${p.name}`}>vs Segunda</a>
    </span>
  );

/** The Compare page's pair: each player the other's compared player. */
export const Pair: Story = {
  args: { orbits: [FIRST, SECOND], shortNames: ['Primera', 'Segunda'], renderActions: links },
};

/** One player's orbit, as the player Stats tab draws it. */
export const Single: StoryObj<typeof SimilarityOrbit> = {
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <SimilarityOrbit
        orbit={FIRST}
        anchorShort="Primera"
        renderActions={() => <a href="#vs">vs Primera</a>}
      />
    </div>
  ),
};

/** No taps, names, keyboard or drift: an article's static picture. */
export const Static: Story = {
  args: { orbits: [FIRST, SECOND], shortNames: ['Primera', 'Segunda'], interactive: false },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[role="button"]')).toHaveLength(0);
    await expect(canvasElement.querySelectorAll('button')).toHaveLength(0);
    const named = [...canvasElement.querySelectorAll('[role="img"]')].map((e) =>
      e.getAttribute('aria-label')
    );
    await expect(named).toEqual([
      'Bo Segunda is joint 12th closest of the 40 other strikers to Ana Primera. Closest: Carl Closest.',
      'Ana Primera is 7th closest of the 40 other strikers to Bo Segunda. Closest: Carl Closest.',
    ]);
  },
};

/** A tap on a face opens the strip with his place in both orbits and the links. */
export const VerifyTapOpensStrip: Story = {
  args: Pair.args,
  play: async ({ canvasElement }) => {
    const face = canvasElement.querySelector(
      '[data-slot="similarity-orbits-orbit-face"][aria-label="Carl Closest"]'
    ) as HTMLElement;
    await userEvent.click(face);
    const strip = canvasElement.querySelector('[data-slot="similarity-orbits-detail"]')!;
    await expect(
      strip.querySelector('[data-slot="similarity-orbits-detail-club"]')?.textContent
    ).toBe('Near United');
    const places = [
      ...strip.querySelectorAll('[data-slot="similarity-orbits-detail-places"] span'),
    ].map((e) => e.textContent);
    await expect(places).toEqual(['Closest to Primera', 'Closest to Segunda']);
    await expect(strip).toHaveAttribute('aria-label', 'Carl Closest, Near United');
    await expect(strip.querySelectorAll('a')).toHaveLength(2);
    // The same face again closes it.
    await userEvent.click(face);
    await expect(canvasElement.querySelector('[data-slot="similarity-orbits-detail"]')).toBeNull();
  },
};

/** One tab stop per orbit; arrows move by rank, Enter opens with focus, Escape returns it. */
export const VerifyKeyboard: Story = {
  args: Pair.args,
  play: async ({ canvasElement }) => {
    const first = canvasElement.querySelector('[data-slot="similarity-orbits-orbit"]')!;
    const stops = first.querySelectorAll('[data-slot="similarity-orbits-orbit-dot"][tabindex="0"]');
    await expect(stops).toHaveLength(1);
    await expect(stops[0]).toHaveAttribute('data-player', 'bo');
    (stops[0] as SVGElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(document.activeElement).toHaveAttribute('data-rank', '12');
    await userEvent.keyboard('{Home}');
    await expect(document.activeElement).toHaveAttribute('data-player', 'closest');
    const dot = document.activeElement;
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute('data-slot', 'similarity-orbits-detail')
    );
    await userEvent.keyboard('{Escape}');
    await expect(canvasElement.querySelector('[data-slot="similarity-orbits-detail"]')).toBeNull();
    await expect(document.activeElement).toBe(dot);
  },
};

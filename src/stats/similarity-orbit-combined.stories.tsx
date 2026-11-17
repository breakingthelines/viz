import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { SimilarityOrbit, SimilarityOrbitCombined } from './similarity-orbit';
import type { OrbitData, OrbitMember, OrbitSpotlight } from './similarity-orbit-model';

/**
 * The combined orbit with scores and roles (owner, 2026-11-17): made-up
 * strikers, 60 in the pool, Bo Segunda 19th closest to Ana Primera and Ana
 * 7th closest to Bo; Fred Ferran close to both.
 */
const ROLES = ['Box Threat', 'Poacher', 'Dribbler'];

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
    return {
      id,
      name,
      club,
      rank: i + 1,
      similarity: 88 - i,
      roles: [ROLES[i % 3]!, ...(i % 5 === 0 ? [ROLES[(i + 1) % 3]!] : [])],
    };
  });
}

const FIRST: OrbitData = {
  anchor: { id: 'ana', name: 'Ana Primera', club: 'Red FC' },
  plural: 'strikers',
  members: pool('a', 60, {
    0: ['closest', 'Carl Closest', 'Near United'],
    5: ['fred', 'Fred Ferran', 'Paris'],
    18: ['bo', 'Bo Segunda', 'White FC'],
  }),
};

const SECOND: OrbitData = {
  anchor: { id: 'bo', name: 'Bo Segunda', club: 'White FC' },
  plural: 'strikers',
  members: pool('b', 60, {
    0: ['closest', 'Carl Closest', 'Near United'],
    6: ['ana', 'Ana Primera', 'Red FC'],
    14: ['fred', 'Fred Ferran', 'Paris'],
  }),
};

const meta = {
  title: 'Stats/SimilarityOrbitCombined',
  component: SimilarityOrbitCombined,
  parameters: { layout: 'padded', backgrounds: { default: 'dark' } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 440, background: '#151515', padding: 20 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SimilarityOrbitCombined>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Combined: Story = {
  args: { orbits: [FIRST, SECOND], shortNames: ['Primera', 'Segunda'] },
};

/** The pointer on a dot: its card, the distance score and line, all in the top layer. */
function centreOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
}

function pointAt(el: Element) {
  el.dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', ...centreOf(el) })
  );
}

const slot = 'similarity-orbit-combined';

export const VerifyHoverCard: Story = {
  args: { ...Combined.args, motion: false },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector(`[data-slot="${slot}-orbit-dot"][data-player="fred"]`)!;
    pointAt(dot);
    const card = await waitFor(() => {
      const c = canvasElement.querySelector(`[data-slot="${slot}-orbit-card"]`) as HTMLElement;
      expect(c).not.toBeNull();
      expect(c.style.visibility).toBe('visible');
      return c;
    });
    await expect(dot).toHaveAttribute('data-hot', 'true');
    const lines = [...card.querySelectorAll(`[data-slot="${slot}-orbit-card-line"]`)].map(
      (e) => e.textContent
    );
    await expect(lines).toEqual([
      '83% like Primera, 6th closest',
      '74% like Segunda, 15th closest',
    ]);
    // The card is in the top layer, and nothing in the orbit is drawn over it.
    const overlay = canvasElement.querySelector(
      `[data-slot="${slot}-orbit-overlay"]`
    ) as HTMLElement;
    await expect(overlay.contains(card)).toBe(true);
    await expect(getComputedStyle(overlay).zIndex).toBe('30');
    // Hit-test the card (the layer ignores the pointer, so let it answer).
    card.style.pointerEvents = 'auto';
    const r = card.getBoundingClientRect();
    for (const [fx, fy] of [
      [0.5, 0.5],
      [0.1, 0.2],
      [0.9, 0.8],
    ]) {
      const hit = document.elementFromPoint(r.left + r.width * fx!, r.top + r.height * fy!);
      await expect(card.contains(hit)).toBe(true);
    }
    // No text runs past the card's edge.
    for (const line of card.querySelectorAll('span')) {
      await expect(line.getBoundingClientRect().right).toBeLessThanOrEqual(r.right + 0.5);
    }
    // The distance: a line, a ring and the score on an opaque label.
    await expect(
      canvasElement.querySelector(`[data-slot="${slot}-orbit-distance"]`)
    ).not.toBeNull();
    const label = canvasElement.querySelector(`[data-slot="${slot}-orbit-distance-label"]`)!;
    await expect(label.textContent).toBe('83%');
    await expect(overlay.contains(label)).toBe(true);
    // The rest fade.
    const other = canvasElement.querySelector(
      `[data-slot="${slot}-orbit-dot"][data-player="a30"]`
    )!;
    await expect((other.parentElement!.parentElement as unknown as SVGGElement).style.opacity).toBe(
      '0.5'
    );
  },
};

/** A face is a hover target too, with the pointer cursor's card. */
export const VerifyFaceHover: Story = {
  args: { ...Combined.args, motion: false },
  play: async ({ canvasElement }) => {
    const face = canvasElement.querySelector(
      `[data-slot="${slot}-orbit-face"][data-face-id="bo"]`
    )!;
    pointAt(face);
    const card = await waitFor(() => {
      const c = canvasElement.querySelector(`[data-slot="${slot}-orbit-card"]`) as HTMLElement;
      expect(c?.style.visibility).toBe('visible');
      return c;
    });
    await expect(card.textContent).toContain('Bo Segunda');
    await expect(card.textContent).toContain('70% like Primera, 19th closest');
    await expect(
      (canvasElement.querySelector(`[data-slot="${slot}-orbit-field"]`) as HTMLElement).style.cursor
    ).toBe('pointer');
    // Over the face it describes, the card is still on top.
    card.style.pointerEvents = 'auto';
    const r = card.getBoundingClientRect();
    await expect(card.contains(document.elementFromPoint(r.left + 6, r.top + 6))).toBe(true);
  },
};

/** A tap opens the strip with the card's lines; no card on a tap. */
export const VerifyStripLines: Story = {
  args: { ...Combined.args, motion: false },
  play: async ({ canvasElement }) => {
    const face = canvasElement.querySelector(
      `[data-slot="${slot}-orbit-face"][aria-label="Carl Closest"]`
    ) as HTMLElement;
    await userEvent.click(face);
    const strip = canvasElement.querySelector(`[data-slot="${slot}-detail"]`)!;
    const places = [...strip.querySelectorAll(`[data-slot="${slot}-detail-places"] span`)].map(
      (e) => e.textContent
    );
    await expect(places).toEqual(['88% like Primera, closest', '88% like Segunda, closest']);
  },
};

/** Lines to the faces: 3 px on the combined orbit, 2 px on one player's. */
export const VerifyStems: Story = {
  args: { ...Combined.args, motion: false },
  play: async ({ canvasElement }) => {
    const stems = [...canvasElement.querySelectorAll(`[data-slot="${slot}-orbit-stem"]`)];
    await expect(stems.length).toBeGreaterThan(0);
    for (const s of stems) await expect(s.getAttribute('stroke-width')).toBe('3');
  },
};

function SpotlightDemo() {
  const [spot, setSpot] = useState<OrbitSpotlight | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SimilarityOrbitCombined
        orbits={[FIRST, SECOND]}
        shortNames={['Primera', 'Segunda']}
        motion={false}
        spotlight={spot}
      />
      <button
        type="button"
        data-role="Poacher"
        onClick={() => setSpot(spot ? null : { roles: ['Poacher'], label: 'Poacher' })}
      >
        Poacher
      </button>
    </div>
  );
}

/** A role lights the members who play it, fades the rest and names the count on top. */
export const VerifySpotlight: StoryObj = {
  render: () => <SpotlightDemo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector('[data-role="Poacher"]')!);
    const lit = canvasElement.querySelectorAll(`[data-slot="${slot}-orbit-dot"][data-lit="true"]`);
    const poachers = FIRST.members.filter((m) => m.roles?.includes('Poacher')).length;
    await expect(lit).toHaveLength(poachers);
    const caption = canvasElement.querySelector(`[data-slot="${slot}-orbit-spotlight"]`)!;
    await expect(caption.textContent).toBe(`Poacher: ${poachers} of the 60 other strikers`);
    const overlay = canvasElement.querySelector(`[data-slot="${slot}-orbit-overlay"]`)!;
    await expect(overlay.contains(caption)).toBe(true);
    await userEvent.click(canvasElement.querySelector('[data-role="Poacher"]')!);
    await expect(canvasElement.querySelector(`[data-slot="${slot}-orbit-spotlight"]`)).toBeNull();
  },
};

/** The re-centre glides the dots; with motion off nothing animates. */
export const VerifyGlide: Story = {
  args: Combined.args,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector(`[data-slot="${slot}"]`)!;
    const option = canvasElement.querySelectorAll(`[data-slot="${slot}-switch-option"]`)[1]!;
    await userEvent.click(option);
    await waitFor(() => expect(root.getAttribute('data-orbit-centre')).toBe('bo'));
    const glides = document
      .getAnimations()
      .filter((a) =>
        (a.effect as KeyframeEffect | null)?.target?.hasAttribute?.('data-orbit-glide')
      );
    await expect(glides.length).toBeGreaterThan(0);
  },
};

export const VerifyNoMotion: Story = {
  args: { ...Combined.args, motion: false },
  play: async ({ canvasElement }) => {
    const option = canvasElement.querySelectorAll(`[data-slot="${slot}-switch-option"]`)[1]!;
    await userEvent.click(option);
    const inOrbit = document
      .getAnimations()
      .filter((a) => !(a instanceof CSSTransition))
      .filter((a) => canvasElement.contains((a.effect as KeyframeEffect | null)?.target ?? null));
    await expect(inOrbit).toHaveLength(0);
  },
};

/** One player's orbit: the card reads the score and the place in the pool, stems 2 px. */
export const VerifySingle: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <SimilarityOrbit orbit={SECOND} anchorShort="Segunda" motion={false} slot="single" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('[data-slot="single-orbit-dot"][data-player="fred"]')!;
    pointAt(dot);
    const card = await waitFor(() => {
      const c = canvasElement.querySelector('[data-slot="single-orbit-card"]') as HTMLElement;
      expect(c?.style.visibility).toBe('visible');
      return c;
    });
    const lines = [...card.querySelectorAll('[data-slot="single-orbit-card-line"]')].map(
      (e) => e.textContent
    );
    await expect(lines).toEqual(['74% similar to Segunda', '15th closest of 60 strikers']);
    for (const s of canvasElement.querySelectorAll('[data-slot="single-orbit-stem"]'))
      await expect(s.getAttribute('stroke-width')).toBe('2');
  },
};

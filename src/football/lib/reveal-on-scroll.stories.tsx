import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { RevealOnScroll } from '#/football/lib/reveal-on-scroll';

/**
 * `RevealOnScroll` plays a one-shot entrance when a block scrolls into view, as a
 * pure enhancement OVER already-visible content (review #3, item 2). These
 * stories lock the safety contract: the content is ALWAYS visible, even if the
 * in-view trigger never fires.
 */
const meta = {
  title: 'Football/Lib/RevealOnScroll',
  component: RevealOnScroll,
  parameters: { layout: 'fullscreen' },
  args: { children: null },
} satisfies Meta<typeof RevealOnScroll>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Effective opacity of `el` up to and including `root` (product of the chain). */
function effectiveOpacity(el: Element, root: Element): number {
  let acc = 1;
  let node: Element | null = el;
  while (node) {
    const o = Number.parseFloat(getComputedStyle(node).opacity || '1');
    if (Number.isFinite(o)) acc *= o;
    if (node === root) break;
    node = node.parentElement;
  }
  return acc;
}

async function nextFrame(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await Promise.resolve();
}

/**
 * Safety lock (review #3, item 2): the wrapped content must be fully visible on
 * the first frame even when the in-view trigger NEVER fires. This neuters
 * `IntersectionObserver` for the story's render (so `useInViewOnce` can never flip
 * to `true`, exactly like a runtime with no IO support, an un-scrolled block, or
 * SSR), then asserts the content reads at full opacity anyway — the reveal is a
 * pure enhancement, never a visibility gate (the inverse of the #28 blank bug).
 *
 * If a future edit regressed the wrapper to gate visibility on the trigger (e.g.
 * `initial={{ opacity: 0 }}` with the animation only on in-view), the content
 * would sit hidden here and this lock would fail.
 */
export const VisibleWhenTriggerNeverFires: Story = {
  decorators: [
    (Story) => {
      // Replace IntersectionObserver with a no-op that never reports an
      // intersection, for this render. A module-scope swap is fine in the
      // isolated story iframe; restored on unmount.
      const original = (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
      class NeverObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
      (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver =
        NeverObserver as unknown as typeof IntersectionObserver;
      // Restore once the microtask queue flushes after this render tree is built.
      queueMicrotask(() => {
        (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = original;
      });
      return (
        <div style={{ background: '#0a0a0a', padding: 48 }}>
          <Story />
        </div>
      );
    },
  ],
  render: () => (
    <RevealOnScroll>
      <div data-content style={{ color: 'white', fontSize: 24 }}>
        Always-visible block content
      </div>
    </RevealOnScroll>
  ),
  play: async ({ canvasElement }) => {
    await nextFrame();
    const content = canvasElement.querySelector('[data-content]') as HTMLElement | null;
    expect(content, 'wrapped content present').not.toBeNull();
    // The reveal trigger never fired (IO neutered), yet the content is fully
    // visible — opacity 1 over itself and the wrapper — proving the reveal is
    // enhancement, not a gate.
    const opacity = effectiveOpacity(content!, canvasElement);
    expect(opacity, `content visible without the in-view trigger (opacity ${opacity})`).toBe(1);
  },
};

/**
 * Plain usage with IntersectionObserver present: the content is visible at rest
 * and the reveal plays once the block enters the viewport (it already is, in the
 * story iframe). Either way the content is visible on the first frame.
 */
export const Default: Story = {
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <RevealOnScroll>
      <div data-content style={{ color: 'white', fontSize: 24 }}>
        Block content
      </div>
    </RevealOnScroll>
  ),
  play: async ({ canvasElement }) => {
    await nextFrame();
    const content = canvasElement.querySelector('[data-content]') as HTMLElement | null;
    expect(content).not.toBeNull();
  },
};

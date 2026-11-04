import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { captureElementToPng } from '#/utils/export';
import { FRAME_HEIGHT, FRAME_WIDTH, SocialFrame } from './social-frame';

const meta = {
  title: 'Brand/SocialFrame',
  component: SocialFrame,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SocialFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Example Player',
    subtitle: 'Example FC, midfielder, 24',
    context: 'Eredivisie 2026-27, per 90, ranked against 57 midfielders',
    children: (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a29e9e',
          fontSize: 13,
        }}
      >
        panel content
      </div>
    ),
  },
};

/** Decode a data-URL PNG far enough to read its real pixel dimensions. */
function decodeSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('decode failed'));
    img.src = dataUrl;
  });
}

/**
 * Verification story (not a product story): mounts a real `SocialFrame`
 * through a real `ref` — the exact path `useSocialFrameExport` hands a
 * caller — and captures it with the same `width`/`height`/`scale` the hook's
 * `save()` passes to `captureElementToPng`, so §4.1's export contract
 * (540x675 CSS px, `scale: 2`, giving 1080x1350) is a measurement, not an
 * assertion.
 *
 * Checks the frame itself lays out at its authored CSS size BEFORE the
 * capture runs — the same reasoning `lineup-card.stories.tsx`'s
 * `CaptureIsExactFrameSize` documents: `html-to-image` clones an
 * already-laid-out node, so a wrongly-sized live DOM would rasterise onto a
 * correctly-sized canvas and the bug would be invisible in the output
 * dimensions alone.
 */
function CaptureHarness() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <SocialFrame
      ref={ref}
      title="Example Player"
      subtitle="Example FC, midfielder, 24"
      context="Eredivisie 2026-27, per 90, ranked against 57 midfielders"
    >
      <div style={{ flex: 1 }} />
    </SocialFrame>
  );
}

export const CaptureIsExactExportSize: Story = {
  args: {
    title: 'Example Player',
    subtitle: 'Example FC, midfielder, 24',
    children: null,
  },
  render: () => <CaptureHarness />,
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('[role="img"][aria-label]')!;
    expect(frame, 'the frame must render').not.toBeNull();

    // (1) Laid out at the true frame size BEFORE any capture happens.
    expect(frame.offsetWidth, 'frame must lay out at its authored width').toBe(FRAME_WIDTH);
    expect(frame.offsetHeight, 'frame must lay out at its authored height').toBe(FRAME_HEIGHT);

    // (2) Captured at scale 2 — the same scale `useSocialFrameExport.save()`
    // passes — decodes at exactly 1080x1350 (spec §4.1).
    const dataUrl = await captureElementToPng(frame, {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      scale: 2,
      backgroundColor: '#0d0d0d',
    });
    const size = await decodeSize(dataUrl);
    expect(size, 'PNG must decode at exactly 1080x1350').toEqual({ width: 1080, height: 1350 });
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { useRef } from 'react';

import { captureElementToPng } from './export';

/**
 * Verification story (not a product story) for two share-as-image capture
 * fixes:
 *   1. An HTML <img> whose SOURCE is an SVG (custom crest upload) must
 *      RASTERISE into the PNG — html-to-image leaves it blank otherwise. The
 *      SVG here is viewBox-only (no intrinsic width/height), the exact shape
 *      that came out blank.
 *   2. A wide table inside an overflow-x-auto box must be captured in FULL,
 *      not clipped to the plate's visible width.
 *
 * The layout: a deliberately NARROW plate (320px) wraps an overflow-x-auto box
 * holding a 900px-wide row. At the left is a magenta SVG <img> crest; at the
 * far right (x≈860px, well past the 320px visible edge) is a lime marker. We
 * capture, decode the PNG, and assert BOTH colours are present — magenta proves
 * the SVG crest rasterised, lime proves the clipped-off far column was captured.
 */

// A magenta square SVG with ONLY a viewBox (no width/height) — the shape that
// html-to-image failed to rasterise from an <img src>.
const MAGENTA_SVG =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2010%2010'%3E%3Crect%20width='10'%20height='10'%20fill='%23ff00ff'/%3E%3C/svg%3E";

function CaptureFixtureCard() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ background: '#0a0a0a', padding: 24 }}>
      <div
        ref={ref}
        data-testid="plate"
        style={{ width: 320, background: '#0a0a0a', border: '1px solid #222', padding: 12 }}
      >
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 900, display: 'flex', alignItems: 'center', height: 40 }}>
            <img src={MAGENTA_SVG} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <div style={{ flex: 1 }} />
            {/* far-right marker, past the 320px visible edge */}
            <div style={{ width: 28, height: 28, background: '#00ff66' }} />
          </div>
        </div>
      </div>
      <button
        type="button"
        data-testid="run"
        onClick={async () => {
          if (!ref.current) return;
          const dataUrl = await captureElementToPng(ref.current, { backgroundColor: '#0a0a0a' });
          (window as unknown as { __capture?: string }).__capture = dataUrl;
        }}
      >
        capture
      </button>
    </div>
  );
}

const meta = {
  title: 'Utils/Verify/CaptureFixes',
  component: CaptureFixtureCard,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CaptureFixtureCard>;
export default meta;
type Story = StoryObj<typeof meta>;

async function decode(dataUrl: string): Promise<ImageData> {
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('decode failed'));
    img.src = dataUrl;
  });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

/** Count pixels roughly matching an (r,g,b) target within a tolerance. */
function countColor(d: ImageData, tr: number, tg: number, tb: number, tol = 60): number {
  let n = 0;
  const { data } = d;
  for (let i = 0; i < data.length; i += 4) {
    if (
      Math.abs(data[i] - tr) <= tol &&
      Math.abs(data[i + 1] - tg) <= tol &&
      Math.abs(data[i + 2] - tb) <= tol &&
      data[i + 3] > 200
    )
      n++;
  }
  return n;
}

export const CapturesSvgCrestAndFullWidth: Story = {
  play: async ({ canvasElement }) => {
    const run = canvasElement.querySelector('[data-testid="run"]') as HTMLButtonElement;
    run.click();
    // Wait for the async capture to stash the data URL.
    let dataUrl = '';
    for (let i = 0; i < 150 && !dataUrl; i++) {
      dataUrl = (window as unknown as { __capture?: string }).__capture ?? '';
      if (!dataUrl) await new Promise((r) => setTimeout(r, 100));
    }
    expect(dataUrl).toMatch(/^data:image\/png/);

    const img = await decode(dataUrl);

    const magenta = countColor(img, 255, 0, 255); // SVG crest rasterised
    const lime = countColor(img, 0, 255, 102); // far-right column captured (full width)

    // eslint-disable-next-line no-console
    console.log(`[capture-fixes] pngW=${img.width} magenta=${magenta} lime=${lime}`);

    // The SVG crest must appear (was blank before the inlineImgSvgSources fix).
    expect(magenta).toBeGreaterThan(50);
    // The far-right marker at x≈860 (past the 320px visible width) must appear
    // (was clipped before the expandForCapture fix).
    expect(lime).toBeGreaterThan(50);
    // Sanity: the capture is wider than the 320px plate (×2 pixelRatio).
    expect(img.width).toBeGreaterThan(700);
  },
};

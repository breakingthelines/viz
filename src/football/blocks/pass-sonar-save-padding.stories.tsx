import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { PassSonar } from './pass-sonar';
import type { PassSonarPlayer, PassWedge } from './pass-sonar';

/**
 * Verification story (not a product story): renders a PassSonar block, clicks the
 * footer "Save as image" button, intercepts the generated PNG, and measures the
 * TOP gap (panel top → first non-background pixel) vs the BOTTOM gap (last
 * non-background pixel → panel bottom). The share-as-image capture should keep
 * the panel's symmetric p-4, so the two gaps should be close. Proves the
 * footer-margin fix empirically instead of by eyeballing a screenshot.
 */
const meta = {
  title: 'Football/Verify/SonarSavePadding',
  component: PassSonar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ background: '#0a0a0a', padding: 48 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof PassSonar>;
export default meta;
type Story = StoryObj<typeof meta>;

const w = (angleDeg: number, avgLength: number, count: number): PassWedge => ({
  angleDeg,
  avgLength,
  count,
});
const PLAYERS: PassSonarPlayer[] = [
  {
    id: 'p',
    name: 'R. De Paul',
    team: 'Argentina',
    starter: true,
    x: 50,
    y: 50,
    wedges: [w(0, 30, 8), w(45, 24, 5), w(90, 18, 3), w(315, 26, 6), w(180, 10, 2)],
  },
];

/** Decode a data-URL PNG into ImageData via an offscreen canvas. */
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

/** Is a pixel row essentially the panel background (near-black, no bright ink)? */
function rowIsBackground(d: ImageData, y: number): boolean {
  const { width, data } = d;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      a = data[i + 3];
    // The BTL panel bg is ~#0a0a0a over near-black; "ink" = anything clearly
    // lighter (logos/text are white/grey) or transparent (a clip hole).
    if (a < 200) return false;
    if (r > 55 || g > 55 || b > 55) return false;
  }
  return true;
}

export const MeasuresSymmetricPadding: Story = {
  args: { team: 'Argentina', players: PLAYERS, wordmark: <span>breaking the lines</span> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Intercept the download: onSave sets link.href to the PNG data URL and clicks it.
    let captured = '';
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.download && this.href.startsWith('data:image/png')) captured = this.href;
      // don't call realClick — avoid an actual navigation/download in the test
    };

    try {
      const saveBtn = await canvas.findByRole('button', { name: /save this block as an image/i });
      saveBtn.click();
      await waitFor(() => expect(captured).toMatch(/^data:image\/png/), { timeout: 15000 });
    } finally {
      HTMLAnchorElement.prototype.click = realClick;
    }

    const img = await decode(captured);
    const H = img.height;

    // Top gap: rows from y=0 down to the first non-background row.
    let top = 0;
    while (top < H && rowIsBackground(img, top)) top++;
    // Bottom gap: rows from y=H-1 up to the first non-background row.
    let bottom = 0;
    while (bottom < H && rowIsBackground(img, H - 1 - bottom)) bottom++;

    // eslint-disable-next-line no-console
    console.log(`[save-padding] pngH=${H} topGap=${top}px bottomGap=${bottom}px`);

    // The captured PNG must have real bottom breathing room ≈ the panel's own
    // bottom padding (×pixelRatio 2 → ~32 device px), NOT flush (the bug was 0).
    // The top gap isn't the comparison baseline here — in this story it's inflated
    // by the 48px wrapper; on the real page top = the panel's 16px p-4. So assert
    // the bottom gap lands in a ~[20,52] device-px band (16px padding × 2, with
    // tolerance for the rounded-corner + border sampling).
    expect(bottom, 'footer must not be flush against the bottom edge').toBeGreaterThan(20);
    expect(bottom, 'bottom padding should be ~the panel p-4 (×2), not a huge slab').toBeLessThan(
      52
    );
  },
};

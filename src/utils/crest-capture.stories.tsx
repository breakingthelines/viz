import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import { Crest } from '#/football/lib/crest';
import { captureElementToPng } from './export';

/**
 * Verification story (not a product story) for the crest CORS cache trap.
 *
 * The crest comes from a second origin that answers like the crest CDN (the
 * `cdnFixture` plugin in vite.config.ts): the plain response is cacheable for
 * 4h and carries no Access-Control-Allow-Origin. The loader loads that URL
 * plainly first, the way SvgHeadshot or a host's lineup block does, so the
 * browser cache holds the plain copy before the Crest mounts. Then:
 *   1. The on-screen Crest must render. A `crossOrigin` Crest is served the
 *      plain cached copy and blocked.
 *   2. captureElementToPng must put the crest pixels in the PNG. Its
 *      `cache: 'no-cache'` fetch revalidates and gets a 304 with CORS headers.
 *      A default-cache fetch would be served the plain copy and blocked.
 *
 * The fixture origin exists only on the dev server (Vitest or `bun run dev`).
 * A static Storybook build shows a note and skips the play function. Vitest
 * runs with `import.meta.env.DEV` true, so the assertions always run in CI.
 */

const FIXTURE_AVAILABLE = import.meta.env.DEV;

/** The fixture crest's colour, rgb(0, 200, 255). */
const CREST_RGB = [0, 200, 255] as const;
/** Rendered crest size in CSS px; the capture runs at the default 2x. */
const CREST_PX = 40;

/** Load `url` the way a plain `<img>` does, with no `crossOrigin`. */
function loadPlain(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`plain load failed: ${url}`));
    img.src = url;
  });
}

/**
 * A fresh cross-origin crest URL whose plain copy is already cached. The path
 * is unique per run, so neither the browser cache nor html-to-image's own
 * resource cache carries a previous run's result.
 */
async function primedCrestUrl(): Promise<string> {
  const res = await fetch('/__viz-fixtures/cdn-origin');
  if (!res.ok) throw new Error(`CDN fixture unavailable (${res.status})`);
  const origin = await res.text();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const url = `${origin}/media/football/team/crest-${id}.png`;
  await loadPlain(url);
  return url;
}

function CrestPlate({ url }: { url?: string }) {
  return (
    <div style={{ background: '#0a0a0a', padding: 24 }}>
      <div data-testid="plate" style={{ width: 120, background: '#0a0a0a', padding: 12 }}>
        <Crest
          url={url}
          name="Fixture FC"
          style={{ width: CREST_PX, height: CREST_PX, borderRadius: 0 }}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Utils/Verify/CrestCapture',
  component: CrestPlate,
  parameters: { layout: 'fullscreen' },
  loaders: [async () => ({ crestUrl: FIXTURE_AVAILABLE ? await primedCrestUrl() : undefined })],
  render: (_args, { loaded }) =>
    FIXTURE_AVAILABLE ? (
      <CrestPlate url={loaded.crestUrl as string} />
    ) : (
      <p style={{ padding: 24 }}>Runs on the dev server only.</p>
    ),
} satisfies Meta<typeof CrestPlate>;
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

/** Count opaque pixels within `tol` of an (r,g,b) target. */
function countColor(d: ImageData, [tr, tg, tb]: readonly number[], tol = 40): number {
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

export const CrossOriginCrestAfterPlainLoad: Story = {
  play: async ({ canvasElement }) => {
    if (!FIXTURE_AVAILABLE) return;
    const plate = canvasElement.querySelector<HTMLElement>('[data-testid="plate"]');
    const crest = plate?.querySelector('img');
    if (!plate || !crest) throw new Error('crest fixture did not render');

    // 1. On screen: the crest loads even though a plain copy is cached.
    await waitFor(() => expect(crest.complete).toBe(true), { timeout: 5000 });
    expect(crest.naturalWidth).toBeGreaterThan(0);

    // 2. Export: the crest's pixels reach the PNG.
    const png = await captureElementToPng(plate, { backgroundColor: '#0a0a0a' });
    const img = await decode(png);
    const crestPixels = countColor(img, CREST_RGB);
    const expected = (CREST_PX * 2) ** 2;

    // eslint-disable-next-line no-console
    console.log(`[crest-capture] pngW=${img.width} crest=${crestPixels}/${expected}`);

    // Most of the 80x80 crest area, allowing for edge antialiasing.
    expect(crestPixels).toBeGreaterThan(expected * 0.8);
  },
};

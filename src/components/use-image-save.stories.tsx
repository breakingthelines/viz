import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { useImageSave } from './use-image-save';

/**
 * The preview overlay's Share button against stubbed `navigator.canShare` /
 * `navigator.share`, so each Web Share outcome is checked in a real browser:
 * no file sharing at all (no Share button, Download stays), a device that
 * takes the file but not the link (the file goes alone), and one that takes
 * both (the link and title travel with the file).
 */
function ShareHarness() {
  const ref = useRef<HTMLDivElement>(null);
  const { save, overlay } = useImageSave();
  return (
    <div>
      <div ref={ref} style={{ width: 120, height: 80, background: '#1f6f4a', color: '#fff' }}>
        Card
      </div>
      <button
        type="button"
        onClick={() =>
          save(ref.current, {
            fileName: 'card',
            forcePreview: true,
            share: { title: 'Cody Gakpo', url: 'https://example.test/p?tab=stats' },
          })
        }
      >
        Save image
      </button>
      {overlay}
    </div>
  );
}

const meta = {
  title: 'Components/UseImageSave',
  component: ShareHarness,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ShareHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

type CanShare = ((data?: ShareData) => boolean) | undefined;

/**
 * Shadows `navigator.canShare` and `navigator.share` on the instance for the
 * length of `run`, then deletes the shadows so the prototype's own methods
 * (or their absence) come back for the next story.
 */
async function withWebShare(
  canShare: CanShare,
  run: (shared: ShareData[]) => Promise<void>
): Promise<void> {
  const shared: ShareData[] = [];
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: (data: ShareData) => {
      shared.push(data);
      return Promise.resolve();
    },
  });
  try {
    await run(shared);
  } finally {
    delete (navigator as { canShare?: unknown }).canShare;
    delete (navigator as { share?: unknown }).share;
  }
}

async function openPreview(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: 'Save image' }));
  return within(await canvas.findByRole('dialog', {}, { timeout: 10_000 }));
}

export const NoFileSharing: Story = {
  play: async ({ canvasElement }) => {
    await withWebShare(undefined, async (shared) => {
      const dialog = await openPreview(canvasElement);
      await expect(dialog.queryByRole('button', { name: 'Share' })).toBeNull();
      await expect(dialog.getByRole('button', { name: 'Download' })).toBeVisible();
      await expect(shared).toHaveLength(0);
    });
  },
};

export const CanShareRefusesFiles: Story = {
  play: async ({ canvasElement }) => {
    await withWebShare(
      () => false,
      async (shared) => {
        const dialog = await openPreview(canvasElement);
        await expect(dialog.queryByRole('button', { name: 'Share' })).toBeNull();
        await expect(dialog.getByRole('button', { name: 'Download' })).toBeVisible();
        await expect(shared).toHaveLength(0);
      }
    );
  },
};

export const FileWithoutLink: Story = {
  play: async ({ canvasElement }) => {
    await withWebShare(
      (data) => !!data?.files?.length && !data.url && !data.title,
      async (shared) => {
        const dialog = await openPreview(canvasElement);
        await userEvent.click(dialog.getByRole('button', { name: 'Share' }));
        await expect(shared).toHaveLength(1);
        await expect(Object.keys(shared[0]!)).toEqual(['files']);
        await expect(shared[0]!.files?.[0]?.name).toBe('card.png');
      }
    );
  },
};

export const FileWithLink: Story = {
  play: async ({ canvasElement }) => {
    await withWebShare(
      (data) => !!data?.files?.length,
      async (shared) => {
        const dialog = await openPreview(canvasElement);
        await userEvent.click(dialog.getByRole('button', { name: 'Share' }));
        await expect(shared).toHaveLength(1);
        await expect(shared[0]!.files?.[0]?.name).toBe('card.png');
        await expect(shared[0]!.title).toBe('Cody Gakpo');
        await expect(shared[0]!.url).toBe('https://example.test/p?tab=stats');
      }
    );
  },
};

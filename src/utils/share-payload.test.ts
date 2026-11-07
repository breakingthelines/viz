import { describe, expect, it } from 'vitest';

import { imageSharePayload } from './share-payload';

const file = new File([new Uint8Array([1])], 'card.png', { type: 'image/png' });

describe('imageSharePayload', () => {
  it('carries the link and title with the file when the target takes both', () => {
    const payload = imageSharePayload(
      file,
      { title: 'Cody Gakpo', url: 'https://example.test/p?tab=stats' },
      () => true
    );
    expect(payload).toEqual({
      files: [file],
      title: 'Cody Gakpo',
      url: 'https://example.test/p?tab=stats',
    });
  });

  it('falls back to the file alone when the target refuses the link', () => {
    const payload = imageSharePayload(file, { url: 'https://example.test/p' }, (data) => !data.url);
    expect(payload).toEqual({ files: [file] });
  });

  it('shares the file alone when no link is given', () => {
    expect(imageSharePayload(file, undefined, () => true)).toEqual({ files: [file] });
  });

  it('returns null when the device cannot share the file', () => {
    expect(imageSharePayload(file, { url: 'https://example.test/p' }, () => false)).toBeNull();
    expect(imageSharePayload(file, undefined, undefined)).toBeNull();
  });
});

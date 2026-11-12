import { useMemo } from 'react';
import { normalizeWindow, type MinuteWindow } from '#/football/lib/selection';

/**
 * A block's `window` prop, normalised and kept referentially stable while its
 * bounds are unchanged, so a host passing an inline `{ from, to }` object on
 * every render doesn't make the block re-filter its data each time.
 */
export function useMinuteWindow(window: MinuteWindow | undefined): MinuteWindow | undefined {
  const from = window?.from;
  const to = window?.to;
  return useMemo(
    () => (from === undefined || to === undefined ? undefined : normalizeWindow({ from, to })),
    [from, to]
  );
}

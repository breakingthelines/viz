import { useCallback, useState } from 'react';

/**
 * Selection state seeded from an optional initial value, emitting every change.
 *
 * Every selectable StatsBomb block consolidates its user-selectable state into a
 * single `<Block>Selection` object and drives it through this hook so the HOST
 * (the editor) can both SEED an author's chosen selection and be NOTIFIED of
 * every change — without the block reaching for `useEffect` to sync state out.
 *
 *   • `initial` seeds the state on mount. When `undefined`, the block opens on
 *     its `fallback` (the default, unseeded experience — byte-for-byte today's
 *     behaviour).
 *   • `onChange` fires with the FULL new selection on every update, computed
 *     inside the state updater so a functional update emits the resolved value
 *     (never a stale snapshot) and the emit happens exactly once per change.
 *
 * The returned `update` accepts either the next selection or a `prev => next`
 * updater, mirroring `useState`'s setter, so callers can route a dropdown /
 * toggle handler through `update({ ...selection, field: value })`.
 *
 * Note: `initial` is read once (lazy initial state); later changes to the prop
 * do not re-seed — the block owns its selection after mount, exactly as the
 * prior `useState(default)` blocks did.
 */
export function usePersistedSelection<T>(
  initial: T | undefined,
  fallback: T,
  onChange?: (s: T) => void
) {
  const [selection, setSelection] = useState<T>(() => initial ?? fallback);
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setSelection((prev) => {
        const n = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        onChange?.(n);
        return n;
      });
    },
    [onChange]
  );
  return [selection, update] as const;
}

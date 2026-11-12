import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_SUBJECT,
  sameSelection,
  withoutSubject,
  type SelectionChange,
  type SelectionSubject,
} from '#/football/lib/selection';

/**
 * Selection state seeded from an optional initial value, reporting user changes.
 *
 * Every selectable football block keeps its user-selectable state in a single
 * `<Block>Selection` object and drives it through this hook, so a host can seed
 * a saved selection and be told when the reader changes it.
 *
 *   • `initial` seeds the state on mount. When `undefined`, the block opens on
 *     its `fallback`. It is read once; later changes to the prop do not re-seed.
 *   • `onChange` fires only for changes made through the returned `update`,
 *     which blocks call from their control handlers. Mounting, seeding from
 *     `initial`, a new `onChange` identity and data changes never fire it.
 *   • It fires once per committed change, after React commits it, with the
 *     selection the block now renders. Several `update` calls in one handler
 *     (a player pick that also clears the side) report one final selection,
 *     never an intermediate one, and an update that leaves the selection
 *     structurally unchanged (re-picking the current option) reports nothing.
 *   • The payload is the selection plus `subject`, resolved by `subjectOf`
 *     from the block's current data (see {@link SelectionSubject}).
 *
 * Emitting from a commit effect, not from inside the state updater, keeps the
 * host's handler out of React's render phase: an updater can run during render
 * (and twice under StrictMode), which reported every change twice and let a
 * host's own `setState` trip React's "Cannot update a component while
 * rendering a different component" warning.
 */
export function usePersistedSelection<T extends object>(
  initial: T | undefined,
  fallback: T,
  onChange?: (selection: SelectionChange<T>) => void,
  subjectOf?: (selection: T) => SelectionSubject
) {
  const [selection, setSelection] = useState<T>(() =>
    initial === undefined ? fallback : withoutSubject(initial)
  );

  // Set by `update`, cleared once the resulting commit has been reported.
  const userChanged = useRef(false);
  // The selection the host last saw (the seed counts as seen).
  const reported = useRef<T>(selection);
  const onChangeRef = useRef(onChange);
  const subjectOfRef = useRef(subjectOf);

  // Declared before the reporting effect so it runs first in the same commit.
  useEffect(() => {
    onChangeRef.current = onChange;
    subjectOfRef.current = subjectOf;
  });

  useEffect(() => {
    if (!userChanged.current) return;
    userChanged.current = false;
    if (sameSelection(reported.current, selection)) return;
    reported.current = selection;
    const subject = subjectOfRef.current?.(selection) ?? EMPTY_SUBJECT;
    onChangeRef.current?.({ ...selection, subject: { ...subject } });
  }, [selection]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    userChanged.current = true;
    setSelection(next);
  }, []);

  return [selection, update] as const;
}

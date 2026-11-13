import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GatedCellRead, GatedCellValue } from './types';

/**
 * Per-viewer resolution of a block's gated cells (contract section 3.3).
 *
 * A body holds public data and a snapshot id only. After hydration the host's
 * provider collects every snapshot id rendered on the page in one microtask,
 * calls `fetchValues` once (the host's `GetGameBlockValues`), and fills cells
 * or shows them locked. Server rendering, and the first client render, show
 * every cell as pending: a calm rule of the same width, no locked note, so
 * cached article HTML never carries a paid figure or a plan-specific note.
 * With `signedIn` false every cell is locked at once and nothing is fetched.
 */

export type GameBlockValuesMap = Record<string, Record<string, GatedCellValue>>;

export interface GameBlockValuesProviderProps {
  /** The host's `GetGameBlockValues`. Never called with an empty list. */
  fetchValues?: (snapshotIds: string[]) => Promise<GameBlockValuesMap>;
  /** False for an anonymous reader: every cell locks without a call. Default true. */
  signedIn?: boolean;
  /**
   * Values already in hand, keyed by snapshot id: a picker preview's redacted
   * `gated` map, or a story. These ids are not fetched, and they render from
   * the first pass, server rendering included, so a host never passes them
   * into cacheable HTML.
   */
  initial?: GameBlockValuesMap;
  /** Where the locked note's "See plans" goes. Default `/plans`. */
  plansHref?: string;
  children: ReactNode;
}

type Entry =
  | { status: 'pending' }
  | { status: 'locked' }
  | { status: 'ready'; cells: Record<string, GatedCellValue> };

interface ValuesContextValue {
  entry: (snapshotId: string) => Entry;
  register: (snapshotId: string) => void;
  plansHref: string;
}

const PENDING: Entry = { status: 'pending' };
const LOCKED: Entry = { status: 'locked' };

/** Outside any provider: cells stay pending and nothing is fetched. */
const DEFAULT_CONTEXT: ValuesContextValue = {
  entry: () => PENDING,
  register: () => {},
  plansHref: '/plans',
};

const ValuesContext = createContext<ValuesContextValue>(DEFAULT_CONTEXT);

export function GameBlockValuesProvider({
  fetchValues,
  signedIn = true,
  initial,
  plansHref = '/plans',
  children,
}: GameBlockValuesProviderProps) {
  const [entries, setEntries] = useState<Record<string, Entry>>(() => {
    const out: Record<string, Entry> = {};
    for (const [id, cells] of Object.entries(initial ?? {})) out[id] = { status: 'ready', cells };
    return out;
  });
  const initialIds = useMemo(() => new Set(Object.keys(initial ?? {})), [initial]);
  // Hydration gate: the first client render matches the server's.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const requested = useRef(new Set<string>(Object.keys(initial ?? {})));
  const queue = useRef(new Set<string>());
  const scheduled = useRef(false);
  const fetchRef = useRef(fetchValues);
  fetchRef.current = fetchValues;
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;

  const flush = useCallback(() => {
    scheduled.current = false;
    const ids = [...queue.current];
    queue.current.clear();
    if (ids.length === 0) return;
    const fetcher = fetchRef.current;
    if (!signedInRef.current || !fetcher) {
      if (!signedInRef.current) {
        setEntries((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = LOCKED;
          return next;
        });
      }
      return;
    }
    fetcher(ids).then(
      (map) => {
        setEntries((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = { status: 'ready', cells: map[id] ?? {} };
          return next;
        });
      },
      () => {
        // A failed read shows the cells locked rather than pending forever, and
        // lets a later render ask again.
        for (const id of ids) requested.current.delete(id);
        setEntries((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = LOCKED;
          return next;
        });
      }
    );
  }, []);

  const register = useCallback(
    (snapshotId: string) => {
      if (!snapshotId || requested.current.has(snapshotId)) return;
      requested.current.add(snapshotId);
      queue.current.add(snapshotId);
      if (!scheduled.current) {
        scheduled.current = true;
        queueMicrotask(flush);
      }
    },
    [flush]
  );

  const value = useMemo<ValuesContextValue>(
    () => ({
      entry: (id) => {
        const e = entries[id];
        // Before hydration only values the host handed in are shown; anything
        // fetched or plan-dependent stays pending so it matches the server.
        if (!hydrated) return e && initialIds.has(id) ? e : PENDING;
        if (e) return e;
        return signedIn ? PENDING : LOCKED;
      },
      register,
      plansHref,
    }),
    [entries, hydrated, initialIds, register, plansHref, signedIn]
  );

  return <ValuesContext.Provider value={value}>{children}</ValuesContext.Provider>;
}

interface ScopeValue {
  snapshotId: string;
  gatedCells: readonly string[];
}

const ScopeContext = createContext<ScopeValue>({ snapshotId: '', gatedCells: [] });

/**
 * Names the snapshot the cells below belong to and registers it for the
 * page's batched read. `GameBlockView` wraps every block in one.
 */
export function GameBlockScope({
  snapshotId,
  gatedCells,
  children,
}: ScopeValue & { children: ReactNode }) {
  const { register } = useContext(ValuesContext);
  useEffect(() => {
    if (snapshotId && gatedCells.length > 0) register(snapshotId);
  }, [register, snapshotId, gatedCells.length]);
  const value = useMemo(() => ({ snapshotId, gatedCells }), [snapshotId, gatedCells]);
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

function readCell(entry: Entry, cell: string): GatedCellRead {
  if (entry.status === 'pending') return { state: 'pending' };
  if (entry.status === 'locked') return { state: 'locked' };
  return entry.cells[cell] ?? { state: 'no-data' };
}

/** One gated cell of the enclosing block, as this viewer may see it. */
export function useGatedCell(cell: string | undefined): GatedCellRead {
  const ctx = useContext(ValuesContext);
  const scope = useContext(ScopeContext);
  if (!cell) return { state: 'no-data' };
  if (!scope.snapshotId) return { state: 'locked' };
  return readCell(ctx.entry(scope.snapshotId), cell);
}

/**
 * Whether the enclosing block shows its locked note: true once a cell it
 * refers to resolves locked. Pending (server render) is never locked.
 */
export function useBlockLocked(): boolean {
  const ctx = useContext(ValuesContext);
  const scope = useContext(ScopeContext);
  if (scope.gatedCells.length === 0) return false;
  if (!scope.snapshotId) return true;
  const entry = ctx.entry(scope.snapshotId);
  if (entry.status === 'pending') return false;
  if (entry.status === 'locked') return true;
  return scope.gatedCells.some((c) => entry.cells[c]?.state === 'locked');
}

/** The host's plans link, for the locked note. */
export function usePlansHref(): string {
  return useContext(ValuesContext).plansHref;
}

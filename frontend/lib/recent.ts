export interface RecentEntry {
  name: string;
  from: string;
  to: string;
  at: number;
}

const STORAGE_KEY = "openconverter:recent";
const MAX_ENTRIES = 5;

/**
 * localStorage-backed history, exposed as an external store so components can
 * read it with useSyncExternalStore instead of loading it in an effect.
 *
 * `cache` matters for correctness, not just speed: getSnapshot must return a
 * stable reference between renders, and parsing the JSON afresh each call would
 * hand React a new array every time and spin it into an infinite render loop.
 */
let cache: RecentEntry[] | null = null;
const listeners = new Set<() => void>();

// A single frozen array so the server snapshot is reference-stable too.
const EMPTY: RecentEntry[] = [];

function read(): RecentEntry[] {
  if (cache) return cache;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    cache = stored ? (JSON.parse(stored) as RecentEntry[]) : EMPTY;
  } catch {
    // Unavailable or corrupt storage just means no history.
    cache = EMPTY;
  }
  return cache;
}

export function subscribeRecent(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getRecent(): RecentEntry[] {
  return read();
}

export function getServerRecent(): RecentEntry[] {
  return EMPTY;
}

export function addRecent(entry: RecentEntry) {
  cache = [entry, ...read()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // History is a convenience, so a storage failure shouldn't break anything.
  }
  listeners.forEach((listener) => listener());
}

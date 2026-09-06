/**
 * Live pulls: small feeds the worker gathers from outside APIs and
 * caches at the edge (GET /api/pull/:name). To wire up a new API:
 * register a source in worker/index.ts SOURCES, declare its shape here,
 * and render it from a widget in src/widgets.tsx.
 */

export interface Commit {
  repo: string;
  message: string;
  sha: string;
  url: string;
  date: string;
}

export interface Language {
  name: string;
  /** 0..1 slice of the bytes across recent public repos */
  share: number;
}

/** One in-flight-or-done promise per source, so SPA nav never refetches. */
const held = new Map<string, Promise<unknown>>();

export function pull<T>(name: string): Promise<T> {
  let p = held.get(name);
  if (!p) {
    p = fetch(`/api/pull/${name}`).then((res) => {
      if (!res.ok) throw new Error(`pull failed (${res.status})`);
      return res.json();
    });
    p.catch(() => held.delete(name));
    held.set(name, p);
  }
  return p as Promise<T>;
}

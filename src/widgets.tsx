import { useEffect, useState } from "react";
import { fmtDay, stampVar } from "./paint";
import { pull, type Commit, type Language } from "./pull";

/**
 * Widgets: small live panels that pull working data into the page and
 * speak the site's own vocabulary: blooms, mono, no boxes. Each loads
 * its own feed and fails soft; if the pull errors or comes back empty
 * the widget renders nothing, the same way the projects room does.
 *
 * A new API-backed widget is three small steps:
 *   1. register the source in worker/index.ts SOURCES (fetch, shape, ttl)
 *   2. declare the shape in src/pull.ts
 *   3. render it here and drop the component into a page
 */

function usePull<T>(name: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    pull<T>(name)
      .then((d) => {
        if (live) setData(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [name]);
  return data;
}

/** The latest public commits, one bloom per repo so a repo keeps its pigment. */
export function Commits({ limit = 5 }: { limit?: number }) {
  const data = usePull<{ commits: Commit[] }>("commits");
  if (!data || data.commits.length === 0) return null;
  return (
    <section className="drift-2" aria-label="Recent commits">
      <h2 className="key">Recent commits</h2>
      <div className="commits">
        {data.commits.slice(0, limit).map((c) => (
          <article className="entry commit" key={`${c.repo}-${c.sha}`}>
            <span
              className="stamp"
              style={{ ["--stamp" as string]: stampVar("note", c.repo) }}
              aria-hidden="true"
            />
            <div>
              <p className="commit-msg">
                <a href={c.url}>{c.message}</a>
              </p>
              <p className="spec">
                {c.repo} · {fmtDay(c.date)}
              </p>
            </div>
          </article>
        ))}
      </div>
      <p className="more" style={{ marginTop: 20 }}>
        <a href="https://github.com/frgmt0">the rest is on github</a>
      </p>
    </section>
  );
}

/** Languages as bloom tallies: pigment stands in for the bar chart. */
export function Languages() {
  const data = usePull<{ languages: Language[] }>("languages");
  if (!data || data.languages.length === 0) return null;
  return (
    <div className="langs">
      {data.languages.map((l) => (
        <p className="lang" key={l.name}>
          <span className="lang-name">{l.name}</span>
          <span className="tally" aria-hidden="true">
            {Array.from({ length: Math.max(1, Math.round(l.share * 10)) }, (_, i) => (
              <span
                className="stamp"
                style={{ ["--stamp" as string]: stampVar("essay", l.name) }}
                key={i}
              />
            ))}
          </span>
          <span className="spec">{Math.max(1, Math.round(l.share * 100))}%</span>
        </p>
      ))}
      <p className="spec" style={{ marginTop: 6 }}>
        measured from recent public repos
      </p>
    </div>
  );
}

/** The editable stack block, one tool per line: `tool · what it does here`. */
export function StackLines({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="stack">
      {lines.map((line, i) => {
        const at = line.indexOf(" · ");
        const tool = at === -1 ? line : line.slice(0, at);
        const what = at === -1 ? "" : line.slice(at + 3);
        return (
          <p className="stack-line" key={i}>
            <span className="tool">{tool}</span>
            {what && <span className="what"> · {what}</span>}
          </p>
        );
      })}
    </div>
  );
}

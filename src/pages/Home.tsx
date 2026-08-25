import { useEffect, useState } from "react";
import Chrome from "../Chrome";
import Editable from "../Editable";
import { listBlocks, listNotes, listPosts, me, type Note, type PostSummary } from "../api";
import { renderMarkdown } from "../markdown";
import { fmtShort, stampVar } from "../paint";

/**
 * Home: a wash, an honest opening, and the most recent writing, essays
 * and notes interleaved by date. Every passage of page copy is an
 * Editable block: stored in the blocks table once edited, with these
 * defaults until then. No project section renders until there is a
 * project worth the room.
 */

const DEFAULTS: Record<string, string> = {
  opening:
    "Hey, I'm Jason. Been reading, resting, mulling over some not-quite-landed ideas lately. I find tossing things on the site helps give them somewhere to go before I've got to really commit. A space for early notions to take a first breath. Makes it easier to see what sticks once they're out there a bit.",
  now: "Most days that means small experiments, school, and talking with other students about AI as a Claude Ambassador. I'm between bigger projects on purpose, and I'd rather say that plainly than dress it up. Los Angeles.",
  elsewhere:
    "If any of this sparks something, shoot me a line: [jason@frgmt.xyz](mailto:jason@frgmt.xyz). Always down to jam on this stuff, probably more than I should be. Code's up at [github.com/frgmt0](https://github.com/frgmt0) if you want to dive in.",
};

type Recent =
  | { kind: "essay"; date: string; post: PostSummary }
  | { kind: "note"; date: string; note: Note };

/** first sentence-ish of a note, for the home list */
function noteLine(content: string): string {
  const plain = content
    .replace(/[#>*_`]/g, "")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .trim();
  const cut = plain.slice(0, 140);
  return cut.length < plain.length ? cut.replace(/\s+\S*$/, "") + "…" : cut;
}

export default function Home() {
  const [recent, setRecent] = useState<Recent[] | null>(null);
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    document.title = "jwz - frgmt.xyz";
    Promise.allSettled([listPosts(), listNotes()]).then(([posts, notes]) => {
      const items: Recent[] = [];
      if (posts.status === "fulfilled")
        for (const p of posts.value) items.push({ kind: "essay", date: p.created_at, post: p });
      if (notes.status === "fulfilled")
        for (const n of notes.value) items.push({ kind: "note", date: n.created_at, note: n });
      items.sort((a, b) => (a.date < b.date ? 1 : -1));
      setRecent(items.slice(0, 6));
    });
    listBlocks()
      .then(setBlocks)
      .catch(() => {});
    me().then((m) => setAdmin(!!m));
  }, []);

  const block = (k: string) => blocks[k] ?? DEFAULTS[k] ?? "";
  const onSaved = (k: string, content: string) => setBlocks((b) => ({ ...b, [k]: content }));

  return (
    <Chrome>
      <div className="hero" aria-hidden="true" />
      <main id="main">
        <Editable
          k="opening"
          value={block("opening")}
          admin={admin}
          onSaved={onSaved}
          render={(c) => (
            <div
              className="opening"
              role="heading"
              aria-level={1}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(c) }}
            />
          )}
        />

        <section className="drift-1" aria-label="Now">
          <h2 className="key">Now</h2>
          <Editable
            k="now"
            value={block("now")}
            admin={admin}
            onSaved={onSaved}
            render={(c) => (
              <div className="body-copy" dangerouslySetInnerHTML={{ __html: renderMarkdown(c) }} />
            )}
          />
        </section>

        <section aria-label="Recent writing">
          <h2 className="key">Recent writing</h2>
          {recent === null && <p className="spec">Loading…</p>}
          {recent?.length === 0 && <p className="spec">Nothing published yet.</p>}
          <div className="entries">
            {recent?.map((r) =>
              r.kind === "essay" ? (
                <article className="entry" key={`e-${r.post.id}`}>
                  <span
                    className="stamp"
                    style={{ ["--stamp" as string]: stampVar("essay", r.post.slug) }}
                    aria-hidden="true"
                  />
                  <div>
                    <h3>
                      <a href={`/essays/${r.post.slug}`}>{r.post.title}</a>{" "}
                      <span className="spec">{fmtShort(r.date)}</span>
                    </h3>
                  </div>
                </article>
              ) : (
                <article className="entry" key={`n-${r.note.id}`}>
                  <span
                    className="stamp"
                    style={{ ["--stamp" as string]: stampVar("note", r.note.id) }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="note-line">
                      <a href="/notes">{noteLine(r.note.content)}</a>{" "}
                      <span className="spec">{fmtShort(r.date)}</span>
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
          {recent && recent.length > 0 && (
            <p className="more" style={{ marginTop: 22 }}>
              <a href="/essays">all essays</a> · <a href="/notes">all notes</a>
            </p>
          )}
        </section>

        <section className="drift-1" aria-label="Contact">
          <h2 className="key">Elsewhere</h2>
          <Editable
            k="elsewhere"
            value={block("elsewhere")}
            admin={admin}
            onSaved={onSaved}
            render={(c) => (
              <div className="body-copy" dangerouslySetInnerHTML={{ __html: renderMarkdown(c) }} />
            )}
          />
        </section>

        <hr className="divider" aria-hidden="true" />
        <p className="end">© 2026 Jason Weiss Zeledon</p>
      </main>
    </Chrome>
  );
}

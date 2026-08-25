import { useEffect, useState } from "react";
import Chrome from "../Chrome";
import { listNotes, type Note } from "../api";
import { renderMarkdown } from "../markdown";
import { fmtDate, stampVar } from "../paint";

/**
 * The fragments stream: dated, untitled, a paragraph or less each.
 * The site's name, made literal.
 */
export default function Notes() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = "Notes — frgmt";
    listNotes()
      .then(setNotes)
      .catch(() => setFailed(true));
  }, []);

  return (
    <Chrome room="notes">
      <main id="main">
        <section aria-label="Notes" style={{ marginTop: "clamp(32px, 6vh, 64px)" }}>
          <h1 className="key">
            Fragments. Ideas that haven't earned an essay yet, dated so I can watch them grow
            up or die.
          </h1>

          {notes === null && !failed && <p className="spec">Loading…</p>}
          {failed && <p className="problem">The notes could not be loaded.</p>}
          {notes?.length === 0 && (
            <p className="body-copy" style={{ marginTop: 24 }}>
              Nothing here yet. Fragments accumulate; this page is patient.
            </p>
          )}

          <div className="notes" style={{ marginTop: 36 }}>
            {notes?.map((n) => (
              <article className="note" key={n.id}>
                <header className="note-head">
                  <span
                    className="stamp"
                    style={{ ["--stamp" as string]: stampVar("note", n.id) }}
                    aria-hidden="true"
                  />
                  <span className="spec">{fmtDate(n.created_at)}</span>
                </header>
                <div
                  className="prose"
                  // renderMarkdown escapes before it transforms; output is safe
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(n.content) }}
                />
              </article>
            ))}
          </div>
        </section>

        <hr className="divider" aria-hidden="true" />
        <p className="end">
          <a href="/">frgmt.xyz</a>
        </p>
      </main>
    </Chrome>
  );
}

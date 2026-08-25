import { useEffect, useState } from "react";
import Chrome from "../Chrome";
import { listPosts, type PostSummary } from "../api";
import { fmtDate, stampVar } from "../paint";

/** Every finished piece, one dated entry each, newest first. */
export default function Essays() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.title = "Essays — frgmt";
    listPosts()
      .then(setPosts)
      .catch(() => setFailed(true));
  }, []);

  return (
    <Chrome room="essays">
      <main id="main">
        <section aria-label="Essays" style={{ marginTop: "clamp(32px, 6vh, 64px)" }}>
          <h1 className="key">Essays, in the order they happened.</h1>

          {posts === null && !failed && <p className="spec">Loading…</p>}
          {failed && <p className="problem">The essays could not be loaded.</p>}
          {posts?.length === 0 && <p className="spec">Nothing published yet.</p>}

          <div className="entries" style={{ marginTop: 28 }}>
            {posts?.map((p) => (
              <article className="entry" key={p.id}>
                <span
                  className="stamp"
                  style={{ ["--stamp" as string]: stampVar("essay", p.slug) }}
                  aria-hidden="true"
                />
                <div>
                  <h3>
                    <a href={`/essays/${p.slug}`}>{p.title}</a>{" "}
                    <span className="spec">{fmtDate(p.created_at)}</span>
                  </h3>
                  {p.excerpt && <p className="excerpt">{p.excerpt}</p>}
                </div>
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

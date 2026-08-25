import { useEffect, useState } from "react";
import Chrome from "../Chrome";
import { getPost, type Post } from "../api";
import { renderMarkdown } from "../markdown";
import { fmtDate, stampVar } from "../paint";

export default function PostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getPost(slug)
      .then((p) => {
        setPost(p);
        document.title = `${p.title} — jwz - frgmt.xyz`;
      })
      .catch(() => {
        setMissing(true);
        document.title = "not found — jwz - frgmt.xyz";
      });
  }, [slug]);

  return (
    <Chrome room="essays">
      <main id="main" style={{ marginTop: "clamp(32px, 6vh, 64px)" }}>
        {!post && !missing && <p className="spec">Loading…</p>}

        {missing && (
          <>
            <h1 className="line">There is no essay at this address.</h1>
            <p className="more">
              <a href="/essays">All essays</a>
            </p>
          </>
        )}

        {post && (
          <>
            <p className="more back">
              <a href="/essays">&larr; all essays</a>
            </p>
            <article>
              <header className="note-head" style={{ marginBottom: 14 }}>
                <span
                  className="stamp"
                  style={{ ["--stamp" as string]: stampVar("essay", post.slug) }}
                  aria-hidden="true"
                />
                <span className="spec">{fmtDate(post.created_at)}</span>
              </header>
              <h1 className="line">{post.title}</h1>
              <div
                className="prose"
                // renderMarkdown escapes before it transforms; output is safe
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
              />
            </article>
            <hr className="divider" aria-hidden="true" />
            <p className="end">
              <a href="/essays">More essays</a>
            </p>
          </>
        )}
      </main>
    </Chrome>
  );
}

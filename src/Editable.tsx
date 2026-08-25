import { useState, type ReactNode } from "react";
import { saveBlock } from "./api";

/**
 * The site is its own CMS. Any passage wrapped in <Editable> renders
 * normally for visitors; for a signed-in admin it grows a small edit
 * affordance. Saving publishes to the live site immediately.
 *
 * `value` is the current content (a stored block, or the code default);
 * `render` decides how it appears on the page.
 */
export default function Editable({
  k,
  value,
  admin,
  onSaved,
  render,
}: {
  k: string;
  value: string;
  admin: boolean;
  onSaved: (k: string, content: string) => void;
  render: (content: string) => ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  if (!admin) return <>{render(value)}</>;

  if (!editing)
    return (
      <div className="editable">
        {render(value)}
        <button
          className="edit-link"
          onClick={() => {
            setDraft(value);
            setProblem("");
            setEditing(true);
          }}
        >
          edit
        </button>
      </div>
    );

  const save = async () => {
    setBusy(true);
    setProblem("");
    try {
      await saveBlock(k, draft);
      onSaved(k, draft.trim());
      setEditing(false);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "save failed");
    }
    setBusy(false);
  };

  return (
    <div className="editable">
      <textarea
        className="pad short"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            void save();
          }
        }}
        autoFocus
        spellCheck
      />
      <div className="editbar">
        <span className="spec">markdown works · saves straight to the live site</span>
        <span className="editbar-actions">
          <button className="lamp" style={{ marginRight: 14 }} onClick={() => setEditing(false)}>
            cancel
          </button>
          <button className="lamp" disabled={busy || !draft.trim()} onClick={save}>
            {busy ? "saving…" : "publish"}
          </button>
        </span>
      </div>
      {problem && <p className="problem">{problem}</p>}
    </div>
  );
}

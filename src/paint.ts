/**
 * Every essay and note gets one of six pigment blooms as its date stamp,
 * picked by a stable hash of the entry's identity so the stamp never
 * changes between visits.
 */
export function stampVar(kind: "essay" | "note", key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `var(--bloom-${kind}-${h % 6})`;
}

export const fmtDate = (iso: string) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/** for feeds that already carry a real ISO timestamp (github) */
export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const fmtShort = (iso: string) =>
  new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });

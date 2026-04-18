// work page — renders the repo catalog.
// loads data/repos.json + team.json + categories.json, groups repos by
// category, folds long groups behind a "show all" toggle, and generates
// a seeded SVG placeholder cover per repo in the owning dev's color.

import repoPayload from "./data/repos.json" with { type: "json" };
import team from "./data/team.json" with { type: "json" };
import catalog from "./data/categories.json" with { type: "json" };

const { categories } = catalog;
const repos = repoPayload.repos ?? [];
const devById = Object.fromEntries(team.map((d) => [d.id, d]));
const FOLD_AT = 4;

/* ── util: deterministic PRNG (xmur3 + mulberry32) ─────────────── */
function seedFrom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/* ── placeholder cover: tinted mark tile + procedural arcs ─────── */
function coverSVG({ name, color }) {
  const rand = seedFrom(name);
  const rot = Math.floor(rand() * 16) - 8;
  const tx = Math.floor(rand() * 40) - 20;
  const ty = Math.floor(rand() * 30) - 15;
  const arcCount = 3 + Math.floor(rand() * 3);
  const arcs = Array.from({ length: arcCount }, () => {
    const cx = Math.floor(rand() * 320);
    const cy = Math.floor(rand() * 200);
    const r = 40 + Math.floor(rand() * 140);
    const w = 0.6 + rand() * 1.2;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-opacity="0.18" stroke-width="${w.toFixed(2)}"/>`;
  }).join("");
  const markScale = 1.1 + rand() * 0.5;
  const code = name
    .slice(0, 6)
    .toUpperCase()
    .padEnd(6, "·")
    .replace(/[^A-Z0-9·]/g, "·");

  const tint = `${color}22`; // 13% alpha hex
  return `
<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} cover">
  <defs>
    <linearGradient id="g-${name}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0.05"/>
    </linearGradient>
    <pattern id="p-${name}" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 8 L8 0" stroke="${color}" stroke-opacity="0.08" stroke-width="0.6"/>
    </pattern>
  </defs>
  <rect width="320" height="200" fill="${tint}"/>
  <rect width="320" height="200" fill="url(#g-${name})"/>
  <rect width="320" height="200" fill="url(#p-${name})"/>
  ${arcs}
  <g transform="translate(${180 + tx} ${90 + ty}) rotate(${rot}) scale(${markScale.toFixed(3)})" fill="${color}" opacity="0.55">
    <path d="m133.9 3.2c-17.4 2.3-49.8 8.3-77.9 19.9-5.8 2.4-15.1 6.2-23.6 11.7-0.7 0.5-1.3 1.7-2.5 6.5-2.9 11.8-7.9 33-8.1 43.1 0 1 0.4 1.6 1.3 1.6l39-0.1c0.6 0 1.4-0.2 1.9-0.6l66.2-50.4c0.7-0.6 4.6-22.7 6.1-29.6 0.3-1.7-1-2.3-2.4-2.1z"/>
    <path d="m101.5 66.3 16.5 18.8c0.5 0.5 1 0.9 1.5 0.9h1.4c0.6 0 0.7-1.1 0.8-1.7l6.1-40.4-26.3 22.4z"/>
  </g>
  <text x="16" y="186" font-family="ui-monospace, Menlo, monospace" font-size="10" fill="${color}" opacity="0.75" letter-spacing="2">${code}</text>
</svg>`.trim();
}

function encodeSVG(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ── dom helpers ───────────────────────────────────────────────── */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}.${m}`;
}

function prettyName(name) {
  return name.replace(/[-_]/g, " ");
}

/* ── group & render ────────────────────────────────────────────── */
const grouped = new Map(categories.map((c) => [c.id, []]));
for (const r of repos) {
  if (!grouped.has(r.category)) grouped.set(r.category, []);
  grouped.get(r.category).push(r);
}

const listEl = document.querySelector('[data-role="list"]');
const tocEl = document.querySelector('[data-role="toc"]');
const countsEl = document.querySelector('[data-role="counts"]');
const emptyEl = document.querySelector('[data-role="empty"]');

if (repos.length === 0) {
  emptyEl.hidden = false;
  countsEl.textContent = "0 fragments.";
} else {
  countsEl.textContent = `${repos.length} fragments · ${team.length} ${team.length === 1 ? "contributor" : "contributors"}.`;
}

// build TOC
const ordered = categories
  .map((c) => ({ cat: c, items: grouped.get(c.id) ?? [] }))
  .filter((g) => g.items.length > 0);

ordered.forEach(({ cat, items }, i) => {
  const a = el(
    "a",
    { href: `#${cat.id}`, class: "work-toc__item" },
    el("span", { class: "work-toc__num" }, String(i + 1).padStart(2, "0")),
    el("span", { class: "work-toc__name" }, cat.name),
    el("span", { class: "work-toc__count" }, `${items.length}`)
  );
  tocEl.append(a);
});

// render each group
ordered.forEach(({ cat, items }, i) => {
  const section = el("section", {
    id: cat.id,
    class: "work-group",
    "aria-labelledby": `group-${cat.id}`,
  });

  const head = el(
    "header",
    { class: "work-group__head" },
    el("span", { class: "work-group__idx" }, `${String(i + 1).padStart(2, "0")} / ${cat.id}`),
    el(
      "h2",
      { id: `group-${cat.id}`, class: "work-group__title" },
      el("span", { "data-scramble": "" }, cat.name, "."),
      el("span", { class: "work-group__count", "aria-label": `${items.length} repos` }, `${items.length}`)
    ),
    el("p", { class: "work-group__desc" }, cat.desc)
  );
  section.append(head);

  const folded = items.length > FOLD_AT;
  const grid = el("ol", { class: "repo-grid", role: "list" });

  items.forEach((repo, idx) => {
    grid.append(renderCard(repo, idx >= FOLD_AT));
  });
  section.append(grid);

  if (folded) {
    const hidden = items.length - FOLD_AT;
    const btn = el(
      "button",
      {
        type: "button",
        class: "work-group__toggle",
        "aria-expanded": "false",
      },
      el("span", { class: "work-group__toggle-label" }, `show all ${items.length}`),
      el("span", { class: "work-group__toggle-count" }, `+${hidden}`),
      el("span", { class: "work-group__toggle-arrow", "aria-hidden": "true" }, "↓")
    );
    btn.addEventListener("click", () => {
      const expanded = section.classList.toggle("is-expanded");
      btn.setAttribute("aria-expanded", String(expanded));
      btn.querySelector(".work-group__toggle-label").textContent = expanded ? "fold" : `show all ${items.length}`;
      btn.querySelector(".work-group__toggle-count").textContent = expanded ? "" : `+${hidden}`;
    });
    section.append(btn);
  }

  listEl.append(section);
});

function renderCard(repo, hiddenByDefault) {
  const dev = devById[repo.dev] ?? { color: "#6b6659", name: repo.dev };
  const color = dev.color ?? "#6b6659";
  const cover = encodeSVG(coverSVG({ name: repo.name, color }));

  const card = el(
    "li",
    {
      class: `repo${hiddenByDefault ? " repo--folded" : ""}${repo.archived ? " repo--archived" : ""}`,
      style: `--frag-color:${color}`,
    },
    el(
      "a",
      { href: repo.url, class: "repo__link", target: "_blank", rel: "noopener" },
      el(
        "div",
        { class: "repo__cover", "aria-hidden": "true" },
        el("img", { src: cover, alt: "", loading: "lazy" })
      ),
      el(
        "div",
        { class: "repo__body" },
        el(
          "div",
          { class: "repo__head" },
          el("span", { class: "repo__chip", "aria-hidden": "true" }),
          el("h3", { class: "repo__name" }, prettyName(repo.name))
        ),
        repo.description
          ? el("p", { class: "repo__desc" }, repo.description)
          : el("p", { class: "repo__desc repo__desc--empty" }, "no description. still counts."),
        el(
          "div",
          { class: "repo__meta" },
          repo.language ? el("span", { class: "repo__lang" }, repo.language) : null,
          el("span", { class: "repo__dot" }, "·"),
          el("span", { class: "repo__dev" }, `@${dev.github ?? repo.dev}`),
          el("span", { class: "repo__dot" }, "·"),
          el("span", { class: "repo__date" }, fmtDate(repo.pushed_at)),
          repo.archived
            ? el("span", { class: "repo__tag" }, "archived")
            : null,
          el("span", { class: "repo__arrow", "aria-hidden": "true" }, "↗")
        )
      )
    )
  );
  return card;
}

/* ── scramble (lightweight port) ───────────────────────────────── */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const POOL = "▓▒░/\\|<>-_=+*?#%[]{}01";
function scramble(el, { duration = 700, revealDelay = 120 } = {}) {
  const final = el.textContent;
  if (!final) return;
  const total = final.length;
  el.classList.add("is-scrambling");
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const revealed = Math.floor(eased * total);
    let out = "";
    for (let i = 0; i < total; i++) {
      const ch = final[i];
      if (i < revealed || ch === " " || ch === "." || ch === ",") out += ch;
      else {
        const localStart = revealDelay + (i / total) * (duration - revealDelay);
        out += (now - start) >= localStart ? ch : POOL[Math.floor(Math.random() * POOL.length)];
      }
    }
    el.textContent = out;
    if (t < 1) requestAnimationFrame(frame);
    else {
      el.textContent = final;
      el.classList.remove("is-scrambling");
    }
  }
  requestAnimationFrame(frame);
}

if (!reduceMotion) {
  // instant-mode: the hero title
  document.querySelectorAll('[data-scramble="instant"]').forEach((el, i) => {
    const final = el.textContent;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = final;
      setTimeout(() => scramble(el, { duration: 900 }), i * 120);
    });
  });

  // IO-mode: category titles
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          if (el.getAttribute("data-scramble") !== "instant") {
            scramble(el, { duration: 650 });
          }
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.3 }
    );
    document.querySelectorAll('[data-scramble]:not([data-scramble="instant"])').forEach((el) => io.observe(el));
  }

  // reveal repo cards on scroll
  if ("IntersectionObserver" in window) {
    const cards = document.querySelectorAll(".repo:not(.repo--folded)");
    cards.forEach((c) => c.classList.add("reveal-init"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("reveal-init");
          entry.target.classList.add("reveal-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.1 }
    );
    cards.forEach((c) => io.observe(c));
  }
}

/* ── vowel toggle (same as landing) ────────────────────────────── */
const fragNodes = document.querySelectorAll("[data-frag]");
const originalFrags = new Map();
fragNodes.forEach((n) => originalFrags.set(n, n.getAttribute("data-frag")));
const fullFrags = {
  "th · ctlg": "the catalog",
};
let vowelOn = false;
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLElement && e.target.matches("input, textarea, select")) return;
  if (e.key !== "v" && e.key !== "V") return;
  vowelOn = !vowelOn;
  fragNodes.forEach((n) => {
    const orig = originalFrags.get(n);
    n.setAttribute("data-frag", vowelOn ? (fullFrags[orig] ?? orig) : orig);
  });
});

/* ── console ──────────────────────────────────────────────────── */
console.log(
  "%c frgmt · work ",
  "background:#110f0c;color:#6FB8A3;font-family:sans-serif;font-weight:700;padding:3px 8px;letter-spacing:-.02em;"
);
console.log(`%c ${repos.length} fragments, ${ordered.length} categories.`, "color:#6b6659;font-family:monospace;font-size:11px;");

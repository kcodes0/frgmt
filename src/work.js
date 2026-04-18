// work page — flat, chronological catalog of every fragment across
// every team member. renders the bundled data on first paint (fast,
// no FOUC), then quietly pulls fresh data from GitHub on load and
// swaps it in. if the pull fails (rate-limit, offline, unauthed)
// we fall back to bundled data silently.

import bundled from "./data/repos.json" with { type: "json" };
import team from "./data/team.json" with { type: "json" };

const devById = Object.fromEntries(team.map((d) => [d.id, d]));

/* ── PRNG (xmur3 + mulberry32) for deterministic covers ────────── */
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

/* ── placeholder cover ─────────────────────────────────────────── */
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
  const tint = `${color}22`;
  const id = name.replace(/[^a-z0-9]/gi, "_");
  return `
<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} cover">
  <defs>
    <linearGradient id="g-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0.05"/>
    </linearGradient>
    <pattern id="p-${id}" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 8 L8 0" stroke="${color}" stroke-opacity="0.08" stroke-width="0.6"/>
    </pattern>
  </defs>
  <rect width="320" height="200" fill="${tint}"/>
  <rect width="320" height="200" fill="url(#g-${id})"/>
  <rect width="320" height="200" fill="url(#p-${id})"/>
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
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

function prettyName(name) {
  return name.replace(/[-_]/g, " ");
}

/* ── relative time ─────────────────────────────────────────────── */
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function relTime(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ago`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h ago`;
  if (ms < WEEK) return `${Math.floor(ms / DAY)}d ago`;
  if (ms < MONTH) return `${Math.floor(ms / WEEK)}w ago`;
  if (ms < YEAR) return `${Math.floor(ms / MONTH)}mo ago`;
  return `${Math.floor(ms / YEAR)}y ago`;
}

/* ── render ────────────────────────────────────────────────────── */
const listEl = document.querySelector('[data-role="list"]');
const emptyEl = document.querySelector('[data-role="empty"]');
const statusTextEl = document.querySelector('[data-role="status-text"]');
const statusEl = document.querySelector('[data-role="status"]');

function render(repos, { live = false, generatedAt = null } = {}) {
  if (!repos || repos.length === 0) {
    emptyEl.hidden = false;
    listEl.innerHTML = "";
    statusTextEl.textContent = "no fragments yet.";
    return;
  }
  emptyEl.hidden = true;

  const sorted = [...repos].sort(
    (a, b) => new Date(b.pushed_at) - new Date(a.pushed_at)
  );

  // reconcile by key (preserve existing nodes → cheap updates)
  const existing = new Map();
  listEl.querySelectorAll(".repo").forEach((node) => {
    existing.set(node.dataset.key, node);
  });

  const frag = document.createDocumentFragment();
  const freshKeys = new Set();
  sorted.forEach((repo, idx) => {
    const key = `${repo.dev}/${repo.name}`;
    freshKeys.add(key);
    const isHot = Date.now() - new Date(repo.pushed_at).getTime() < WEEK;
    const prior = existing.get(key);
    const node = prior ? updateCard(prior, repo, idx, isHot) : renderCard(repo, idx, isHot);
    frag.appendChild(node);
  });
  // drop nodes that no longer belong
  for (const [key, node] of existing) {
    if (!freshKeys.has(key)) node.remove();
  }
  listEl.append(frag);

  const pulled = generatedAt ? relTime(generatedAt) : "just now";
  const count = sorted.length;
  const contributors = new Set(sorted.map((r) => r.dev)).size;
  statusTextEl.textContent = `${count} fragments · ${contributors} ${contributors === 1 ? "contributor" : "contributors"} · ${live ? "live · " : ""}pulled ${pulled}`;
  if (live) statusEl.classList.add("is-live");
}

function renderCard(repo, idx, isHot) {
  const dev = devById[repo.dev] ?? { color: "#6b6659", github: repo.dev };
  const color = dev.color ?? "#6b6659";
  const cover = encodeSVG(coverSVG({ name: repo.name, color }));
  const key = `${repo.dev}/${repo.name}`;

  const badge = idx === 0 && isHot
    ? el("span", { class: "repo__badge" }, "working on")
    : null;

  return el(
    "li",
    {
      class: `repo${repo.archived ? " repo--archived" : ""}${isHot ? " repo--hot" : ""}${idx === 0 ? " repo--feature" : ""}`,
      style: `--frag-color:${color}`,
      "data-key": key,
    },
    el(
      "a",
      { href: repo.url, class: "repo__link", target: "_blank", rel: "noopener" },
      el(
        "div",
        { class: "repo__cover", "aria-hidden": "true" },
        el("img", { src: cover, alt: "", loading: "lazy" }),
        badge
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
          repo.language ? el("span", { class: "repo__dot" }, "·") : null,
          el("span", { class: "repo__dev" }, `@${dev.github ?? repo.dev}`),
          el("span", { class: "repo__dot" }, "·"),
          el("span", { class: "repo__date", title: repo.pushed_at ?? "" }, relTime(repo.pushed_at)),
          repo.archived ? el("span", { class: "repo__tag" }, "archived") : null,
          el("span", { class: "repo__arrow", "aria-hidden": "true" }, "↗")
        )
      )
    )
  );
}

function updateCard(node, repo, idx, isHot) {
  // update badge position + meta timestamp without re-building everything
  const dev = devById[repo.dev] ?? { color: "#6b6659", github: repo.dev };
  const color = dev.color ?? "#6b6659";
  node.style.setProperty("--frag-color", color);
  node.classList.toggle("repo--feature", idx === 0);
  node.classList.toggle("repo--hot", isHot);
  const badge = node.querySelector(".repo__badge");
  if (idx === 0 && isHot && !badge) {
    const cover = node.querySelector(".repo__cover");
    if (cover) cover.append(el("span", { class: "repo__badge" }, "working on"));
  } else if ((idx !== 0 || !isHot) && badge) {
    badge.remove();
  }
  const date = node.querySelector(".repo__date");
  if (date) date.textContent = relTime(repo.pushed_at);
  const desc = node.querySelector(".repo__desc");
  if (desc && repo.description && desc.classList.contains("repo__desc--empty")) {
    desc.classList.remove("repo__desc--empty");
    desc.textContent = repo.description;
  }
  return node;
}

/* ── live fetch from GitHub ────────────────────────────────────── */
const CACHE_KEY = "frgmt.repos.v1";
const CACHE_TTL = 10 * MINUTE;

async function fetchDev(dev) {
  const url = `https://api.github.com/users/${dev.github}/repos?per_page=100&sort=updated&type=owner`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${dev.github}`);
  const raw = await res.json();
  return raw
    .filter((r) => !r.fork && !r.private && !r.disabled)
    .map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description || "",
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics ?? [],
      archived: !!r.archived,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      dev: dev.id,
    }));
}

async function fetchAll() {
  const lists = await Promise.all(team.map((d) => fetchDev(d).catch(() => null)));
  const out = [];
  let anyOK = false;
  for (const list of lists) {
    if (list) { out.push(...list); anyOK = true; }
  }
  if (!anyOK) throw new Error("all dev fetches failed");
  return out;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.t > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(repos) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      t: Date.now(),
      generated_at: new Date().toISOString(),
      repos,
    }));
  } catch {}
}

// 1. paint bundled data immediately
render(bundled.repos ?? [], { live: false, generatedAt: bundled.generated_at });

// 2. use cache if warm, else fetch fresh
const cached = readCache();
if (cached) {
  render(cached.repos, { live: true, generatedAt: cached.generated_at });
} else {
  fetchAll()
    .then((fresh) => {
      writeCache(fresh);
      render(fresh, { live: true, generatedAt: new Date().toISOString() });
    })
    .catch((err) => {
      console.warn("[frgmt] live fetch failed, keeping bundled data:", err.message);
      statusTextEl.textContent = `${(bundled.repos ?? []).length} fragments · bundled · ${relTime(bundled.generated_at)}`;
    });
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
  document.querySelectorAll('[data-scramble="instant"]').forEach((el, i) => {
    const final = el.textContent;
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = final;
      setTimeout(() => scramble(el, { duration: 900 }), i * 120);
    });
  });
}

/* ── vowel toggle ──────────────────────────────────────────────── */
const fragNodes = document.querySelectorAll("[data-frag]");
const originalFrags = new Map();
fragNodes.forEach((n) => originalFrags.set(n, n.getAttribute("data-frag")));
const fullFrags = {
  "frgmnts · ltst · frst": "fragments · latest first",
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
  "%c frgmt · fragments ",
  "background:#110f0c;color:#6FB8A3;font-family:sans-serif;font-weight:700;padding:3px 8px;letter-spacing:-.02em;"
);
console.log(`%c latest first · live from github`, "color:#6b6659;font-family:monospace;font-size:11px;");

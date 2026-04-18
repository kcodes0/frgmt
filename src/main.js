// frgmt — enhancement layer
// scramble text on reveal, stroke-draw the hero mark, tilt the mark
// with the cursor, render tile counts + team roster, toggle vowels on "v"

import repoPayload from "./data/repos.json" with { type: "json" };
import team from "./data/team.json" with { type: "json" };

const supportsIO = "IntersectionObserver" in window;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── per-dev fragment cards ────────────────────────────────────── */
// each developer gets a "see <name>'s fragments" card on the home page,
// tinted with their --frag-color (hex from team.json). the card summarizes
// the dev's most-recent repo activity and a per-dev repo count.
const repos = repoPayload.repos ?? [];
const byDev = new Map();
for (const r of repos) {
  if (!byDev.has(r.dev)) byDev.set(r.dev, []);
  byDev.get(r.dev).push(r);
}
for (const arr of byDev.values()) {
  arr.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
}

const devs = document.querySelector('[data-role="devs"]');
if (devs) {
  team.forEach((dev, idx) => {
    const repoList = byDev.get(dev.id) ?? [];
    const count = repoList.length;
    const recent = repoList.slice(0, 3).map((r) => r.name);
    const num = String(idx + 1).padStart(3, "0");

    const li = document.createElement("li");
    li.className = "dev";
    li.style.setProperty("--frag-color", dev.color);
    li.innerHTML = `
      <a class="dev__link" href="./work.html">
        <div class="dev__head">
          <span class="dev__num">${num}</span>
          <span class="dev__swatch" aria-hidden="true"></span>
          <span class="dev__color">${dev.color_name ?? dev.color}</span>
          <span class="dev__hex">${dev.color.toLowerCase()}</span>
        </div>
        <div class="dev__body">
          <h3 class="dev__name">${dev.name}</h3>
          <p class="dev__role">${dev.role}</p>
        </div>
        <ul class="dev__recent" aria-label="recent fragments">
          ${recent.map((n) => `<li>${n}</li>`).join("")}
          ${recent.length === 0 ? `<li class="dev__recent--empty">no fragments yet</li>` : ""}
        </ul>
        <div class="dev__foot">
          <span>see ${dev.name}'s fragments</span>
          <span class="dev__count">${count}</span>
          <span class="dev__arrow" aria-hidden="true">→</span>
        </div>
      </a>
    `;
    devs.append(li);
  });
}

/* ── scramble ───────────────────────────────────────────────────── */
// Animates text through a glitchy pool of chars, revealing left→right.
// `mode="instant"` runs immediately (hero); otherwise IO-triggered.
const SCRAMBLE_POOL = "▓▒░/\\|<>-_=+*?#%[]{}01";
const scrambleEls = document.querySelectorAll("[data-scramble]");

function scramble(el, { duration = 700, revealDelay = 120 } = {}) {
  const final = el.textContent;
  if (!final) return;
  const total = final.length;
  el.classList.add("is-scrambling");
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    // ease-out curve for reveal progress
    const eased = 1 - Math.pow(1 - t, 3);
    const revealedCount = Math.floor(eased * total);
    let out = "";
    for (let i = 0; i < total; i++) {
      const ch = final[i];
      if (i < revealedCount || ch === " " || ch === "." || ch === ",") {
        out += ch;
      } else {
        // stabilize after reveal to avoid flickering the next char forever
        const localStart = revealDelay + (i / total) * (duration - revealDelay);
        if (elapsed >= localStart) {
          out += final[i];
        } else {
          out += SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)];
        }
      }
    }
    el.textContent = out;
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = final;
      el.classList.remove("is-scrambling");
    }
  }
  requestAnimationFrame(frame);
}

if (reduceMotion) {
  scrambleEls.forEach(() => {});
} else {
  // queue instant-mode scrambles on first frame (staggered), freezing
  // the final text immediately so there's no flash of final content
  scrambleEls.forEach((el) => {
    if (el.getAttribute("data-scramble") === "instant") {
      el.dataset.finalText = el.textContent;
      el.textContent = "";
    }
  });
  requestAnimationFrame(() => {
    scrambleEls.forEach((el) => {
      if (el.getAttribute("data-scramble") !== "instant") return;
      const order = Array.from(el.parentElement?.querySelectorAll('[data-scramble="instant"]') ?? [el]).indexOf(el);
      el.textContent = el.dataset.finalText ?? "";
      setTimeout(() => scramble(el, { duration: 900 }), order * 200);
    });
  });

  if (supportsIO) {
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
    scrambleEls.forEach((el) => {
      if (el.getAttribute("data-scramble") !== "instant") io.observe(el);
    });
  }
}

/* ── scroll reveal (opacity/translate) ──────────────────────────── */
const revealTargets = document.querySelectorAll(
  ".section-head, .thesis__cols, .dev, .principle, .isnt__list li, .team__body p"
);
revealTargets.forEach((el) => el.classList.add("reveal-init"));

if (supportsIO && !reduceMotion) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove("reveal-init");
        entry.target.classList.add("reveal-in");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.1 }
  );
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => {
    el.classList.remove("reveal-init");
    el.classList.add("reveal-in");
  });
}

/* ── hero mark: shard shatter assembly ───────────────────────────
   The mark is diced into a grid of clipped cells. Each cell starts
   scattered far from center, rotated, and invisible. On first frame
   the cells converge inward — a literal fragment-to-fragment assembly
   — settling into the final logo. Afterward the cursor creates a
   repulsion ripple on the nearest shards, and the drift pattern
   behind the mark parallaxes with the pointer.

   The trick: instead of splitting the mark geometry (expensive and
   fragile), we render the whole mark inside N <g clip-path=rect>
   groups, each clip covering a unique cell of the grid. The full
   mark is defined once in <defs> and referenced via <use> — so the
   GPU paints 1 mark N times, not N × 7 paths from scratch. */
const heroMark = document.querySelector(".hero__mark[data-draw]");
const heroWrap = document.querySelector(".hero__mark-wrap");
const heroDrift = document.querySelector(".hero__drift");

const VB = 150;
const COLS = 8;
const ROWS = 6;
const CW = VB / COLS;
const CH = VB / ROWS;
const SVGNS = "http://www.w3.org/2000/svg";

function rngFrom(str) {
  let h = 2166136261 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

if (heroMark) {
  const shards = buildShards(heroMark);

  if (reduceMotion) {
    // snap-to-place for accessibility
    shards.forEach((s) => {
      s.g.setAttribute("transform", "translate(0 0) rotate(0)");
      s.g.style.opacity = "1";
    });
    heroMark.classList.add("drawn");
  } else {
    revealShards(shards, heroMark, () => {
      heroMark.classList.add("drawn");
      attachRipple(shards, heroMark, heroWrap, heroDrift);
    });
  }
}

function buildShards(svg) {
  const originals = [...svg.querySelectorAll("path")];
  // clean out original paths — they'll live inside <defs> instead
  originals.forEach((p) => p.remove());

  const defs = svgEl("defs");
  const body = svgEl("g", { id: "frgmt-mark-body" });
  originals.forEach((p) => body.appendChild(p.cloneNode(true)));
  defs.appendChild(body);

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = `frgmt-clip-${r}-${c}`;
      const clip = svgEl("clipPath", { id });
      clip.appendChild(svgEl("rect", {
        x: c * CW, y: r * CH, width: CW, height: CH,
      }));
      defs.appendChild(clip);
      cells.push({ row: r, col: c, id });
    }
  }
  svg.appendChild(defs);

  // add a sweep line overlay for the reveal finale
  const sweep = svgEl("rect", {
    class: "hero__mark-sweep",
    x: -10, y: 0, width: 6, height: VB,
    fill: "#c8401a",
  });
  sweep.style.opacity = "0";

  const rnd = rngFrom("frgmt-shard-v1");
  const shards = cells.map(({ row, col, id }) => {
    const angle = rnd() * Math.PI * 2;
    const dist = 220 + rnd() * 260;
    const dx0 = Math.cos(angle) * dist;
    const dy0 = Math.sin(angle) * dist;
    const rot0 = (rnd() - 0.5) * 160;

    const g = svgEl("g", {
      "clip-path": `url(#${id})`,
      transform: `translate(${dx0.toFixed(2)} ${dy0.toFixed(2)}) rotate(${rot0.toFixed(2)} ${VB / 2} ${VB / 2})`,
    });
    g.style.opacity = "0";
    g.style.willChange = "transform, opacity";

    const use = svgEl("use", { href: "#frgmt-mark-body" });
    g.appendChild(use);
    svg.appendChild(g);

    return {
      g, row, col, dx0, dy0, rot0,
      cx: col * CW + CW / 2,
      cy: row * CH + CH / 2,
      dxCur: 0, dyCur: 0, rotCur: 0,
      dxTgt: 0, dyTgt: 0, rotTgt: 0,
    };
  });

  svg.appendChild(sweep);
  svg.__sweep = sweep;
  return shards;
}

function revealShards(shards, svg, done) {
  // per-shard arrival delay radiates from the grid center outward —
  // outer shards start first, inner shards "snap" in last, feels
  // like the logo is being pulled together from the edges.
  const MAX_DELAY = 720;
  const PER = 780;
  const TOTAL = MAX_DELAY + PER;
  const midC = (COLS - 1) / 2;
  const midR = (ROWS - 1) / 2;
  const maxDist = Math.hypot(midC, midR);

  shards.forEach((s) => {
    const d = Math.hypot(s.col - midC, s.row - midR) / maxDist;
    s.delay = MAX_DELAY * (1 - d); // outer first
  });

  const t0 = performance.now();

  function frame(now) {
    const e = now - t0;
    let active = false;
    for (const s of shards) {
      const t = Math.max(0, Math.min(1, (e - s.delay) / PER));
      if (t < 1) active = true;
      // elastic-like arrival: slight overshoot for snap feel
      const eased = t < 1
        ? 1 - Math.pow(1 - t, 4) + Math.sin(t * Math.PI) * 0.04
        : 1;
      const dx = s.dx0 * (1 - eased);
      const dy = s.dy0 * (1 - eased);
      const rot = s.rot0 * (1 - eased);
      s.g.setAttribute(
        "transform",
        `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rot.toFixed(2)} ${VB / 2} ${VB / 2})`
      );
      s.g.style.opacity = String(Math.min(1, t * 1.6));
    }

    // sweep line: horizontal scan across the viewBox near the end of reveal
    const sweep = svg.__sweep;
    if (sweep) {
      const sweepStart = MAX_DELAY * 0.2;
      const sweepDur = 620;
      const st = Math.max(0, Math.min(1, (e - sweepStart) / sweepDur));
      if (st > 0 && st < 1) {
        const x = -10 + st * (VB + 20);
        sweep.setAttribute("x", x.toFixed(2));
        sweep.style.opacity = String(Math.sin(st * Math.PI) * 0.55);
      } else if (st >= 1) {
        sweep.style.opacity = "0";
      }
    }

    if (active || e < TOTAL) requestAnimationFrame(frame);
    else {
      // final snap: zero-out any lingering sub-pixel offset
      for (const s of shards) {
        s.g.setAttribute("transform", "translate(0 0) rotate(0)");
        s.g.style.opacity = "1";
      }
      done();
    }
  }
  requestAnimationFrame(frame);
}

function attachRipple(shards, svg, wrap, drift) {
  if (!wrap) return;

  const R = 55;        // radius of repulsion in viewBox units
  const STRENGTH = 14; // max displacement per cell
  const ROT_STR = 26;  // max rotation per cell (deg)
  const LERP = 0.16;

  let raf = 0;
  let running = false;
  let driftTargetX = 0, driftTargetY = 0;
  let driftCurX = 0, driftCurY = 0;

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(tick);
  }

  wrap.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VB;
    const py = ((e.clientY - rect.top) / rect.height) * VB;

    for (const s of shards) {
      const dx = s.cx - px;
      const dy = s.cy - py;
      const d = Math.hypot(dx, dy);
      if (d < R) {
        const force = 1 - d / R;
        const ang = Math.atan2(dy, dx);
        s.dxTgt = Math.cos(ang) * force * STRENGTH;
        s.dyTgt = Math.sin(ang) * force * STRENGTH;
        s.rotTgt = force * ROT_STR * (dx < 0 ? -1 : 1);
      } else {
        s.dxTgt = 0; s.dyTgt = 0; s.rotTgt = 0;
      }
    }

    const wrapRect = wrap.getBoundingClientRect();
    driftTargetX = (e.clientX - wrapRect.left) / wrapRect.width - 0.5;
    driftTargetY = (e.clientY - wrapRect.top) / wrapRect.height - 0.5;
    start();
  });

  wrap.addEventListener("pointerleave", () => {
    for (const s of shards) { s.dxTgt = 0; s.dyTgt = 0; s.rotTgt = 0; }
    driftTargetX = 0; driftTargetY = 0;
    start();
  });

  function tick() {
    let moving = false;
    for (const s of shards) {
      s.dxCur += (s.dxTgt - s.dxCur) * LERP;
      s.dyCur += (s.dyTgt - s.dyCur) * LERP;
      s.rotCur += (s.rotTgt - s.rotCur) * LERP;
      const delta = Math.abs(s.dxTgt - s.dxCur) + Math.abs(s.dyTgt - s.dyCur) + Math.abs(s.rotTgt - s.rotCur);
      if (delta > 0.05) moving = true;
      s.g.setAttribute(
        "transform",
        `translate(${s.dxCur.toFixed(2)} ${s.dyCur.toFixed(2)}) rotate(${s.rotCur.toFixed(2)} ${s.cx.toFixed(2)} ${s.cy.toFixed(2)})`
      );
    }
    driftCurX += (driftTargetX - driftCurX) * 0.12;
    driftCurY += (driftTargetY - driftCurY) * 0.12;
    if (drift) {
      drift.style.transform = `translate(${(driftCurX * -14).toFixed(2)}px, ${(driftCurY * -14).toFixed(2)}px)`;
    }
    if (Math.abs(driftTargetX - driftCurX) + Math.abs(driftTargetY - driftCurY) > 0.002) moving = true;

    if (moving) {
      raf = requestAnimationFrame(tick);
    } else {
      running = false;
      raf = 0;
    }
  }
}

/* ── vowel toggle ───────────────────────────────────────────────── */
const fragNodes = document.querySelectorAll("[data-frag]");
const originalFrags = new Map();
fragNodes.forEach((n) => originalFrags.set(n, n.getAttribute("data-frag")));

const fullFrags = {
  "th · thss":      "the · thesis",
  "wht · w · mk":   "what · we · make",
  "prncpls":        "principles",
  "wht · w · rn't": "what · we · aren't",
  "n":              "one",
};

let vowelOn = false;
function toggleVowels(on) {
  vowelOn = on;
  fragNodes.forEach((n) => {
    const original = originalFrags.get(n);
    const full = fullFrags[original] ?? original;
    n.setAttribute("data-frag", on ? full : original);
  });
}

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLElement && e.target.matches("input, textarea, select")) return;
  if (e.key === "v" || e.key === "V") toggleVowels(!vowelOn);
});

/* ── console ────────────────────────────────────────────────────── */
console.log(
  "%c frgmt ",
  "background:#110f0c;color:#f4f1e9;font-family:sans-serif;font-weight:700;padding:3px 8px;letter-spacing:-.02em;"
);
console.log("%c frgmt.xyz — press v to put the vowels back.", "color:#6b6659;font-family:monospace;font-size:11px;");

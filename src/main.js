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
  ".section-head, .thesis__cols, .tile, .principle, .isnt__list li, .team__body p"
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

/* ── hero mark: stroke-draw in, then fill ───────────────────────── */
const heroMark = document.querySelector(".hero__mark[data-draw]");
if (heroMark && !reduceMotion) {
  const paths = heroMark.querySelectorAll("path");
  const lengths = [];
  paths.forEach((p) => {
    const len = p.getTotalLength();
    lengths.push(len);
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    p.style.transition = "none";
  });
  requestAnimationFrame(() => {
    paths.forEach((p, i) => {
      p.style.transition = `stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1) ${i * 80}ms`;
      p.style.strokeDashoffset = "0";
    });
    const maxDelay = 80 * (paths.length - 1);
    setTimeout(() => {
      heroMark.classList.add("drawn");
      paths.forEach((p) => {
        p.style.transition = "stroke-dashoffset .3s, fill .6s cubic-bezier(.16,1,.3,1)";
      });
    }, 1200 + maxDelay);
  });
}

/* ── hero mark: mouse-parallax tilt ─────────────────────────────── */
const heroWrap = document.querySelector(".hero__mark-wrap");
const heroDrift = document.querySelector(".hero__drift");
if (heroWrap && heroMark && !reduceMotion) {
  let raf = 0;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;

  heroWrap.addEventListener("pointermove", (e) => {
    const rect = heroWrap.getBoundingClientRect();
    targetX = (e.clientX - rect.left) / rect.width - 0.5;
    targetY = (e.clientY - rect.top) / rect.height - 0.5;
    if (!raf) raf = requestAnimationFrame(tick);
  });
  heroWrap.addEventListener("pointerleave", () => {
    targetX = 0; targetY = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  });

  function tick() {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    const rot = curX * 6;
    const tx = curX * 8;
    const ty = curY * 6;
    heroMark.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
    if (heroDrift) {
      heroDrift.style.transform = `translate(${curX * -14}px, ${curY * -14}px)`;
    }
    if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
      raf = requestAnimationFrame(tick);
    } else {
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

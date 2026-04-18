// frgmt — tiny enhancement layer
// Scroll-reveal, mosaic trigger, and a keyboard easter egg: press "v"
// to put the vowels back into every fragment header, briefly.

const supportsIO = "IntersectionObserver" in window;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── scroll reveal ──────────────────────────────────────────────── */
const revealTargets = document.querySelectorAll(
  ".section-head, .pull, .thesis__cols, .tile, .principle, .isnt__list li, .team__lede, .team__body p, .mosaic, .foot__grid"
);
revealTargets.forEach((el, i) => {
  el.classList.add("reveal-init");
  el.style.transitionDelay = `${Math.min(i * 20, 200)}ms`;
});

if (supportsIO && !reduceMotion) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove("reveal-init");
        entry.target.classList.add("reveal-in");
        if (entry.target.classList.contains("mosaic")) {
          entry.target.classList.add("reveal");
        }
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => {
    el.classList.remove("reveal-init");
    el.classList.add("reveal-in");
    if (el.classList.contains("mosaic")) el.classList.add("reveal");
  });
}

/* ── vowel easter egg ───────────────────────────────────────────── */
// Press "v" to temporarily reveal that the fragments still read as real
// words. The frag labels swap from the vowel-less echo to the full form.
const fragNodes = document.querySelectorAll(".section-head__title [data-frag]");
const originalFrags = new Map();
fragNodes.forEach((n) => originalFrags.set(n, n.getAttribute("data-frag")));

const fullFrags = {
  "th thss":        "the thesis",
  "wht frgmt mks":  "what frgmt makes",
  "th prncpls":     "the principles",
  "wht frgmt sn't": "what frgmt isn't",
  "n + pc":         "one + a piece",
};

let vowelOn = false;
function toggleVowels(on) {
  vowelOn = on;
  fragNodes.forEach((n) => {
    const original = originalFrags.get(n);
    const full = fullFrags[original] ?? original;
    n.setAttribute("data-frag", on ? full : original);
    n.style.setProperty("--frag-color", on ? "var(--ember-2)" : "");
  });
}

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLElement && e.target.matches("input, textarea, select")) return;
  if (e.key === "v" || e.key === "V") {
    toggleVowels(!vowelOn);
  }
});

/* ── console hello ──────────────────────────────────────────────── */
console.log(
  "%c frgmt %c small things that add up. ",
  "background:#121110;color:#efeade;font-family:serif;font-style:italic;padding:4px 8px;border-radius:2px 0 0 2px;",
  "background:#c8491c;color:#efeade;font-family:monospace;padding:4px 8px;border-radius:0 2px 2px 0;"
);
console.log("%c tip: press v to put the vowels back.", "color:#7a7266;font-family:monospace;");

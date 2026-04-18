// frgmt — small enhancement layer
// Subtle scroll reveal plus a hidden keystroke: press "v" to put the
// vowels back into every fragment-labeled heading.

const supportsIO = "IntersectionObserver" in window;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealTargets = document.querySelectorAll(
  ".section-head, .pull, .thesis__cols, .tile, .principle, .isnt__list li, .team__lede, .team__body p"
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

const fragNodes = document.querySelectorAll("[data-frag]");
const originalFrags = new Map();
fragNodes.forEach((n) => originalFrags.set(n, n.getAttribute("data-frag")));

const fullFrags = {
  "th · thss":      "the thesis",
  "wht w mk":       "what we make",
  "prncpls":        "principles",
  "wht frgmt sn't": "what frgmt isn't",
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

console.log(
  "%c frgmt ",
  "background:#16140f;color:#f4f1e9;font-family:sans-serif;padding:3px 8px;letter-spacing:-.02em;"
);
console.log("%c press v to put the vowels back.", "color:#716c5e;font-family:monospace;font-size:11px;");

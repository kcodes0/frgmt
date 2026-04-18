// join page — tiny script that (1) swaps form for thank-you state when
// we arrive back from formsubmit.co with ?sent=1, (2) upgrades the role
// chips with keyboard focus polish, and (3) disables submit briefly on
// click to prevent double-posts.

const url = new URL(location.href);
const sent = url.searchParams.get("sent") === "1";

const formSection = document.querySelector('[data-role="form"]');
const sentSection = document.querySelector('[data-role="sent"]');

if (sent && formSection && sentSection) {
  formSection.hidden = true;
  sentSection.hidden = false;
  // scrub ?sent=1 from the URL so a refresh doesn't stay on thank-you
  history.replaceState(null, "", url.pathname);
  sentSection.scrollIntoView({ behavior: "instant", block: "start" });
}

/* ── submit polish ──────────────────────────────────────────────── */
const form = document.querySelector(".join-form");
if (form) {
  form.addEventListener("submit", (e) => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    // let native validation fire first
    if (!form.checkValidity()) return;
    btn.disabled = true;
    btn.dataset.state = "sending";
    const label = btn.querySelector("span:first-child");
    if (label) label.textContent = "sending…";
  });
}

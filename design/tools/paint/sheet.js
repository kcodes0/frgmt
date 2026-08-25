/*
 * The production sheet. Renders every painted asset the site ships, at
 * fixed rectangles, then POSTs the whole canvas to /save. crop.sh slices
 * the sheet into individual WebPs using the same rectangles.
 *
 * Light half: watercolor on warm paper.  Dark half: the same shapes in
 * lifted, low-chroma pigment on toned near-black paper — gouache logic.
 */

const LIGHT_PAPER = "#FAFAF7";
const DARK_PAPER = "#101011";

const LIGHT = { payne: "#46536b", indigo: "#2c3a68", umber: "#6e5237", ink: "#17171B" };
const DARK = { payne: "#9db0d6", indigo: "#94a5e0", umber: "#d6b284", ink: "#eceae4" };

/* gouache needs body: translucent pigment goes muddy over dark paper */
let OP = 1;

const W = 1600;
const H = 1440;

/* Rect registry; crop.sh mirrors these. x,y are top-left in image coords. */
const RECTS = {
  "hero-l": { x: 0, y: 0, w: 1400, h: 340 },
  "divider-l": { x: 0, y: 360, w: 1200, h: 60 },
  // 6 indigo + 6 umber blooms, 120px cells
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`bloom-essay-${i}-l`, { x: i * 130, y: 440, w: 120, h: 120 }]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`bloom-note-${i}-l`, { x: i * 130, y: 580, w: 120, h: 120 }]),
  ),
  // ink texture clipped inside the "frgmt" wordmark via background-clip
  "mark-l": { x: 820, y: 440, w: 380, h: 110 },
  "mark-d": { x: 820, y: 1160, w: 380, h: 110 },
  "hero-d": { x: 0, y: 720, w: 1400, h: 340 },
  "divider-d": { x: 0, y: 1080, w: 1200, h: 60 },
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`bloom-essay-${i}-d`, { x: i * 130, y: 1160, w: 120, h: 120 }]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`bloom-note-${i}-d`, { x: i * 130, y: 1300, w: 120, h: 120 }]),
  ),
};

function setup() {
  createCanvas(W, H, WEBGL);
  angleMode(DEGREES);
  noLoop();
}

/* image coords → centered WEBGL coords */
const cxy = (r) => [r.x + r.w / 2 - W / 2, r.y + r.h / 2 - H / 2];

function j(x, y, amt = 4) {
  return [x + random(-amt, amt), y + random(-amt, amt)];
}

function poly(pts) {
  brush.beginShape(0);
  for (const [x, y] of pts) brush.vertex(x, y);
  brush.endShape(true);
}

function wash(color, opacity, bleed, texture, border = 0.3) {
  brush.noStroke();
  brush.noHatch();
  brush.fill(color, Math.min(255, opacity * OP));
  (brush.fillBleed || brush.bleed)(bleed);
  // texture above ~0.35 scatters ghost triangles across the paper
  brush.fillTexture(Math.min(texture, 0.3), border);
}

function heroWash(rect, pig, ink) {
  const [cx, cy] = cxy(rect);
  const w = rect.w - 160;
  const h = rect.h - 80;

  const strokes = 4;
  const sh = h / 1.9;
  for (let i = 0; i < strokes; i++) {
    const t = i / (strokes - 1);
    const y = cy - h / 2 + t * (h - sh);
    const xl = cx - w / 2 + random(-8, 18) + (i % 2) * 12;
    const xr = cx + w / 2 - random(-8, 18) - ((i + 1) % 2) * 8;
    wash(pig, 13 + t * 26, 0.13, 0.75, 0.16);
    poly([
      j(xl, y, 5),
      j((xl + xr) / 2, y + random(-7, 7), 6),
      j(xr, y + random(-4, 4), 5),
      j(xr - random(0, 16), y + sh, 5),
      j((xl + xr) / 2, y + sh + random(-7, 7), 6),
      j(xl + random(0, 16), y + sh, 5),
    ]);
  }

  // rewet edge along the bottom
  wash(pig, 48, 0.2, 0.7, 0.3);
  poly([
    j(cx - w / 2 + 30, cy + h / 2 - 26, 4),
    j(cx, cy + h / 2 - 30, 6),
    j(cx + w / 2 - 40, cy + h / 2 - 22, 4),
    j(cx + w / 2 - 60, cy + h / 2 - 2, 4),
    j(cx, cy + h / 2 + 4, 6),
    j(cx - w / 2 + 50, cy + h / 2, 4),
  ]);

  // one broken ink accent under the left reach of the band
  brush.noFill();
  brush.set("rotring", ink, 0.65);
  brush.line(cx - w * 0.46, cy + h / 2 + 24, cx - w * 0.05, cy + h / 2 + 22);
}

function bloom(rect, pig) {
  const [cx, cy] = cxy(rect);
  const r = rect.w * 0.22 * random(0.85, 1.1);
  wash(pig, 42, 0.5, 0.8, 0.12);
  brush.circle(cx + random(-4, 4), cy + random(-4, 4), r, 0.4);
  wash(pig, 72, 0.55, 0.6, 0.2);
  brush.circle(cx + r * random(-0.3, 0.3), cy + r * random(-0.25, 0.35), r * random(0.3, 0.45), 0.4);
}

function divider(rect, pig) {
  const [cx, cy] = cxy(rect);
  const w = rect.w - 80;
  wash(pig, 30, 0.18, 0.9);
  const pts = [];
  const n = 16;
  for (let i = 0; i <= n; i++) pts.push(j(cx - w / 2 + (i * w) / n, cy - random(2, 7), 2));
  for (let i = n; i >= 0; i--) pts.push(j(cx - w / 2 + (i * w) / n, cy + random(2, 7), 2));
  poly(pts);
}

/* dense mottled ink for the wordmark: a full-bleed coat, then blotches */
function inkField(rect, cols) {
  const [cx, cy] = cxy(rect);
  const w = rect.w;
  const h = rect.h;
  // two full-bleed coats: watercolor opacity dilutes fast, ink needs body
  for (let pass = 0; pass < 2; pass++) {
    wash(cols[0], 140, 0.25, 0.6, 0.2);
    poly([
      j(cx - w / 2 - 20, cy - h / 2 - 16, 6),
      j(cx, cy - h / 2 - 14, 8),
      j(cx + w / 2 + 20, cy - h / 2 - 16, 6),
      j(cx + w / 2 + 22, cy + h / 2 + 16, 6),
      j(cx, cy + h / 2 + 18, 8),
      j(cx - w / 2 - 22, cy + h / 2 + 14, 6),
    ]);
  }
  for (let i = 0; i < 14; i++) {
    const c = cols[1 + (i % (cols.length - 1))];
    wash(c, 80 + random(90), 0.4, 0.7, 0.2);
    brush.circle(cx + random(-w / 2, w / 2), cy + random(-h / 2, h / 2), 18 + random(38), 0.5);
  }
}

function paintHalf(pal, paper) {
  const suffix = paper === LIGHT_PAPER ? "l" : "d";
  OP = suffix === "d" ? 1.9 : 1;
  heroWash(RECTS[`hero-${suffix}`], pal.payne, pal.ink);
  divider(RECTS[`divider-${suffix}`], pal.payne);
  for (let i = 0; i < 6; i++) bloom(RECTS[`bloom-essay-${i}-${suffix}`], pal.indigo);
  for (let i = 0; i < 6; i++) bloom(RECTS[`bloom-note-${i}-${suffix}`], pal.umber);
  inkField(
    RECTS[`mark-${suffix}`],
    suffix === "l"
      ? ["#2a3140", "#0e0f14", "#4a5568"]
      : ["#c9cfdd", "#f3f1ea", "#8fa0bd"],
  );
}

function draw() {
  // grounds: light paper above, dark paper below, painted with plain p5
  background(LIGHT_PAPER);
  push();
  noStroke();
  fill(DARK_PAPER);
  rect(-W / 2, 720 - H / 2, W, H - 720);
  pop();

  brush.scaleBrushes(2.5);
  paintHalf(LIGHT, LIGHT_PAPER);
  paintHalf(DARK, DARK_PAPER);

  // hand the sheet to the save server
  setTimeout(async () => {
    const dataUrl = document.querySelector("canvas").toDataURL("image/png");
    await fetch("/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "sheet", dataUrl }),
    });
    document.title = "saved";
  }, 500);
}

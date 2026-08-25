/*
 * The painted vocabulary for route 04 Watermark, rendered with p5.brush.
 * Everything the site will ever paint, on one sheet:
 *
 *   1. the hero wash        — payne's gray, mostly water, one darker rewet edge
 *   2. pigment blooms       — date stamps for essays (indigo) and notes (umber)
 *   3. the divider strip    — a thin ragged wash, the only divider on the site
 *
 * Steven Holl study energy: quick, wet, reserved paper. No outlines except a
 * couple of broken ink accents. WEBGL canvas, origin at center.
 */

const PAPER = "#FAFAF7";

const PIGMENT = {
  payne: "#46536b", // home
  indigo: "#2c3a68", // essays
  umber: "#6e5237", // notes
};

const W = 1600;
const H = 1200;

function setup() {
  createCanvas(W, H, WEBGL);
  angleMode(DEGREES);
  noLoop();
}

function j(x, y, amt = 4) {
  return [x + random(-amt, amt), y + random(-amt, amt)];
}

function poly(pts, curvature = 0) {
  brush.beginShape(curvature);
  for (const [x, y] of pts) brush.vertex(x, y);
  brush.endShape(true);
}

function wash(color, opacity, bleed, texture, border = 0.3) {
  brush.noStroke();
  brush.noHatch();
  brush.fill(color, opacity);
  (brush.fillBleed || brush.bleed)(bleed);
  // texture above ~0.35 scatters giant ghost triangles across the paper;
  // keep granulation below that
  brush.fillTexture(Math.min(texture, 0.3), border);
}

/* ------------------------------------------------------------- hero wash
 * A wide band, mostly water. Two passes: a very pale broad one, then a
 * narrower charged one along the lower edge that blooms upward. */
function heroWash(cx, cy, w, h) {
  const c = PIGMENT.payne;

  // a graded wash built the way one is actually painted: overlapping
  // horizontal strokes, each a long thin quad, loading more pigment
  // toward the bottom. No single big shape, so no picture-frame border.
  const strokes = 4;
  const sh = h / 1.9; // deep overlap so interiors fuse into one wash
  for (let i = 0; i < strokes; i++) {
    const t = i / (strokes - 1);
    const y = cy - h / 2 + t * (h - sh);
    const xl = cx - w / 2 + random(-8, 18) + (i % 2) * 12;
    const xr = cx + w / 2 - random(-8, 18) - ((i + 1) % 2) * 8;
    wash(c, 13 + t * 26, 0.13, 0.75, 0.16);
    poly(
      [
        j(xl, y, 5),
        j((xl + xr) / 2, y + random(-7, 7), 6),
        j(xr, y + random(-4, 4), 5),
        j(xr - random(0, 16), y + sh, 5),
        j((xl + xr) / 2, y + sh + random(-7, 7), 6),
        j(xl + random(0, 16), y + sh, 5),
      ],
      0,
    );
  }

  // the rewet edge: one charged thin stroke along the bottom
  wash(c, 48, 0.2, 0.7, 0.3);
  poly(
    [
      j(cx - w / 2 + 30, cy + h / 2 - 26, 4),
      j(cx, cy + h / 2 - 30, 6),
      j(cx + w / 2 - 40, cy + h / 2 - 22, 4),
      j(cx + w / 2 - 60, cy + h / 2 - 2, 4),
      j(cx, cy + h / 2 + 4, 6),
      j(cx - w / 2 + 50, cy + h / 2, 4),
    ],
    0,
  );

  // one broken ink accent under the band
  brush.noFill();
  brush.set("rotring", "#17171B", 0.65);
  brush.line(cx - w * 0.46, cy + h * 0.58, cx - w * 0.05, cy + h * 0.56);
}

/* -------------------------------------------------------- pigment blooms
 * Date stamps. One wet circle, one smaller charged drop off-center, so it
 * reads as a bloom rather than a dot. */
function bloom(x, y, r, color) {
  wash(color, 42, 0.5, 0.8, 0.12);
  brush.circle(x, y, r, 0.4);
  wash(color, 72, 0.55, 0.6, 0.2);
  brush.circle(x + r * random(-0.3, 0.3), y + r * random(-0.25, 0.35), r * random(0.3, 0.45), 0.4);
}

/* -------------------------------------------------------- divider strip */
function divider(cx, cy, w, color) {
  wash(color, 30, 0.18, 0.9);
  const pts = [];
  const n = 16;
  for (let i = 0; i <= n; i++) pts.push(j(cx - w / 2 + (i * w) / n, cy - random(2, 7), 2));
  for (let i = n; i >= 0; i--) pts.push(j(cx - w / 2 + (i * w) / n, cy + random(2, 7), 2));
  poly(pts, 0);
}

function draw() {
  background(PAPER);
  brush.scaleBrushes(2.5);

  // 1. hero
  heroWash(0, -H / 2 + 300, 1240, 300);

  // 2. blooms: a row of essay stamps, a row of note stamps
  const r = 26;
  for (let i = 0; i < 6; i++) {
    bloom(-450 + i * 180, 160, r * random(0.85, 1.2), PIGMENT.indigo);
  }
  for (let i = 0; i < 6; i++) {
    bloom(-450 + i * 180, 320, r * random(0.8, 1.15), PIGMENT.umber);
  }

  // 3. divider
  divider(0, 470, 1100, PIGMENT.payne);
}

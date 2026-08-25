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
/* dark palette leans into color: grass-green divider, chromatic blooms */
const DARK = { payne: "#7fa763", indigo: "#8fa2ea", umber: "#dba368", ink: "#eceae4" };

/* gouache needs body: translucent pigment goes muddy over dark paper */
let OP = 1;

/* ?part=scene renders only the full-page backdrop on its own canvas;
   the default part renders the asset sheet. Two smaller canvases instead
   of one giant one, which was exhausting the WebGL context. */
const PART = new URLSearchParams(location.search).get("part") || "main";

const W = 1600;
const H = PART === "scene" ? 1000 : 1600;

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
  "mark-d": { x: 820, y: 1440, w: 380, h: 110 },
  "hero-d": { x: 0, y: 720, w: 1400, h: 340 },
  // the full-page dark backdrop: the whole site becomes the painting
  "scene-d": { x: 0, y: 0, w: 1600, h: 1000 },
  "divider-d": { x: 0, y: 1120, w: 1200, h: 60 },
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`bloom-essay-${i}-d`, { x: i * 130, y: 1220, w: 120, h: 120 }]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [`bloom-note-${i}-d`, { x: i * 130, y: 1360, w: 120, h: 120 }]),
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

/* ------------------------------------------------------------ nocturne
 * The dark-mode hero is a painting, not a wash: a moonlit sky with
 * clouds, a rolling grass knoll, and a stand of voluminous trees.
 * Gouache logic: opaque mid-value pigment on near-black paper. */

function cloud(x, y, s, opacity) {
  const lobes = [
    [0, 0, 1],
    [-s * 0.9, s * 0.12, 0.72],
    [s * 0.85, s * 0.1, 0.66],
    [-s * 0.35, -s * 0.28, 0.62],
    [s * 0.3, -s * 0.3, 0.55],
  ];
  wash("#96a6c8", opacity, 0.45, 0.7, 0.18);
  for (const [dx, dy, r] of lobes) brush.circle(x + dx, y + dy, s * r, 0.35);
  // lit crown
  wash("#dfe4ee", opacity * 0.55, 0.5, 0.6, 0.15);
  brush.circle(x - s * 0.2, y - s * 0.3, s * 0.42, 0.4);
}

function canopy(x, y, s, dark, light) {
  wash(dark, 120, 0.35, 0.7, 0.2);
  const lobes = [
    [0, -s * 0.55, 0.8],
    [-s * 0.55, -s * 0.2, 0.72],
    [s * 0.55, -s * 0.25, 0.68],
    [0, -s * 0.05, 0.85],
  ];
  for (const [dx, dy, r] of lobes) brush.circle(x + dx, y + dy, s * r, 0.4);
  // moonlit side, upper left
  wash(light, 88, 0.45, 0.6, 0.18);
  brush.circle(x - s * 0.45, y - s * 0.6, s * 0.42, 0.45);
  brush.circle(x - s * 0.05, y - s * 0.85, s * 0.3, 0.45);
  // trunk
  brush.noFill();
  brush.set("charcoal", "#1a2318", 1.1);
  brush.line(x - 2, y - s * 0.1, x + random(-3, 3), y + s * 0.55);
}

function nocturne(rect) {
  OP = 1.35;
  const [cx, cy] = cxy(rect);
  const w = rect.w - 140;
  const h = rect.h - 70;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const top = cy - h / 2;
  const rectBottom = cy + rect.h / 2 + 10;
  const hy = top + h * 0.72; // horizon

  // the crest of the knoll: one shared line for fills, grass, and trees
  const crest = (t) =>
    hy - Math.sin(t * Math.PI * 1.1 + 0.25) * h * 0.16 - Math.sin(t * 5.7) * h * 0.02;

  // night sky fills the whole band, deeper at the top
  for (let pass = 0; pass < 2; pass++) {
    wash("#3a4f80", 70, 0.14, 0.7, 0.14);
    const pts = [j(left - 24, top, 5), j(cx, top - 3, 6), j(right + 24, top, 5)];
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      pts.push(j(left - 24 + t * (w + 48), crest(t) + 12, 3));
    }
    poly(pts);
  }
  wash("#28386b", 55, 0.16, 0.7, 0.14);
  poly([
    j(left + 6, top, 5), j(cx, top - 2, 6), j(right - 6, top + 2, 5),
    j(right - 10, top + h * 0.34, 6), j(cx, top + h * 0.4, 8), j(left + 2, top + h * 0.36, 6),
  ]);

  // moon with a soft halo, high in the upper right
  const mx = cx + w * 0.3;
  const my = top + h * 0.18;
  wash("#8a96b8", 42, 0.5, 0.6, 0.1);
  brush.circle(mx, my, 34, 0.3);
  wash("#ece7d3", 150, 0.3, 0.5, 0.12);
  brush.circle(mx, my, 15, 0.25);

  // three wide clouds drifting across the upper sky
  cloud(cx - w * 0.28, top + h * 0.2, 44, 48);
  cloud(cx + w * 0.04, top + h * 0.34, 36, 40);
  cloud(cx - w * 0.44, top + h * 0.44, 28, 32);

  // the knoll: a cooler far swell behind, the grassy mound in front
  const ground = (offset, color, opacity, bleed) => {
    const pts = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(j(left - 12 + t * (w + 24), crest(t) + offset, 3));
    }
    pts.push(j(right + 12, rectBottom, 1));
    pts.push(j(left - 12, rectBottom, 1));
    wash(color, opacity, bleed, 0.75, 0.12);
    poly(pts);
  };
  ground(h * 0.1, "#3f6052", 70, 0.14); // far swell, cool blue-green
  ground(0, "#528049", 125, 0.12); // the knoll
  ground(h * 0.16, "#3a5c34", 70, 0.08); // shadowed foot of the slope

  // moonlit grass along the crest
  wash("#9cc878", 95, 0.4, 0.7, 0.16);
  for (let i = 0; i < 10; i++) {
    const t = 0.08 + i * 0.09 + random(-0.02, 0.02);
    brush.circle(left + t * w, crest(t) + random(2, 8), 6 + random(7), 0.5);
  }

  // voluminous trees, canopies breaking the skyline
  canopy(left + w * 0.17, crest(0.17) + 4, 46, "#2c4c26", "#7fae63");
  canopy(left + w * 0.29, crest(0.29) + 6, 58, "#33582b", "#8fbc6f");
  canopy(left + w * 0.4, crest(0.4) + 4, 38, "#27441f", "#6d9c55");
  canopy(right - w * 0.12, crest(0.88) + 6, 42, "#2c4c26", "#79a75e");

  // the same broken ink accent the light hero carries
  brush.noFill();
  brush.set("rotring", "#eceae4", 0.65);
  brush.line(left + 10, cy + rect.h / 2 - 8, cx - w * 0.05, cy + rect.h / 2 - 10);
}

/* ------------------------------------------------- the full-page scene
 * Dark mode's backdrop: a viewport-filling nocturne. Sky fills the
 * frame, the knoll and trees hold the bottom edge, and the content
 * column floats in the night air above them. */
function nocturneScene(rect) {
  OP = 1.5;
  const [cx, cy] = cxy(rect);
  const w = rect.w;
  const h = rect.h;
  const left = cx - w / 2 - 40;
  const right = cx + w / 2 + 40;
  const top = cy - h / 2 - 40;
  const bottom = cy + h / 2 + 40;
  const hy = cy - h / 2 + h * 0.82; // horizon

  const crest = (t) =>
    hy - Math.sin(t * Math.PI * 1.05 + 0.4) * h * 0.05 - Math.sin(t * 5.1) * h * 0.012;

  // night sky across the whole frame
  wash("#2c3d68", 60, 0.14, 0.7, 0.12);
  poly([j(left, top, 4), j(cx, top - 3, 5), j(right, top, 4), j(right, hy + 20, 4), j(cx, hy + 26, 6), j(left, hy + 18, 4)]);
  // deeper zenith
  wash("#1f2c55", 48, 0.16, 0.7, 0.12);
  poly([j(left, top, 4), j(cx, top - 2, 5), j(right, top, 4), j(right, top + h * 0.42, 6), j(cx, top + h * 0.48, 8), j(left, top + h * 0.44, 6)]);
  // a breath of light above the horizon
  wash("#41568a", 34, 0.2, 0.7, 0.12);
  poly([j(left, hy - h * 0.16, 6), j(cx, hy - h * 0.19, 8), j(right, hy - h * 0.15, 6), j(right, hy + 16, 4), j(cx, hy + 20, 6), j(left, hy + 14, 4)]);

  // moon, top right, clear of the content column on wide screens
  const mx = cx + w * 0.36;
  const my = cy - h / 2 + h * 0.3;
  wash("#8a96b8", 40, 0.5, 0.6, 0.1);
  brush.circle(mx, my, 40, 0.3);
  wash("#ece7d3", 150, 0.3, 0.5, 0.12);
  brush.circle(mx, my, 17, 0.25);

  // clouds drifting at different heights
  // cover-crop safe zone: wide viewports cut the top ~25% of the image
  cloud(cx - w * 0.34, cy - h / 2 + h * 0.32, 62, 40);
  cloud(cx - w * 0.06, cy - h / 2 + h * 0.42, 48, 32);
  cloud(cx + w * 0.24, cy - h / 2 + h * 0.5, 54, 36);
  cloud(cx - w * 0.42, cy - h / 2 + h * 0.58, 40, 26);
  cloud(cx + w * 0.44, cy - h / 2 + h * 0.66, 34, 24);

  // the knoll holding the bottom of every page
  const ground = (offset, color, opacity, bleed) => {
    const pts = [];
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(j(left + t * (right - left), crest(t) + offset, 3));
    }
    pts.push(j(right, bottom, 2));
    pts.push(j(left, bottom, 2));
    wash(color, opacity, bleed, 0.75, 0.12);
    poly(pts);
  };
  ground(h * 0.03, "#33523f", 70, 0.14); // far swell, cool
  ground(0, "#3b5c36", 115, 0.12); // the knoll
  ground(h * 0.09, "#2c452c", 85, 0.1); // shadowed foreground

  // moonlit grass along the crest
  wash("#8fbc6f", 75, 0.4, 0.7, 0.16);
  for (let i = 0; i < 14; i++) {
    const t = 0.04 + i * 0.068 + random(-0.02, 0.02);
    brush.circle(left + t * (right - left), crest(t) + random(2, 10), 7 + random(8), 0.5);
  }

  // stands of trees left and right, canopies breaking the skyline
  canopy(left + w * 0.1, crest(0.1) + 6, 64, "#2c4c26", "#7fae63");
  canopy(left + w * 0.2, crest(0.2) + 8, 82, "#33582b", "#8fbc6f");
  canopy(left + w * 0.3, crest(0.3) + 6, 54, "#27441f", "#6d9c55");
  canopy(left + w * 0.88, crest(0.88) + 8, 72, "#2c4c26", "#79a75e");
  canopy(left + w * 0.97, crest(0.97) + 6, 50, "#27441f", "#6d9c55");
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
  // light keeps the quiet wash; turning the lamp off reveals the painting
  if (suffix === "d") {
    nocturne(RECTS["hero-d"]);
    OP = 1.9;
  } else {
    heroWash(RECTS["hero-l"], pal.payne, pal.ink);
  }
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
  brush.scaleBrushes(2.5);

  if (PART === "scene") {
    // the scene ships opaque: it is the bottom layer of the dark site
    push();
    noStroke();
    fill(DARK_PAPER);
    rect(-W / 2, -H / 2, W, H);
    pop();
    nocturneScene(RECTS["scene-d"]);
  } else {
    // grounds: PURE WHITE above and PURE BLACK below, so assets vanish
    // into whatever sits beneath them in CSS: multiply(white) and
    // screen(black) are both no-ops. Pigment alone survives the blend.
    background('#FFFFFF');
    push();
    noStroke();
    fill("#000000");
    rect(-W / 2, 720 - H / 2, W, H - 720);
    pop();
    paintHalf(LIGHT, LIGHT_PAPER);
    paintHalf(DARK, DARK_PAPER);
  }

  // hand the render to the save server
  setTimeout(async () => {
    const dataUrl = document.querySelector("canvas").toDataURL("image/png");
    await fetch("/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: PART === "scene" ? "scene" : "sheet", dataUrl }),
    });
    document.title = "saved";
  }, 500);
}

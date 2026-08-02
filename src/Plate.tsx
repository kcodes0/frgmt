import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import type { Theme } from "./theme";

/**
 * The plate: one tall photograph hanging down the right side of the page,
 * reduced to a field of dither dots in the page's own ink.
 *
 * The asset is a plain grayscale cliff. Everything else happens in the shader:
 * an 8x8 ordered dither turns luminance into dots of --ink on nothing, so in
 * light the dark rock is dense dark dots on paper, and in dark the same rule
 * with a light ink produces the photographic negative for free. One file, both
 * rooms.
 *
 * Scroll drives two things. The crop drifts down the photograph as you move
 * down the page, on a heavily damped follower so the image is still arriving
 * after your thumb has stopped. And scroll *speed* feeds churn: the dots pick
 * up a noise displacement and dissolve toward static, then settle back into
 * the image over a couple of seconds — mid-diffusion, re-forming. At rest a
 * whisper of churn stays on so the plate breathes instead of freezing.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_res;     /* canvas, device px */
uniform vec2 u_texRes;
uniform float u_dot;    /* dither cell, device px */
uniform float u_time;
uniform float u_pan;    /* 0..1 down the photograph */
uniform float u_churn;  /* 0..1 how dissolved */
uniform vec3 u_ink;

/* how far past the crop we zoom, which is exactly the room the pan gets */
const float Z = 1.25;

float hash(vec2 v) {
  return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453);
}

/* value noise, one octave: smooth enough to read as flow, not sparkle */
float noise(vec2 v) {
  vec2 i = floor(v);
  vec2 f = fract(v);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

/*
  8x8 Bayer, built from the 2x2 kernel [[0,3],[2,1]]. The finest bits carry
  the most significance; weight them the other way and the matrix degenerates
  into visible 8x8 gradient blocks.
*/
float bayer(vec2 c) {
  float t = 0.0;
  float s = 16.0;
  for (int i = 0; i < 3; i++) {
    vec2 h = mod(floor(c), 2.0);
    t += (h.x * 3.0 - h.y * 2.0 * (h.x * 2.0 - 1.0)) * s;
    c = floor(c / 2.0);
    s *= 0.25;
  }
  return (t + 0.5) / 64.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;

  /* fit the texture's width, zoom in a step, pan the surplus with the page */
  float frac = (u_res.y / u_res.x) * (u_texRes.x / u_texRes.y);
  frac = min(frac / Z, 1.0);
  vec2 tuv = vec2(
    0.5 + (uv.x - 0.5) / Z,
    uv.y * frac + u_pan * (1.0 - frac));

  /* churn: the sample point wanders off through a slow flow field */
  vec2 flow = vec2(
    noise(uv * 9.0 + u_time * 0.11),
    noise(uv * 9.0 - 31.7 - u_time * 0.09)) - 0.5;
  float l = texture2D(u_tex, tuv + flow * u_churn * 0.16).r;

  /* and the tone itself dissolves toward broadcast static */
  float grain = hash(floor(gl_FragCoord.xy / u_dot) + floor(u_time * 14.0));
  l = mix(l, grain, u_churn * 0.65);

  /* ink where the photograph is dark; the paper is the light */
  float ink = step(l, bayer(gl_FragCoord.xy / u_dot));
  gl_FragColor = vec4(u_ink * ink, ink);
}
`;

/** css --ink is hex like #17171b; the shader wants 0..1 rgb */
function inkOf(el: HTMLElement): [number, number, number] {
  const hex = getComputedStyle(el).getPropertyValue("--ink").trim();
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type Painter = { setInk: () => void; still: () => void };

/* no WebGL: the photograph hangs plainly, greyscale, still a plate */
function StillPlate({ theme }: { theme: Theme }) {
  return (
    <img
      className="plate"
      src="/media/plate.webp"
      alt=""
      aria-hidden="true"
      style={{ objectFit: "cover", filter: theme === "dark" ? "invert(1)" : undefined }}
    />
  );
}

/*
  A fuse, not a boundary in name only: if anything in the live plate throws in
  render or an effect, React 19 would otherwise unmount the entire page. A
  decoration that can white-screen the site is a liability, so it blows down to
  the still image instead.
*/
class Fuse extends Component<{ fallback: ReactNode; children: ReactNode }, { blown: boolean }> {
  state = { blown: false };
  static getDerivedStateFromError() {
    return { blown: true };
  }
  render() {
    return this.state.blown ? this.props.fallback : this.props.children;
  }
}

export default function Plate(props: { theme: Theme; reduced: boolean }) {
  return (
    <Fuse fallback={<StillPlate theme={props.theme} />}>
      <LivePlate {...props} />
    </Fuse>
  );
}

function LivePlate({ theme, reduced }: { theme: Theme; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const painter = useRef<Painter | null>(null);
  const [lost, setLost] = useState(false);

  /*
    Everything that talks to WebGL sits inside one try. Safari in particular
    will hand out a context and then refuse to make shaders for it (a lost
    context looks exactly like this), and an error thrown from an effect
    unmounts the whole tree in React 19: a decoration must fail into its
    fallback, never take the page with it.
  */
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cleanup: (() => void) | undefined;
    try {
      cleanup = init(canvas);
    } catch {
      setLost(true);
    }
    return cleanup;

    function init(canvas: HTMLCanvasElement): () => void {
      const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
      if (!gl) throw new Error("no webgl");

      const sh = (type: number, src: string) => {
        const s = gl.createShader(type);
        if (!s) throw new Error("no shader");
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("compile");
        return s;
      };
      const prog = gl.createProgram();
      if (!prog) throw new Error("no program");
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const U = (n: string) => gl.getUniformLocation(prog, n);
      const uRes = U("u_res");
      const uTexRes = U("u_texRes");
      const uDot = U("u_dot");
      const uTime = U("u_time");
      const uPan = U("u_pan");
      const uChurn = U("u_churn");
      const uInk = U("u_ink");

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.ceil(canvas.clientWidth * dpr));
        canvas.height = Math.max(1, Math.ceil(canvas.clientHeight * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        /* 3 css px a cell: coarse enough that the halftone is the aesthetic */
        gl.uniform1f(uDot, 3 * dpr);
      };

      /*
      The followers. pan trails the scroll position and churn trails the scroll
      speed, each with its own time constant: churn rises almost with the
      gesture, then takes ~2s to settle, which is the window in which the
      dissolve is something you can watch.
    */
      let pan = 0;
      let churn = 0;
      let lastY = window.scrollY;
      let raf = 0;
      let ready = false;

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!ready) return;

        const doc = document.documentElement;
        const range = Math.max(1, doc.scrollHeight - window.innerHeight);
        const target = Math.min(1, Math.max(0, window.scrollY / range));
        pan += (target - pan) * 0.05;

        const vel = Math.abs(window.scrollY - lastY);
        lastY = window.scrollY;
        const want = Math.min(0.85, vel / 900 + 0.045);
        churn += (want - churn) * (want > churn ? 0.16 : 0.022);

        gl.uniform1f(uTime, now / 1000);
        gl.uniform1f(uPan, pan);
        gl.uniform1f(uChurn, churn);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      const still = () => {
        if (!ready) return;
        gl.uniform1f(uTime, 0);
        gl.uniform1f(uPan, 0);
        gl.uniform1f(uChurn, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      painter.current = { setInk: () => gl.uniform3fv(uInk, inkOf(canvas)), still };

      const img = new Image();
      img.src = "/media/plate.webp";
      img.decode().then(
        () => {
          try {
            const tex = gl.createTexture();
            if (!tex) throw new Error("no texture");
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.uniform2f(uTexRes, img.naturalWidth, img.naturalHeight);
            ready = true;
            if (reduced) still();
          } catch {
            setLost(true);
          }
        },
        () => setLost(true),
      );

      resize();
      painter.current.setInk();

      if (!reduced) raf = requestAnimationFrame(frame);

      // a shader nobody is looking at is a shader nobody should be paying for
      const onVisibility = () => {
        if (reduced) return;
        cancelAnimationFrame(raf);
        if (!document.hidden) raf = requestAnimationFrame(frame);
      };
      const onResize = () => {
        resize();
        if (reduced) still();
      };

      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      /*
        The context is deliberately NOT lost here. A canvas only ever has one;
        losing it poisons the next mount of this same element, which is exactly
        what StrictMode's double-mount does in dev. Re-init just compiles onto
        the context again, and a real unmount takes the canvas with it.
      */
      return () => {
        cancelAnimationFrame(raf);
        painter.current = null;
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }
  }, [reduced]);

  /*
    A theme flip is one uniform, not a new context: browsers cap live WebGL
    contexts, and a visitor toying with the lamp would hit that cap.
  */
  useEffect(() => {
    painter.current?.setInk();
    if (reduced) painter.current?.still();
  }, [theme, reduced]);

  if (lost) return <StillPlate theme={theme} />;

  return <canvas ref={ref} className="plate" aria-hidden="true" />;
}

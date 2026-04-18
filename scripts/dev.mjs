#!/usr/bin/env bun
// Dev server that serves both HTML entrypoints at their extensionless AND
// `.html` paths, so links like `./work.html` work in dev the same way they
// do on Cloudflare Pages in production.

import index from "../index.html";
import work from "../work.html";
import join from "../join.html";
import notFound from "../404.html";

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  development: true,
  routes: {
    "/": index,
    "/index.html": index,
    "/work": work,
    "/work.html": work,
    "/join": join,
    "/join.html": join,
    "/404": notFound,
    "/404.html": notFound,
  },
});

console.log(`frgmt dev → http://localhost:${server.port}`);
console.log(`  /           → index.html`);
console.log(`  /work       → work.html`);
console.log(`  /join       → join.html`);
console.log(`  /404        → 404.html`);

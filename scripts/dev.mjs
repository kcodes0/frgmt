#!/usr/bin/env bun
// Dev server that serves both HTML entrypoints at their extensionless AND
// `.html` paths, so links like `./work.html` work in dev the same way they
// do on Cloudflare Pages in production.

import index from "../index.html";
import work from "../work.html";

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  development: true,
  routes: {
    "/": index,
    "/index.html": index,
    "/work": work,
    "/work.html": work,
  },
});

console.log(`frgmt dev → http://localhost:${server.port}`);
console.log(`  /           → index.html`);
console.log(`  /index.html → index.html`);
console.log(`  /work       → work.html`);
console.log(`  /work.html  → work.html`);

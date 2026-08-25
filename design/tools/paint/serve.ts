/*
 * Static server + save endpoint for the paint sheet.
 *   bun run serve.ts          → http://localhost:8317
 *   POST /save {name, dataUrl} → writes out/<name>.png
 */
import { mkdirSync } from "node:fs";

mkdirSync(new URL("./out", import.meta.url).pathname, { recursive: true });

Bun.serve({
  port: 8317,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/save") {
      const { name, dataUrl } = (await req.json()) as { name: string; dataUrl: string };
      if (!/^[a-z0-9-]+$/.test(name)) return new Response("bad name", { status: 400 });
      const b64 = dataUrl.split(",")[1];
      await Bun.write(
        new URL(`./out/${name}.png`, import.meta.url).pathname,
        Buffer.from(b64, "base64"),
      );
      console.log(`saved out/${name}.png`);
      return new Response("ok");
    }
    const path = url.pathname === "/" ? "/sheet.html" : url.pathname;
    const file = Bun.file(new URL(`.${path}`, import.meta.url).pathname);
    return (await file.exists()) ? new Response(file) : new Response("404", { status: 404 });
  },
});
console.log("paint server on http://localhost:8317");

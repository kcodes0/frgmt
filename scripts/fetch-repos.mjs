#!/usr/bin/env bun
// Fetches public repos for every team member from GitHub and writes a
// flat catalog to src/data/repos.json. Each repo is assigned a category
// based on its topics, name, and description. Run at build time.

import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

const team = JSON.parse(await fs.readFile(path.join(ROOT, "src/data/team.json"), "utf8"));
const { categories, default: defaultCat } = JSON.parse(
  await fs.readFile(path.join(ROOT, "src/data/categories.json"), "utf8")
);

function categorize(repo) {
  const topics = (repo.topics ?? []).map((t) => t.toLowerCase());
  const name = (repo.name || "").toLowerCase();
  const desc = (repo.description || "").toLowerCase();
  const hay = `${name} ${desc} ${topics.join(" ")}`;
  for (const cat of categories) {
    for (const kw of cat.keywords) {
      if (topics.includes(kw)) return cat.id;
      const re = new RegExp(`\\b${kw}\\b`, "i");
      if (re.test(hay)) return cat.id;
    }
  }
  return defaultCat;
}

async function fetchDev(dev) {
  const url = `https://api.github.com/users/${dev.github}/repos?per_page=100&sort=updated&type=owner`;
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "frgmt-fetch" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const raw = await res.json();
  return raw
    .filter((r) => !r.fork && !r.private && !r.disabled)
    .map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description || "",
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics ?? [],
      archived: !!r.archived,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      dev: dev.id,
      category: categorize(r),
    }));
}

const out = [];
for (const dev of team) {
  try {
    process.stdout.write(`→ ${dev.github} ... `);
    const repos = await fetchDev(dev);
    out.push(...repos);
    console.log(`${repos.length} repos`);
  } catch (e) {
    console.warn(`\n  failed (${dev.github}): ${e.message}`);
  }
}

out.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

const payload = {
  generated_at: new Date().toISOString(),
  count: out.length,
  repos: out,
};
await fs.writeFile(
  path.join(ROOT, "src/data/repos.json"),
  JSON.stringify(payload, null, 2) + "\n"
);
console.log(`wrote ${out.length} repos to src/data/repos.json`);

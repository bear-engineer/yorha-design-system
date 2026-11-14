#!/usr/bin/env node
// Docs a11y gate: serve a static Storybook build, open every docs entry from index.json
// in Chromium, run axe-core, and exit 1 on any violation.
//
// Usage: node scripts/docs-axe.mjs [storybook-static-dir] [--only <substring>] [--url <running storybook>]
// --url audits a running Storybook (e.g. a dev server on another port) instead of serving a static build.
// Exit: 0 clean, 1 violations (or a docs entry failed to render), 2 crash.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

export function serveStatic(dir) {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let file = normalize(join(root, decodeURIComponent(url.pathname)));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

/** Docs entries from a Storybook index.json (`entries` or legacy `stories`). */
export function docsEntries(index) {
  const all = index.entries ?? index.stories ?? {};
  return Object.values(all).filter((e) => e.type === "docs");
}

/** One printable line per violating node. */
export function formatViolations(id, violations) {
  return violations.flatMap((v) =>
    v.nodes.map((n) => `${id}\t${v.id} (${v.impact ?? "n/a"})\t${n.target.join(" ")}`),
  );
}

async function auditEntry(browser, base, entry) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`${entry.id}\tpage error\t${e.message.split("\n")[0]}`));
  try {
    await page.goto(`${base}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=docs`, { waitUntil: "load" });
    // Storybook keeps its loader nodes in the DOM; the shell sets body.sb-show-main once docs have rendered.
    await page.waitForSelector("body.sb-show-main #storybook-docs h1, body.sb-show-main #storybook-docs h2, body.sb-show-main #storybook-docs .sbdocs", { timeout: 30_000 });
    // Inline autodocs stories mount a moment after the shell.
    await page.waitForFunction(
      () => ![...document.querySelectorAll(".docs-story")].some((el) => el.querySelector(".sb-story:empty, .sb-loader")),
      null,
      { timeout: 30_000 },
    ).catch(() => {});
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).analyze();
    problems.push(...formatViolations(entry.id, results.violations));
  } catch (error) {
    problems.push(`${entry.id}\trender failed\t${String(error.message).split("\n")[0]}`);
  } finally {
    await context.close();
  }
  return problems;
}

async function main(argv) {
  let dir = "storybook-static";
  let only = null;
  let remote = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--only") only = argv[++i];
    else if (argv[i] === "--url") remote = argv[++i].replace(/\/$/, "");
    else dir = argv[i];
  }
  const indexPath = join(resolve(dir), "index.json");
  if (!remote && !existsSync(indexPath)) {
    process.stderr.write(`docs-axe: ${indexPath} not found; run pnpm build-storybook first\n`);
    return 2;
  }
  const index = remote ? await (await fetch(`${remote}/index.json`)).json() : JSON.parse(readFileSync(indexPath, "utf8"));
  let entries = docsEntries(index);
  if (only) entries = entries.filter((e) => e.id.includes(only));
  if (!entries.length) {
    process.stderr.write("docs-axe: no docs entries found\n");
    return 2;
  }
  const server = remote ? null : await serveStatic(dir);
  const base = remote ?? `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const all = [];
  try {
    for (const entry of entries) {
      const found = await auditEntry(browser, base, entry);
      all.push(...found);
      process.stderr.write(`${found.length ? "FAIL" : "ok  "} ${entry.id}\n`);
      for (const line of found.slice(0, 3)) process.stderr.write(`     ${line.split("\t").slice(1).join(" | ").slice(0, 200)}\n`);
    }
  } finally {
    await browser.close();
    server?.close();
  }
  if (all.length) {
    process.stdout.write(`\ndocs-axe: ${all.length} violation(s) in ${new Set(all.map((l) => l.split("\t")[0])).size} of ${entries.length} docs entries\n`);
    process.stdout.write("entry id\trule\ttarget\n");
    for (const line of all) process.stdout.write(`${line}\n`);
    return 1;
  }
  process.stdout.write(`docs-axe: ${entries.length} docs entries, 0 violations\n`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error) => { process.stderr.write(`docs-axe: crashed: ${error.stack ?? error}\n`); process.exitCode = 2; },
  );
}

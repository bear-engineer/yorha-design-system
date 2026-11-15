#!/usr/bin/env node
// Docs scroll gate: a docs page must never scroll on its own. Serves a static Storybook build, opens every
// docs entry, waits for the page to settle, then asserts scrollY stays 0 for a few seconds (child story
// iframes whose play functions focus elements used to drag the docs page down to a test fixture).
//
// Usage: node scripts/docs-scroll.mjs [storybook-static-dir] [--only <substring>] [--url <running storybook>] [--watch <ms>]
// Exit: 0 clean, 1 a page scrolled (or failed to render), 2 crash.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { docsEntries, serveStatic } from "./docs-axe.mjs";

async function check(browser, base, entry, watch) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=docs`, { waitUntil: "load" });
    await page.waitForSelector("body.sb-show-main #storybook-docs h1, body.sb-show-main #storybook-docs h2, body.sb-show-main #storybook-docs .sbdocs", { timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    // Sample the whole watch window: a scroll that later returns would still be a jump.
    const max = await page.evaluate(
      (ms) => new Promise((done) => {
        let top = scrollY;
        const stop = performance.now() + ms;
        const tick = () => {
          top = Math.max(top, scrollY);
          if (performance.now() < stop) requestAnimationFrame(tick);
          else done({ top, active: document.activeElement?.id || document.activeElement?.tagName });
        };
        tick();
      }),
      watch,
    );
    return max.top === 0 ? null : `${entry.id}\tscrolled to ${max.top}px (focus: ${max.active})`;
  } catch (error) {
    return `${entry.id}\trender failed\t${String(error.message).split("\n")[0]}`;
  } finally {
    await context.close();
  }
}

async function main(argv) {
  let dir = "storybook-static";
  let only = null;
  let remote = null;
  let watch = 5000;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--only") only = argv[++i];
    else if (argv[i] === "--url") remote = argv[++i].replace(/\/$/, "");
    else if (argv[i] === "--watch") watch = Number(argv[++i]);
    else dir = argv[i];
  }
  const indexPath = join(resolve(dir), "index.json");
  if (!remote && !existsSync(indexPath)) {
    process.stderr.write(`docs-scroll: ${indexPath} not found; run pnpm build-storybook first\n`);
    return 2;
  }
  const index = remote ? await (await fetch(`${remote}/index.json`)).json() : JSON.parse(readFileSync(indexPath, "utf8"));
  let entries = docsEntries(index);
  if (only) entries = entries.filter((e) => e.id.includes(only));
  if (!entries.length) {
    process.stderr.write("docs-scroll: no docs entries found\n");
    return 2;
  }
  const server = remote ? null : await serveStatic(dir);
  const base = remote ?? `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const bad = [];
  try {
    // Four pages at a time: each wait is mostly idle.
    const queue = [...entries];
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) {
        const problem = await check(browser, base, entry, watch);
        if (problem) bad.push(problem);
        process.stderr.write(`${problem ? "FAIL" : "ok  "} ${entry.id}\n`);
      }
    }));
  } finally {
    await browser.close();
    server?.close();
  }
  if (bad.length) {
    process.stdout.write(`\ndocs-scroll: ${bad.length} of ${entries.length} docs entries scrolled by themselves\n${bad.sort().join("\n")}\n`);
    return 1;
  }
  process.stdout.write(`docs-scroll: ${entries.length} docs entries, scrollY stayed 0 for ${watch}ms\n`);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (error) => { process.stderr.write(`docs-scroll: crashed: ${error.stack ?? error}\n`); process.exitCode = 2; },
);

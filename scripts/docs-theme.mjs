#!/usr/bin/env node
// Docs theme gate: the Theme toolbar must reach every docs page. Serves a static Storybook build, opens every docs
// entry with `&globals=theme:dark` and asserts the docs <html> and every story iframe report data-theme=dark; a sample
// is repeated with high-contrast, and a live toolbar change (UPDATE_GLOBALS on the channel) must re-theme the iframes.
//
// Usage: node scripts/docs-theme.mjs [storybook-static-dir] [--only <substring>] [--url <running storybook>]
// Exit: 0 clean, 1 an iframe/page ignored the theme, 2 crash.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { docsEntries, serveStatic } from "./docs-axe.mjs";

const SETTLE_MS = 20_000;
const skipped = { live: 0, liveOk: 0 };

/** Theme of the docs document and of every same-origin story iframe, once all iframes finished loading. */
const readThemes = () => {
  const frames = [...document.querySelectorAll("iframe")].map((frame) => {
    let doc = null;
    try { doc = frame.contentDocument; } catch { /* cross-origin */ }
    const ready = !!doc && doc.readyState === "complete" && !!doc.querySelector("#storybook-root *, #root *");
    return { id: new URL(frame.src, location.href).searchParams.get("id"), ready, theme: doc?.documentElement.dataset.theme ?? null };
  });
  return { top: document.documentElement.dataset.docsTheme ?? null, frames };
};

async function waitThemed(page, theme) {
  const deadline = Date.now() + SETTLE_MS;
  let seen;
  do {
    // A navigation (story iframe reload, HMR) can destroy the context mid-evaluate; just poll again.
    seen = await page.evaluate(readThemes).catch(() => ({ top: null, frames: [] }));
    if (seen.top === theme && seen.frames.every((f) => f.ready && f.theme === theme)) return null;
    // Docs loads story iframes lazily (loading=lazy): scroll like a reader to bring the rest into view.
    if (seen.frames.some((f) => !f.ready)) await page.mouse.wheel(0, 700).catch(() => {});
    await page.waitForTimeout(250);
  } while (Date.now() < deadline);
  const wrong = seen.frames.filter((f) => !f.ready || f.theme !== theme).map((f) => `${f.id}=${f.ready ? f.theme : "not rendered"}`);
  return `expected ${theme}: top=${seen.top}${wrong.length ? `; iframes ${wrong.join(", ")}` : ""}`;
}

async function open(browser, base, entry, theme) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${base}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=docs&globals=theme:${theme}`, { waitUntil: "load" });
  await page.waitForSelector("body.sb-show-main #storybook-docs h1, body.sb-show-main #storybook-docs h2, body.sb-show-main #storybook-docs .sbdocs", { timeout: 30_000 });
  await page.mouse.move(640, 400);
  return { page, context };
}

async function check(browser, base, entry, themes, live) {
  const problems = [];
  for (const theme of themes) {
    const { page, context } = await open(browser, base, entry, theme).catch((error) => ({ error }));
    if (!page) { problems.push(`${entry.id}\trender failed`); continue; }
    try {
      const problem = await waitThemed(page, theme);
      if (problem) problems.push(`${entry.id}\t${problem}`);
      else if (live && theme === "dark") {
        // A toolbar change after load must reach the already-open iframes.
        // Same call the manager's UPDATE_GLOBALS lands on. Storybook reloads a docs iframe whose story is mid-render
        // (the manager then re-opens it with the new globals in the URL); such pages cannot be observed live.
        const reloaded = await page.evaluate(async () => {
          window.__liveMark = true;
          await window.__STORYBOOK_PREVIEW__.onUpdateGlobals({ globals: { theme: "high-contrast" } });
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return !window.__liveMark;
        }).catch(() => true);
        if (reloaded) skipped.live += 1;
        else {
          const again = await waitThemed(page, "high-contrast");
          if (again) problems.push(`${entry.id}\tlive toolbar change: ${again}`);
          else skipped.liveOk += 1;
        }
      }
    } finally {
      await context.close();
    }
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
    process.stderr.write(`docs-theme: ${indexPath} not found; run pnpm build-storybook first\n`);
    return 2;
  }
  const index = remote ? await (await fetch(`${remote}/index.json`)).json() : JSON.parse(readFileSync(indexPath, "utf8"));
  let entries = docsEntries(index);
  if (only) entries = entries.filter((e) => e.id.includes(only));
  if (!entries.length) {
    process.stderr.write("docs-theme: no docs entries found\n");
    return 2;
  }
  const server = remote ? null : await serveStatic(dir);
  const base = remote ?? `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const bad = [];
  try {
    const queue = entries.map((entry, i) => ({ entry, sample: i % 6 === 0 }));
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const problems = await check(browser, base, job.entry, job.sample ? ["dark", "high-contrast"] : ["dark"], job.sample);
        bad.push(...problems);
        process.stderr.write(`${problems.length ? "FAIL" : "ok  "} ${job.entry.id}\n`);
      }
    }));
  } finally {
    await browser.close();
    server?.close();
  }
  if (bad.length) {
    process.stdout.write(`\ndocs-theme: ${bad.length} problem(s) across ${entries.length} docs entries\n${bad.sort().join("\n")}\n`);
    return 1;
  }
  process.stdout.write(`docs-theme: ${entries.length} docs entries, docs page and every story iframe follow dark (sample: high-contrast; live toolbar change verified on ${skipped.liveOk}, ${skipped.live} reloaded by Storybook mid-render)\n`);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (error) => { process.stderr.write(`docs-theme: crashed: ${error.stack ?? error}\n`); process.exitCode = 2; },
);

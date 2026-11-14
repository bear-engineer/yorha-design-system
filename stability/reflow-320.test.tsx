import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { mountStory } from "./mount";

/**
 * WCAG 1.4.10 Reflow: at 320 CSS px no story may need page-level horizontal scrolling. Content that scrolls inside
 * its own overflow container (tables, scroll-area) is allowed; position:fixed content is skipped.
 * Covers every `States` and `Default` story of ui, layout and blocks items.
 */
const modules = import.meta.glob<Record<string, unknown>>(
  [
    "../registry/yorha/ui/*/*.stories.tsx",
    "../registry/yorha/layout/*/*.stories.tsx",
    "../registry/yorha/blocks/*/*.stories.tsx",
  ],
  { eager: true },
);

const WIDTH = 320;
/** Items the review flagged at 320px: every story, not only States/Default. */
const ALL_STORIES = new Set(["app-shell", "form", "icon-button"]);

beforeEach(async () => {
  await page.viewport(WIDTH, 700);
});
afterEach(async () => {
  await page.viewport(1280, 800);
});

/** Elements poking out of the viewport that no scrolling/clipping ancestor (itself inside the viewport) contains. */
function overflowing(root: HTMLElement): string[] {
  const iw = document.documentElement.clientWidth;
  const out: string[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || (r.right <= iw + 1 && r.left >= -1)) continue;
    let p = el.parentElement;
    let contained = false;
    while (p && p !== root.parentElement) {
      if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) {
        const pr = p.getBoundingClientRect();
        if (pr.right <= iw + 1 && pr.left >= -1) {
          contained = true;
          break;
        }
      }
      p = p.parentElement;
    }
    if (!contained) out.push(`${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className ? "." + el.className.split(" ").slice(0, 2).join(".") : ""} [${Math.round(r.left)}..${Math.round(r.right)}]`);
  }
  return out;
}

/** Entry staggers/transitions are motion, not layout: measure the resting layout. */
async function settle() {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await Promise.allSettled(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)).map((a) => a.finished));
  }
}

describe(`reflow at ${WIDTH}px: no page-level horizontal scroll`, () => {
  for (const [path, mod] of Object.entries(modules as Record<string, Record<string, unknown>>)) {
    const item = path.split("/").at(-2)!;
    const names = ["States", "Default", ...(ALL_STORIES.has(item) ? Object.keys(mod).filter((k) => k !== "default") : [])];
    for (const name of new Set(names)) {
      if (!mod[name]) continue;
      test(`${item} / ${name}`, { timeout: 30_000 }, async () => {
        const root = await mountStory(item, name);
        expect(document.documentElement.clientWidth, "viewport did not shrink").toBeLessThanOrEqual(WIDTH);
        await settle();
        const off = overflowing(root.parentElement!);
        expect(off.slice(0, 4), `${item}/${name}: elements wider than ${WIDTH}px outside a scroll container`).toEqual([]);
      });
    }
  }
});

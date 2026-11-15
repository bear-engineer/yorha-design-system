import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { mountStory, frames } from "./mount";
const src = import.meta.glob<string>(["../registry/yorha/ui/drawer/drawer.tsx", "../registry/yorha/ui/select/select.tsx"], { query: "?raw", import: "default", eager: true });
const drawerSrc = src["../registry/yorha/ui/drawer/drawer.tsx"]!;
const selectSrc = src["../registry/yorha/ui/select/select.tsx"]!;

/**
 * v4 detail-d geometry: timeline fit hero, yorha-scroll scrollers, prose measure, 360 reflow of the docs-heavy Themes stories.
 * Written after the code (the batch was finished by a second worker), so there is no RED commit for these.
 */
const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];

afterEach(async () => {
  await page.viewport(1280, 800);
});

async function mountTl(name: string) {
  const root = await mountStory("timeline", name, { stage: "top" });
  const deco = root.firstElementChild as HTMLElement | null;
  if (deco) deco.style.width = "min(100vw, 56rem)";
  await frames(8);
  return root;
}

const hasScrollbarRule = (el: Element) => getComputedStyle(el, "::-webkit-scrollbar").width === "10px" || getComputedStyle(el).scrollbarColor.includes("rgb");

describe("timeline fit hero", () => {
  for (const width of [1280, 360]) {
    test(`Default fits the frame and no tick label ellipsizes at ${width}`, async () => {
      await page.viewport(width, 800);
      const root = await mountTl("Default");
      const sc = q(root, "[data-part='scroller']");
      expect(sc.scrollWidth).toBeLessThanOrEqual(sc.clientWidth + 1);
      const labels = qa(root, "[data-part='tick-label']");
      expect(labels.length).toBeGreaterThan(0);
      for (const l of labels) expect(l.scrollWidth, `tick label "${l.textContent}"`).toBeLessThanOrEqual(l.clientWidth);
    });
  }
  test("timeline scroller carries yorha-scroll", async () => {
    const root = await mountTl("Default");
    expect(hasScrollbarRule(q(root, "[data-part='scroller']"))).toBe(true);
  });
});

describe("yorha-scroll on scrollers", () => {
  test("kanban column list and board", async () => {
    const root = await mountStory("kanban", "Default", { stage: "top" });
    const lists = qa(root, ".yorha-scroll");
    expect(lists.length).toBeGreaterThanOrEqual(2);
    for (const el of lists) expect(hasScrollbarRule(el)).toBe(true);
  });
  test("drawer body and select list use yorha-scroll (source)", () => {
    expect(drawerSrc).toMatch(/body: "yorha-scroll /);
    expect(selectSrc).toMatch(/data-slot="select-list" className="yorha-scroll /);
  });
});

describe("prose measure", () => {
  test("ko paragraphs are held to 38em", async () => {
    const root = await mountStory("prose", "Korean", { stage: "top" });
    const prose = q(root, ".yorha-prose");
    const fs = parseFloat(getComputedStyle(prose).fontSize);
    expect(prose.getBoundingClientRect().width / fs).toBeLessThanOrEqual(38 + 0.01);
  });
});

describe("360 reflow: no document horizontal scroll", () => {
  for (const item of ["accordion", "tabs", "scroll-area"]) {
    test(`${item} Themes`, async () => {
      await page.viewport(360, 800);
      await mountStory(item, "Themes", { stage: "top" });
      await frames(4);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth + 1);
    });
  }
});

import { createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { composeStory, setProjectAnnotations } from "@storybook/react-vite";
import * as previewAnnotations from "../.storybook/preview";
import "../src/styles/storybook.css";

// Storybook project annotations (decorators, globals) apply to composed stories.
setProjectAnnotations([previewAnnotations]);

// WCAG 1.4.12 text spacing: line-height 1.5, paragraph spacing 2em, letter-spacing 0.12em, word-spacing 0.16em.
// Applied to every element so Tailwind tracking/leading utilities cannot win; paragraph-like blocks get 2em after.
const SPACING_CSS = `
*,*::before,*::after{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important;}
p,li,dd,dt,blockquote{margin-bottom:2em!important;}
*,*::before,*::after{animation:none!important;transition:none!important;}
`;

type StoryModule = Record<string, unknown> & { default: Record<string, unknown> };
const modules = import.meta.glob<StoryModule>("../registry/yorha/{ui,layout}/*/*.stories.tsx", { eager: true });

// Representative stories. `dir` is the item folder under registry/yorha; `story` is the named export.
const REPRESENTATIVE: readonly { dir: string; story: string }[] = [
  { dir: "ui/button", story: "Default" },
  { dir: "ui/field", story: "Default" },
  { dir: "ui/text-field", story: "Default" },
  { dir: "ui/select", story: "Default" },
  { dir: "ui/tabs", story: "Default" },
  { dir: "ui/card", story: "Default" },
  { dir: "ui/chip", story: "Default" },
  { dir: "ui/badge", story: "Neutral" },
  { dir: "ui/data-table", story: "Default" },
  { dir: "layout/page-header", story: "Default" },
  { dir: "ui/prose", story: "Korean" },
  { dir: "ui/text", story: "Default" },
  { dir: "layout/bento", story: "Presets" },
  { dir: "ui/dialog", story: "Themes" },
  { dir: "ui/menu-list", story: "Default" },
  // A1 items (calendar, timeline, kanban, date/file inputs)
  { dir: "ui/calendar", story: "Default" },
  { dir: "ui/timeline", story: "Default" },
  { dir: "ui/kanban", story: "Default" },
  { dir: "ui/date-input", story: "Default" },
  { dir: "ui/file-input", story: "Default" },
];

const ITEMS = REPRESENTATIVE.map(({ dir, story }) => {
  const mod = modules[`../registry/yorha/${dir}/${dir.split("/").at(-1)}.stories.tsx`];
  if (!mod) throw new Error(`stories file not found for ${dir}`);
  const storyObj = mod[story];
  if (!storyObj) throw new Error(`story ${story} not found in ${dir}`);
  return { id: dir, meta: mod.default, story: storyObj as Record<string, unknown> };
});

export interface Clipped {
  el: string;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Elements with overflow hidden/clip whose content does not fit. Exempt: elements with a title attribute,
 * elements containing an sr-only full-text fallback, and visually hidden helpers (≤1px box).
 */
export function findClipped(root: HTMLElement): Clipped[] {
  const out: Clipped[] = [];
  for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    const cs = getComputedStyle(el);
    if (![cs.overflowX, cs.overflowY].some((v) => v === "hidden" || v === "clip")) continue;
    if (el.hasAttribute("title")) continue;
    if (el.querySelector(".sr-only,[class*='sr-only']")) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) continue;
    const { scrollWidth, clientWidth, scrollHeight, clientHeight } = el;
    if (scrollWidth > clientWidth + 1 || scrollHeight > clientHeight + 1) {
      const label = `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")} "${(el.textContent ?? "").trim().slice(0, 30)}"`;
      out.push({ el: label, scrollWidth, clientWidth, scrollHeight, clientHeight });
    }
  }
  return out;
}

const mounted: { root: Root; container: HTMLElement; style: HTMLStyleElement }[] = [];

afterEach(() => {
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.container.remove();
    m.style.remove();
  }
});

const nextFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

async function renderWithSpacing(meta: Record<string, unknown>, story: Record<string, unknown>): Promise<Clipped[]> {
  const composed = composeStory({ ...story, globals: { theme: "light", motion: "off", density: "comfortable" } }, meta as never);
  const Story = composed as unknown as ComponentType;

  // Spacing is injected before mount so layout is computed with it.
  const style = document.createElement("style");
  style.textContent = SPACING_CSS;
  document.head.append(style);

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container, style });
  // lang="ko": Storybook has no <html lang>; text leading and wrapping depend on it.
  root.render(createElement("div", { lang: "ko" }, createElement(Story)));

  await nextFrames();
  await document.fonts.ready;
  await nextFrames();
  const wrapper = container.firstElementChild as HTMLElement;
  // Guard against a vacuous pass: the story must render, and the injected spacing must be in effect.
  const first = wrapper.querySelector<HTMLElement>("*");
  expect(first, "story rendered no DOM").not.toBeNull();
  expect(getComputedStyle(first!).letterSpacing, "spacing not applied").not.toBe("normal");
  return findClipped(wrapper);
}

describe("detector self-check", () => {
  test("flags an overflow-hidden box whose text is cut off", () => {
    const host = document.createElement("div");
    host.innerHTML = `<div style="width:80px;height:20px;overflow:hidden"><span style="white-space:nowrap">잘림 테스트 문장입니다 길게 길게 길게</span></div>`;
    document.body.append(host);
    try {
      expect(findClipped(host)).toHaveLength(1);
    } finally {
      host.remove();
    }
  });

  test("exempts a clipped box with a title or an sr-only full-text fallback", () => {
    const host = document.createElement("div");
    host.innerHTML = `
      <div title="전체 문장" style="width:80px;height:20px;overflow:hidden"><span style="white-space:nowrap">잘림 테스트 문장입니다 길게 길게</span></div>
      <div style="width:80px;height:20px;overflow:hidden"><span class="sr-only">전체 문장 대체 텍스트 길게 길게 길게 길게</span><span aria-hidden="true" style="white-space:nowrap">잘림 테스트 문장입니다 길게 길게</span></div>`;
    document.body.append(host);
    try {
      expect(findClipped(host)).toEqual([]);
    } finally {
      host.remove();
    }
  });
});

describe("WCAG 1.4.12 text spacing: no clipped text in representative stories", () => {
  for (const item of ITEMS) {
    test(item.id, async () => {
      const clipped = await renderWithSpacing(item.meta, item.story);
      expect(clipped, `clipped elements: ${JSON.stringify(clipped)}`).toEqual([]);
    });
  }
});

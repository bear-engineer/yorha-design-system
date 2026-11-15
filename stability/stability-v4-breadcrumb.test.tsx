import { createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import "../src/styles/storybook.css";
import { animationsFinished, frames } from "./mount";
import { Breadcrumb, type BreadcrumbItem } from "../registry/yorha/layout/breadcrumb/breadcrumb";
import { Sidebar } from "../registry/yorha/layout/sidebar/sidebar";

/** v4 breadcrumb craft pass: ring never touches separators, fixed separator cells, hover moves nothing, collapse menu, sidebar width contract. */

const r = (el: Element) => el.getBoundingClientRect();
const mounted: Array<() => void> = [];
afterEach(() => {
  for (const un of mounted.splice(0)) un();
});
function render(node: ReactNode, style = "padding:24px"): HTMLElement {
  const container = document.createElement("div");
  container.style.cssText = style;
  document.body.append(container);
  const router = createMemoryRouter([{ path: "*", element: node }], { initialEntries: ["/"] });
  const root = createRoot(container);
  root.render(createElement(RouterProvider, { router }));
  mounted.push(() => {
    root.unmount();
    container.remove();
  });
  return container;
}
async function mount(node: ReactNode, style?: string): Promise<HTMLElement> {
  const c = render(node, style);
  await frames(4);
  return c;
}
const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
const px = (v: string) => parseFloat(v) || 0;
const intersects = (a: DOMRect | { left: number; right: number; top: number; bottom: number }, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const ITEMS: BreadcrumbItem[] = [{ label: "홈", to: "/" }, { label: "유닛", to: "/units" }, { label: "A-2 기체" }];
const DEEP: BreadcrumbItem[] = [
  { label: "홈", to: "/" },
  { label: "유닛", to: "/units" },
  { label: "2B 계열", to: "/units/2b" },
  { label: "정비 기록", to: "/units/2b/logs" },
  { label: "2026-11 점검", to: "/units/2b/logs/2026-11" },
  { label: "A-2 기체" },
];

describe("breadcrumb detail", () => {
  test("keyboard focus ring (label box + width + offset) never intersects a separator and keeps >= 2px clearance", async () => {
    const root = await mount(createElement(Breadcrumb, { items: ITEMS }));
    await animationsFinished();
    expect(qa(root, "nav a")).toHaveLength(2);
    for (const link of qa(root, "nav a")) {
      link.blur();
      await userEvent.keyboard("{Tab}");
      expect(document.activeElement).toBe(link);
      await frames(2);
      const label = q(link, '[data-slot="breadcrumb-label"]');
      const cs = getComputedStyle(label);
      expect(cs.outlineStyle).toBe("solid");
      const grow = px(cs.outlineWidth) + px(cs.outlineOffset);
      const b = r(label);
      const ring = { left: b.left - grow, right: b.right + grow, top: b.top - grow, bottom: b.bottom + grow };
      for (const sep of qa(root, '[data-slot="breadcrumb-separator"]')) {
        const s = r(sep);
        expect(intersects(ring, s), `ring ${JSON.stringify(ring)} vs separator ${JSON.stringify(s)}`).toBe(false);
        const gap = Math.max(s.left - ring.right, ring.left - s.right);
        if (Math.abs(s.top - ring.top) < 40) expect(gap, "clearance").toBeGreaterThanOrEqual(2);
      }
      expect(getComputedStyle(link).outlineStyle, "the link itself draws no box").not.toBe("solid");
    }
  });

  test("every separator is the same fixed 12x12 integer cell and gaps to the labels are equal", async () => {
    const root = await mount(createElement(Breadcrumb, { items: DEEP, maxItems: 99 }));
    await animationsFinished();
    const seps = qa(root, '[data-slot="breadcrumb-separator"]');
    expect(seps).toHaveLength(5);
    for (const s of seps) {
      expect(r(s).width).toBe(12);
      expect(r(s).height).toBe(12);
    }
    const lis = qa(root, "li");
    const range = (el: Element) => {
      const g = document.createRange();
      g.selectNodeContents(el);
      return g.getBoundingClientRect();
    };
    const gaps: number[] = [];
    lis.forEach((li, i) => {
      if (i === 0) return;
      const sep = q(li, '[data-slot="breadcrumb-separator"]');
      const item = [...li.children].find((c) => c !== sep)!;
      const prevItem = [...lis[i - 1]!.children].find((c) => c.getAttribute("data-slot") !== "breadcrumb-separator")!;
      if (r(sep).top === r(prevItem).top || Math.abs(r(sep).top - r(prevItem).top) < 20) gaps.push(r(sep).left - range(prevItem.querySelector('[data-slot="breadcrumb-label"]') ?? prevItem).right);
      void item;
    });
    expect(Math.max(...gaps) - Math.min(...gaps), `gaps ${gaps.join(",")}`).toBeLessThanOrEqual(0.5);
  });

  test("hover changes no rect: items, labels, separators keep their boxes", async () => {
    const root = await mount(createElement(Breadcrumb, { items: ITEMS }));
    await animationsFinished();
    const boxes = () => qa(root, "li, li > *, li a > span").map((e) => JSON.stringify(r(e)));
    const before = boxes();
    await userEvent.hover(q(root, "nav a"));
    await animationsFinished();
    await frames(2);
    expect(boxes()).toEqual(before);
    const label = q(q(root, "nav a"), '[data-slot="breadcrumb-label"]');
    expect(getComputedStyle(label).backgroundSize, "ink filled on hover").toContain("100%");
  });

  test("current page: aria-current on the last item, diamond mark, not a link", async () => {
    const root = await mount(createElement(Breadcrumb, { items: ITEMS }));
    const cur = qa(root, '[aria-current="page"]');
    expect(cur).toHaveLength(1);
    expect(cur[0]!.textContent).toBe("A-2 기체");
    expect(cur[0]!.closest("a")).toBeNull();
    expect(cur[0]!.querySelector('[data-glyph="diamond"]')).not.toBeNull();
  });

  test("overflow: middle levels collapse into a menu reachable by keyboard that lists the hidden levels", async () => {
    const root = await mount(createElement(Breadcrumb, { items: DEEP }));
    await animationsFinished();
    expect(qa(root, "nav li")).toHaveLength(4);
    const more = q(root, '[data-slot="breadcrumb-more"]');
    expect(more.getAttribute("aria-label")).toBe("숨겨진 경로 3개 보기");
    expect(r(more).width).toBeGreaterThanOrEqual(24);
    expect(r(more).height).toBeGreaterThanOrEqual(24);
    more.focus();
    await userEvent.keyboard("{Enter}");
    await frames(3);
    const menu = document.querySelector('[role="menu"]')!;
    expect(menu).not.toBeNull();
    const names = qa(menu, '[role="menuitem"]').map((m) => m.textContent);
    expect(names).toEqual(["유닛", "2B 계열", "정비 기록"]);
    await userEvent.keyboard("{Escape}");
    await animationsFinished();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(more);
  });

  test("truncation: a long label ellipsizes visually, the link keeps the full accessible name and title", async () => {
    const long = "비공식 팬 프로젝트 유닛 운용 기록 보관소 및 정기 점검 일정 관리";
    const root = await mount(createElement(Breadcrumb, { items: [{ label: "홈", to: "/" }, { label: long, to: "/units" }, { label: "A-2 기체" }] }));
    await animationsFinished();
    const link = qa(root, "nav a")[1]!;
    expect(link.getAttribute("title")).toBe(long);
    expect(link.textContent).toBe(long);
    const label = q(link, '[data-slot="breadcrumb-label"]');
    expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    expect(r(label).width).toBeLessThanOrEqual(24 * 16 + 1);
    expect(r(link).height).toBe(24);
  });
});

describe("sidebar width contract and nav rows", () => {
  const sections = [{ id: "a", title: "작전", items: [{ to: "/", label: "홈", end: true }, { to: "/units", label: "유닛" }] }];
  const frame = (collapsible = false, defaultCollapsed = false) =>
    mount(createElement(Sidebar, { sections, collapsible, defaultCollapsed, header: "헤더", footer: "푸터" }), "display:flex;width:1280px;height:600px");

  test("256px in a 1280 container, 64px rail when collapsed; the right rule spans the full container height; it does not grow", async () => {
    const root = await frame();
    await animationsFinished();
    const nav = q(root, "nav");
    expect(r(nav).width).toBe(256);
    expect(r(nav).height).toBe(600);
    expect(getComputedStyle(nav).borderRightWidth).toBe("1px");
    expect(r(nav).bottom - r(root).top).toBe(600);
    const rail = await frame(true, true);
    await animationsFinished();
    expect(r(q(rail, "nav")).width).toBe(64);
  });

  test("current row band spans the sidebar body's inner width; rows are the row token tall", async () => {
    const root = await frame();
    await animationsFinished();
    const cur = q(root, 'a[aria-current="page"]');
    const stack = q(root, '[data-slot="sidebar-body"] > div');
    const cs = getComputedStyle(stack);
    const inner = r(stack).width - px(cs.paddingLeft) - px(cs.paddingRight);
    expect(r(cur).width).toBe(inner);
    expect(getComputedStyle(cur).backgroundSize).toContain("100%");
    expect(getComputedStyle(cur).borderTopColor, "no seam rule on the ink band").toBe("rgba(0, 0, 0, 0)");
    expect(r(cur).height).toBe(32);
  });

  test("row focus ring is inset: ring box stays inside the row, so it never overlaps a neighbour or the scroll edge", async () => {
    const root = await frame();
    await animationsFinished();
    const links = qa(root, "nav a");
    links[0]!.blur();
    await userEvent.keyboard("{Tab}");
    await frames(2);
    const focused = document.activeElement as HTMLElement;
    expect(links).toContain(focused);
    const cs = getComputedStyle(focused);
    expect(cs.outlineStyle).toBe("solid");
    expect(px(cs.outlineOffset)).toBeLessThanOrEqual(-px(cs.outlineWidth));
    const grow = px(cs.outlineWidth) + px(cs.outlineOffset);
    expect(grow).toBeLessThanOrEqual(0);
    for (const other of links.filter((l) => l !== focused)) expect(intersects({ left: r(focused).left - grow, right: r(focused).right + grow, top: r(focused).top - grow, bottom: r(focused).bottom + grow }, r(other))).toBe(false);
  });

  test("marker is a 12px glyph cell with the same box in every state; Hangul rows carry no letter-spacing", async () => {
    const root = await frame();
    await animationsFinished();
    const marks = qa(root, '[data-slot="nav-link-marker"]');
    expect(marks.length).toBe(2);
    for (const m of marks) {
      expect(r(m).width).toBe(12);
      expect(r(m).height).toBe(12);
    }
    expect(r(marks[0]!).left).toBe(r(marks[1]!).left);
    expect(getComputedStyle(q(root, "nav a")).textTransform).toBe("none");
  });
});

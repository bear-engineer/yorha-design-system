import { createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import "../src/styles/storybook.css";
import { frames } from "./mount";
import { Menubar, MenubarMenu, MenubarTrigger } from "../registry/yorha/ui/menubar/menubar";
import { Toolbar, ToolbarButton, ToolbarInput, ToolbarLink, ToolbarToggle } from "../registry/yorha/ui/toolbar/toolbar";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger, NavigationMenuContent } from "../registry/yorha/ui/navigation-menu/navigation-menu";

/**
 * v4 detail pass A. Ring rule: segmented / stacked items (no gap) draw the inset ring; free-standing controls with >= 4px
 * clearance draw the outset ring. The ring box never intersects a neighbour.
 */

const mounted: Array<() => void> = [];
afterEach(() => {
  for (const un of mounted.splice(0)) un();
});
async function mount(node: ReactNode): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.style.cssText = "padding:24px;width:720px";
  document.body.append(container);
  const root = createRoot(container);
  root.render(node);
  mounted.push(() => {
    root.unmount();
    container.remove();
  });
  await frames(4);
  return container;
}
const offset = (el: Element) => parseFloat(getComputedStyle(el).outlineOffset);
const box = (el: Element) => el.getBoundingClientRect();
/** Outline box: the border box grown by the outline offset + width. */
function ringBox(el: Element) {
  const cs = getComputedStyle(el);
  const grow = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth);
  const b = box(el);
  return { left: b.left - grow, right: b.right + grow, top: b.top - grow, bottom: b.bottom + grow };
}
const hits = (a: { left: number; right: number; top: number; bottom: number }, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe("detail-a: ring rule on stacked bars", () => {
  test("Menubar triggers: inset ring, never over a neighbour", async () => {
    const c = await mount(
      createElement(
        Menubar,
        { "aria-label": "앱 메뉴" },
        ...["파일", "보기", "도움말"].map((n) => createElement(MenubarMenu, { key: n }, createElement(MenubarTrigger, null, n))),
      ),
    );
    await userEvent.tab();
    const items = [...c.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const focused = items.find((i) => i === document.activeElement)!;
    expect(focused).toBeTruthy();
    expect(offset(focused)).toBeLessThan(0);
    for (const o of items.filter((i) => i !== focused)) expect(hits(ringBox(focused), box(o))).toBe(false);
  });

  test("NavigationMenu triggers: inset ring", async () => {
    const c = await mount(
      createElement(
        NavigationMenu,
        { "aria-label": "주 메뉴" },
        createElement(
          NavigationMenuList,
          null,
          ...["유닛", "기록"].map((n) =>
            createElement(NavigationMenuItem, { key: n }, createElement(NavigationMenuTrigger, null, n), createElement(NavigationMenuContent, null, "패널")),
          ),
        ),
      ),
    );
    await userEvent.tab();
    const t = c.querySelector<HTMLElement>("button")!;
    expect(document.activeElement).toBe(t);
    expect(offset(t)).toBeLessThan(0);
  });

  test("Toolbar link and input: inset ring", async () => {
    const c = await mount(
      createElement(
        Toolbar,
        { "aria-label": "편집 도구" },
        createElement(ToolbarToggle, { value: "b", "aria-label": "굵게" }, "B"),
        createElement(ToolbarButton, null, "저장"),
        createElement(ToolbarLink, { href: "#h" }, "도움말"),
        createElement(ToolbarInput, { "aria-label": "검색" }),
      ),
    );
    const link = c.querySelector<HTMLElement>("a")!;
    const input = c.querySelector<HTMLElement>("input")!;
    link.focus({ focusVisible: true } as FocusOptions);
    await userEvent.keyboard("{Shift>}{/Shift}");
    expect(offset(link)).toBeLessThan(0);
    input.focus({ focusVisible: true } as FocusOptions);
    expect(offset(input)).toBeLessThan(0);
  });
});

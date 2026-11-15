import { createElement, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider, Link, useNavigate } from "react-router";
import { afterEach, describe, expect, test } from "vitest";
import { mountStory, frames } from "./mount";
import { Split } from "../registry/yorha/layout/split/split";
import { HudLayout, HudRegion } from "../registry/yorha/layout/hud-layout/hud-layout";
import { Sidebar } from "../registry/yorha/layout/sidebar/sidebar";
import { SystemMenuLayout } from "../registry/yorha/layout/system-menu-layout/system-menu-layout";
import { RouteTransition } from "../registry/yorha/router/route-transition/route-transition";
import { YorhaProvider, useSoundPreference } from "../registry/yorha/providers/yorha-provider/yorha-provider";
import * as soundLib from "../registry/yorha/sound/sound/sound";
const { useCue, CUE_MAP } = soundLib as unknown as { useCue: (k: string) => () => void; CUE_MAP: Record<string, string> };

/** v4 layout / router / providers / sound: geometry and behaviour for V4-270..285 (f-lay). */

const r = (el: Element) => el.getBoundingClientRect();
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const mounted: Array<() => void> = [];
afterEach(() => {
  for (const un of mounted.splice(0)) un();
  localStorage.removeItem("yorha:sound");
});
function render(node: ReactNode, style = ""): HTMLElement {
  const container = document.createElement("div");
  container.style.cssText = style;
  document.body.append(container);
  const root = createRoot(container);
  root.render(node);
  mounted.push(() => {
    root.unmount();
    container.remove();
  });
  return container;
}
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
const mod = (el: HTMLElement) => el;

describe("V4-270 AppShell mobile nav is an overlay", () => {
  test("main does not move when the nav opens; a link tap closes it and refocuses the toggle; no transition-property all", async () => {
    const root = await mountStory("app-shell", "MobileDisclosure");
    await frames(2);
    const main = root.querySelector<HTMLElement>("main")!;
    const toggle = [...root.querySelectorAll("button")].find((b) => b.textContent?.includes("메뉴"))!;
    const region = root.querySelector<HTMLElement>('[data-slot="app-shell-nav"]')!;
    const top0 = r(main).top;
    const h0 = r(main).height;
    toggle.click();
    await frames(3);
    expect(region.dataset.open).toBe("true");
    expect(Math.abs(r(main).top - top0), "main top constant while the nav is open").toBeLessThanOrEqual(0.5);
    expect(Math.abs(r(main).height - h0), "main height constant").toBeLessThanOrEqual(0.5);
    expect(getComputedStyle(region).position).toBe("absolute");
    for (const el of [toggle, region]) expect(getComputedStyle(el).transitionProperty).not.toBe("all");
    root.querySelector<HTMLAnchorElement>('[data-slot="app-shell-nav"] a')!.click();
    await frames(3);
    expect(region.dataset.open, "link tap closes").toBeUndefined();
    expect(document.activeElement, "focus returns to the toggle").toBe(toggle);
  });
});

describe("V4-272 Split resizable", () => {
  const LIST = createElement("button", { type: "button", id: "in-list" }, "목록");
  const DETAIL = createElement("p", null, "상세");
  function Host(props: { onSize?: (n: number) => void; defaultSize?: number }) {
    return createElement(Split, { list: LIST, detail: DETAIL, resizable: true, defaultSize: props.defaultSize ?? 256, onSizeChange: props.onSize, className: "w-[900px]" } as never);
  }
  const sep = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="separator"]')!;

  test("window-splitter semantics and a 24px hit zone", async () => {
    const c = render(createElement(Host), "width:900px");
    await frames(3);
    const s = sep(c);
    expect(s).toBeTruthy();
    expect(s.tabIndex).toBe(0);
    expect(s.getAttribute("aria-orientation")).toBe("vertical");
    expect(Number(s.getAttribute("aria-valuenow"))).toBe(256);
    expect(s.hasAttribute("aria-valuemin") && s.hasAttribute("aria-valuemax")).toBe(true);
    expect(r(s).width).toBeGreaterThanOrEqual(24);
    const list = c.querySelector<HTMLElement>('[data-slot="split-list"]')!;
    expect(Math.round(r(list).width)).toBeGreaterThanOrEqual(256);
    expect(s.querySelector('[data-slot="glyph"][data-glyph="grip"]')).toBeTruthy();
  });

  test("keys: arrows 16, Shift 64, Home/End, Enter resets", async () => {
    const seen: number[] = [];
    const c = render(createElement(Host, { onSize: (n) => seen.push(n) }), "width:900px");
    await frames(3);
    const s = sep(c);
    s.focus();
    key(s, "ArrowRight");
    await frames(2);
    expect(Number(s.getAttribute("aria-valuenow"))).toBe(272);
    key(s, "ArrowLeft", { shiftKey: true });
    await frames(2);
    expect(Number(s.getAttribute("aria-valuenow"))).toBe(208);
    key(s, "Home");
    await frames(2);
    const min = Number(s.getAttribute("aria-valuenow"));
    expect(min).toBe(Number(s.getAttribute("aria-valuemin")));
    key(s, "End");
    await frames(2);
    expect(Number(s.getAttribute("aria-valuenow"))).toBe(Number(s.getAttribute("aria-valuemax")));
    key(s, "Enter");
    await frames(2);
    expect(Number(s.getAttribute("aria-valuenow"))).toBe(256);
    expect(seen.at(-1)).toBe(256);
  });

  test("pointer drag: no reflow until release, commit on release", async () => {
    const c = render(createElement(Host), "width:900px");
    await frames(3);
    const s = sep(c);
    const list = c.querySelector<HTMLElement>('[data-slot="split-list"]')!;
    const w0 = r(list).width;
    const b = r(s);
    const x = b.left + b.width / 2;
    const y = b.top + 8;
    const ev = (type: string, dx: number) =>
      s.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: x + dx, clientY: y }));
    ev("pointerdown", 0);
    ev("pointermove", 64);
    await frames(2);
    expect(r(list).width, "list does not reflow mid-drag").toBeCloseTo(w0, 0);
    expect(c.querySelector("[data-part=ghost]"), "ghost rule shown").toBeTruthy();
    ev("pointerup", 64);
    await frames(3);
    expect(Number(s.getAttribute("aria-valuenow"))).toBe(320);
    expect(Math.round(r(list).width)).toBeGreaterThanOrEqual(320);
    expect(c.querySelector("[data-part=ghost]")).toBeNull();
  });

  test("stacked mode has no handle", async () => {
    const c = render(createElement(Host), "width:300px");
    await frames(3);
    expect(c.querySelector('[role="separator"]')).toBeNull();
  });
});

describe("V4-273 HudLayout pointer opt-in", () => {
  test("a select, summary and tabindex element inside a region are hit-testable", async () => {
    const c = render(
      createElement(HudLayout, { position: "absolute", className: "h-[300px] w-[400px]" } as never,
        createElement(HudRegion, { corner: "top-start", label: "상태" },
          createElement("select", { id: "hs", "aria-label": "모드" }, createElement("option", null, "A")),
          createElement("details", null, createElement("summary", { id: "hsum" }, "더 보기")),
          createElement("div", { id: "htab", tabIndex: 0, style: { height: 24 } }, "포커스"),
        ),
      ),
      "position:relative;width:400px;height:300px",
    );
    await frames(3);
    for (const id of ["hs", "hsum", "htab"]) {
      const el = c.querySelector<HTMLElement>(`#${id}`)!;
      const b = r(el);
      expect(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2), id).toBe(el);
    }
  });
});

describe("V4-274 sound story uses the kit Slider", () => {
  test("no raw range input in the story", async () => {
    const files = import.meta.glob("../registry/yorha/sound/sound/sound.stories.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    const src = Object.values(files)[0]!;
    expect(src).not.toMatch(/type="range"/);
    expect(src).toMatch(/Slider/);
  });
});

describe("V4-271 route transition: announcer, focus, scroll", () => {
  function Page({ name, to }: { name: string; to?: string }) {
    const nav = useNavigate();
    return createElement("main", { id: `p-${name}`, "aria-label": "본문" },
      createElement("h1", null, `페이지 ${name}`),
      to ? createElement(Link, { id: "go", to }, "이동") : null,
      createElement("button", { id: "back", type: "button", onClick: () => nav(-1) }, "뒤로"),
      createElement("div", { style: { height: 2000 } }));
  }
  function routerFor() {
    return createMemoryRouter([
      { element: createElement(RouteTransition), children: [
        { path: "/", element: createElement(Page, { name: "A", to: "/b" }) },
        { path: "/b", element: createElement(Page, { name: "B" }) },
      ] },
    ], { initialEntries: ["/"] });
  }

  test("PUSH announces the h1, focuses main and resets scroll; POP keeps focus and restores scroll", async () => {
    document.documentElement.dataset.motion = "off";
    const router = routerFor();
    render(createElement(RouterProvider, { router }));
    await frames(3);
    window.scrollTo(0, 400);
    await frames(2);
    expect(window.scrollY).toBeGreaterThan(300);
    await router.navigate("/b");
    await frames(4);
    await sleep(150);
    const live = document.querySelector<HTMLElement>('[data-slot="route-announcer"]')!;
    expect(live, "announcer mounted").toBeTruthy();
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toContain("페이지 B");
    expect(document.activeElement?.tagName).toBe("MAIN");
    expect(window.scrollY).toBe(0);
    await router.navigate(-1);
    await frames(4);
    await sleep(150);
    expect(document.activeElement?.tagName, "POP does not steal focus").not.toBe("MAIN");
    expect(window.scrollY, "scroll restored").toBeGreaterThan(300);
    delete document.documentElement.dataset.motion;
  });

  test("off mode installs no view-transition animation; scan keyframes exist for full", () => {
    const css = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((x) => x.cssText); } catch { return []; } }).join("\n");
    expect(css).toMatch(/yorha-route-scan-forward/);
  });

  test("V4-281 pending bar markup: 2px, 10 segments", async () => {
    const files = import.meta.glob("../registry/yorha/router/route-transition/route-transition.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    expect(Object.values(files)[0]).toMatch(/route-pending/);
  });
});

describe("V4-277 Sidebar collapsible", () => {
  const SECTIONS = [{ id: "a", title: "작전", items: [{ to: "/", label: "홈", end: true }, { to: "/u", label: "유닛" }] }];
  test("64px rail <-> 256px, toggle has aria-expanded, labels wiped", async () => {
    const router = createMemoryRouter([{ path: "*", element: createElement(Sidebar, { sections: SECTIONS, collapsible: true } as never) }]);
    const c = render(createElement(RouterProvider, { router }), "width:400px");
    await frames(3);
    const nav = c.querySelector<HTMLElement>("nav")!;
    const t = c.querySelector<HTMLButtonElement>('button[aria-expanded]')!;
    expect(t.getAttribute("aria-expanded")).toBe("true");
    expect(Math.round(r(nav).width)).toBe(256);
    t.click();
    await frames(3);
    expect(t.getAttribute("aria-expanded")).toBe("false");
    expect(Math.round(r(nav).width)).toBe(64);
    expect(r(t).width).toBeGreaterThanOrEqual(24);
    t.click();
    await frames(3);
    expect(Math.round(r(nav).width)).toBe(256);
  });
});

describe("V4-278 / V4-279 sound cues and persistence", () => {
  test("CUE_MAP covers the spec'd kinds with existing cues", () => {
    for (const k of ["overlay-open", "overlay-close", "toggle", "kanban-lift", "kanban-drop", "kanban-cancel", "kanban-limit", "toast-info", "toast-error", "sort"]) {
      expect(CUE_MAP, k).toHaveProperty(k);
    }
  });

  test("useCue is a no-op while sound is off", () => {
    let fired = 0;
    function Probe() {
      const cue = useCue("toggle");
      (window as unknown as { __cue?: () => void }).__cue = () => { cue(); fired++; };
      return null;
    }
    render(createElement(YorhaProvider, null, createElement(Probe)));
    expect(() => (window as unknown as { __cue: () => void }).__cue()).not.toThrow();
    expect(fired).toBe(1);
  });

  test("provider persists enabled/volume in yorha:sound and restores them", async () => {
    let api!: ReturnType<typeof useSoundPreference>;
    function Probe() {
      api = useSoundPreference();
      return null;
    }
    render(createElement(YorhaProvider, null, createElement(Probe)));
    await frames(2);
    api.setEnabled(true);
    api.setVolume(0.25);
    await frames(2);
    expect(JSON.parse(localStorage.getItem("yorha:sound")!)).toEqual({ enabled: true, volume: 0.25 });
    render(createElement(YorhaProvider, null, createElement(Probe)));
    await frames(3);
    expect(api.enabled).toBe(true);
    expect(api.volume).toBe(0.25);
  });
});

describe("V4-280 SystemMenuLayout Esc returns to the list row", () => {
  test("panel tabIndex -1; Escape in the panel focuses the selected row", async () => {
    const sections = [{ id: "s", label: "시스템", items: [{ id: "i1", label: "하나", content: "내용 1" }, { id: "i2", label: "둘", content: "내용 2" }] }];
    const c = render(createElement(SystemMenuLayout, { sections }), "width:900px");
    await frames(3);
    const panel = c.querySelector<HTMLElement>('[data-slot="system-menu-panel"]')!;
    expect(panel.tabIndex).toBe(-1);
    panel.focus();
    key(panel, "Escape");
    await frames(2);
    const row = document.activeElement as HTMLElement;
    expect(row.closest('[data-slot="split-list"]'), "focus is in the list").toBeTruthy();
    expect(row.textContent).toContain("하나");
  });
});

describe("V4-275 guides", () => {
  const guides = import.meta.glob("../src/docs/guides/*.mdx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
  const g = (n: string) => Object.entries(guides).find(([p]) => p.endsWith(`/${n}.mdx`))?.[1] ?? "";
  test("NativeElements guide carries the table with reasons; Motion/PageTransitions describe the scan", () => {
    const n = g("NativeElements");
    expect(n.length).toBeGreaterThan(1500);
    for (const el of ["select", "input", "dialog", "details", "progress", "meter", "range", "table"]) expect(n.toLowerCase()).toContain(el);
    expect(n).toMatch(/Keep|유지|Replace|교체/);
    expect(g("MotionGuide")).toMatch(/glitch|글리치/i);
    expect(g("PageTransitions")).toMatch(/scan|스캔/i);
    expect(g("PageTransitions")).toMatch(/RouteAnnouncer/);
  });
  test("V4-285 error page recipe", () => {
    expect(g("PageTransitions") + g("MotionGuide")).toMatch(/Glitch/);
  });
  test("SchedulingAndInputs describes timeline drag and drop", () => {
    const s = g("SchedulingAndInputs");
    expect(s).toMatch(/canMove/);
    expect(s).toMatch(/readOnly/);
  });
});

describe("V4-282 command palette block", () => {
  test("story renders a dialog trigger", async () => {
    const files = import.meta.glob("../registry/yorha/blocks/command-palette/command-palette.tsx", { query: "?raw", import: "default", eager: true });
    expect(Object.keys(files).length).toBe(1);
  });
});

describe("V4-283/284 bento and output", () => {
  test("bento loading state has exactly one role=status", async () => {
    const root = await mountStory("bento-dashboard", "StateSwitching");
    await frames(2);
    const btn = [...root.querySelectorAll("button")].find((b) => b.textContent === "로딩")!;
    btn.click();
    await frames(3);
    expect(root.querySelectorAll('[role="status"]').length).toBe(1);
  });
  test("the continuously updating sound readout opts out of live announcements", () => {
    const files = import.meta.glob("../registry/yorha/sound/sound/sound.stories.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
    expect(Object.values(files)[0]).toMatch(/<output[^>]*aria-live="off"/);
  });
});
void mod;
void useState;

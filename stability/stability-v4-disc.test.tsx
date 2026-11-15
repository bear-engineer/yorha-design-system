import { createElement as h } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // global css (tokens, utilities)
import { frames } from "./mount";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../registry/yorha/ui/tabs/tabs";
import { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionPanel } from "../registry/yorha/ui/accordion/accordion";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "../registry/yorha/ui/collapsible/collapsible";
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from "../registry/yorha/ui/scroll-area/scroll-area";

// v4 f-disc: V4-180 tabs overflow, V4-181 scroll-area cues + scroll-padding, V4-183 hiddenUntilFound.
// (V4-182 lives in stability-accordion.test.tsx: the height sampling there now reads getAnimations().)

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const x of hosts.splice(0)) x.remove();
});

async function mount(node: React.ReactNode, width = 320, motion = "off"): Promise<HTMLElement> {
  document.documentElement.dataset.motion = motion;
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:0;top:8px;width:${width}px;color:#000;background:#fff;`;
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return host;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LABELS = ["상태 개요", "유닛 목록", "임무 기록", "통신 로그", "보안 설정", "네트워크", "저장 장치", "전력 상태", "센서 배열", "정비 이력", "시스템 진단", "기타 항목"];
function manyTabs() {
  return h(
    Tabs,
    { defaultValue: "t0" },
    h(TabsList, { "aria-label": "많은 탭" }, ...LABELS.map((l, i) => h(TabsTab, { key: i, value: `t${i}` }, l))),
    ...LABELS.map((l, i) => h(TabsPanel, { key: i, value: `t${i}` }, `본문 ${l}`)),
  );
}

describe("V4-180 tabs overflow", () => {
  it("12 tabs at 320px: list scrolls, no label is clipped, tabs never shrink below their label", async () => {
    const host = await mount(manyTabs());
    const list = host.querySelector<HTMLElement>("[data-slot=tabs-list]")!;
    expect(getComputedStyle(list).overflowX).toBe("auto");
    expect(list.scrollWidth).toBeGreaterThan(list.clientWidth + 8);
    expect(getComputedStyle(list).backgroundAttachment).toContain("local"); // yorha-scroll-cue-x
    for (const tab of host.querySelectorAll<HTMLElement>("[data-slot=tabs-tab]")) {
      expect(tab.scrollWidth, `${tab.textContent} label clipped`).toBeLessThanOrEqual(tab.clientWidth + 0.5);
      expect(tab.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
    }
  });

  it("with room the tabs still share the strip equally (no regression for short lists)", async () => {
    const host = await mount(h(Tabs, { defaultValue: "a" }, h(TabsList, { "aria-label": "짧은" }, h(TabsTab, { value: "a" }, "상태"), h(TabsTab, { value: "b" }, "유닛"), h(TabsTab, { value: "c" }, "기록"))), 400);
    const list = host.querySelector<HTMLElement>("[data-slot=tabs-list]")!;
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const ws = [...host.querySelectorAll<HTMLElement>("[data-slot=tabs-tab]")].map((t) => t.getBoundingClientRect().width);
    expect(Math.max(...ws) - Math.min(...ws)).toBeLessThan(1);
  });

  it("the active tab scrolls into view (instant in off and reduced); the last tab is reachable; panel rect is constant", async () => {
    for (const motion of ["off", "reduced"]) {
      const host = await mount(manyTabs(), 320, motion);
      const list = host.querySelector<HTMLElement>("[data-slot=tabs-list]")!;
      const panelBefore = host.querySelector<HTMLElement>("[role=tabpanel]:not([hidden])")!.getBoundingClientRect();
      const tabs = [...host.querySelectorAll<HTMLElement>("[data-slot=tabs-tab]")];
      tabs[0]!.focus();
      await userEvent.keyboard("{End}");
      await frames(2); // instant: no smooth-scroll wait
      const last = tabs[tabs.length - 1]!;
      expect(last.getAttribute("aria-selected")).toBe("true");
      expect(list.scrollLeft, `${motion}: list did not scroll`).toBeGreaterThan(0);
      const lr = list.getBoundingClientRect();
      const r = last.getBoundingClientRect();
      expect(r.left, `${motion}: last tab left of list`).toBeGreaterThanOrEqual(lr.left - 0.5);
      expect(r.right, `${motion}: last tab right of list`).toBeLessThanOrEqual(lr.right + 0.5);
      // the indicator travels with the content (it is inside the scroller)
      const ind = host.querySelector<HTMLElement>("[data-slot=tabs-indicator]")!.getBoundingClientRect();
      await wait(50);
      expect(Math.abs(ind.left - r.left)).toBeLessThan(1.5);
      const panelAfter = host.querySelector<HTMLElement>("[role=tabpanel]:not([hidden])")!.getBoundingClientRect();
      expect(Math.abs(panelAfter.top - panelBefore.top)).toBeLessThan(0.5);
      expect(Math.abs(panelAfter.left - panelBefore.left)).toBeLessThan(0.5);
      await userEvent.keyboard("{Home}");
      await frames(2);
      expect(list.scrollLeft).toBeLessThan(1);
      for (const r2 of roots.splice(0)) r2.unmount();
      for (const x of hosts.splice(0)) x.remove();
    }
  });

  it("no vertical scroll or clipped indicator in the strip", async () => {
    const host = await mount(manyTabs());
    const list = host.querySelector<HTMLElement>("[data-slot=tabs-list]")!;
    expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight);
    const ind = host.querySelector<HTMLElement>("[data-slot=tabs-indicator]")!.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    expect(ind.bottom).toBeGreaterThanOrEqual(lr.bottom - 1.5);
  });
});

function scroller(opts: { x?: boolean } = {}) {
  const items = Array.from({ length: 24 }, (_, i) => h("button", { key: i, type: "button", "data-i": i, style: { display: "block", height: 28, width: opts.x ? 600 : "100%", margin: "4px 0" } }, `항목 ${i}`));
  return h(
    ScrollArea,
    { style: { height: 120, width: 240 } },
    h(ScrollAreaViewport, { "aria-label": "목록" }, h(ScrollAreaContent, null, ...items)),
    h(ScrollAreaScrollbar, { orientation: "vertical" }, h(ScrollAreaThumb)),
    opts.x ? h(ScrollAreaScrollbar, { orientation: "horizontal" }, h(ScrollAreaThumb)) : null,
  );
}

describe("V4-181 scroll-area cues and scroll-padding", () => {
  it("viewport carries the scroll cues (local + scroll gradient layers)", async () => {
    const host = await mount(scroller());
    const vp = host.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]")!;
    const cs = getComputedStyle(vp);
    expect(cs.backgroundAttachment).toContain("local");
    expect(cs.backgroundAttachment).toContain("scroll");
    expect(cs.backgroundImage).toContain("gradient");
  });

  it("both axes overflowing: the cue has x and y layers (8) instead of one utility overriding the other", async () => {
    const host = await mount(scroller({ x: true }), 240);
    const vp = host.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]")!;
    await frames(3);
    expect(vp.hasAttribute("data-has-overflow-x") && vp.hasAttribute("data-has-overflow-y")).toBe(true);
    expect(getComputedStyle(vp).backgroundAttachment.split(",").length).toBe(8);
  });

  it("scroll-padding: a focused child clears the viewport edge by more than its ring (top and bottom)", async () => {
    const host = await mount(scroller());
    const vp = host.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]")!;
    const pad = parseFloat(getComputedStyle(vp).scrollPaddingBottom);
    expect(pad).toBeGreaterThanOrEqual(5);
    const btn = (i: number) => host.querySelector<HTMLElement>(`[data-i="${i}"]`)!;
    btn(5).focus();
    await frames(3);
    let vr = vp.getBoundingClientRect();
    expect(vr.bottom - btn(5).getBoundingClientRect().bottom, "bottom ring under the bottom rule").toBeGreaterThanOrEqual(5);
    vp.scrollTop = vp.scrollHeight;
    await frames(2);
    btn(15).focus();

    await frames(3);
    vr = vp.getBoundingClientRect();
    expect(btn(15).getBoundingClientRect().top - vr.top, "top ring under the top rule").toBeGreaterThanOrEqual(5);
  });
});

function accordion(extra: Record<string, unknown> = {}) {
  return h(
    Accordion,
    { defaultValue: [] },
    h(AccordionItem, { value: "a" }, h(AccordionHeader, null, h(AccordionTrigger, null, "개요")), h(AccordionPanel, extra, "찾기 가능한 본문 텍스트")),
  );
}

describe("V4-183 hiddenUntilFound", () => {
  it("accordion: a closed panel is hidden=until-found, takes no height, and beforematch opens it", async () => {
    const host = await mount(accordion());
    const panel = host.querySelector<HTMLElement>("[data-slot=accordion-panel]")!;
    const trigger = host.querySelector<HTMLElement>("[data-slot=accordion-trigger]")!;
    expect(panel.getAttribute("hidden")).toBe("until-found");
    expect(panel.getBoundingClientRect().height).toBeLessThan(1);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    panel.dispatchEvent(new Event("beforematch", { bubbles: true }));
    await frames(3);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hasAttribute("hidden")).toBe(false);
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(8);
  });

  it("accordion: opening from until-found still runs a real height transition (full motion)", async () => {
    const host = await mount(accordion(), 320, "full");
    const panel = host.querySelector<HTMLElement>("[data-slot=accordion-panel]")!;
    const trigger = host.querySelector<HTMLElement>("[data-slot=accordion-trigger]")!;
    await userEvent.click(trigger);
    await frames(2);
    const anim = panel.getAnimations().find((a) => (a as CSSTransition).transitionProperty === "height");
    expect(anim, "no height transition while opening").toBeDefined();
    expect(Number(anim!.effect!.getComputedTiming().endTime)).toBeGreaterThan(100);
    anim!.finish();
    await frames(2);
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(8);
  });

  it("accordion: the default can be switched off per panel", async () => {
    const host = await mount(accordion({ hiddenUntilFound: false }));
    const panel = host.querySelector<HTMLElement>("[data-slot=accordion-panel]");
    expect(panel === null || panel.getAttribute("hidden") !== "until-found").toBe(true);
  });

  it("collapsible: a closed panel is hidden=until-found and beforematch opens it", async () => {
    const host = await mount(h(Collapsible, null, h(CollapsibleTrigger, null, "더보기"), h(CollapsiblePanel, null, "찾기 가능한 본문")));
    const panel = host.querySelector<HTMLElement>("[data-slot=collapsible-panel]")!;
    const trigger = host.querySelector<HTMLElement>("[data-slot=collapsible-trigger]")!;
    expect(panel.getAttribute("hidden")).toBe("until-found");
    expect(panel.getBoundingClientRect().height).toBeLessThan(1);
    panel.dispatchEvent(new Event("beforematch", { bubbles: true }));
    await frames(3);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});

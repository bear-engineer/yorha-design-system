import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { mountStory, frames } from "./mount";

/** v4 kanban (f-kan): V4-230..236. Real pointer-event sequences; geometry and computed-style assertions. */

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const r = (el: Element) => el.getBoundingClientRect();
const handleOf = (root: ParentNode, prefix: string) =>
  qa(root, "button").find((b) => b.getAttribute("aria-label")?.startsWith(prefix))!;
const ptr = (target: EventTarget, type: string, x: number, y: number) =>
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === "pointerup" ? 0 : 1, pointerId: 1, pointerType: "mouse", isPrimary: true }),
  );
async function lift(handle: HTMLElement, to: { x: number; y: number }) {
  const h = r(handle);
  const x0 = h.left + h.width / 2;
  const y0 = h.top + h.height / 2;
  ptr(handle, "pointerdown", x0, y0);
  for (let i = 1; i <= 10; i++) {
    ptr(document, "pointermove", x0 + ((to.x - x0) * i) / 10, y0 + ((to.y - y0) * i) / 10);
    await frames(2);
  }
  await frames(3);
}
const drop = (x: number, y: number) => ptr(document, "pointerup", x, y);

afterEach(() => {
  document.documentElement.removeAttribute("data-motion");
  document.body.style.cursor = "";
});

describe("V4-230 keyboard focus", () => {
  test("focus stays on the lifted card's handle across columns", async () => {
    const root = await mountStory("kanban", "Default");
    const handle = handleOf(root, "통신 모듈 교체");
    handle.focus();
    await userEvent.keyboard(" ");
    await frames(4);
    await userEvent.keyboard("{ArrowRight}");
    await frames(8);
    const active = document.activeElement as HTMLElement;
    expect(active.getAttribute("aria-label") ?? "", "focus after ArrowRight").toMatch(/통신 모듈 교체 카드 이동$/);
    expect(root.contains(active)).toBe(true);
    await userEvent.keyboard("{ArrowRight}");
    await frames(8);
    expect((document.activeElement as HTMLElement).getAttribute("aria-label") ?? "").toMatch(/카드 이동$/);
    await userEvent.keyboard("{Escape}");
    await frames(4);
  });
});

describe("V4-231 WIP warning", () => {
  test("takes no row: count turns alert with a triangle-up glyph, 2px inset top rule, status text hidden", async () => {
    const root = await mountStory("kanban", "WipLimitWarning");
    const cols = qa(root, "[role=group]");
    const [calm, over] = cols as [HTMLElement, HTMLElement];
    const gap = (c: HTMLElement) => r(q(c, "ul")).top - r(q(c, "h2")).bottom;
    expect(Math.abs(gap(over) - gap(calm)), "list top relative to heading").toBeLessThanOrEqual(1);
    const count = q(over, "[data-part=count]");
    expect(q(count, "svg[data-glyph=triangle-up]"), "triangle glyph").toBeTruthy();
    expect(q(calm, "[data-part=count]").querySelector("svg"), "calm count has no glyph").toBeNull();
    expect(getComputedStyle(count).color).not.toBe(getComputedStyle(q(calm, "[data-part=count]")).color);
    const shadow = getComputedStyle(over).boxShadow;
    expect(shadow, shadow).toContain("inset");
    expect(shadow).toMatch(/0px 2px 0px 0px/);
    const status = q(over, "[role=status]");
    expect(r(status).width, "visually hidden").toBeLessThanOrEqual(1);
    expect(status.textContent).toContain("WIP 한도 초과");
  });
});

describe("V4-232 board height during a drag", () => {
  test("board keeps its start height and content below does not move", async () => {
    const root = await mountStory("kanban", "Default");
    const board = q(root, "[role=region]");
    const after = document.createElement("div");
    after.textContent = "below";
    root.appendChild(after);
    const h0 = r(board).height;
    const below0 = r(after).top;
    const cols = qa(root, "[role=group]");
    const t = r(cols[2]!);
    await lift(handleOf(root, "유닛 A 점검"), { x: t.left + t.width / 2, y: t.top + 60 });
    expect(r(board).height, "board height mid-drag").toBeGreaterThanOrEqual(h0 - 0.5);
    expect(Math.abs(r(after).top - below0), "content below").toBeLessThanOrEqual(0.5);
    drop(t.left + t.width / 2, t.top + 60);
    await wait(500);
  });
});

describe("V4-233 edge autoscroll", () => {
  test("pointer parked at the right edge scrolls the board to its max; the left edge scrolls back", async () => {
    const root = await mountStory("kanban", "Default");
    const board = q(root, "[role=region]");
    root.style.width = "360px";
    root.style.maxWidth = "360px";
    await frames(3);
    expect(board.scrollWidth, "board overflows").toBeGreaterThan(board.clientWidth + 100);
    const b = r(board);
    await lift(handleOf(root, "유닛 A 점검"), { x: b.right - 8, y: b.top + 120 });
    const samples: number[] = [];
    for (let i = 0; i < 8; i++) {
      await wait(125);
      samples.push(board.scrollLeft);
    }
    const max = board.scrollWidth - board.clientWidth;
    expect(samples[0]!, `samples ${samples}`).toBeGreaterThan(0);
    for (let i = 1; i < samples.length; i++) {
      if (samples[i - 1]! < max - 1) expect(samples[i]!, `strictly increases ${samples}`).toBeGreaterThan(samples[i - 1]!);
    }
    expect(samples.at(-1)!).toBeGreaterThanOrEqual(max - 2);
    ptr(document, "pointermove", b.left + 6, b.top + 120);
    await wait(1200);
    expect(board.scrollLeft, "scrolled back").toBeLessThan(max / 2);
    ptr(document, "pointerup", b.left + 6, b.top + 120);
    await wait(500);
    root.style.width = "";
    root.style.maxWidth = "";
  });

  test("column lists carry the scroll cue", async () => {
    const root = await mountStory("kanban", "Default");
    const list = q(root, "[data-slot=kanban-list]");
    expect(getComputedStyle(list).backgroundAttachment).toContain("local");
  });
});

describe("V4-234 insertion marker and empty drop zone", () => {
  test("marker is a 2px line with two 4x4 caps; empty column shows the drop text on a dither floor", async () => {
    const root = await mountStory("kanban", "Default");
    expect(document.querySelector("[data-slot=kanban-drop-zone]")).toBeNull();
    const cols = qa(root, "[role=group]");
    const t = r(cols[1]!);
    await lift(handleOf(root, "유닛 A 점검"), { x: t.left + t.width / 2, y: t.top + 60 });
    const line = q(document.body, "[data-slot=kanban-drop-indicator]");
    expect(r(line).height).toBeCloseTo(2, 0);
    const caps = qa(line, "[data-part=cap]");
    expect(caps.length).toBe(2);
    for (const c of caps) {
      expect(r(c).width).toBeCloseTo(4, 0);
      expect(r(c).height).toBeCloseTo(4, 0);
    }
    const zone = q(root, "[data-slot=kanban-drop-zone]");
    expect(zone.textContent).toContain("여기에 놓기");
    const floor = q(zone, ".yorha-dither-12");
    expect(getComputedStyle(floor).maskImage, "dither mask").not.toBe("none");
    drop(t.left + t.width / 2, t.top + 60);
    await wait(500);
    expect(document.querySelector("[data-slot=kanban-drop-zone]")).toBeNull();
  });

  test("a last card's marker sits on the trailing edge", async () => {
    const root = await mountStory("kanban", "Default");
    const cols = qa(root, "[role=group]");
    const t = r(cols[0]!);
    await lift(handleOf(root, "통신 모듈 교체"), { x: t.left + t.width / 2, y: t.bottom - 10 });
    const line = q(document.body, "[data-slot=kanban-drop-indicator]");
    expect(line.getAttribute("data-edge")).toBe("end");
    const li = line.closest("li")!;
    expect(Math.abs(r(line).bottom - r(li).bottom)).toBeLessThanOrEqual(2);
    drop(t.left + t.width / 2, t.bottom - 10);
    await wait(500);
  });
});

describe("V4-235 lifted cue and over-limit ring", () => {
  test("overlay grip is ink; entering an over-limit column flickers its ring once", async () => {
    const root = await mountStory("kanban", "WipLimitWarning");
    const idle = getComputedStyle(q(handleOf(root, "유닛 A 점검"), "svg")).color;
    const cols = qa(root, "[role=group]");
    const t = r(cols[1]!);
    const h = handleOf(root, "유닛 A 점검");
    await lift(h, { x: t.left + t.width / 2, y: t.top + 80 });
    const grip = q(document.body, "[data-slot=kanban-overlay] [data-part=grip]");
    expect(getComputedStyle(grip).color).not.toBe(idle);
    expect(getComputedStyle(grip).color).toBe(getComputedStyle(q(document.body, "[data-slot=kanban-drop-indicator]")).backgroundColor);
    const ring = q(root, "[data-part=limit-ring]");
    expect(ring, "ring on over-limit target").toBeTruthy();
    expect(ring.classList.contains("yorha-flicker")).toBe(true);
    drop(t.left + t.width / 2, t.top + 80);
    await wait(500);
  });
});

describe("V4-236 column collapse", () => {
  test("toggle collapses the list, aria-expanded follows; a held card opens it", async () => {
    const root = await mountStory("kanban", "Collapsible");
    const col = qa(root, "[role=group]")[1]!;
    const toggle = q(col, "[data-part=collapse]");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(toggle);
    await frames(3);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(r(q(col, "ul")).height, "list collapsed").toBe(0);
    expect(r(toggle).width).toBeGreaterThanOrEqual(24);
    const t = r(col);
    await lift(handleOf(root, "유닛 A 점검"), { x: t.left + t.width / 2, y: t.top + 30 });
    expect(r(q(col, "ul")).height, "opens while a card is held").toBeGreaterThan(0);
    drop(t.left + t.width / 2, t.top + 30);
    await wait(500);
  });
});

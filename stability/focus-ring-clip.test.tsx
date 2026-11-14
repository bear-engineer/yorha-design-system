import { describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { frames, mountStory } from "./mount";

/** Entry staggers are motion, not layout: measure the resting position. */
async function settle() {
  await frames(2);
  await Promise.allSettled(
    document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)).map((a) => a.finished),
  );
}

/**
 * The focus ring (outline + offset) is drawn outside the control, so every scrolling/clipping ancestor must leave
 * room for it. Tab through the story and assert the ring box lies inside each clipping ancestor's padding box.
 */
function clippedBy(el: HTMLElement): string[] {
  const cs = getComputedStyle(el);
  const grow = (parseFloat(cs.outlineWidth) || 0) + (parseFloat(cs.outlineOffset) || 0);
  const r = el.getBoundingClientRect();
  const ring = { l: r.left - grow, t: r.top - grow, r: r.right + grow, b: r.bottom + grow };
  const out: string[] = [];
  for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
    const o = getComputedStyle(p);
    if (!/(hidden|auto|scroll|clip)/.test(o.overflowX + o.overflowY)) continue;
    const pr = p.getBoundingClientRect();
    const bw = (k: string) => parseFloat(o.getPropertyValue(k)) || 0;
    const inner = {
      l: pr.left + bw("border-left-width"),
      t: pr.top + bw("border-top-width"),
      r: pr.right - bw("border-right-width"),
      b: pr.bottom - bw("border-bottom-width"),
    };
    const sides = [
      ring.l < inner.l - 0.5 ? "left" : "",
      ring.r > inner.r + 0.5 ? "right" : "",
      ring.t < inner.t - 0.5 ? "top" : "",
      ring.b > inner.b + 0.5 ? "bottom" : "",
    ].filter(Boolean);
    if (sides.length) out.push(`${p.tagName.toLowerCase()}.${String(p.className).split(" ").slice(0, 2).join(".")}: ${sides.join("+")}`);
  }
  return out;
}

async function tabThrough(root: HTMLElement, steps: number, jumpToEnd = false): Promise<string[]> {
  const problems: string[] = [];
  for (let i = 0; i < steps; i++) {
    await userEvent.tab();
    if (jumpToEnd && i === 0) await userEvent.keyboard("{End}");
    await settle();
    const el = document.activeElement as HTMLElement | null;
    if (!el || !root.contains(el)) continue;
    const hit = clippedBy(el);
    if (hit.length) problems.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 16)}" ring clipped by ${hit.join(", ")}`);
  }
  return problems;
}

describe("focus ring is not clipped by scroll/clip ancestors", () => {
  test("menu-list LongList: first and last row", async () => {
    const root = await mountStory("menu-list", "LongList");
    expect(await tabThrough(root, 1, true)).toEqual([]);
    await userEvent.keyboard("{Home}");
    await settle();
    expect(clippedBy(document.activeElement as HTMLElement)).toEqual([]);
  });

  test("toast Themes: contained panes", async () => {
    const root = await mountStory("toast", "Themes");
    expect(await tabThrough(root, 12)).toEqual([]);
  });
});

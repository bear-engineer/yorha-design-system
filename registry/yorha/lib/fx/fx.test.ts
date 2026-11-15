// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { runFx } from "./fx";

/** The part of an element runFx touches. `animations` is what getAnimations() reports once data-run is set. */
function fakeElement(animations: () => Animation[]) {
  const attrs = new Map<string, string>();
  const el = {
    setAttribute: (name: string, value: string) => attrs.set(name, value),
    removeAttribute: (name: string) => attrs.delete(name),
    getAnimations: () => (attrs.has("data-run") ? animations() : []),
  };
  return { el: el as unknown as HTMLElement, attrs };
}
const running = (finished: Promise<unknown>) => [{ finished } as unknown as Animation];

describe("runFx", () => {
  it("is a no-op for an empty element", () => {
    expect(runFx(null)).toBe(false);
    expect(runFx(undefined)).toBe(false);
  });

  it("two calls 300 ms apart: the second returns false; the attribute is gone after the animations settle", async () => {
    vi.useFakeTimers();
    try {
      let settle = () => {};
      const { el, attrs } = fakeElement(() => running(new Promise<void>((resolve) => (settle = resolve))));
      expect(runFx(el)).toBe(true);
      expect(attrs.get("data-run")).toBe("");
      vi.setSystemTime(Date.now() + 300);
      vi.advanceTimersByTime(300);
      expect(runFx(el)).toBe(false);
      settle();
      await Promise.resolve();
      await Promise.resolve();
      expect(attrs.has("data-run")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("runs again after the 1000 ms floor; lockoutMs can only raise it", () => {
    const now = vi.spyOn(performance, "now");
    const { el } = fakeElement(() => []);
    now.mockReturnValue(0);
    expect(runFx(el)).toBe(true);
    now.mockReturnValue(999);
    expect(runFx(el, { lockoutMs: 0 })).toBe(false);
    now.mockReturnValue(1000);
    expect(runFx(el, { lockoutMs: 0 })).toBe(true);
    now.mockReturnValue(2500);
    expect(runFx(el, { lockoutMs: 2000 })).toBe(false);
    now.mockReturnValue(3000);
    expect(runFx(el, { lockoutMs: 2000 })).toBe(true);
    now.mockRestore();
  });

  it("removes the attribute at once when nothing animates (data-motion=off)", () => {
    const { el, attrs } = fakeElement(() => []);
    expect(runFx(el)).toBe(true);
    expect(attrs.has("data-run")).toBe(false);
  });
});

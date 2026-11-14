import { describe, expect, it } from "vitest";
import {
  resolveRouteDirection,
  resolveTransitionMode,
  segmentDirection,
  supportsViewTransition,
} from "./route-transition";

describe("resolveRouteDirection", () => {
  it("PUSH is forward, REPLACE is replace", () => {
    expect(resolveRouteDirection({ navigationType: "PUSH", idx: 3, prevIdx: 2 })).toBe("forward");
    expect(resolveRouteDirection({ navigationType: "REPLACE", idx: 2, prevIdx: 2 })).toBe("replace");
  });
  it("POP compares the history index", () => {
    expect(resolveRouteDirection({ navigationType: "POP", idx: 1, prevIdx: 2 })).toBe("back");
    expect(resolveRouteDirection({ navigationType: "POP", idx: 3, prevIdx: 1 })).toBe("forward");
    expect(resolveRouteDirection({ navigationType: "POP", idx: 2, prevIdx: 2 })).toBe("replace");
  });
  it("POP without an index is back", () => {
    expect(resolveRouteDirection({ navigationType: "POP", idx: null, prevIdx: 2 })).toBe("back");
    expect(resolveRouteDirection({ navigationType: "POP", idx: 2, prevIdx: null })).toBe("back");
  });
});

describe("segmentDirection", () => {
  const order = ["a", "b", "c"];
  it("moves forward and back along the order", () => {
    expect(segmentDirection(order, "a", "c")).toBe("forward");
    expect(segmentDirection(order, "c", "b")).toBe("back");
  });
  it("is replace for same or unknown segments", () => {
    expect(segmentDirection(order, "b", "b")).toBe("replace");
    expect(segmentDirection(order, "a", "zzz")).toBe("replace");
  });
});

describe("resolveTransitionMode", () => {
  it("full motion on a supporting browser is on", () => {
    expect(resolveTransitionMode({ motion: "full", prefersReduced: true, supported: true })).toBe("on");
    expect(resolveTransitionMode({ motion: null, prefersReduced: false, supported: true })).toBe("on");
  });
  it("reduced is a crossfade, off is none", () => {
    expect(resolveTransitionMode({ motion: "reduced", prefersReduced: false, supported: true })).toBe("reduced");
    expect(resolveTransitionMode({ motion: null, prefersReduced: true, supported: true })).toBe("reduced");
    expect(resolveTransitionMode({ motion: "off", prefersReduced: false, supported: true })).toBe("off");
  });
  it("no startViewTransition renders without animation in every mode", () => {
    for (const motion of ["full", "reduced", null]) {
      expect(resolveTransitionMode({ motion, prefersReduced: false, supported: false })).toBe("unsupported");
    }
    expect(resolveTransitionMode({ motion: "off", prefersReduced: false, supported: false })).toBe("off");
  });
});

describe("supportsViewTransition", () => {
  it("detects document.startViewTransition without calling it", () => {
    let called = 0;
    expect(supportsViewTransition({ startViewTransition: () => { called++; } })).toBe(true);
    expect(supportsViewTransition({})).toBe(false);
    expect(supportsViewTransition(undefined)).toBe(false);
    expect(called).toBe(0);
  });
});

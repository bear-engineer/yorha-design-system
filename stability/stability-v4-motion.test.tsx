import { afterEach, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";

// v4 g-motion (V4-001..012): the new motion vocabulary per motion mode. Animations are paused and seeked, so the assertions read
// mid-motion frames instead of racing the clock. Reduced = opacity only (no clip, displacement); off = nothing runs.

type Mode = "full" | "reduced" | "off";
const MODES: Mode[] = ["full", "reduced", "off"];

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

async function mount(mode: Mode, html: string, waitFrames = 2): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = "ko";
  host.dataset.motion = mode;
  host.style.cssText = "padding:24px;width:480px;background:var(--yorha-bg);color:var(--yorha-fg)";
  host.innerHTML = html;
  document.body.append(host);
  hosts.push(host);
  // Freeze every animation in the task it started: assertions read frames, not a clock a busy runner can outrun.
  for (const animation of host.getAnimations({ subtree: true })) animation.pause();
  if (waitFrames > 0) await frames(waitFrames);
  return host;
}
const q = <T extends HTMLElement = HTMLElement>(host: ParentNode, selector: string) => {
  const el = host.querySelector<T>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
};
const running = (el: Element) => el.getAnimations({ subtree: true }) as CSSAnimation[];
const names = (el: Element) => running(el).map((a) => `${(a.effect as KeyframeEffect).pseudoElement ?? ""}${a.animationName}`).sort();
const keyframeProps = (a: Animation) =>
  new Set((a.effect as KeyframeEffect).getKeyframes().flatMap((frame) => Object.keys(frame)).filter((key) => !["offset", "easing", "composite", "computedOffset"].includes(key)));
const seek = (a: Animation, ms: number) => {
  a.pause();
  a.currentTime = ms;
};
const rect = (el: Element) => JSON.stringify(el.getBoundingClientRect().toJSON());
const root = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
/** Whitespace-separated CSS values at the top level (calc(...) stays whole), expanded from the 1-4 value shorthand. */
const edges = (value: string) => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === " " && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  const [a, b = a, c = a, d = b] = parts;
  return [a, b, c, d] as string[];
};
/** `calc(0% - 16px)` is -16px; Chromium keeps the calc form for the reduced pop rest value. */
const flat = (value: string) => value.replace(/calc\(0% - ([\d.]+px)\)/g, "-$1");
const settle = () => frames(1);

describe("V4-001 tokens per mode", () => {
  const EXPECT: Record<string, Record<Mode, string>> = {
    "--motion-glitch": { full: "260ms", reduced: "0ms", off: "0ms" },
    "--motion-flicker": { full: "220ms", reduced: "0ms", off: "0ms" },
    "--motion-stream": { full: "320ms", reduced: "0ms", off: "0ms" },
    "--motion-caret": { full: "1000ms", reduced: "0ms", off: "0ms" },
    "--motion-panel": { full: "280ms", reduced: "0ms", off: "0ms" },
    "--yorha-ease-out": { full: "cubic-bezier(0.23, 1, 0.32, 1)", reduced: "linear", off: "linear" },
    "--yorha-ease-move": { full: "cubic-bezier(0.77, 0, 0.175, 1)", reduced: "linear", off: "linear" },
    "--motion-modal": { full: "220ms", reduced: "0ms", off: "0ms" },
    "--motion-modal-exit": { full: "150ms", reduced: "0ms", off: "0ms" },
    "--motion-modal-backdrop": { full: "160ms", reduced: "0ms", off: "0ms" },
    "--motion-modal-backdrop-exit": { full: "140ms", reduced: "0ms", off: "0ms" },
    // deprecated aliases: smooth curves, never steps()
    "--yorha-step-reveal": { full: "cubic-bezier(0.23, 1, 0.32, 1)", reduced: "linear", off: "linear" },
    "--yorha-step-flip": { full: "ease-in-out", reduced: "linear", off: "linear" },
    "--motion-fx-mask-50": { full: "var(--yorha-dither-50)", reduced: "none", off: "none" },
  };
  for (const mode of MODES) {
    it(`${mode}: duration, easing and mask tokens`, async () => {
      const host = await mount(mode, `<p id="p">x</p>`);
      for (const [name, byMode] of Object.entries(EXPECT)) expect(root(q(host, "#p"), name), `${name} in ${mode}`).toBe(name === "--motion-fx-mask-50" && mode === "full" ? root(q(host, "#p"), "--yorha-dither-50") : byMode[mode]);
    });
  }
});

describe("V4-006 yorha-glitch", () => {
  const html = `<h2 id="h" class="yorha-glitch" data-text="SYSTEM FAULT" data-run="" style="margin:0;white-space:nowrap">SYSTEM FAULT</h2>`;

  it("full: accessible text stays plain, layers sit inside the host box and displace mid-run, the host box never moves", async () => {
    const host = await mount("full", html);
    const h = q(host, "#h");
    const before = rect(h);
    expect(h.textContent).toBe("SYSTEM FAULT");
    expect(getComputedStyle(h, "::before").content).toMatch(/SYSTEM FAULT.*\/ ""/);
    expect(getComputedStyle(h, "::after").content).toMatch(/\/ ""/);
    expect(getComputedStyle(h, "::before").position).toBe("absolute");
    const all = running(h);
    expect(all.map((a) => a.animationName).sort()).toEqual(["yorha-glitch-a-fade", "yorha-glitch-a-move", "yorha-glitch-b-fade", "yorha-glitch-b-move", "yorha-glitch-core"]);
    for (const a of all) seek(a, 0);
    await settle();
    // Start of the burst: both layers are 3px off their rest position, in opposite directions, and the host dips.
    const dx = (pseudo: string) => new DOMMatrix(getComputedStyle(h, pseudo).transform).m41;
    expect(Math.abs(dx("::before"))).toBe(3);
    expect(dx("::before")).toBe(-dx("::after"));
    expect(Number(getComputedStyle(h).opacity)).toBeLessThan(0.5);
    expect(getComputedStyle(h, "::before").clipPath).toContain("inset(");
    // The offset and slice decay smoothly: each later sample is strictly closer to rest than the one before.
    const trail: number[] = [];
    for (const t of [20, 60, 120, 200]) {
      for (const a of all) seek(a, t);
      await settle();
      trail.push(Math.abs(dx("::before")));
    }
    expect(trail.every((v, i) => v < (trail[i - 1] ?? 3) && v > 0), trail.join()).toBe(true);
    expect(getComputedStyle(h, "::before").animationTimingFunction).not.toContain("steps");
    expect(rect(h)).toBe(before);
    for (const a of all) a.finish();
    h.removeAttribute("data-run");
    await settle();
    expect(rect(h)).toBe(before);
    expect(getComputedStyle(h).opacity).toBe("1");
    expect(getComputedStyle(h, "::before").opacity).toBe("0");
  });

  it("reduced: only the host fades, no transform or clip keyframes anywhere", async () => {
    const host = await mount("reduced", html);
    const h = q(host, "#h");
    expect(names(h)).toEqual(["yorha-glitch-core"]);
    for (const a of running(h)) expect([...keyframeProps(a)]).toEqual(["opacity"]);
    expect(getComputedStyle(h, "::before").transform).toBe("none");
  });

  it("off: nothing runs", async () => {
    const host = await mount("off", html);
    expect(names(q(host, "#h"))).toEqual([]);
  });

  it("forced-colors: the channel layers are removed", async () => {
    const host = await mount("full", html);
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
    try {
      await frames(2);
      const h = q(host, "#h");
      expect(getComputedStyle(h, "::before").display).toBe("none");
      expect(getComputedStyle(h, "::after").display).toBe("none");
    } finally {
      await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "none" }] });
    }
  });

  it("without data-run nothing animates", async () => {
    const host = await mount("full", html.replace(` data-run=""`, ""));
    expect(names(q(host, "#h"))).toEqual([]);
  });
});

describe("V4-007 yorha-flicker", () => {
  const html = `<span id="f" class="yorha-flicker" data-run="" style="display:block;width:24px;height:24px;background:var(--yorha-alert-ui)"></span>`;
  const samples = async (host: HTMLElement) => {
    const f = q(host, "#f");
    const [a] = running(f);
    const out: number[] = [];
    if (!a) return out;
    const total = Number((a.effect as KeyframeEffect).getComputedTiming().duration);
    for (const t of [0.05, 0.25, 0.45, 0.65, 0.95]) {
      seek(a, total * t);
      await settle();
      out.push(Number(getComputedStyle(f).opacity));
    }
    return out;
  };
  const reversals = (values: number[]) => {
    let count = 0;
    for (let i = 2; i < values.length; i++) if ((values[i]! - values[i - 1]!) * (values[i - 1]! - values[i - 2]!) < 0) count++;
    return count;
  };

  it("full: one smooth pulse (a single reversal), host rect constant", async () => {
    const host = await mount("full", html);
    const before = rect(q(host, "#f"));
    const values = await samples(host);
    expect(reversals(values), values.join()).toBe(1);
    expect(getComputedStyle(q(host, "#f")).animationTimingFunction).toBe("ease-in-out");
    expect(rect(q(host, "#f"))).toBe(before);
  });
  it("reduced: a monotone fade, no reversal", async () => {
    const host = await mount("reduced", html);
    const values = await samples(host);
    expect(values.length).toBeGreaterThan(0);
    expect(reversals(values), values.join()).toBe(0);
    for (const a of running(q(host, "#f"))) expect([...keyframeProps(a)]).toEqual(["opacity"]);
  });
  it("off: no animation", async () => {
    const host = await mount("off", html);
    expect(names(q(host, "#f"))).toEqual([]);
  });
});

describe("V4-008 yorha-caret", () => {
  const html = `<p>BOOT <span id="c" class="yorha-caret" data-blink aria-hidden="true"></span></p><p>BOOT <span id="s" class="yorha-caret" aria-hidden="true"></span></p>`;
  it("full: blinks 6 cycles then stays solid; integer box; without data-blink it is solid", async () => {
    const host = await mount("full", html);
    const c = q(host, "#c");
    const style = getComputedStyle(c);
    expect(style.animationName).toBe("yorha-caret-blink");
    expect(style.animationIterationCount).toBe("6");
    expect(style.animationTimingFunction).toBe("steps(1)"); // computed form of step-end; the standard caret blink: the one allowed discrete change
    expect(Number.isInteger(parseFloat(style.width))).toBe(true);
    expect(Number.isInteger(parseFloat(style.height))).toBe(true);
    expect(names(c)).toEqual(["yorha-caret-blink"]);
    expect(names(q(host, "#s"))).toEqual([]);
  });
  for (const mode of ["reduced", "off"] as const) {
    it(`${mode}: no animation, solid`, async () => {
      const host = await mount(mode, html);
      expect(names(q(host, "#c"))).toEqual([]);
      expect(getComputedStyle(q(host, "#c")).opacity).toBe("1");
    });
  }
});

describe("V4-009 yorha-stream", () => {
  const rows = [0, 1, 2, 9].map((i) => `<li class="yorha-stream" style="--yorha-stagger-index:${i}">row ${i}</li>`).join("");
  const html = `<ul id="u" style="margin:0;padding:0;list-style:none">${rows}</ul>`;
  it("full: one smooth opacity + 4px translate animation per row, delay capped at index 6", async () => {
    const host = await mount("full", html);
    const items = [...host.querySelectorAll<HTMLElement>("li")];
    for (const li of items) {
      expect(names(li)).toEqual(["yorha-stream-in"]);
      expect([...keyframeProps(running(li)[0]!)].sort()).toEqual(["opacity", "translate"]);
      expect(getComputedStyle(li).animationTimingFunction).toBe("cubic-bezier(0.23, 1, 0.32, 1)");
    }
    const delay = (li: HTMLElement) => getComputedStyle(li).animationDelay.split(",")[0];
    expect(delay(items[0]!)).toBe("0s");
    expect(delay(items[1]!)).toBe("0.04s");
    expect(delay(items[3]!)).toBe(`${0.04 * 6}s`.replace(/0+s$/, "s").replace(/^0\.24s$/, "0.24s"));
    seek(running(items[0]!)[0]!, 120);
    await settle();
    const opacity = Number(getComputedStyle(items[0]!).opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    expect(parseFloat(getComputedStyle(items[0]!).translate.split(" ")[1]!)).toBeGreaterThan(0);
  });
  it("reduced: only an opacity fade (the translate stays 0)", async () => {
    const host = await mount("reduced", html);
    for (const li of host.querySelectorAll<HTMLElement>("li")) {
      expect(names(li)).toEqual(["yorha-stream-in"]);
      seek(running(li)[0]!, 60);
      await settle();
      expect(parseFloat(getComputedStyle(li).translate.split(" ")[1] ?? "0") || 0).toBe(0);
      expect(Number(getComputedStyle(li).opacity)).toBeLessThan(1);
    }
  });
  it("off: nothing runs", async () => {
    const host = await mount("off", html);
    expect(names(host)).toEqual([]);
  });
});

describe("yorha-unfold (dialog: unfold from a line)", () => {
  const box = (id: string, state: string) => `<div id="${id}" class="yorha-unfold" ${state} style="width:240px;height:80px;background:var(--yorha-ink)"><p style="margin:0">content</p></div>`;
  const html = box("d", "data-open") + box("x", "data-closed");
  const open = box("d", "data-open");
  const inset = (el: Element) => getComputedStyle(el).clipPath;
  /** Top inset in px for an 80px-tall box (the computed value keeps `calc(<pct>% +/- <px>px)` while the percentage is live). */
  const topPx = (el: Element) => {
    const top = edges(/^inset\((.+)\)$/.exec(inset(el))?.[1] ?? "")[0]!;
    if (!top.startsWith("calc(")) return parseFloat(top);
    return top
      .slice(5, -1)
      .replace(/ - /g, " + -")
      .split(" + ")
      .reduce((sum, term) => sum + (term.endsWith("%") ? (parseFloat(term) / 100) * 80 : parseFloat(term)), 0);
  };
  it("full: clip from a centred 2px band to the negative inset, linear 90ms fade, delayed content, no mask", async () => {
    const host = await mount("full", html, 0);
    const d = q(host, "#d");
    expect(names(d)).toEqual(["yorha-unfold-clip-in", "yorha-unfold-content-in", "yorha-unfold-fade-in"]);
    const clipIn = running(d).find((a) => a.animationName === "yorha-unfold-clip-in")!;
    const fadeIn = running(d).find((a) => a.animationName === "yorha-unfold-fade-in")!;
    const timing = (a: Animation) => (a.effect as KeyframeEffect).getComputedTiming();
    expect(timing(clipIn).duration).toBe(220);
    expect(timing(fadeIn).duration).toBe(90);
    expect(getComputedStyle(d).animationTimingFunction).toBe("cubic-bezier(0.23, 1, 0.32, 1), linear");
    expect(getComputedStyle(d).maskImage).toBe("none");
    seek(clipIn, 0);
    await settle();
    expect(edges(/^inset\((.+)\)$/.exec(inset(d))?.[1] ?? "")).toEqual(["calc(50% - 1px)", "-6px", "calc(50% - 1px)", "-6px"]);
    const heights: number[] = [];
    for (const t of [20, 50, 90, 140, 190]) {
      seek(clipIn, t);
      await settle();
      heights.push(80 - 2 * topPx(d));
    }
    expect(heights.every((h, i) => h > (heights[i - 1] ?? 2)), heights.join()).toBe(true);
    seek(clipIn, 219.5);
    await settle();
    expect(topPx(d)).toBeLessThan(-5.9); // lands on the -6px bleed
    // The body arrives 60ms later than the popup and rises 4px.
    const content = q(d, "p");
    expect(names(content)).toEqual(["yorha-unfold-content-in"]);
    expect(getComputedStyle(content).animationDelay).toBe("0.06s");
    expect(getComputedStyle(content).animationDuration).toBe("0.2s");
    const rise = running(content)[0]!;
    seek(rise, 0);
    await settle();
    expect(getComputedStyle(content).translate).toBe("0px 4px");
    expect(getComputedStyle(content).opacity).toBe("0");
    // exit: 150ms opacity + clip closing to the line, no delay
    const x = q(host, "#x");
    expect(names(x)).toEqual(["yorha-unfold-clip-out", "yorha-unfold-fade-out"]);
    expect(getComputedStyle(x).animationDuration).toBe("0.15s, 0.15s");
    expect(getComputedStyle(x).animationDelay).toBe("0s");
    expect(getComputedStyle(x).animationTimingFunction).not.toContain("steps");
    // The box itself never changes size or position.
    expect(rect(d)).toBe(rect(q(host, "#d")));
  });
  it("reduced: one 120ms linear opacity fade, no clip movement, no content movement", async () => {
    const host = await mount("reduced", open, 0);
    const d = q(host, "#d");
    expect(names(d)).toEqual(["yorha-unfold-fade-in"]);
    const fade = running(d)[0]!;
    expect((fade.effect as KeyframeEffect).getComputedTiming().duration).toBe(120);
    expect(getComputedStyle(d).animationTimingFunction).toBe("linear, linear");
    expect([...keyframeProps(fade)]).toEqual(["opacity"]);
    expect(inset(d)).toBe("none"); // no clip at rest: the hard shadow and focus ring are never clipped
  });
  it("off: nothing runs", async () => {
    const host = await mount("off", open, 0);
    expect(names(host)).toEqual([]);
  });
  it("yorha-dissolve is gone (no alias)", () => {
    const sheets = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join("\n");
    expect(sheets).not.toContain("yorha-dissolve");
  });
});

describe("V4-004 yorha-pop (smooth, side-aware clip, no scale)", () => {
  const popup = (attrs: string) => `<div class="yorha-pop" ${attrs} style="width:200px;height:100px;background:var(--yorha-panel)"></div>`;
  const html = [`id="rest"`, `id="bottom" data-starting-style=""`, `id="top" data-starting-style="" data-side="top"`, `id="left" data-starting-style="" data-side="left"`, `id="right" data-starting-style="" data-side="right"`]
    .map(popup)
    .join("");
  const clip = (el: Element) => getComputedStyle(el).clipPath;
  it("full: rest clip is a negative inset; the starting style closes exactly the edge next to the anchor", async () => {
    const host = await mount("full", html);
    expect(clip(q(host, "#rest"))).toBe("inset(-16px)");
    const parts = (id: string) => edges(/^inset\((.+)\)$/.exec(clip(q(host, `#${id}`)))?.[1] ?? "");
    const closed = (value: string | undefined) => value !== "-16px";
    expect(parts("bottom").map(closed)).toEqual([false, false, true, false]);
    expect(parts("top").map(closed)).toEqual([true, false, false, false]);
    expect(parts("left").map(closed)).toEqual([false, false, false, true]);
    expect(parts("right").map(closed)).toEqual([false, true, false, false]);
    for (const id of ["rest", "bottom", "top", "left", "right"]) expect(getComputedStyle(q(host, `#${id}`)).scale).toBe("none");
    expect(getComputedStyle(q(host, "#bottom")).opacity).toBe("0");
    const style = getComputedStyle(q(host, "#rest"));
    expect(style.transitionProperty).toBe("opacity, clip-path");
    expect(style.transitionTimingFunction).toBe("linear, cubic-bezier(0.23, 1, 0.32, 1)");
  });
  it("reduced: starting and rest clip are the same; only opacity differs", async () => {
    const host = await mount("reduced", html);
    const resolved = (id: string) => edges(flat(/^inset\((.+)\)$/.exec(clip(q(host, `#${id}`)))?.[1] ?? ""));
    for (const id of ["rest", "bottom", "top", "left", "right"]) expect(resolved(id), id).toEqual(["-16px", "-16px", "-16px", "-16px"]);
    expect(getComputedStyle(q(host, "#rest")).transitionTimingFunction).toBe("linear, linear");
  });
  it("off: zero durations", async () => {
    const host = await mount("off", html);
    expect(getComputedStyle(q(host, "#rest")).transitionDuration).toBe("0s, 0s");
  });
});

describe("V4-003 smooth wipe and press", () => {
  const html = `<button id="w" class="yorha-wipe">a</button><button id="p" class="yorha-press">b</button>`;
  it("full: background-size and colour both ease-out", async () => {
    const host = await mount("full", html);
    const wipe = getComputedStyle(q(host, "#w"));
    expect(wipe.transitionProperty).toBe("background-size, color");
    expect(wipe.transitionTimingFunction).toBe("cubic-bezier(0.23, 1, 0.32, 1), cubic-bezier(0.23, 1, 0.32, 1)");
    const press = getComputedStyle(q(host, "#p"));
    expect(press.transitionProperty).toBe("scale, color, background-color, border-color, background-size");
    expect(press.transitionTimingFunction).not.toContain("steps");
  });
  it("reduced: linear background-size", async () => {
    const host = await mount("reduced", html);
    expect(getComputedStyle(q(host, "#w")).transitionTimingFunction.startsWith("linear")).toBe(true);
  });
});

describe("V4-011 static pixel utilities", () => {
  const html = `<span id="d25" class="yorha-dither-25" style="width:16px;height:16px"></span><span id="d50" class="yorha-dither-50" style="display:block;width:16px;height:16px"></span><span id="dots" class="yorha-dots" style="display:block;width:16px;height:16px"></span><span id="rail" class="yorha-rail" style="display:block;height:16px"></span><span id="ct" style="color:CanvasText">x</span>`;
  it("mask sizes, rail width", async () => {
    const host = await mount("full", html);
    expect(getComputedStyle(q(host, "#d25")).maskSize).toBe("8px 8px");
    expect(getComputedStyle(q(host, "#d50")).maskSize).toBe("8px 8px");
    expect(getComputedStyle(q(host, "#dots")).maskSize).toBe("4px 4px");
    expect(getComputedStyle(q(host, "#rail")).maskSize).toBe("4px 4px");
    expect(getComputedStyle(q(host, "#rail")).width).toBe("2px");
    expect(getComputedStyle(q(host, "#d50")).pointerEvents).toBe("none");
  });
  it("forced-colors: CanvasText ground, the light levels are dropped", async () => {
    const host = await mount("full", html);
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
    try {
      await frames(2);
      const text = getComputedStyle(q(host, "#ct")).color;
      expect(getComputedStyle(q(host, "#d50")).backgroundColor).toBe(text);
      expect(getComputedStyle(q(host, "#dots")).backgroundColor).toBe(text);
      expect(getComputedStyle(q(host, "#d25")).display).toBe("none");
    } finally {
      await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "none" }] });
    }
  });
});

describe("V4-012 yorha-scroll-cue-y", () => {
  it("four layers: two local covers over two scroll rules, 1 px tall at the top and bottom edge", async () => {
    const host = await mount("full", `<div id="s" class="yorha-scroll-cue-y" style="height:80px;overflow:auto"><div style="height:400px">x</div></div>`);
    const style = getComputedStyle(q(host, "#s"));
    expect(style.backgroundAttachment).toBe("local, local, scroll, scroll");
    expect(style.backgroundSize).toBe("100% 1px, 100% 1px, 100% 1px, 100% 1px");
    expect(style.backgroundPosition).toBe("50% 0%, 50% 100%, 50% 0%, 50% 100%");
  });
});

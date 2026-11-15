import { afterEach, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";

// v4 g-motion (V4-001..012): the new motion vocabulary per motion mode. Animations are paused and seeked, so the assertions read
// mid-motion frames instead of racing the clock. Reduced = opacity only (no clip, mask, displacement, steps); off = nothing runs.

type Mode = "full" | "reduced" | "off";
const MODES: Mode[] = ["full", "reduced", "off"];

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

async function mount(mode: Mode, html: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = "ko";
  host.dataset.motion = mode;
  host.style.cssText = "padding:24px;width:480px;background:var(--yorha-bg);color:var(--yorha-fg)";
  host.innerHTML = html;
  document.body.append(host);
  hosts.push(host);
  await frames(2);
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
const settle = () => frames(1);

describe("V4-001 tokens per mode", () => {
  const EXPECT: Record<string, Record<Mode, string>> = {
    "--motion-glitch": { full: "240ms", reduced: "0ms", off: "0ms" },
    "--motion-flicker": { full: "240ms", reduced: "0ms", off: "0ms" },
    "--motion-stream": { full: "320ms", reduced: "0ms", off: "0ms" },
    "--motion-caret": { full: "1000ms", reduced: "0ms", off: "0ms" },
    "--motion-panel": { full: "280ms", reduced: "0ms", off: "0ms" },
    "--yorha-step-reveal": { full: "steps(4, end)", reduced: "linear", off: "linear" },
    "--yorha-step-scan": { full: "steps(6, end)", reduced: "linear", off: "linear" },
    "--yorha-step-loop": { full: "steps(16, end)", reduced: "linear", off: "linear" },
    "--yorha-step-flip": { full: "steps(1, end)", reduced: "linear", off: "linear" },
    "--motion-fx-mask-50": { full: "var(--yorha-dither-50)", reduced: "none", off: "none" },
  };
  for (const mode of MODES) {
    it(`${mode}: duration, easing and mask tokens`, async () => {
      const host = await mount(mode, `<p id="p">x</p>`);
      for (const [name, byMode] of Object.entries(EXPECT)) expect(root(q(host, "#p"), name), `${name} in ${mode}`).toBe(byMode[mode]);
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
    for (const a of all) seek(a, 60);
    await settle();
    // 25 % of the burst: both layers are 3px off their rest position, in opposite directions, and the host dips.
    const dx = (pseudo: string) => new DOMMatrix(getComputedStyle(h, pseudo).transform).m41;
    expect(Math.abs(dx("::before"))).toBe(3);
    expect(dx("::before")).toBe(-dx("::after"));
    expect(Number(getComputedStyle(h).opacity)).toBeLessThan(0.5);
    expect(getComputedStyle(h, "::before").clipPath).toContain("inset(");
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
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
    try {
      await frames(2);
      const h = q(host, "#h");
      expect(getComputedStyle(h, "::before").display).toBe("none");
      expect(getComputedStyle(h, "::after").display).toBe("none");
    } finally {
      await cdp("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "none" }] });
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

  it("full: two reversals, host rect constant", async () => {
    const host = await mount("full", html);
    const before = rect(q(host, "#f"));
    const values = await samples(host);
    expect(reversals(values), values.join()).toBe(2);
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
    expect(style.animationTimingFunction).toBe("steps(1)");
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
  it("full: two animations per row, clip and fade apart, delay capped at index 6", async () => {
    const host = await mount("full", html);
    const items = [...host.querySelectorAll<HTMLElement>("li")];
    for (const li of items) {
      expect(names(li)).toEqual(["yorha-stream-clip", "yorha-stream-fade"]);
      for (const a of running(li)) expect(keyframeProps(a).has("clip-path") && keyframeProps(a).has("opacity")).toBe(false);
    }
    const delay = (li: HTMLElement) => getComputedStyle(li).animationDelay.split(",")[0];
    expect(delay(items[0]!)).toBe("0s");
    expect(delay(items[1]!)).toBe("0.04s");
    expect(delay(items[3]!)).toBe(`${0.04 * 6}s`.replace(/0+s$/, "s").replace(/^0\.24s$/, "0.24s"));
    // mid-run (row 0, 50 %): the clip is half open.
    const [clip] = running(items[0]!).filter((a) => a.animationName === "yorha-stream-clip");
    seek(clip!, 160);
    await settle();
    expect(getComputedStyle(items[0]!).clipPath).not.toBe("none");
  });
  it("reduced: only the fade runs", async () => {
    const host = await mount("reduced", html);
    for (const li of host.querySelectorAll<HTMLElement>("li")) {
      expect(names(li)).toEqual(["yorha-stream-fade"]);
      expect([...keyframeProps(running(li)[0]!)]).toEqual(["opacity"]);
    }
  });
  it("off: nothing runs", async () => {
    const host = await mount("off", html);
    expect(names(host)).toEqual([]);
  });
});

describe("V4-005 yorha-dissolve and the dither tiles", () => {
  const html = `<div id="d" class="yorha-dissolve" data-open style="width:240px;height:80px;background:var(--yorha-ink)"></div><div id="x" class="yorha-dissolve" data-closed style="width:240px;height:80px;background:var(--yorha-ink)"></div>`;
  it("full: a mask animation and a fade animation, 2 px cells (8 px tile) stepping through 50/75/none", async () => {
    const host = await mount("full", html);
    const d = q(host, "#d");
    expect(names(d)).toEqual(["yorha-dissolve-fade-in", "yorha-dissolve-mask-in"]);
    expect(getComputedStyle(d).maskSize).toBe("8px 8px");
    const [mask] = running(d).filter((a) => a.animationName === "yorha-dissolve-mask-in");
    const total = Number((mask!.effect as KeyframeEffect).getComputedTiming().duration);
    const image = async (fraction: number) => {
      seek(mask!, total * fraction);
      await settle();
      return getComputedStyle(d).maskImage;
    };
    expect(await image(0.1)).toContain("shape-rendering");
    expect(await image(0.5)).toContain("data:image/svg+xml");
    expect(await image(0.7)).toBe("none");
    expect(names(q(host, "#x"))).toEqual(["yorha-dissolve-fade-out", "yorha-dissolve-mask-out"]);
    expect(root(d, "--yorha-dither-25")).toContain("crispEdges");
  });
  it("reduced: one opacity fade, no mask", async () => {
    const host = await mount("reduced", html);
    const d = q(host, "#d");
    expect(names(d)).toEqual(["yorha-dissolve-fade-in"]);
    expect([...keyframeProps(running(d)[0]!)]).toEqual(["opacity"]);
    expect(getComputedStyle(d).maskImage).toBe("none");
  });
  it("off: nothing runs", async () => {
    const host = await mount("off", html);
    expect(names(host)).toEqual([]);
  });
});

describe("V4-004 yorha-pop (stepped, side-aware clip, no scale)", () => {
  const popup = (attrs: string) => `<div class="yorha-pop" ${attrs} style="width:200px;height:100px;background:var(--yorha-panel)"></div>`;
  const html = [`id="rest"`, `id="bottom" data-starting-style=""`, `id="top" data-starting-style="" data-side="top"`, `id="left" data-starting-style="" data-side="left"`, `id="right" data-starting-style="" data-side="right"`]
    .map(popup)
    .join("");
  const clip = (el: Element) => getComputedStyle(el).clipPath;
  it("full: rest clip is a negative inset; the starting style closes exactly the edge next to the anchor", async () => {
    const host = await mount("full", html);
    expect(clip(q(host, "#rest"))).toBe("inset(-16px)");
    const sides = (id: string) => {
      const m = /^inset\((.+)\)$/.exec(clip(q(host, `#${id}`)));
      return m?.[1] ?? "";
    };
    const parts = (id: string) => sides(id).split(" ");
    const closed = (value: string | undefined) => value !== "-16px";
    expect(parts("bottom").map(closed)).toEqual([false, false, true, false]);
    expect(parts("top").map(closed)).toEqual([true, false, false, false]);
    expect(parts("left").map(closed)).toEqual([false, false, false, true]);
    expect(parts("right").map(closed)).toEqual([false, true, false, false]);
    for (const id of ["rest", "bottom", "top", "left", "right"]) expect(getComputedStyle(q(host, `#${id}`)).scale).toBe("none");
    expect(getComputedStyle(q(host, "#bottom")).opacity).toBe("0");
    const style = getComputedStyle(q(host, "#rest"));
    expect(style.transitionProperty).toBe("opacity, clip-path");
    expect(style.transitionTimingFunction).toBe("linear, steps(4)");
  });
  it("reduced: starting and rest clip are the same; only opacity differs", async () => {
    const host = await mount("reduced", html);
    expect(clip(q(host, "#bottom"))).toBe(clip(q(host, "#rest")));
    expect(clip(q(host, "#left"))).toBe(clip(q(host, "#rest")));
    expect(getComputedStyle(q(host, "#rest")).transitionTimingFunction).toBe("linear, linear");
  });
  it("off: zero durations", async () => {
    const host = await mount("off", html);
    expect(getComputedStyle(q(host, "#rest")).transitionDuration).toBe("0s, 0s");
  });
});

describe("V4-003 stepped wipe and press", () => {
  const html = `<button id="w" class="yorha-wipe">a</button><button id="p" class="yorha-press">b</button>`;
  it("full: background-size steps(6), colour keeps the ease", async () => {
    const host = await mount("full", html);
    const wipe = getComputedStyle(q(host, "#w"));
    expect(wipe.transitionProperty).toBe("background-size, color");
    expect(wipe.transitionTimingFunction.split(", steps(6), ")[0]).toBe("steps(6)");
    expect(wipe.transitionTimingFunction).toContain("cubic-bezier(0.16, 1, 0.3, 1)");
    const press = getComputedStyle(q(host, "#p"));
    expect(press.transitionProperty).toBe("scale, color, background-color, border-color, background-size");
    expect(press.transitionTimingFunction.split(", ")[press.transitionTimingFunction.split(", ").length - 1]).toContain("steps(6)");
  });
  it("reduced: linear background-size", async () => {
    const host = await mount("reduced", html);
    expect(getComputedStyle(q(host, "#w")).transitionTimingFunction.startsWith("linear")).toBe(true);
  });
});

describe("V4-011 static pixel utilities", () => {
  const html = `<span id="d25" class="yorha-dither-25" style="display:block;width:16px;height:16px"></span><span id="d50" class="yorha-dither-50" style="display:block;width:16px;height:16px"></span><span id="dots" class="yorha-dots" style="display:block;width:16px;height:16px"></span><span id="rail" class="yorha-rail" style="display:block;height:16px"></span><span id="ct" style="color:CanvasText">x</span>`;
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
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
    try {
      await frames(2);
      const text = getComputedStyle(q(host, "#ct")).color;
      expect(getComputedStyle(q(host, "#d50")).backgroundColor).toBe(text);
      expect(getComputedStyle(q(host, "#dots")).backgroundColor).toBe(text);
      expect(getComputedStyle(q(host, "#d25")).display).toBe("none");
    } finally {
      await cdp("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "none" }] });
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

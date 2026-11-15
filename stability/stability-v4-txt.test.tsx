import { createRef } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";
import { BootLog } from "../registry/yorha/ui/boot-log/boot-log";
import { Decipher } from "../registry/yorha/ui/decipher/decipher";
import { Glitch, type GlitchHandle } from "../registry/yorha/ui/decipher/glitch";
import { ProseTable, Prose } from "../registry/yorha/ui/prose/prose";
import { Text } from "../registry/yorha/ui/text/text";
import { Typer } from "../registry/yorha/ui/typer/typer";

// v4 f-txt (V4-260..268): reserved heights, caret blink contract, Glitch heading, focus-only-while-overflowing tables,
// inview decipher, glyph status marks, expandable text, th scope warning.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
  vi.restoreAllMocks();
});

async function mount(node: React.ReactNode, { motion = "full", width = 400, top = 8, height }: { motion?: string; width?: number; top?: number; height?: number } = {}): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.dataset.motion = motion;
  document.documentElement.dataset.motion = motion;
  host.style.cssText = `position:absolute;left:8px;top:${top}px;width:${width}px;color:#000;background:#fff;${height ? `height:${height}px;` : ""}`;
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(2);
  return host;
}

async function until(fn: () => boolean, ms = 4000): Promise<boolean> {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (fn()) return true;
    await frames(1);
  }
  return fn();
}

const LONG = "Recovered sector log entry: the archive index was rebuilt after the fault and every record now resolves to a stable address in the lower grid.";

describe("V4-261 Typer reserves the full-text box", () => {
  it("multi-line story at 360 px keeps the same height from the first frame to done", async () => {
    const host = await mount(<Typer text={LONG} speed={4} />, { width: 360 });
    const typer = host.querySelector<HTMLElement>("[data-slot=typer]")!;
    const h0 = typer.getBoundingClientRect().height;
    expect(h0).toBeGreaterThan(40);
    expect(await until(() => typer.dataset.state === "done")).toBe(true);
    expect(Math.abs(typer.getBoundingClientRect().height - h0)).toBeLessThan(0.5);
  });
});

describe("V4-260 BootLog reserves its final height", () => {
  const lines = [
    { text: "POWER CELL CHECK", status: "ok" as const },
    { text: "MEMORY MAP DEGRADED IN SECTOR 7", status: "warn" as const },
    { text: "ARCHIVE LINK", status: "fail" as const },
    { text: "HANDSHAKE COMPLETE", status: "ok" as const },
  ];

  it("container height is constant from the first frame to the end", async () => {
    const host = await mount(<BootLog lines={lines} speed={2} gap={10} />, { width: 480 });
    const root = host.querySelector<HTMLElement>("[data-slot=boot-log]")!;
    const h0 = root.getBoundingClientRect().height;
    expect(await until(() => root.querySelectorAll("[data-slot=boot-log-line][data-done]").length === lines.length, 6000)).toBe(true);
    expect(Math.abs(root.getBoundingClientRect().height - h0)).toBeLessThan(0.5);
  });

  it("every line is mounted from the start; unrevealed lines are hidden, not absent", async () => {
    const host = await mount(<BootLog lines={lines} speed={40} gap={300} />, { width: 480 });
    const all = host.querySelectorAll<HTMLElement>("[data-slot=boot-log-line]");
    expect(all.length).toBe(lines.length);
    expect(getComputedStyle(all[lines.length - 1]!).visibility).toBe("hidden");
  });

  it("a click on the focused log skips to the end", async () => {
    const host = await mount(<BootLog lines={lines} speed={40} gap={300} />, { width: 480 });
    const log = host.querySelector<HTMLElement>("[role=log]")!;
    expect(log.tabIndex).toBe(0);
    log.click();
    await frames(2);
    const all = host.querySelectorAll<HTMLElement>("[data-slot=boot-log-line]");
    for (const el of all) expect(getComputedStyle(el).visibility).toBe("visible");
  });

  it("V4-266 status marks are a glyph plus the text tag", async () => {
    const host = await mount(<BootLog lines={lines} motion="off" />, { width: 480, motion: "off" });
    const fail = host.querySelector<HTMLElement>('[data-slot=boot-log-line][data-status="fail"]')!;
    expect(fail.querySelector("svg[data-glyph]")).not.toBeNull();
    expect(fail.textContent).toContain("[FAIL]");
  });

  it("V4-263 a fail line renders through Glitch once", async () => {
    const host = await mount(<BootLog lines={lines} speed={2} gap={10} />, { width: 480 });
    const fail = await until(() => host.querySelector<HTMLElement>('[data-slot=boot-log-line][data-status="fail"] [data-glitch]') !== null, 6000);
    expect(fail).toBe(true);
    const g = host.querySelector<HTMLElement>('[data-slot=boot-log-line][data-status="fail"] [data-glitch]')!;
    expect(g.dataset.text).toBe("ARCHIVE LINK");
  });
});

describe("V4-262 caret blinks only once the reveal is idle or finished", () => {
  it("no data-blink while typing; data-blink after done; none in reduced", async () => {
    const host = await mount(<Typer text={LONG} speed={30} />, { width: 360 });
    const caret = host.querySelector<HTMLElement>("[data-yorha-caret]")!;
    expect(caret.hasAttribute("data-blink")).toBe(false);
    expect(caret.classList.contains("yorha-caret")).toBe(true);
    const typer = host.querySelector<HTMLElement>("[data-slot=typer]")!;
    expect(await until(() => typer.dataset.state === "done", 8000)).toBe(true);
    expect(host.querySelector("[data-yorha-caret][data-blink]")).not.toBeNull();
  });

  it("reduced motion: the caret has no animation", async () => {
    const host = await mount(<Typer text="ALPHA" />, { motion: "reduced" });
    const caret = host.querySelector<HTMLElement>("[data-yorha-caret]")!;
    expect(getComputedStyle(caret).animationName).toBe("none");
  });
});

describe("V4-263 Glitch heading", () => {
  it("accessible name equals the text; data-text mirrors it", async () => {
    const host = await mount(<Glitch as="h1" text="SYSTEM FAULT" />);
    const h = host.querySelector<HTMLElement>("h1")!;
    expect(h.getAttribute("aria-label")).toBe("SYSTEM FAULT");
    expect(h.textContent).toBe("SYSTEM FAULT");
    expect(h.dataset.text).toBe("SYSTEM FAULT");
  });

  it("replay() through the ref starts a run; a second replay within 1000 ms is ignored", async () => {
    const ref = createRef<GlitchHandle>();
    await mount(<Glitch ref={ref} as="h1" text="SYSTEM FAULT" />);
    expect(ref.current!.replay()).toBe(true);
    expect(ref.current!.replay()).toBe(false);
  });
});

describe("V4-264 ProseTable focusable only while it overflows", () => {
  const table = (
    <ProseTable label="Units">
      <thead>
        <tr>
          <th scope="col">Unit</th>
          <th scope="col">Class</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>YK-08</td>
          <td>Type B</td>
        </tr>
      </tbody>
    </ProseTable>
  );

  it("fits: no tab stop on the region", async () => {
    const host = await mount(<Prose>{table}</Prose>, { width: 600 });
    const region = host.querySelector<HTMLElement>("[data-slot=prose-table-scroll]")!;
    expect(region.hasAttribute("tabindex")).toBe(false);
  });

  it("overflows: the region is a tab stop", async () => {
    const wide = (
      <ProseTable label="Units">
        <thead>
          <tr>
            {Array.from({ length: 12 }, (_, i) => (
              <th key={i} scope="col">
                Column heading {i}
              </th>
            ))}
          </tr>
        </thead>
      </ProseTable>
    );
    const host = await mount(<Prose>{wide}</Prose>, { width: 240 });
    const region = host.querySelector<HTMLElement>("[data-slot=prose-table-scroll]")!;
    expect(region.tabIndex).toBe(0);
  });
});

describe("V4-265 Decipher trigger=inview runs once, when it comes into view", () => {
  it("stays idle off screen, then reaches done once", async () => {
    const host = await mount(
      <div style={{ height: 3000 }}>
        <div style={{ position: "absolute", top: 2000 }}>
          <Decipher text="SECTOR 9" trigger="inview" />
        </div>
      </div>,
      { height: 2400, width: 400 },
    );
    const d = host.querySelector<HTMLElement>("[data-slot=decipher]")!;
    await frames(20);
    expect(d.dataset.state).toBe("idle");
    host.scrollTop = 0;
    host.parentElement?.scrollTo?.(0, 0);
    d.scrollIntoView({ block: "center" });
    expect(await until(() => d.dataset.state === "done", 5000)).toBe(true);
  });
});

describe("V4-267 Text expandable", () => {
  it("clamped text gets a 24 px expand control with aria-expanded; fitting text keeps it hidden", async () => {
    const host = await mount(<Text as="p" lineClamp={2} expandable width={200}>{LONG}</Text>, { width: 200 });
    const btn = host.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(btn.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    btn.click();
    await frames(2);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("text that fits: the control is visibility hidden (slot kept, no tab stop)", async () => {
    const host = await mount(<Text as="p" lineClamp={3} expandable>SHORT</Text>, { width: 400 });
    const btn = host.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
    expect(getComputedStyle(btn).visibility).toBe("hidden");
  });
});

describe("V4-268 ProseTable th without scope warns in dev", () => {
  it("warns for a th without scope", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await mount(
      <Prose>
        <ProseTable label="Bad">
          <thead>
            <tr>
              <th>Unit</th>
            </tr>
          </thead>
        </ProseTable>
      </Prose>,
    );
    expect(warn.mock.calls.some((c) => String(c[0]).includes("scope"))).toBe(true);
  });

  it("does not warn when every th has a scope", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await mount(
      <Prose>
        <ProseTable label="Good">
          <thead>
            <tr>
              <th scope="col">Unit</th>
            </tr>
          </thead>
        </ProseTable>
      </Prose>,
    );
    expect(warn.mock.calls.some((c) => String(c[0]).includes("scope"))).toBe(false);
  });
});

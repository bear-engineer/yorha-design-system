import { useState, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // storybook annotations + global css
import { frames } from "./mount";
import { Button, type ButtonSize, type ButtonVariant } from "../registry/yorha/ui/button/button";
import { IconButton } from "../registry/yorha/ui/icon-button/icon-button";
import { Toggle } from "../registry/yorha/ui/toggle/toggle";
import { ToggleGroup, ToggleGroupItem } from "../registry/yorha/ui/toggle-group/toggle-group";
import { Chip, ChipGroup } from "../registry/yorha/ui/chip/chip";
import { Badge } from "../registry/yorha/ui/badge/badge";
import { KbdCombo, useShortcut } from "../registry/yorha/ui/kbd/kbd";

// v4 f-act-a: V4-085..092. Geometry and computed style, never roles alone.

const mounted: { root: Root; host: HTMLElement }[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.host.remove();
  }
});

async function render(ui: ReactElement, motion = "full"): Promise<{ host: HTMLElement; root: Root }> {
  document.documentElement.dataset.motion = motion;
  const host = document.createElement("div");
  host.lang = "ko";
  host.style.cssText = "position:absolute;left:8px;top:8px;width:520px;padding:24px;background:var(--yorha-bg);color:var(--yorha-fg)";
  document.body.append(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  flushSync(() => root.render(ui));
  await frames(3);
  return { host, root };
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = <T extends Element = HTMLElement>(host: ParentNode, sel: string) => {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};
const rectOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(",");
};

describe("Button promise + result (V4-085)", () => {
  it("a promise onClick blocks re-entry; the glyph shows, then data-result clears", async () => {
    const calls = vi.fn(() => new Promise<void>((r) => setTimeout(r, 300)));
    const { host } = await render(<Button onClick={calls}>저장</Button>);
    const btn = q<HTMLButtonElement>(host, "button");
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(btn.getAttribute("aria-busy")).toBe("true");
    await wait(450);
    expect(btn.dataset.result).toBe("success");
    expect(btn.querySelector("[data-slot=button-result] svg[data-glyph=check]")).not.toBeNull();
    expect(host.querySelector("[aria-live=polite]")?.textContent).toBe("완료");
    await userEvent.click(btn);
    expect(calls).toHaveBeenCalledTimes(2);
    await wait(1900);
    expect(btn.dataset.result).toBeUndefined();
  });

  it("a rejected promise = error result with the alert glyph and 실패", async () => {
    const { host } = await render(<Button onClick={() => Promise.reject(new Error("x"))}>저장</Button>);
    const btn = q<HTMLButtonElement>(host, "button");
    await userEvent.click(btn);
    await wait(120);
    expect(btn.dataset.result).toBe("error");
    expect(btn.querySelector("[data-slot=button-result] svg[data-glyph=alert]")).not.toBeNull();
    expect(host.querySelector("[aria-live=polite]")?.textContent).toBe("실패");
  });

  it("rect is equal before / during / after for 3 sizes x 4 variants", async () => {
    const sizes: ButtonSize[] = ["sm", "md", "lg"];
    const variants: ButtonVariant[] = ["default", "primary", "ghost", "danger"];
    const Cell = ({ result, loading }: { result: "success" | "error" | null; loading: boolean }) => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, max-content)", gap: 8 }}>
        {sizes.flatMap((size) =>
          variants.map((variant) => (
            <Button key={`${size}${variant}`} size={size} variant={variant} result={result} loading={loading}>
              저장
            </Button>
          )),
        )}
      </div>
    );
    const { host, root } = await render(<Cell result={null} loading={false} />);
    const snap = () => [...host.querySelectorAll("button")].map(rectOf);
    const before = snap();
    expect(before).toHaveLength(12);
    flushSync(() => root.render(<Cell result={null} loading />));
    await frames(2);
    expect(snap()).toEqual(before);
    flushSync(() => root.render(<Cell result="success" loading={false} />));
    await frames(2);
    expect(snap()).toEqual(before);
    flushSync(() => root.render(<Cell result="error" loading={false} />));
    await frames(2);
    expect(snap()).toEqual(before);
    const cell = q(host, "[data-slot=button-result]");
    expect(getComputedStyle(cell).position).toBe("absolute");
  });

  it("loading wins over result", async () => {
    const { host } = await render(<Button loading result="success">저장</Button>);
    const btn = q(host, "button");
    expect(btn.dataset.loading).toBe("");
    expect(btn.querySelector("[data-slot=button-result]")).toBeNull();
  });
});

describe("Button busy bar easing (V4-086)", () => {
  const easingOf = (host: HTMLElement) => {
    const bar = q(host, "[data-slot=button-busy]");
    const anims = bar.getAnimations();
    return { count: anims.length, easing: anims[0] ? (anims[0].effect as KeyframeEffect).getTiming().easing : null };
  };
  it("full = step-flip, reduced = soft slow pulse, off = static", async () => {
    const flip = getComputedStyle(document.documentElement).getPropertyValue("--yorha-step-flip").trim();
    const full = await render(<Button loading>저장</Button>, "full");
    expect(easingOf(full.host)).toEqual({ count: 1, easing: flip });
    const reduced = await render(<Button loading>저장</Button>, "reduced");
    const r = easingOf(reduced.host);
    expect(r.count).toBe(1);
    expect(r.easing).not.toBe(flip);
    const off = await render(<Button loading>저장</Button>, "off");
    expect(easingOf(off.host).count).toBe(0);
    expect(getComputedStyle(q(off.host, "[data-slot=button-busy]")).opacity).toBe("1");
  });
});

describe("IconButton tooltip (V4-087)", () => {
  const find = () => document.querySelector<HTMLElement>("[role=tooltip]");
  async function until(fn: () => unknown, ms = 2500) {
    const t0 = Date.now();
    while (!fn() && Date.now() - t0 < ms) await wait(50);
  }
  it("hover shows the label, no aria-describedby; shortcut adds a Kbd", async () => {
    const { host } = await render(
      <IconButton aria-label="복사" shortcut="C">
        +
      </IconButton>,
    );
    const btn = q(host, "button");
    await userEvent.hover(btn);
    await until(find);
    expect(find()?.textContent).toContain("복사");
    expect(find()?.querySelector("kbd")?.textContent).toBe("C");
    expect(btn.getAttribute("aria-describedby")).toBeNull();
  });
  it("Tab focus shows it; tooltip={false} never does", async () => {
    const { host } = await render(
      <div>
        <IconButton aria-label="붙여넣기">+</IconButton>
        <IconButton aria-label="조용히" tooltip={false}>
          +
        </IconButton>
      </div>,
    );
    await userEvent.tab();
    await until(find);
    expect(find()?.textContent).toContain("붙여넣기");
    await userEvent.tab();
    await wait(900);
    expect(document.activeElement).toBe(host.querySelectorAll("button")[1]);
    expect(find()?.textContent ?? "").not.toContain("조용히");
  });
});

describe("Toggle bullet (V4-088)", () => {
  it("scale is none in both states; the filled bullet steps in opacity", async () => {
    const { host } = await render(
      <div>
        <Toggle>알림</Toggle>
        <ToggleGroup aria-label="보기" defaultValue={["a"]}>
          <ToggleGroupItem value="a">A</ToggleGroupItem>
          <ToggleGroupItem value="b">B</ToggleGroupItem>
        </ToggleGroup>
      </div>,
    );
    const marks = [
      q(host, "button[aria-pressed] span span"),
      ...host.querySelectorAll<HTMLElement>("[data-yorha-bullet] > span"),
    ];
    const toggle = q<HTMLButtonElement>(host, "button");
    for (let i = 0; i < 2; i++) {
      for (const m of marks) {
        expect(getComputedStyle(m).scale).toBe("none");
        expect(getComputedStyle(m).transform).toBe("none");
      }
      await userEvent.click(toggle);
      await wait(400);
    }
    expect(getComputedStyle(marks[0]!).opacity).toBe("0");
    const on = q(host, "[data-yorha-bullet] > span");
    expect(getComputedStyle(on).opacity).toBe("1");
    expect(getComputedStyle(marks[0]!).transitionTimingFunction).toContain("steps");
  });
});

describe("ToggleGroup required (V4-089)", () => {
  const Group = ({ required, onChange }: { required?: boolean; onChange?: (v: string[]) => void }) => (
    <ToggleGroup aria-label="정렬" defaultValue={["a"]} required={required} onValueChange={onChange}>
      <ToggleGroupItem value="a">A</ToggleGroupItem>
      <ToggleGroupItem value="b">B</ToggleGroupItem>
    </ToggleGroup>
  );
  it("clicking the pressed item keeps value and aria-pressed (default required)", async () => {
    const onChange = vi.fn();
    const { host } = await render(<Group onChange={onChange} />);
    const [a, b] = host.querySelectorAll("button");
    await userEvent.click(a!);
    expect(a!.getAttribute("aria-pressed")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(b!);
    expect(a!.getAttribute("aria-pressed")).toBe("false");
    expect(b!.getAttribute("aria-pressed")).toBe("true");
    expect(onChange).toHaveBeenCalledWith(["b"], expect.anything());
  });
  it("required={false} keeps the filter behaviour", async () => {
    const { host } = await render(<Group required={false} />);
    const a = q(host, "button");
    await userEvent.click(a);
    expect(a.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("ChipGroup (V4-090)", () => {
  function Chips() {
    const [items, setItems] = useState(["가", "나", "다"]);
    return (
      <>
        <ChipGroup aria-label="태그">
          {items.map((l) => (
            <Chip key={l} label={l} onRemove={() => setItems((s) => s.filter((x) => x !== l))} />
          ))}
        </ChipGroup>
        <button type="button">after</button>
      </>
    );
  }
  const chips = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-slot=chip]")];
  it("one tab stop, arrows rove, Delete removes and focus lands on the next", async () => {
    const { host } = await render(<Chips />);
    const tabbable = () =>
      [...host.querySelectorAll<HTMLElement>("button, [tabindex]")].filter((e) => e.tabIndex >= 0);
    expect(tabbable().filter((e) => e.closest("[data-slot=chip-group]"))).toHaveLength(1);
    await userEvent.tab();
    expect(document.activeElement).toBe(chips(host)[0]);
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(chips(host)[1]);
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(chips(host)[2]);
    await userEvent.keyboard("{Home}{ArrowRight}");
    await userEvent.keyboard("{Delete}");
    await frames(3);
    expect(chips(host).map((c) => c.textContent)).toEqual(["가", "다"]);
    expect(document.activeElement?.textContent).toContain("다");
    expect(host.querySelector("[aria-live=polite]")?.textContent).toBe("제거됨");
    await userEvent.keyboard("{Backspace}");
    await frames(3);
    expect(document.activeElement).toBe(chips(host)[0]); // last chip -> previous
    expect(chips(host).map((c) => c.textContent)).toEqual(["가"]);
  });
});

describe("KbdCombo + useShortcut (V4-091)", () => {
  const platform = Object.getOwnPropertyDescriptor(navigator, "platform");
  const setPlatform = (value: string) => Object.defineProperty(navigator, "platform", { value, configurable: true });
  beforeEach(() => setPlatform("Linux x86_64"));
  afterEach(() => {
    if (platform) Object.defineProperty(navigator, "platform", platform);
    else delete (navigator as unknown as Record<string, unknown>).platform;
  });

  it("mod is Ctrl off Apple, the Cmd mark on Apple", async () => {
    const a = await render(<KbdCombo keys={["mod", "K"]} />);
    expect([...a.host.querySelectorAll("kbd")].map((k) => k.textContent)).toEqual(["Ctrl", "K"]);
    setPlatform("MacIntel");
    const b = await render(<KbdCombo keys={["mod", "K"]} />);
    expect([...b.host.querySelectorAll("kbd")].map((k) => k.textContent)).toEqual(["⌘", "K"]);
  });

  function Probe({ onHit, allowInInput }: { onHit: () => void; allowInInput?: boolean }) {
    const props = useShortcut(["mod", "K"], onHit, { allowInInput });
    return (
      <div>
        <button type="button" {...props}>
          검색
        </button>
        <input aria-label="필드" />
      </div>
    );
  }
  const press = (target: Element, init: KeyboardEventInit) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));

  it("fires once; ignores inputs, repeats, IME and defaultPrevented; exposes aria-keyshortcuts", async () => {
    const hit = vi.fn();
    const { host } = await render(<Probe onHit={hit} />);
    expect(q(host, "button").getAttribute("aria-keyshortcuts")).toBe("Control+K");
    press(document.body, { key: "k", ctrlKey: true });
    expect(hit).toHaveBeenCalledTimes(1);
    press(q(host, "input"), { key: "k", ctrlKey: true });
    press(document.body, { key: "k", ctrlKey: true, repeat: true });
    press(document.body, { key: "k", ctrlKey: true, isComposing: true });
    press(document.body, { key: "k", metaKey: true });
    press(document.body, { key: "k" });
    expect(hit).toHaveBeenCalledTimes(1);
    const stop = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", stop, true);
    press(document.body, { key: "k", ctrlKey: true });
    window.removeEventListener("keydown", stop, true);
    expect(hit).toHaveBeenCalledTimes(1);
  });

  it("Apple uses Meta, and allowInInput lets text fields through", async () => {
    setPlatform("MacIntel");
    const hit = vi.fn();
    const { host } = await render(<Probe onHit={hit} allowInInput />);
    expect(q(host, "button").getAttribute("aria-keyshortcuts")).toBe("Meta+K");
    press(q(host, "input"), { key: "k", metaKey: true });
    press(document.body, { key: "k", ctrlKey: true });
    expect(hit).toHaveBeenCalledTimes(1);
  });
});

describe("Badge alert mark (V4-092)", () => {
  it("is the diamond glyph: no rotated box, transform none, two colours", async () => {
    const { host } = await render(<Badge variant="alert">경고</Badge>);
    const svg = q<SVGSVGElement>(host, "svg[data-glyph=diamond]");
    expect(getComputedStyle(svg).transform).toBe("none");
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(host.querySelector(".rotate-45")).toBeNull();
    for (const el of host.querySelectorAll("span")) expect(getComputedStyle(el).transform).toBe("none");
    const r = svg.getBoundingClientRect();
    expect(Number.isInteger(r.width) && Number.isInteger(r.height)).toBe(true);
    const badge = q(host, "[data-variant=alert]");
    expect(badge.getBoundingClientRect().height).toBe(24);
  });
});

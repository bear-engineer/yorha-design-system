import { createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import "./mount"; // storybook annotations + global css
import { frames } from "./mount";
import { Button } from "../registry/yorha/ui/button/button";
import { Toggle } from "../registry/yorha/ui/toggle/toggle";
import { Input } from "../registry/yorha/ui/input/input";
import { TextField } from "../registry/yorha/ui/text-field/text-field";
import { Textarea } from "../registry/yorha/ui/textarea/textarea";
import { NumberField } from "../registry/yorha/ui/number-field/number-field";
import { PasswordInput } from "../registry/yorha/ui/password-input/password-input";
import { SearchInput } from "../registry/yorha/ui/search-input/search-input";
import { ColorInput } from "../registry/yorha/ui/color-input/color-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../registry/yorha/ui/select/select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../registry/yorha/ui/tabs/tabs";

// v3 craft C2: kit consistency (C2-301..304, C2-106). One field fill, one control type size, one focus ring, no press scale.

const mounted: { root: Root; host: HTMLElement }[] = [];
afterEach(() => {
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.host.remove();
  }
});
async function render(ui: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = "ko";
  host.style.cssText = "padding:24px;width:520px;box-sizing:border-box;background:var(--yorha-bg);color:var(--yorha-fg)";
  document.body.append(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  root.render(ui);
  await frames(3);
  await document.fonts.ready;
  await frames(2);
  return host;
}
const css = (el: Element) => getComputedStyle(el);
const q = <T extends Element = HTMLElement>(host: ParentNode, sel: string) => {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

function fieldKit() {
  return createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 12 } },
    createElement(Input, { "aria-label": "input", defaultValue: "가" }),
    createElement(TextField, { label: "tf", defaultValue: "가" }),
    createElement(Textarea, { "aria-label": "ta", defaultValue: "가" }),
    createElement(NumberField, { label: "nf", defaultValue: 3 }),
    createElement(PasswordInput, { label: "pw", defaultValue: "abc" }),
    createElement(SearchInput, { label: "sr", defaultValue: "가" }),
    createElement(ColorInput, { label: "co", defaultValue: "#336699" }),
    createElement(
      Select,
      { items: [{ value: "a", label: "에이" }], defaultValue: "a" },
      createElement(SelectTrigger, { "aria-label": "sel" }, createElement(SelectValue, null)),
      createElement(SelectContent, null, createElement(SelectItem, { value: "a" }, "에이")),
    ),
  );
}

/** The painted frame of each field: the control itself, or its InputGroup frame. */
function frameOf(host: HTMLElement, label: string): Element {
  const sel: Record<string, string> = {
    input: '[aria-label="input"]',
    tf: "input",
    ta: '[aria-label="ta"]',
    sel: "[data-slot=select-trigger]",
  };
  if (sel[label]) return label === "tf" ? host.querySelectorAll("input")[1] : q(host, sel[label]);
  return null as never;
}

describe("C2-303 one field fill, C2-302 one field type size", () => {
  it("input, text-field, textarea, select trigger and every group field share fill and 17px body text", async () => {
    const host = await render(fieldKit());
    const frames_: Element[] = [
      frameOf(host, "input"),
      frameOf(host, "tf"),
      frameOf(host, "ta"),
      frameOf(host, "sel"),
      ...host.querySelectorAll("[data-slot=input-group]"),
    ];
    expect(frames_.length).toBeGreaterThanOrEqual(8);
    const ref = css(frames_[0]!).backgroundColor;
    const baseFs = css(host).getPropertyValue("--yorha-text-base");
    const probe = document.createElement("div");
    probe.style.fontSize = `var(--yorha-text-base)`;
    host.append(probe);
    const baseFont = css(probe).fontSize;
    probe.remove();
    expect(baseFs).not.toBe("");
    for (const f of frames_) {
      expect(css(f).backgroundColor, `${f.getAttribute("data-slot") ?? f.tagName} fill`).toBe(ref);
    }
    const typed = [...host.querySelectorAll("input, textarea"), q(host, "[data-slot=select-trigger]")].filter(
      (el) => !(el instanceof HTMLInputElement && (el.type === "color" || el.type === "hidden")),
    );
    for (const el of typed) expect(css(el).fontSize, `${el.tagName}.${el.getAttribute("type")} font`).toBe(baseFont);
  });

  it("labels use one size", async () => {
    const host = await render(fieldKit());
    const sizes = new Set([...host.querySelectorAll("label")].map((l) => css(l).fontSize));
    expect([...sizes], "label sizes").toHaveLength(1);
  });
});

describe("C2-304 button type ramp", () => {
  it("font-size is base-2 / base / base+2 (one 2px step per size, md = body size)", async () => {
    const host = await render(
      createElement("div", null,
        createElement(Button, { size: "sm" }, "가"),
        createElement(Button, { size: "md" }, "가"),
        createElement(Button, { size: "lg" }, "가"),
      ),
    );
    const [sm, md, lg] = [...host.querySelectorAll("button")].map((b) => parseFloat(css(b).fontSize));
    expect(md! - sm!).toBeGreaterThanOrEqual(2);
    expect(lg! - md!).toBeGreaterThanOrEqual(2);
    const probe = document.createElement("div");
    probe.style.fontSize = "var(--yorha-text-base)";
    host.append(probe);
    const base = parseFloat(css(probe).fontSize);
    probe.remove();
    expect([sm, md, lg]).toEqual([base - 2, base, base + 2]);
  });
});

describe("C2-301 tabs focus ring is the kit ring", () => {
  it("keyboard focus on a tab: 2px outline at +2px offset in the ring colour, same as a button", async () => {
    const host = await render(
      createElement("div", null,
        createElement(Button, null, "버튼"),
        createElement(Tabs, { defaultValue: "a" },
          createElement(TabsList, null, createElement(TabsTab, { value: "a" }, "하나"), createElement(TabsTab, { value: "b" }, "둘")),
          createElement(TabsPanel, { value: "a" }, "A"),
          createElement(TabsPanel, { value: "b" }, "B"),
        ),
      ),
    );
    await userEvent.tab();
    const btn = q(host, "button");
    expect(document.activeElement).toBe(btn);
    const ring = { w: css(btn).outlineWidth, o: css(btn).outlineOffset, c: css(btn).outlineColor };
    await userEvent.tab();
    const tab = document.activeElement as HTMLElement;
    expect(tab.getAttribute("role")).toBe("tab");
    expect(css(tab).outlineWidth).toBe(ring.w);
    expect(css(tab).outlineOffset).toBe(ring.o);
    expect(css(tab).outlineColor).toBe(ring.c);
  });
});

describe("C2-106 pressed never changes size", () => {
  it("button and toggle: no scale transition, scale stays none while the pointer is down", async () => {
    const host = await render(createElement("div", null, createElement(Button, null, "버튼"), createElement(Toggle, null, "토글")));
    for (const el of host.querySelectorAll("button")) {
      expect(css(el).transitionProperty, "scale not animated").not.toContain("scale");
      const r = el.getBoundingClientRect();
      await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: r.x + r.width / 2, y: r.y + r.height / 2 });
      await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x + r.width / 2, y: r.y + r.height / 2, button: "left", clickCount: 1 });
      await new Promise((res) => setTimeout(res, 300));
      expect(css(el).scale).toBe("none");
      const r2 = el.getBoundingClientRect();
      expect([r2.width, r2.height]).toEqual([r.width, r.height]);
      await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x + r.width / 2, y: r.y + r.height / 2, button: "left", clickCount: 1 });
    }
  });
});

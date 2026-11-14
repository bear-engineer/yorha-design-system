import { createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import "../src/styles/storybook.css";
import { Checkbox } from "../registry/yorha/ui/checkbox/checkbox";
import { Meter } from "../registry/yorha/ui/meter/meter";
import { Progress } from "../registry/yorha/ui/progress/progress";
import { Radio, RadioGroup } from "../registry/yorha/ui/radio-group/radio-group";
import { Switch } from "../registry/yorha/ui/switch/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../registry/yorha/ui/tabs/tabs";
import { Toggle } from "../registry/yorha/ui/toggle/toggle";

// B1/B4: under forced-colors the UA replaces background-color with Canvas, so fills built from bg-yorha-ink vanish.
// The kit's @media (forced-colors: active) rules must keep every on/off, selected and filled state distinguishable.

const frames = (n: number) => new Promise<void>((resolve) => {
  const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
  step(n);
});

const setForcedColors = (value: "active" | "none") =>
  cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value }] });

let host: HTMLElement;
let unmount: () => void;
async function render(node: ReactNode, attrs: Record<string, string> = {}) {
  host = document.createElement("div");
  host.setAttribute("lang", "ko");
  host.setAttribute("data-motion", "off");
  for (const [k, v] of Object.entries(attrs)) host.setAttribute(k, v);
  host.style.padding = "24px";
  document.body.append(host);
  const root = createRoot(host);
  root.render(node);
  unmount = () => { root.unmount(); host.remove(); };
  await frames(3);
  await document.fonts.ready;
}

beforeEach(async () => { await setForcedColors("active"); });
afterEach(async () => { unmount?.(); await setForcedColors("none"); });

const css = (el: Element) => getComputedStyle(el);
const q = <T extends Element>(selector: string, root: ParentNode = host) => {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`not found: ${selector}`);
  return el;
};
const transparent = (c: string) => c === "rgba(0, 0, 0, 0)" || c === "transparent";

describe("forced-colors: states stay distinguishable", () => {
  it("emulation is active", async () => {
    await render(createElement("p", null, "x"));
    expect(matchMedia("(forced-colors: active)").matches).toBe(true);
  });

  it("switch on and off differ in background and the thumb stays visible", async () => {
    await render(createElement("div", null, createElement(Switch, { defaultChecked: true, "aria-label": "on" }, "on"), createElement(Switch, { "aria-label": "off" }, "off")));
    const on = q("[role=switch][data-checked]");
    const off = q("[role=switch]:not([data-checked])");
    expect(css(on).backgroundColor).not.toBe(css(off).backgroundColor);
    expect(transparent(css(on).backgroundColor)).toBe(false);
    for (const sw of [on, off]) {
      const thumb = q("span", sw);
      expect(css(thumb).backgroundColor, "thumb differs from its track").not.toBe(css(sw).backgroundColor);
    }
  });

  it("selected tab differs from the others", async () => {
    await render(createElement(Tabs, { defaultValue: "a" },
      createElement(TabsList, { "aria-label": "t" }, createElement(TabsTab, { value: "a" }, "A"), createElement(TabsTab, { value: "b" }, "B")),
      createElement(TabsPanel, { value: "a" }, "pa"), createElement(TabsPanel, { value: "b" }, "pb")));
    const sel = q("[role=tab][aria-selected=true]");
    const other = q("[role=tab][aria-selected=false]");
    expect(css(sel).backgroundColor).not.toBe(css(other).backgroundColor);
    expect(css(sel).color).not.toBe(css(sel).backgroundColor);
  });

  it("progress and meter fills differ from their tracks", async () => {
    await render(createElement("div", { style: { width: 240 } }, createElement(Progress, { value: 40, label: "p" }), createElement(Meter, { value: 60, label: "m" })));
    for (const role of ["progressbar", "meter"]) {
      const root = q(`[role=${role}]`);
      const fill = [...root.querySelectorAll<HTMLElement>("div, span")].find((el) => el.className.includes("bg-yorha-ink") && el.getBoundingClientRect().width > 0);
      expect(fill, `${role} fill`).toBeTruthy();
      const track = fill!.parentElement!;
      expect(transparent(css(fill!).backgroundColor), `${role} fill colour`).toBe(false);
      expect(css(fill!).backgroundColor, `${role} fill vs track`).not.toBe(css(track).backgroundColor);
    }
  });

  it("checked checkbox, checked radio and pressed toggle differ from their off state", async () => {
    await render(createElement("div", null,
      createElement(Checkbox, { defaultChecked: true, "aria-label": "c1" }, "c1"), createElement(Checkbox, { "aria-label": "c0" }, "c0"),
      createElement(RadioGroup, { defaultValue: "a", "aria-label": "r" }, createElement(Radio, { value: "a" }, "a"), createElement(Radio, { value: "b" }, "b")),
      createElement(Toggle, { defaultPressed: true }, "on"), createElement(Toggle, null, "off")));
    const cbOn = q("[role=checkbox][data-checked]");
    const cbOff = q("[role=checkbox]:not([data-checked])");
    expect(css(cbOn).backgroundColor).not.toBe(css(cbOff).backgroundColor);
    const rOn = q("[role=radio][data-checked]");
    const rOff = q("[role=radio]:not([data-checked])");
    const dot = (r: Element) => q("span", r);
    // the dot is only painted when checked: either its fill or the control's own colours differ
    expect(`${css(rOn).backgroundColor}|${css(dot(rOn)).backgroundColor}|${css(dot(rOn)).opacity}`)
      .not.toBe(`${css(rOff).backgroundColor}|${css(dot(rOff)).backgroundColor}|${css(dot(rOff)).opacity}`);
    expect(transparent(css(dot(rOn)).backgroundColor)).toBe(false);
    const tOn = q("button[data-pressed]");
    const tOff = q("button:not([data-pressed])");
    expect(css(tOn).backgroundColor).not.toBe(css(tOff).backgroundColor);
  });

  it("heading-style text-shadow is none under forced colors", async () => {
    await render(createElement("h2", { className: "text-shadow-yorha" }, "title"));
    expect(css(q("h2")).textShadow).toBe("none");
  });
});

describe("base css", () => {
  it("high-contrast theme drops the text shadow", async () => {
    await setForcedColors("none");
    await render(createElement("h2", { className: "text-shadow-yorha" }, "title"), { "data-theme": "high-contrast" });
    expect(css(q("h2")).textShadow).toBe("none");
  });

  it("light theme keeps the decorative text shadow", async () => {
    await setForcedColors("none");
    await render(createElement("h2", { className: "text-shadow-yorha" }, "title"), { "data-theme": "light" });
    expect(css(q("h2")).textShadow).not.toBe("none");
  });

  it("table cells wrap at word breaks, links and code may break anywhere (B2)", async () => {
    await setForcedColors("none");
    await render(createElement("div", null, createElement("table", null, createElement("tbody", null, createElement("tr", null, createElement("td", null, "유닛 2B"), createElement("th", null, "HP")))), createElement("a", { href: "#x" }, "link"), createElement("code", null, "code")));
    expect(css(q("td")).overflowWrap).toBe("break-word");
    expect(css(q("th")).overflowWrap).toBe("break-word");
    expect(css(q("a")).overflowWrap).toBe("anywhere");
    expect(css(q("code")).overflowWrap).toBe("anywhere");
  });

  it("mobile base: tap highlight off, manipulation on controls, text-size-adjust 100% (B5)", async () => {
    await setForcedColors("none");
    await render(createElement("div", null, createElement("button", { type: "button" }, "b"), createElement("a", { href: "#x" }, "a"), createElement("input", {})));
    expect(css(document.documentElement).getPropertyValue("-webkit-text-size-adjust")).toBe("100%");
    expect(css(document.body).getPropertyValue("-webkit-tap-highlight-color")).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    for (const sel of ["button", "a", "input"]) expect(css(q(sel)).touchAction, sel).toBe("manipulation");
  });
});

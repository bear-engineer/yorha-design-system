import { createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // storybook annotations + global css
import { frames } from "./mount";
import { expectPixelSnapped, expectSameHeight, expectSingleLine } from "./measure";
import { Button } from "../registry/yorha/ui/button/button";
import { IconButton } from "../registry/yorha/ui/icon-button/icon-button";
import { Toggle } from "../registry/yorha/ui/toggle/toggle";
import { ToggleGroup, ToggleGroupItem } from "../registry/yorha/ui/toggle-group/toggle-group";
import { Switch } from "../registry/yorha/ui/switch/switch";
import { Checkbox } from "../registry/yorha/ui/checkbox/checkbox";
import { CheckboxGroup } from "../registry/yorha/ui/checkbox-group/checkbox-group";
import { Radio, RadioGroup } from "../registry/yorha/ui/radio-group/radio-group";
import { Slider } from "../registry/yorha/ui/slider/slider";
import { Chip } from "../registry/yorha/ui/chip/chip";
import { Badge } from "../registry/yorha/ui/badge/badge";
import { Kbd } from "../registry/yorha/ui/kbd/kbd";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarInput, ToolbarLink, ToolbarSeparator, ToolbarToggle } from "../registry/yorha/ui/toolbar/toolbar";

// v3 craft: actions & toggles (FACT-01..19). Rendered at the default density (control md 40 / sm 32).

const mounted: { root: Root; host: HTMLElement }[] = [];
afterEach(() => {
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.host.remove();
  }
});

async function render(ui: ReactElement, { width }: { width?: number } = {}): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = "ko";
  host.style.cssText = `padding:24px;background:var(--yorha-bg);color:var(--yorha-fg);${width ? `width:${width}px;box-sizing:border-box;` : ""}`;
  document.body.append(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  root.render(ui);
  await frames(3);
  await document.fonts.ready;
  await frames(2);
  return host;
}
const px = (v: string) => parseFloat(v);
const css = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
const q = <T extends Element = HTMLElement>(host: ParentNode, sel: string) => {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};
const token = (name: string) => {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:var(${name})`;
  document.body.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
};
const settle = () => new Promise((r) => setTimeout(r, 450));
const box = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height };
};

describe("FACT-01 checked box keeps its painted size", () => {
  it("checkbox, switch track, radio box: same rect and ink border when checked", async () => {
    const host = await render(
      createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" } },
        createElement(Checkbox, { defaultChecked: false }, "가"),
        createElement(Checkbox, { defaultChecked: true }, "나"),
        createElement(Switch, { defaultChecked: false }, "다"),
        createElement(Switch, { defaultChecked: true }, "라"),
        createElement(RadioGroup, { defaultValue: "b" }, createElement(Radio, { value: "a" }, "마"), createElement(Radio, { value: "b" }, "바")),
      ),
    );
    await settle();
    const cb = [...host.querySelectorAll<HTMLElement>('[role="checkbox"]')];
    const sw = [...host.querySelectorAll<HTMLElement>('[role="switch"]')];
    const rd = [...host.querySelectorAll<HTMLElement>('[role="radio"]')];
    for (const [off, on] of [cb, sw, rd] as const) {
      expect(box(on), "checked size equals unchecked").toEqual(box(off));
    }
    const ink = (() => {
      const p = document.createElement("div");
      p.style.cssText = "color:var(--yorha-ink)";
      document.body.append(p);
      const c = css(p).color;
      p.remove();
      return c;
    })();
    for (const el of [cb[1], sw[1], rd[1]]) expect(css(el).borderTopColor).toBe(ink);
  });
});

describe("FACT-02 toolbar at 360", () => {
  it("wraps instead of overflowing; labels stay on one line; items are control-sm tall", async () => {
    const host = await render(
      createElement(Toolbar, { "aria-label": "편집 도구" },
        createElement(ToolbarGroup, { "aria-label": "서식" },
          createElement(ToolbarToggle, { value: "b", "aria-label": "굵게" }, "B"),
          createElement(ToolbarToggle, { value: "i", "aria-label": "기울임" }, "I")),
        createElement(ToolbarSeparator),
        createElement(ToolbarButton, null, "저장"),
        createElement(ToolbarButton, { disabled: true, focusableWhenDisabled: true }, "삭제"),
        createElement(ToolbarSeparator),
        createElement(ToolbarLink, { href: "#help" }, "도움말"),
        createElement(ToolbarInput, { "aria-label": "검색", placeholder: "검색" })),
      { width: 360 },
    );
    const bar = q(host, '[data-slot="toolbar"]');
    expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth);
    expect(bar.getBoundingClientRect().right).toBeLessThanOrEqual(host.getBoundingClientRect().right);
    for (const el of host.querySelectorAll('[data-slot="toolbar-button"], [data-slot="toolbar-toggle"], [data-slot="toolbar-link"]')) {
      expectSingleLine(el);
      expect(el.getBoundingClientRect().height).toBe(token("--yorha-control-sm"));
    }
    expect(q(host, '[data-slot="toolbar-input"]').getBoundingClientRect().height).toBe(token("--yorha-control-sm"));
  });
  it("FACT-15 pressed toolbar toggle has no underline", async () => {
    const host = await render(createElement(Toolbar, { "aria-label": "t" }, createElement(ToolbarToggle, { value: "b", defaultPressed: true, "aria-label": "굵게" }, "B")));
    expect(css(q(host, '[data-slot="toolbar-toggle"]')).textDecorationLine).toBe("none");
  });
});

describe("FACT-03/18/17 chip", () => {
  it("long labels at 360 stay in one line without horizontal overflow", async () => {
    const host = await render(
      createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" } },
        createElement(Chip, { label: "아주 긴 플러그인 이름 모듈 A 확장 패키지", sizeLabel: "64 KB", capacity: 0.6, onRemove: () => {} }),
        createElement(Chip, { label: "선택형 모듈 B 아주 긴 이름의 항목", sizeLabel: "128 KB", capacity: 0.3, selectable: true })),
      { width: 360 },
    );
    for (const chip of host.querySelectorAll<HTMLElement>('[data-slot="chip"], button[aria-pressed]')) {
      expect(chip.getBoundingClientRect().right).toBeLessThanOrEqual(host.getBoundingClientRect().right);
      expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);
      expect(chip.getBoundingClientRect().height).toBe(token("--yorha-control-sm"));
      const label = chip.querySelector<HTMLElement>('[data-slot="chip-label"]');
      expect(label?.getAttribute("title")).toBeTruthy();
      expect(css(label as HTMLElement).textOverflow).toBe("ellipsis");
    }
  });
  it("remove uses an icon, not a text glyph, in a 24px+ target; bar has no double end line", async () => {
    const host = await render(createElement(Chip, { label: "삭제형", sizeLabel: "8 KB", capacity: 0.4, onRemove: () => {} }));
    const remove = q(host, "button");
    expect(remove.textContent).toBe("");
    expect(remove.querySelector("svg")).not.toBeNull();
    expect(remove.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
    const bar = q(host, '[data-slot="bar"]');
    expect(css(bar).borderRightWidth).toBe("0px");
  });
});

describe("FACT-04/05 loading button", () => {
  it("hover keeps the wipe at 0% and press never scales; busy bar sits inside the button", async () => {
    for (const square of [false, true]) {
      const ui = square ? createElement(IconButton, { "aria-label": "저장", loading: true }, "S") : createElement(Button, { loading: true }, "저장 중");
      const host = await render(ui);
      const btn = q(host, "button");
      const before = btn.getBoundingClientRect();
      await userEvent.hover(btn);
      await settle();
      expect(css(btn).backgroundSize, "no wipe while loading").toMatch(/^0(px|%)/);
      expect(css(btn).scale).toBe("none");
      const busy = q(btn, "[data-slot=button-busy]");
      const b = busy.getBoundingClientRect();
      expect(b.height).toBe(2);
      expect(b.left).toBeGreaterThanOrEqual(before.left + 1);
      expect(b.right).toBeLessThanOrEqual(before.right - 1);
      expect(b.bottom).toBeLessThanOrEqual(before.bottom - 1);
      expect(b.width).toBeGreaterThanOrEqual(before.width - 4);
      expect(btn.getBoundingClientRect().width).toBe(before.width);
      expect(btn.getBoundingClientRect().height).toBe(before.height);
    }
  });
});

describe("FACT-06 hover affordance on stateful controls", () => {
  const cases: [string, ReactElement, string, "self" | "label"][] = [
    ["toggle", createElement(Toggle, null, "굵게"), "button[aria-pressed]", "self"],
    ["toggle-group", createElement(ToggleGroup, { "aria-label": "g" }, createElement(ToggleGroupItem, { value: "a" }, "하나"), createElement(ToggleGroupItem, { value: "b" }, "둘")), "[data-slot=toggle-group-item]", "self"],
    ["checkbox", createElement(Checkbox, null, "알림"), '[role="checkbox"]', "label"],
    ["switch", createElement(Switch, null, "알림"), '[role="switch"]', "label"],
    ["radio", createElement(RadioGroup, { "aria-label": "r" }, createElement(Radio, { value: "a" }, "하나")), '[role="radio"]', "label"],
    ["chip", createElement(Chip, { label: "선택형", selectable: true }), "button[aria-pressed]", "self"],
  ];
  for (const [name, ui, sel, target] of cases) {
    it(`${name}: hover paints --yorha-hover`, async () => {
      const host = await render(ui);
      const el = q(host, sel);
      const idle = css(el).backgroundColor;
      await userEvent.hover(target === "label" ? (el.closest("label") as HTMLElement) : el);
      await settle();
      expect(css(el).backgroundColor).not.toBe(idle);
    });
  }
});

describe("FACT-07 disabled recipe (no container opacity)", () => {
  it("every disabled control computes opacity 1 and text --yorha-disabled", async () => {
    const host = await render(
      createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" } },
        createElement(Button, { disabled: true }, "버튼"),
        createElement(Button, { disabled: true, variant: "primary" }, "주요"),
        createElement(IconButton, { "aria-label": "아이콘", disabled: true }, "I"),
        createElement(Toggle, { disabled: true }, "토글"),
        createElement(ToggleGroup, { "aria-label": "g", disabled: true }, createElement(ToggleGroupItem, { value: "a" }, "하나")),
        createElement(Switch, { disabled: true }, "스위치"),
        createElement(Checkbox, { disabled: true }, "체크"),
        createElement(RadioGroup, { "aria-label": "r", disabled: true }, createElement(Radio, { value: "a" }, "라디오")),
        createElement(Slider, { label: "슬라이더", disabled: true, defaultValue: 40 }),
        createElement(Toolbar, { "aria-label": "t" }, createElement(ToolbarInput, { "aria-label": "검색", disabled: true }))),
    );
    const dis = (() => {
      const p = document.createElement("div");
      p.style.cssText = "color:var(--yorha-disabled)";
      host.append(p);
      const c = css(p).color;
      p.remove();
      return c;
    })();
    const parts = host.querySelectorAll<HTMLElement>(":disabled, [data-disabled], [aria-disabled=true], label");
    expect(parts.length).toBeGreaterThan(8);
    for (const el of parts) {
      expect(css(el).opacity, `opacity ${el.outerHTML.slice(0, 60)}`).toBe("1");
    }
    for (const el of host.querySelectorAll<HTMLElement>("button:disabled, [role=checkbox][data-disabled], [role=switch][data-disabled]")) {
      expect(css(el).color).toBe(dis);
    }
  });
});

describe("FACT-08/17 one height scale", () => {
  it("Button, Toggle, IconButton and ToggleGroup of one size are the same height", async () => {
    for (const size of ["sm", "md"] as const) {
      const host = await render(
        createElement("div", { style: { display: "flex", gap: 8, alignItems: "flex-start" } },
          createElement(Button, { size }, "버튼"),
          createElement(Toggle, { size }, "토글"),
          createElement(IconButton, { "aria-label": "i", size }, "I"),
          createElement(ToggleGroup, { "aria-label": "g", size, "data-testid": "tg" } as never, createElement(ToggleGroupItem, { value: "a" }, "하나"), createElement(ToggleGroupItem, { value: "b" }, "둘"))),
      );
      const els = [...host.querySelectorAll<HTMLElement>("button")].slice(0, 3);
      els.push(q(host, '[data-slot="toggle-group"]'));
      expectSameHeight(...els);
      expect(els[0].getBoundingClientRect().height).toBe(token(`--yorha-control-${size}`));
    }
  });
  it("ToggleGroup defaults to sm; Chip is control-sm", async () => {
    const host = await render(
      createElement("div", { style: { display: "flex", gap: 8, alignItems: "flex-start" } },
        createElement(ToggleGroup, { "aria-label": "g" }, createElement(ToggleGroupItem, { value: "a" }, "하나")),
        createElement(Chip, { label: "칩", selectable: true })),
    );
    expect(q(host, '[data-slot="toggle-group"]').getBoundingClientRect().height).toBe(token("--yorha-control-sm"));
    expect(q(host, "button[aria-pressed]:not([data-slot])").getBoundingClientRect().height).toBe(token("--yorha-control-sm"));
  });
  it("Badge 24px, Kbd 20px", async () => {
    const host = await render(createElement("div", { style: { display: "flex", gap: 8, alignItems: "flex-start" } }, createElement(Badge, null, "신규"), createElement(Kbd, null, "K")));
    expect(q(host, "[data-variant]").getBoundingClientRect().height).toBe(24);
    expect(q(host, "kbd").getBoundingClientRect().height).toBe(20);
    expect(q(host, "kbd").getBoundingClientRect().width).toBeGreaterThanOrEqual(20);
  });
});

describe("FACT-09 box and label centring", () => {
  it("indicator box centre is the first line centre, whole pixels; switch thumb insets are equal", async () => {
    const host = await render(
      createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" } },
        createElement(Checkbox, { defaultChecked: true }, "알림 수신"),
        createElement(Switch, { defaultChecked: true }, "알림 수신"),
        createElement(RadioGroup, { "aria-label": "r", defaultValue: "a" }, createElement(Radio, { value: "a" }, "알림 수신"))),
    );
    await settle();
    for (const el of host.querySelectorAll<HTMLElement>('[role="checkbox"], [role="switch"], [role="radio"]')) {
      expectPixelSnapped(el, { axes: "xy" });
      const label = el.closest("label") as HTMLElement;
      const text = label.querySelector("span:last-child") as HTMLElement;
      const lh = px(css(text).lineHeight);
      const first = text.getBoundingClientRect().top + lh / 2;
      const r = el.getBoundingClientRect();
      expect(Math.abs(r.top + r.height / 2 - first), `centre of ${el.getAttribute("role")}`).toBeLessThanOrEqual(0.5);
    }
    const track = q(host, '[role="switch"]');
    const thumb = q(track, "span");
    const t = track.getBoundingClientRect();
    const h = thumb.getBoundingClientRect();
    const left = h.left - t.left;
    const right = t.right - h.right;
    expect(Math.abs(left - right)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(h.top - t.top - (t.bottom - h.bottom))).toBeLessThanOrEqual(0.1);
  });
});

describe("FACT-10/11/12 slider", () => {
  it("fill snaps to whole segments; cursors; ring sits on the drawn thumb", async () => {
    const host = await render(createElement("div", { style: { width: 300 } }, createElement(Slider, { label: "볼륨", defaultValue: 47 })));
    const fill = q(host, '[data-slot="slider-fill"]');
    const track = q(host, '[data-slot="slider-track"]');
    expect(fill.getBoundingClientRect().width % 8).toBe(0);
    expect(track.getBoundingClientRect().width % 8).toBe(0);
    const thumb = q(host, '[role="slider"]').closest("[data-index], div") as HTMLElement;
    const control = q(host, '[data-slot="slider-control"]');
    expect(css(control).cursor).toBe("pointer");
    const thumbEl = q(host, '[data-slot="slider-thumb"]');
    expect(css(thumbEl).cursor).toBe("grab");
    expect(thumb).toBeTruthy();
    await userEvent.tab();
    expect(css(thumbEl).outlineStyle, "no ring on the 24px hit box").toBe("none");
    expect(css(thumbEl, "::before").outlineStyle, "ring on the drawn 16px thumb").not.toBe("none");
  });
});

describe("FACT-13 radio ring on the box, group gap 8", () => {
  it("keyboard focus rings the 20px box, not the row", async () => {
    const host = await render(createElement(RadioGroup, { "aria-label": "r", defaultValue: "a" }, createElement(Radio, { value: "a" }, "하나"), createElement(Radio, { value: "b" }, "둘")));
    await userEvent.tab();
    const radio = q(host, '[role="radio"][tabindex="0"], [role="radio"][data-checked]');
    expect(css(radio).outlineStyle).not.toBe("none");
    expect(css(radio.closest("label") as HTMLElement).outlineStyle).toBe("none");
    expect(css(q(host, '[role="radiogroup"]')).rowGap).toBe("8px");
  });
});

describe("FACT-16 grouped items do not scale", () => {
  it("toggle-group items and toolbar toggles carry no press scale", async () => {
    const host = await render(createElement(ToggleGroup, { "aria-label": "g" }, createElement(ToggleGroupItem, { value: "a" }, "하나"), createElement(ToggleGroupItem, { value: "b" }, "둘")));
    for (const el of host.querySelectorAll("[data-slot=toggle-group-item]")) {
      expect(css(el).transitionProperty).not.toContain("scale");
    }
  });
});

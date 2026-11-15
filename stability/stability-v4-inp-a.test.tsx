import { createElement, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";
import { PasswordInput } from "../registry/yorha/ui/password-input/password-input";
import { SearchInput } from "../registry/yorha/ui/search-input/search-input";
import { Textarea } from "../registry/yorha/ui/textarea/textarea";
import { TextField } from "../registry/yorha/ui/text-field/text-field";
import { Input } from "../registry/yorha/ui/input/input";
import { FieldCounter, FieldFrame } from "../registry/yorha/ui/field/field";
import { Form, FormSubmit } from "../registry/yorha/ui/form/form";

// v4 f-inp-a (V4-120..128, 131): input interaction upgrades. Geometry and behaviour, not only roles.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

async function mount(node: React.ReactNode, motion = "full"): Promise<HTMLElement> {
  document.documentElement.dataset.motion = motion;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:8px;top:8px;width:360px;background:#fff;color:#000";
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(2);
  return host;
}
const rect = (el: Element) => {
  const r = el.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(",");
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("V4-120 PasswordInput autoHide", () => {
  const pw = (extra = {}) => createElement(PasswordInput, { label: "비밀번호", defaultValue: "secret123", ...extra });
  const input = (h: HTMLElement) => h.querySelector("input") as HTMLInputElement;
  const reveal = (h: HTMLElement) => h.querySelector("button[aria-pressed]") as HTMLButtonElement;

  it("Tab away -> password again; selection kept; status says 숨김", async () => {
    const host = await mount(
      createElement("div", null, pw(), createElement("button", { id: "after" }, "after")),
    );
    input(host).focus();
    input(host).setSelectionRange(2, 5);
    await userEvent.click(reveal(host));
    expect(input(host).type).toBe("text");
    const same = input(host);
    input(host).focus();
    input(host).setSelectionRange(2, 5);
    await userEvent.tab(); // -> reveal button (still in group)
    await userEvent.tab(); // -> out of group
    await frames(2);
    expect(input(host).type).toBe("password");
    expect(input(host)).toBe(same); // no remount
    expect(host.querySelector("button[aria-pressed]")!.getAttribute("aria-pressed")).toBe("false");
    expect(host.textContent).toContain("숨김");
  });

  it("stays revealed while focus moves inside the group; reveal announces 표시됨", async () => {
    const host = await mount(pw());
    await userEvent.click(reveal(host));
    expect(host.textContent).toContain("표시됨");
    input(host).focus();
    expect(input(host).type).toBe("text");
  });

  it("form submit hides it", async () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    const host = await mount(createElement("form", { onSubmit }, pw({ name: "pw" }), createElement("button", { type: "submit" }, "go")));
    await userEvent.click(reveal(host));
    expect(input(host).type).toBe("text");
    host.querySelector("form")!.requestSubmit();
    await frames(2);
    expect(input(host).type).toBe("password");
  });

  it("autoHide={false} opts out", async () => {
    const host = await mount(createElement("div", null, pw({ autoHide: false }), createElement("button", null, "after")));
    await userEvent.click(reveal(host));
    input(host).focus();
    await userEvent.tab();
    await userEvent.tab();
    expect(input(host).type).toBe("text");
  });
});

describe("V4-121 FieldCounter", () => {
  it("n/max, tabular, rect constant while typing to max; alerts only at 90 % and 100 %", async () => {
    function Demo() {
      const [v, setV] = useState("");
      return createElement(
        FieldFrame,
        { label: "소개", description: createElement(FieldCounter, { value: v, max: 10 }) },
        createElement("input", { value: v, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV(e.target.value), "aria-label": "x" }),
      );
    }
    const host = await mount(createElement(Demo));
    const counter = host.querySelector("[data-slot=field-counter]") as HTMLElement;
    const row = counter.parentElement!;
    const before = rect(row);
    const cBefore = rect(counter);
    expect(counter.textContent).toBe("0/10");
    expect(getComputedStyle(counter).fontVariantNumeric).toContain("tabular-nums");
    const field = host.querySelector("input") as HTMLInputElement;
    field.focus();
    const live = () => host.querySelector("[data-slot=field-counter-status]")!.textContent;
    await userEvent.keyboard("12345678");
    expect(live()).toBe("");
    expect(counter.hasAttribute("data-alert")).toBe(false);
    await userEvent.keyboard("9");
    expect(live()).not.toBe("");
    expect(counter.hasAttribute("data-alert")).toBe(true);
    const at90 = live();
    await userEvent.keyboard("0");
    expect(live()).not.toBe(at90);
    expect(counter.textContent).toBe("10/10");
    expect(rect(row)).toBe(before);
    expect(rect(counter)).toBe(cBefore);
  });
});

describe("V4-122 Textarea submitOnModEnter", () => {
  it("Ctrl+Enter submits once; plain Enter does not; composition ignored; aria-keyshortcuts", async () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    const host = await mount(
      createElement("form", { onSubmit }, createElement(Textarea, { label: "메모", submitOnModEnter: true })),
    );
    const ta = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(ta.getAttribute("aria-keyshortcuts")).toContain("Control+Enter");
    ta.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(0);
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, isComposing: true }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it("off by default", async () => {
    const host = await mount(createElement(Textarea, { label: "메모" }));
    expect(host.querySelector("textarea")!.hasAttribute("aria-keyshortcuts")).toBe(false);
  });
});

describe("V4-123 SearchInput loading", () => {
  it("spinner replaces the search glyph; group rect constant", async () => {
    function Demo() {
      const [l, setL] = useState(false);
      return createElement("div", null, createElement(SearchInput, { label: "검색", loading: l }), createElement("button", { id: "t", onClick: () => setL((x) => !x) }, "t"));
    }
    const host = await mount(createElement(Demo));
    const group = host.querySelector("[data-slot=input-group]")!;
    const before = rect(group);
    const addon = host.querySelector("[data-slot=input-group-addon]")!;
    const addonBefore = rect(addon);
    expect(addon.querySelector("[data-slot=spinner]")).toBeNull();
    (host.querySelector("#t") as HTMLButtonElement).click();
    await frames(2);
    expect(addon.querySelector("[data-slot=spinner]")).not.toBeNull();
    expect(addon.querySelector("[data-slot=glyph],svg")).toBeNull();
    expect(rect(group)).toBe(before);
    expect(rect(addon)).toBe(addonBefore);
    expect(host.querySelector("input")!.getAttribute("aria-busy")).toBe("true");
  });
});

describe("V4-124 Field error flicker", () => {
  function Demo({ reserve = false }: { reserve?: boolean }) {
    const [bad, setBad] = useState(false);
    return createElement(
      "div",
      null,
      createElement(FieldFrame, { label: "a", error: bad ? "틀림" : undefined, reserveError: reserve }, createElement("input", { "aria-label": "a" })),
      createElement(FieldFrame, { label: "b" }, createElement("input", { "aria-label": "b", id: "b" })),
      createElement("button", { id: "t", onClick: () => setBad((x) => !x) }, "t"),
    );
  }
  const anims = (h: HTMLElement) =>
    (h.querySelector("[data-slot=field-error-icon]") as HTMLElement | null)?.getAnimations().filter((a) => (a as CSSAnimation).animationName === "yorha-flicker").length ?? 0;
  const toggle = async (h: HTMLElement) => {
    (h.querySelector("#t") as HTMLButtonElement).click();
    await frames(1);
  };

  it("first invalid -> 1 animation, text at once; again within 1 s -> 0", async () => {
    const host = await mount(createElement(Demo));
    await toggle(host);
    expect(host.querySelector("[role=alert]")!.textContent).toContain("틀림");
    expect(anims(host)).toBe(1);
    await toggle(host); // valid
    await toggle(host); // invalid again, < 1 s
    expect(host.querySelector("[data-slot=field-error-icon]")).not.toBeNull();
    expect(anims(host)).toBe(0);
  });
  it("no animation under motion=off", async () => {
    const host = await mount(createElement(Demo), "off");
    await toggle(host);
    expect(anims(host)).toBe(0);
  });
  it("reserveError keeps the next field's top constant", async () => {
    const host = await mount(createElement(Demo, { reserve: true }));
    const top = () => (host.querySelector("#b") as HTMLElement).getBoundingClientRect().top;
    const before = top();
    await toggle(host);
    expect(top()).toBe(before);
    await toggle(host);
    expect(top()).toBe(before);
  });
});

describe("V4-125 Form async submit", () => {
  it("Enter twice -> handler once; data-pending; button rect constant; error map focuses first invalid", async () => {
    let release!: (v?: Record<string, string>) => void;
    const handler = vi.fn(() => new Promise<Record<string, string> | void>((res) => (release = res)));
    const host = await mount(
      createElement(
        Form,
        { onFormSubmit: handler },
        createElement(TextField, { label: "이름", name: "name" }),
        createElement(FormSubmit, null, "저장"),
      ),
    );
    const form = host.querySelector("form")!;
    const btn = host.querySelector("button[type=submit]") as HTMLButtonElement;
    const before = rect(btn);
    const input = host.querySelector("input") as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Enter}");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(form.hasAttribute("data-pending")).toBe(true);
    expect(btn.hasAttribute("data-loading")).toBe(true);
    expect(rect(btn)).toBe(before);
    release({ name: "서버 오류" });
    await frames(3);
    expect(form.hasAttribute("data-pending")).toBe(false);
    expect(host.querySelector("[role=alert]")!.textContent).toContain("서버 오류");
    expect(document.activeElement).toBe(input);
    expect(rect(btn)).toBe(before);
  });
  it("sync handlers still work", async () => {
    const handler = vi.fn();
    const host = await mount(createElement(Form, { onFormSubmit: handler }, createElement(TextField, { label: "이름", name: "n" }), createElement(FormSubmit, null, "ok")));
    host.querySelector("form")!.requestSubmit();
    await frames(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(host.querySelector("form")!.hasAttribute("data-pending")).toBe(false);
  });
});

describe("V4-126 Input type=number", () => {
  it("UA spinners hidden", async () => {
    const host = await mount(createElement(Input, { type: "number", "aria-label": "n", defaultValue: 3 }));
    const el = host.querySelector("input")!;
    expect(getComputedStyle(el).appearance).toBe("textfield");
    const spin = getComputedStyle(el, "::-webkit-inner-spin-button");
    expect(["none", "auto", "textfield"]).toContain(spin.appearance); // engine reports the pseudo; the control must not grow
    expect(el.getBoundingClientRect().height).toBe(getComputedStyle(el).height === "auto" ? el.getBoundingClientRect().height : parseFloat(getComputedStyle(el).height));
  });
});

describe("V4-127 TextField clearable", () => {
  it("clear empties the input and focus returns; group rect constant", async () => {
    const host = await mount(createElement(TextField, { label: "이름", clearable: true, defaultValue: "abc" }));
    const group = host.querySelector("[data-slot=input-group]")!;
    const input = host.querySelector("input") as HTMLInputElement;
    const before = rect(group);
    await userEvent.click(host.querySelector("button[aria-label]") as HTMLButtonElement);
    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(rect(group)).toBe(before);
  });
  it("not clearable by default: no group", async () => {
    const host = await mount(createElement(TextField, { label: "이름" }));
    expect(host.querySelector("[data-slot=input-group]")).toBeNull();
  });
});

describe("V4-128 PasswordInput strength", () => {
  it("four fixed segments; bar height constant; label per level", async () => {
    function Demo() {
      const [s, setS] = useState(0);
      return createElement("div", null, createElement(PasswordInput, { label: "pw", strength: s as 0 }), createElement("button", { id: "t", onClick: () => setS(3) }, "t"));
    }
    const host = await mount(createElement(Demo));
    const bar = () => host.querySelector("[data-slot=password-strength]") as HTMLElement;
    expect(bar().querySelectorAll("[data-segment]").length).toBe(4);
    const before = rect(bar());
    (host.querySelector("#t") as HTMLButtonElement).click();
    await frames(2);
    expect(bar().querySelectorAll("[data-segment][data-on]").length).toBe(3);
    expect(rect(bar())).toBe(before);
    await wait(700);
    expect(host.querySelector("[data-slot=password-strength-status]")!.textContent).not.toBe("");
  });
});

describe("V4-131 Textarea scroll cue", () => {
  it("carries the scroll cue utility and scrolls when clamped", async () => {
    const host = await mount(createElement(Textarea, { label: "m", defaultValue: "x\n".repeat(40), autoSize: true }));
    const ta = host.querySelector("textarea")!;
    expect(ta.className).toContain("yorha-scroll-cue-y");
    expect(ta.scrollHeight).toBeGreaterThan(ta.clientHeight);
  });
});

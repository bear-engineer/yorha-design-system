import * as React from "react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // global css (tokens, utilities)
import { frames } from "./mount";
import { ColorInput } from "../registry/yorha/ui/color-input/color-input";
import { FileInput } from "../registry/yorha/ui/file-input/file-input";
import { OTPFieldInput, OTPFieldRoot } from "../registry/yorha/ui/otp-field/otp-field";
import { inputPresets } from "../registry/yorha/ui/input-types/input-types";

// v4 f-inp-b (V4-140..149): native form participation stays intact (name, value, reset, validation) while the kit adds behaviour on top.

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  delete document.documentElement.dataset.motion;
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});

async function mount(node: React.ReactNode): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:8px;top:8px;width:420px;";
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return host;
}

const file = (name: string, size = 10, type = "text/plain") => new File([new Uint8Array(size)], name, { type, lastModified: 1 });
const dt = (...files: File[]) => {
  const d = new DataTransfer();
  files.forEach((f) => d.items.add(f));
  return d;
};
const drop = (target: EventTarget, ...files: File[]) => {
  const ev = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt(...files) });
  target.dispatchEvent(ev);
  return ev;
};
const fileForm = (props: Partial<React.ComponentProps<typeof FileInput>> = {}) =>
  createElement("form", { id: "f" }, createElement(FileInput, { label: "첨부", name: "doc", ...props }), createElement("button", { type: "reset" }, "reset"));
const zoneOf = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-slot=file-drop-zone]")!;
const nativeFile = (host: HTMLElement) => host.querySelector<HTMLInputElement>("input[type=file]")!;

describe("V4-140: FileInput required + empty", () => {
  it("native input is visually hidden, not display:none", async () => {
    const host = await mount(fileForm());
    const input = nativeFile(host);
    const s = getComputedStyle(input);
    expect(s.display).not.toBe("none");
    expect(input.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    expect(s.position).toBe("absolute");
  });

  it("submit is blocked, the trigger button is focused and an error is visible", async () => {
    const host = await mount(fileForm({ required: true }));
    const form = host.querySelector("form")!;
    const submit = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener("submit", submit);
    expect(form.reportValidity()).toBe(false);
    await frames(2);
    expect(submit).not.toHaveBeenCalled();
    const button = host.querySelector<HTMLElement>("[data-slot=file-drop-zone] button")!;
    expect(document.activeElement).toBe(button);
    const err = host.querySelector<HTMLElement>("[role=alert]");
    expect(err, "field error shown").not.toBeNull();
    expect(err!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(zoneOf(host).closest("[data-invalid]")).not.toBeNull();
  });

  it("a dropped file lands in the native input and FormData", async () => {
    const host = await mount(fileForm({ required: true }));
    const form = host.querySelector("form")!;
    form.reportValidity();
    drop(zoneOf(host), file("a.txt"));
    await frames(3);
    const got = new FormData(form).get("doc") as File;
    expect(got.name).toBe("a.txt");
    expect(form.checkValidity()).toBe(true);
    expect(host.querySelector("[role=alert]")).toBeNull();
  });
});

describe("V4-141: window drop guard, paste, maxFiles", () => {
  it("a drop that misses the zone is default-prevented on body", async () => {
    await mount(fileForm());
    const ev = drop(document.body, file("a.txt"));
    expect(ev.defaultPrevented).toBe(true);
  });
  it("a non-file drag is left alone", async () => {
    await mount(fileForm());
    const d = new DataTransfer();
    d.setData("text/plain", "hi");
    const ev = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: d });
    document.body.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
  it("listeners are removed on unmount", async () => {
    await mount(fileForm());
    roots.splice(0).forEach((r) => r.unmount());
    expect(drop(document.body, file("a.txt")).defaultPrevented).toBe(false);
  });
  it("paste adds clipboard files when the group has focus", async () => {
    const host = await mount(fileForm({ multiple: true }));
    const button = host.querySelector<HTMLElement>("[data-slot=file-drop-zone] button")!;
    button.focus();
    button.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt(file("p.txt")) }));
    await frames(3);
    expect(host.querySelectorAll("ul li").length).toBe(1);
    expect((new FormData(host.querySelector("form")!).get("doc") as File).name).toBe("p.txt");
  });
  it("maxFiles=2 rejects the third with a message", async () => {
    const host = await mount(fileForm({ multiple: true, maxFiles: 2 }));
    drop(zoneOf(host), file("1.txt"), file("2.txt"), file("3.txt"));
    await frames(3);
    expect(host.querySelectorAll("ul li").length).toBe(2);
    expect(host.querySelector("[role=alert]")?.textContent).toContain("3.txt");
  });
});

describe("V4-144/146: reset, rejections accumulate, clear all", () => {
  it("form.reset() empties the list and the native input", async () => {
    const host = await mount(fileForm({ multiple: true }));
    drop(zoneOf(host), file("a.txt"));
    await frames(3);
    expect(host.querySelectorAll("ul li").length).toBe(1);
    host.querySelector("form")!.reset();
    await frames(3);
    expect(host.querySelectorAll("ul li").length).toBe(0);
    expect(nativeFile(host).files!.length).toBe(0);
  });
  it("rejections accumulate and 모두 지우기 clears files and messages", async () => {
    const host = await mount(fileForm({ multiple: true, accept: ".txt" }));
    drop(zoneOf(host), file("a.txt"));
    drop(zoneOf(host), file("x.png", 10, "image/png"));
    drop(zoneOf(host), file("y.png", 10, "image/png"));
    await frames(3);
    expect(host.querySelectorAll("[role=alert]").length).toBe(2);
    expect(host.querySelectorAll("ul li").length).toBe(1);
    const clear = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === "모두 지우기")!;
    expect(clear).toBeTruthy();
    clear.click();
    await frames(3);
    expect(host.querySelectorAll("ul li").length).toBe(0);
    expect(host.querySelectorAll("[role=alert]").length).toBe(0);
  });
  it("per-file status bar: sm cell gauge, aria value, constant row height", async () => {
    const host = await mount(fileForm({ multiple: true }));
    drop(zoneOf(host), file("a.txt"));
    await frames(3);
    const row = host.querySelector<HTMLElement>("ul li")!;
    const h0 = row.getBoundingClientRect().height;
    roots.splice(0).forEach((r) => r.unmount());
    const host2 = await mount(fileForm({ multiple: true, status: () => ({ state: "uploading", progress: 0.5 }) }));
    drop(zoneOf(host2), file("a.txt"));
    await frames(3);
    const row2 = host2.querySelector<HTMLElement>("ul li")!;
    const bar = row2.querySelector<HTMLElement>("[data-slot=file-progress] [role=progressbar]")!;
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
    expect(bar.getAttribute("aria-valuetext")).toBe("50%");
    const track = bar.querySelector<HTMLElement>("[data-slot=progress-track]")!;
    expect(track.getBoundingClientRect().width).toBe(54);
    expect(track.getBoundingClientRect().height).toBe(10);
    const cells = bar.querySelector<HTMLElement>("[data-slot=progress-cells]")!;
    expect(cells.getBoundingClientRect().width).toBe(48);
    expect(getComputedStyle(cells).maskSize).toContain("6px");
    expect(bar.querySelector<HTMLElement>("[data-slot=progress-fill]")!.style.clipPath).toBe("inset(0px 24px 0px 0px)");
    expect(row2.getBoundingClientRect().height).toBe(h0);
    const heights = new Set<number>();
    for (const state of ["uploading", "done", "error"] as const) {
      roots.splice(0).forEach((r) => r.unmount());
      const h = await mount(fileForm({ multiple: true, status: () => ({ state, progress: 0.5 }) }));
      drop(zoneOf(h), file("a.txt"));
      await frames(3);
      const li = h.querySelector<HTMLElement>("ul li")!;
      heights.add(li.getBoundingClientRect().height);
      const pb = li.querySelector<HTMLElement>("[data-slot=file-progress] [role=progressbar]")!;
      if (state === "done") {
        expect(pb.getAttribute("aria-valuenow")).toBe("100");
        expect(pb.getAttribute("aria-valuetext")).toBe("업로드 완료");
        expect(li.querySelector("[data-slot=file-progress-glyph] svg, [data-slot=file-progress-glyph] [data-slot=glyph]")).not.toBeNull();
      }
      if (state === "error") {
        expect(pb.getAttribute("aria-valuetext")).toBe("업로드 실패");
        expect(pb.querySelector("[data-slot=progress-track]")!.getAttribute("data-status")).toBe("error");
      }
    }
    expect(heights.size).toBe(1);
    expect([...heights][0]).toBe(h0);
  });
});

describe("V4-142/143/144/147: ColorInput", () => {
  const colorForm = (props: Partial<React.ComponentProps<typeof ColorInput>> = {}) =>
    createElement("form", {}, createElement(ColorInput, { label: "색", name: "c", defaultValue: "#336699", ...props }));
  const hexField = (host: HTMLElement) => host.querySelector<HTMLInputElement>("input[type=text]")!;

  it("partial hex: swatch carries a dither layer and nothing commits", async () => {
    const onValueChange = vi.fn();
    const host = await mount(colorForm({ onValueChange }));
    const input = hexField(host);
    expect(host.querySelector("[data-slot=color-swatch-dither]")).toBeNull();
    input.focus();
    await userEvent.clear(input);
    await userEvent.keyboard("12");
    await frames(2);
    const layer = host.querySelector<HTMLElement>("[data-slot=color-swatch-dither]");
    expect(layer, "dither layer").not.toBeNull();
    expect(layer!.className).toContain("yorha-dither-50");
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it("illegal characters set aria-invalid", async () => {
    const host = await mount(colorForm());
    const input = hexField(host);
    input.focus();
    await userEvent.clear(input);
    await userEvent.keyboard("zz");
    await frames(2);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
  it("fine pointer: the swatch opens a popover, a swatch click commits to the native input", async () => {
    const onValueChange = vi.fn();
    const host = await mount(colorForm({ onValueChange, swatches: ["#ff0000", "#00ff00", "#0000ff"] }));
    const trigger = host.querySelector<HTMLElement>("[data-slot=color-trigger]")!;
    expect(trigger).not.toBeNull();
    trigger.click();
    await frames(8);
    const options = [...document.querySelectorAll<HTMLElement>("[data-slot=color-swatch-option]")];
    expect(options.length).toBe(3);
    for (const o of options) {
      const r = o.getBoundingClientRect();
      expect(r.width).toBeGreaterThanOrEqual(24);
      expect(r.height).toBeGreaterThanOrEqual(24);
    }
    expect(options.filter((o) => o.tabIndex === 0).length).toBe(1);
    options[1]!.click();
    await frames(3);
    expect(onValueChange).toHaveBeenCalledWith("#00ff00");
    expect(host.querySelector<HTMLInputElement>("input[type=color]")!.value).toBe("#00ff00");
    expect(new FormData(host.querySelector("form")!).get("c")).toBe("#00ff00");
    expect([...document.querySelectorAll("button")].some((b) => b.textContent?.includes("시스템 선택기"))).toBe(true);
  });
  it("form.reset() restores text and swatch", async () => {
    const host = await mount(
      createElement("form", {}, createElement(ColorInput, { label: "색", name: "c", defaultValue: "#336699" }), createElement("button", { type: "reset" }, "r")),
    );
    const input = hexField(host);
    input.focus();
    await userEvent.clear(input);
    await userEvent.keyboard("ff0000");
    await userEvent.tab();
    await frames(2);
    expect(input.value.toLowerCase()).toBe("#ff0000");
    host.querySelector("form")!.reset();
    await frames(4);
    expect(input.value.toLowerCase()).toBe("#336699");
    expect(host.querySelector<HTMLInputElement>("input[type=color]")!.value).toBe("#336699");
    expect(getComputedStyle(host.querySelector("[data-slot=color-swatch]")!).backgroundColor).toBe("rgb(51, 102, 153)");
  });
  it("EyeDropper button exists only where window.EyeDropper does", async () => {
    const host = await mount(colorForm());
    host.querySelector<HTMLElement>("[data-slot=color-trigger]")!.click();
    await frames(8);
    const has = () => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("스포이트"));
    expect(has()).toBe("EyeDropper" in window);
  });
});

describe("V4-145/148: OTP status", () => {
  const otp = (status?: "idle" | "verifying" | "success" | "error", extra: object = {}) =>
    createElement(
      OTPFieldRoot,
      { id: "o", length: 4, status, ...extra } as never,
      ...Array.from({ length: 4 }, (_, i) => createElement(OTPFieldInput, { key: i, "aria-label": `문자 ${i + 1}` })),
    );
  // Base UI adds one extra hidden input (the form value); the visible slots sit inside [data-slot=otp-caret] wrappers.
  const slots = (host: HTMLElement) => [...host.querySelectorAll<HTMLInputElement>("input")].filter((i) => i.type !== "hidden" && i.getAttribute("aria-label")?.startsWith("문자"));

  it("slot 0 defaults to one-time-code and numeric", async () => {
    const host = await mount(otp("idle"));
    const [s0] = slots(host);
    expect(s0!.getAttribute("autocomplete")).toBe("one-time-code");
    expect(s0!.getAttribute("inputmode")).toBe("numeric");
  });
  it("status changes keep the root rect; attributes follow", async () => {
    const host = await mount(otp("idle"));
    const size = (h: HTMLElement) => {
      const r = h.firstElementChild!.getBoundingClientRect();
      return `${r.width}x${r.height}`;
    };
    const idle = size(host);
    const rerender = async (s: "idle" | "verifying" | "success" | "error") => {
      roots.splice(0).forEach((r) => r.unmount());
      hosts.splice(0).forEach((h) => h.remove());
      return mount(otp(s, { defaultValue: "1234" }));
    };
    const sizes: string[] = [];
    const v = await rerender("verifying");
    sizes.push(size(v));
    expect(v.firstElementChild!.getAttribute("aria-busy")).toBe("true");
    expect(v.querySelector("[data-slot=spinner]")).not.toBeNull();
    const okHost = await rerender("success");
    sizes.push(size(okHost));
    expect(okHost.querySelector("[data-slot=glyph][data-glyph=check]")).not.toBeNull();
    const bad = await rerender("error");
    sizes.push(size(bad));
    expect(slots(bad).map((s) => s.getAttribute("aria-invalid"))).toEqual(["true", "true", "true", "true"]);
    // the reserved status cell makes every state the same size
    expect(sizes).toEqual([idle, idle, idle]);
  });
  it("active empty slot shows the block caret; none in motion off", async () => {
    const host = await mount(otp());
    slots(host)[0]!.focus();
    await frames(2);
    const caret = host.querySelector<HTMLElement>("[data-slot=otp-caret]")!;
    expect(caret.className).toContain("yorha-caret");
    expect(getComputedStyle(caret).visibility).toBe("visible");
    document.documentElement.dataset.motion = "off";
    await frames(2);
    expect(getComputedStyle(caret).display).toBe("none");
  });
});

describe("V4-149: input presets", () => {
  it("every preset carries enterKeyHint", () => {
    for (const p of Object.values(inputPresets)) expect((p as { enterKeyHint?: string }).enterKeyHint).toBeTruthy();
  });
});

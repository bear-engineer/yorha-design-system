import { describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { expectCentered, expectPixelSnapped, expectSameHeight } from "./measure";
import { frames, mountStory } from "./mount";

/** v3 text inputs and forms (family inp): geometry and state assertions, one per accepted FINP finding. */

const cs = (el: Element) => getComputedStyle(el);
const px = (v: string) => parseFloat(v);
const controlMd = () => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;height:var(--yorha-control-md)";
  document.body.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
};
const inputs = (host: HTMLElement) => [...host.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not([type=color]):not([type=file])")];
const top = (item: string, name: string) => mountStory(item, name, { stage: "top" });
const byLabel = (host: HTMLElement, text: string) =>
  [...host.querySelectorAll("label")].find((l) => l.textContent?.trim() === text) as HTMLElement | undefined;
const controlOf = (host: HTMLElement, text: string) => {
  const label = byLabel(host, text);
  if (!label) throw new Error(`label ${text} not found`);
  return document.getElementById(label.getAttribute("for") ?? "") ?? label.closest("[data-slot], div")!.querySelector("input,textarea")!;
};

describe("FINP-01/02/16/17/21/08: adorned controls share one frame on the control scale", () => {
  for (const item of ["password-input", "search-input", "color-input", "number-field"]) {
    test(`${item}: frame = control-md, parts equal and whole pixels`, { timeout: 30_000 }, async () => {
      const host = await top(item, "States");
      const md = controlMd();
      const groups = [...host.querySelectorAll<HTMLElement>("[data-slot=input-group]")];
      expect(groups.length, `${item} has InputGroup frames`).toBeGreaterThan(0);
      for (const g of groups) {
        expect(g.getBoundingClientRect().height).toBe(md);
        expectPixelSnapped(g);
        const parts = [...g.querySelectorAll<HTMLElement>("[data-slot=input-group-control], [data-slot=input-group-button], [data-slot=input-group-addon]")];
        if (parts.length > 1) expectSameHeight(...parts);
      }
    });
  }
  test("search: leading icon addon is centred, disabled search has no clear button", async () => {
    const host = await top("search-input", "States");
    for (const addon of host.querySelectorAll("[data-slot=input-group-addon]")) expectCentered(addon.firstElementChild!, addon);
    expect(host.querySelectorAll("[data-slot=input-group-addon]").length).toBeGreaterThan(0);
    const locked = controlOf(host, "잠김");
    expect(locked.closest("[data-slot=input-group]")!.querySelector("[data-slot=input-group-button]")).toBeNull();
  });
  test("number-field: steppers draw svg icons, no text glyphs", async () => {
    const host = await top("number-field", "States");
    const buttons = [...host.querySelectorAll("[data-slot=input-group-button]")];
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    for (const b of buttons) {
      expect(b.querySelector("svg")).not.toBeNull();
      expect(b.textContent?.trim()).toBe("");
    }
  });
  test("color: a white swatch keeps a visible 1px edge", async () => {
    const host = await top("color-input", "States");
    const swatch = host.querySelector<HTMLElement>("[data-slot=color-swatch]")!;
    expect(px(cs(swatch).borderTopWidth)).toBe(1);
  });
});

describe("FINP-03/04/05: otp slots", () => {
  test("slots stay square when the row is narrow", async () => {
    const host = await top("otp-field", "States");
    (host.parentElement as HTMLElement).style.width = "240px";
    await frames(2);
    const slots = inputs(host).filter((i) => i.closest("[data-slot], div")?.contains(i));
    expect(slots.length).toBeGreaterThan(6);
    for (const s of slots) {
      const r = s.getBoundingClientRect();
      expect(Math.abs(r.width - r.height), `slot ${r.width}x${r.height}`).toBeLessThanOrEqual(1);
    }
  });
  test("filled slots differ from empty ones; invalid keeps the border width", async () => {
    const host = await top("otp-field", "States");
    const slots = inputs(host);
    const filled = slots.find((s) => s.hasAttribute("data-filled") && !s.disabled);
    const empty = slots.find((s) => !s.hasAttribute("data-filled") && !s.disabled);
    expect(filled, "a filled slot in States").toBeDefined();
    expect(empty).toBeDefined();
    expect(cs(filled!).borderTopColor).not.toBe(cs(empty!).borderTopColor);
    expect(cs(filled!).fontFamily).toMatch(/mono/i);
    const before = cs(empty!).borderTopWidth;
    empty!.setAttribute("data-invalid", "");
    expect(cs(empty!).borderTopWidth).toBe(before);
    expect(cs(empty!).boxShadow).not.toBe("none");
  });
});

describe("FINP-06/07: number field is a Field", () => {
  test("label matches TextField, description/error/read-only exist", async () => {
    const nf = await top("number-field", "States");
    const tf = await top("text-field", "States");
    const a = byLabel(nf, "기본")!;
    const b = byLabel(tf, "기본")!;
    expect(cs(a).fontSize).toBe(cs(b).fontSize);
    expect(cs(a).textTransform).toBe("none");
    const bad = nf.querySelector<HTMLInputElement>("input[aria-invalid=true]");
    expect(bad, "invalid number field").not.toBeNull();
    expect(nf.querySelector("[role=alert]")).not.toBeNull();
    const ro = controlOf(nf, "읽기 전용") as HTMLInputElement;
    expect(ro.readOnly).toBe(true);
    const frame = ro.closest("[data-slot=input-group]")!;
    expect(cs(frame).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });
});

describe("FINP-09/10/11/15: text control states", () => {
  test("hover changes the border colour, never the box", async () => {
    const host = await top("text-field", "States");
    const input = controlOf(host, "기본") as HTMLInputElement;
    const before = cs(input).borderTopColor;
    const rect = input.getBoundingClientRect();
    await userEvent.hover(input);
    await new Promise((r) => setTimeout(r, 400));
    expect(cs(input).borderTopColor).not.toBe(before);
    const after = input.getBoundingClientRect();
    expect(after.height).toBe(rect.height);
    await userEvent.unhover(input);
  });
  test("read-only is a printed line; disabled has no container opacity", async () => {
    const host = await top("text-field", "States");
    const plain = controlOf(host, "기본");
    const ro = controlOf(host, "읽기 전용");
    const off = controlOf(host, "잠김");
    expect(cs(ro).backgroundColor).not.toBe(cs(plain).backgroundColor);
    expect(cs(ro).borderTopColor).not.toBe(cs(plain).borderTopColor);
    expect(cs(ro).cursor).toBe("default");
    expect(cs(off).opacity).toBe("1");
    expect(cs(off).color).not.toBe(cs(plain).color);
  });
  test("Input and TextField use one control class (height, transition)", async () => {
    const a = await top("input", "States");
    const b = await top("text-field", "States");
    const ia = inputs(a)[0]!;
    const ib = inputs(b)[0]!;
    expect(cs(ia).transitionDuration).toBe(cs(ib).transitionDuration);
    expect(ia.getBoundingClientRect().height).toBe(controlMd());
    expect(ib.getBoundingClientRect().height).toBe(controlMd());
    expectPixelSnapped(ia);
  });
});

describe("FINP-12/13: field messages", () => {
  test("error icon shares the first text line centre; description hugs the control", async () => {
    const host = await top("field", "States");
    const alert = host.querySelector<HTMLElement>("[role=alert]")!;
    const icon = alert.querySelector<HTMLElement>("[aria-hidden=true]")!;
    const text = alert.lastElementChild as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(text);
    const line = range.getClientRects()[0]!;
    const ir = icon.getBoundingClientRect();
    expect(Math.abs(ir.top + ir.height / 2 - (line.top + line.height / 2))).toBeLessThan(1);
    const desc = host.querySelector<HTMLElement>("[data-slot=field-description]") ?? [...host.querySelectorAll("p,div")].find((e) => e.id.includes("description"));
    const control = host.querySelector("input")!;
    expect(desc).toBeTruthy();
    expect(desc!.getBoundingClientRect().top - control.getBoundingClientRect().bottom).toBe(4);
  });
});

describe("FINP-18/19/20: file input", () => {
  test("dragging keeps the box, goes solid and swaps the hint", async () => {
    const host = await top("file-input", "States");
    const zone = host.querySelector<HTMLElement>("[data-slot=file-drop-zone]")!;
    const h = zone.getBoundingClientRect().height;
    expect(cs(zone).borderTopStyle).toBe("dashed");
    zone.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }));
    await new Promise((r) => setTimeout(r, 400));
    expect(cs(zone).borderTopStyle).toBe("solid");
    expect(zone.getBoundingClientRect().height).toBe(h);
    const active = zone.querySelector<HTMLElement>("[data-slot=file-drop-active]")!;
    expect(cs(active).visibility).toBe("visible");
    expect(active.textContent).toContain("여기에 놓으세요");
    expect(cs(zone.querySelector("[data-slot=file-drop-idle]")!).visibility).toBe("hidden");
    expect(cs(zone).cursor).toBe("copy");
  });
  test("size has a non-breaking space; rejections are field errors with an icon", async () => {
    const { formatFileSize } = await import("../registry/yorha/ui/file-input/file-input");
    expect(formatFileSize(1000, "ko-KR")).toMatch(/\d\u00a0\S/);
    const host = await top("file-input", "States");
    const native = host.querySelector<HTMLInputElement>("input[type=file]")!;
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(5000)], "big.txt", { type: "text/plain" }));
    native.files = dt.files;
    native.dispatchEvent(new Event("change", { bubbles: true }));
    await frames(3);
    const alert = host.querySelector<HTMLElement>("[role=alert]")!;
    expect(alert).not.toBeNull();
    expect(alert.querySelector("[data-slot=field-error-icon]")).not.toBeNull();
  });
});

describe("FINP-22/23/24/25: textarea, form, input types, fieldset", () => {
  test("textarea: no native grip, whole-pixel min height", async () => {
    const host = await top("textarea", "States");
    const area = host.querySelector("textarea")!;
    expect(cs(area).resize).toBe("none");
    expect(Number.isInteger(px(cs(area).minHeight))).toBe(true);
  });
  test("form: submit button is as tall as the inputs", async () => {
    const host = await top("form", "States");
    const submit = host.querySelector<HTMLElement>("button[type=submit]")!;
    expectSameHeight(submit, inputs(host)[0]!);
    expect(submit.getBoundingClientRect().height).toBe(controlMd());
  });
  test("input-types: reset and submit buttons have a visible border or fill", async () => {
    const host = await top("input-types", "States");
    for (const el of host.querySelectorAll<HTMLElement>("input[type=reset], input[type=button]")) {
      const s = cs(el);
      expect(px(s.borderTopWidth)).toBeGreaterThan(0);
      expect(s.backgroundColor, `${el.getAttribute("type")} fill`).not.toBe("rgba(0, 0, 0, 0)");
    }
  });
  test("fieldset: legend sits on a rule", async () => {
    const host = await top("fieldset", "Default");
    const legend = host.querySelector("[data-slot=fieldset-legend]")!;
    expect(px(cs(legend).borderBottomWidth)).toBe(1);
    expect(px(cs(legend).marginBottom)).toBe(0);
  });
});

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import "./mount"; // global css (tokens, utilities)
import { frames } from "./mount";
import { Slider } from "../registry/yorha/ui/slider/slider";
import { DateInput } from "../registry/yorha/ui/date-input/date-input";
import { Decipher } from "../registry/yorha/ui/decipher/decipher";
import { Combobox, ComboboxInput, ComboboxInputGroup, ComboboxLabel } from "../registry/yorha/ui/combobox/combobox";
import { Avatar, AvatarFallback, AvatarImage } from "../registry/yorha/ui/avatar/avatar";

// v4 detail-e: kit-styled native bits (#12, #13), Decipher slots (#28), Combobox label (#30), Avatar fallback (#31).

const hosts: HTMLElement[] = [];
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
  document.documentElement.removeAttribute("data-motion");
  vi.restoreAllMocks();
});

async function mount(node: React.ReactNode): Promise<HTMLElement> {
  const host = document.createElement("div");
  host.lang = "ko";
  host.style.cssText = "position:absolute;left:16px;top:16px;width:400px";
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(node));
  await frames(3);
  return host;
}

const sheetText = () =>
  Array.from(document.styleSheets)
    .flatMap((s) => { try { return Array.from(s.cssRules); } catch { return []; } })
    .map((r) => r.cssText)
    .join("\n");

describe("#12 slider thumb range input is not a native control", () => {
  it("is appearance:none and clipped away", async () => {
    const host = await mount(<Slider label="볼륨" defaultValue={40} />);
    const input = host.querySelector<HTMLInputElement>("input[type=range]")!;
    expect(getComputedStyle(input).appearance).toBe("none");
    expect(getComputedStyle(input).clipPath).toContain("inset(50%)");
    const thumb = host.querySelector('[data-slot="slider-thumb"]')!.getBoundingClientRect();
    expect([thumb.width, thumb.height]).toEqual([24, 24]);
  });
});

describe("#13 native date segments are kit-styled", () => {
  it("every field has ink-block focus (focus-within), fg-soft placeholder, no spin/clear/indicator", async () => {
    await mount(<DateInput label="날짜" type="datetime-local" />);
    const css = sheetText();
    for (const f of ["year", "month", "day", "hour", "minute", "meridiem"]) {
      expect(css, f).toContain(`::-webkit-datetime-edit-${f}-field:focus-within`);
    }
    expect(css).toContain("::-webkit-datetime-edit-text");
    expect(css).toContain("::-webkit-inner-spin-button");
    expect(css).toContain("::-webkit-calendar-picker-indicator");
  });

  it("empty value is flagged for the placeholder colour; error flags aria-invalid", async () => {
    const host = await mount(<DateInput label="날짜" error="필수" />);
    const input = host.querySelector<HTMLInputElement>("input[type=date]")!;
    expect(input.dataset.empty).toBe("");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("#28 Decipher slots never reflow", () => {
  it("width is identical while scrambling and when done", async () => {
    document.documentElement.setAttribute("data-motion", "full");
    const host = await mount(<h2 className="text-xl"><Decipher text="시스템 복호화 완료 MEMORY 9S" /></h2>);
    const el = host.querySelector<HTMLElement>('[data-slot="decipher"]')!;
    const widths: number[] = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 1500 && el.dataset.state !== "done") {
      widths.push(el.getBoundingClientRect().width);
      await frames(1);
    }
    widths.push(el.getBoundingClientRect().width);
    expect(widths.length).toBeGreaterThan(3);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.01);
  });
});

describe("#30 Combobox label", () => {
  it("is a native label for the input, without Base UI warnings", async () => {
    const err = vi.spyOn(console, "error");
    const host = await mount(
      <Combobox items={["Archive", "Bunker"]}>
        <ComboboxLabel>유닛</ComboboxLabel>
        <ComboboxInputGroup><ComboboxInput /></ComboboxInputGroup>
      </Combobox>,
    );
    const label = host.querySelector<HTMLLabelElement>("label")!;
    const input = host.querySelector<HTMLInputElement>("input")!;
    expect(label.htmlFor).toBe(input.id);
    expect(input.labels?.[0]).toBe(label);
    expect(err.mock.calls.filter((c) => String(c[0]).includes("Base UI"))).toEqual([]);
  });
});

describe("#31 Avatar broken image", () => {
  it("shows the styled initials fallback for an undecodable data URI", async () => {
    const host = await mount(
      <Avatar><AvatarImage src="data:image/png;base64,AAAA" alt="x" /><AvatarFallback>A2</AvatarFallback></Avatar>,
    );
    await frames(10);
    const fb = host.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')!;
    expect(fb.textContent).toBe("A2");
    expect(getComputedStyle(fb).display).toBe("flex");
    expect(getComputedStyle(fb).justifyContent).toBe("center");
    expect(host.querySelector('[data-slot="avatar-image"]')).toBeNull();
  });
});

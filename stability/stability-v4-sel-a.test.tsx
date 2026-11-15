import { createElement, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, onTestFinished, test } from "vitest";
import { userEvent } from "vitest/browser";
import "./mount"; // global css (tokens, utilities, storybook annotations)
import { frames } from "./mount";
import * as CB from "../registry/yorha/ui/combobox/combobox";
import * as AC from "../registry/yorha/ui/autocomplete/autocomplete";
import * as SL from "../registry/yorha/ui/select/select";

// v4 f-sel-a: V4-155 yorha-pop adoption, V4-156 loading, V4-157 clearable, V4-158 create / +N / Esc, V4-159 form, V4-160 pixel arrows.

const roots: ReturnType<typeof createRoot>[] = [];
const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) r.unmount();
  for (const h of hosts.splice(0)) h.remove();
});
async function mount(node: ReactNode) {
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;left:24px;top:24px;width:320px";
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  flushSync(() => root.render(createElement("div", { lang: "ko" }, node)));
  await frames(3);
  return host;
}
const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const until = async (fn: () => boolean, label: string, ms = 4000) => {
  const start = performance.now();
  while (performance.now() - start < ms) {
    if (fn()) return;
    await frames(2);
  }
  throw new Error(`timeout: ${label}`);
};
const settle = async (sel: string) => {
  await until(() => {
    const el = q(sel);
    return !!el && !el.hasAttribute("data-starting-style") && el.getBoundingClientRect().width > 0;
  }, `popup ${sel}`);
  await frames(30);
};
const FRUITS = ["사과", "배", "포도", "귤", "감", "딸기", "수박", "참외", "복숭아", "자두", "망고", "키위"];
const Create = (props: Record<string, unknown>) => createElement((CB as any).ComboboxCreate, props);
const rect = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
};

function Combo({ loading, defaultOpen, multiple, defaultValue, children }: { loading?: boolean; defaultOpen?: boolean; multiple?: boolean; defaultValue?: string[]; children?: ReactNode }) {
  const body = (
    <>
      {multiple ? (
        <CB.ComboboxInputGroup>
          <CB.ComboboxValue>
            {(v: string[]) => (
              <CB.ComboboxChips>
                {v.map((x) => (
                  <CB.ComboboxChip key={x} aria-label={x}>
                    {x}
                    <CB.ComboboxChipRemove aria-label={`${x} 제거`} />
                  </CB.ComboboxChip>
                ))}
                <CB.ComboboxInput aria-label="과일" />
              </CB.ComboboxChips>
            )}
          </CB.ComboboxValue>
          <CB.ComboboxTrigger />
        </CB.ComboboxInputGroup>
      ) : (
        <CB.ComboboxInputGroup>
          <CB.ComboboxInput aria-label="과일" />
          <CB.ComboboxClear />
          <CB.ComboboxTrigger />
        </CB.ComboboxInputGroup>
      )}
      <CB.ComboboxContent>
        <CB.ComboboxStatus />
        <CB.ComboboxEmpty>결과 없음</CB.ComboboxEmpty>
        <CB.ComboboxList>
          <CB.ComboboxCollection>{(item: string) => <CB.ComboboxItem key={item} value={item}>{item}</CB.ComboboxItem>}</CB.ComboboxCollection>
          {children}
        </CB.ComboboxList>
      </CB.ComboboxContent>
    </>
  );
  const Root = CB.Combobox as unknown as (p: Record<string, unknown>) => ReactNode;
  return createElement(Root, { items: FRUITS, loading, defaultOpen, multiple, defaultValue }, body);
}

describe("V4-155 yorha-pop adoption", () => {
  test("select / combobox / autocomplete popups reveal by clip-path with a negative rest inset; first and last option stay in view", { timeout: 60_000 }, async () => {
    await mount(
      <SL.Select defaultOpen defaultValue="배" items={FRUITS.map((f) => ({ value: f, label: f }))}>
        <SL.SelectTrigger aria-label="과일 선택"><SL.SelectValue /></SL.SelectTrigger>
        <SL.SelectContent>{FRUITS.map((f) => <SL.SelectItem key={f} value={f}>{f}</SL.SelectItem>)}</SL.SelectContent>
      </SL.Select>,
    );
    await settle("[data-slot=select-content]");
    for (const sel of ["[data-slot=select-content]"]) {
      const popup = q(sel)!;
      const cs = getComputedStyle(popup);
      expect(cs.transitionProperty).toContain("clip-path");
      expect(cs.clipPath).toMatch(/^inset\(-\d+(\.\d+)?px/);
      expect(cs.transform).toBe("none");
      const p = popup.getBoundingClientRect();
      const options = [...popup.querySelectorAll("[role=option]")];
      for (const o of [options[0]!, options.at(-1)!]) {
        const r = o.getBoundingClientRect();
        // The scroll list may hide rows by scrolling, but a row that is in view is never cut by the popup's own clip.
        if (r.bottom > p.top && r.top < p.bottom) {
          expect(r.left).toBeGreaterThanOrEqual(p.left - 0.5);
          expect(r.right).toBeLessThanOrEqual(p.right + 0.5);
        }
      }
    }
  });

  test("item-aligned select popup still uses the pop utility (no scale, clip-path transition)", { timeout: 60_000 }, async () => {
    await mount(
      <SL.Select defaultOpen defaultValue="포도" items={FRUITS.map((f) => ({ value: f, label: f }))}>
        <SL.SelectTrigger aria-label="과일 선택"><SL.SelectValue /></SL.SelectTrigger>
        <SL.SelectContent alignItemWithTrigger>{FRUITS.map((f) => <SL.SelectItem key={f} value={f}>{f}</SL.SelectItem>)}</SL.SelectContent>
      </SL.Select>,
    );
    await settle("[data-slot=select-content]");
    const cs = getComputedStyle(q("[data-slot=select-content]")!);
    expect(cs.transitionProperty).toContain("clip-path");
    expect(cs.transform).toBe("none");
    expect(cs.clipPath).toMatch(/^inset\(-/);
  });

  test("combobox and autocomplete popups: clip-path transition, no scale", { timeout: 60_000 }, async () => {
    await mount(<Combo defaultOpen />);
    await settle("[data-slot=combobox-content]");
    const cs = getComputedStyle(q("[data-slot=combobox-content]")!);
    expect(cs.transitionProperty).toContain("clip-path");
    expect(cs.transform).toBe("none");
  });
});

describe("V4-160 pixel arrows", () => {
  test("combobox / autocomplete / select arrows are stacked glyphs, never rotated, one visible per side", { timeout: 60_000 }, async () => {
    const Root = CB.Combobox as unknown as (p: Record<string, unknown>) => ReactNode;
    await mount(
      createElement(Root, { items: FRUITS, defaultOpen: true }, [
        <CB.ComboboxInputGroup key="g"><CB.ComboboxInput aria-label="과일" /></CB.ComboboxInputGroup>,
        <CB.ComboboxContent key="c"><CB.ComboboxArrow /><CB.ComboboxList><CB.ComboboxCollection>{(i: string) => <CB.ComboboxItem key={i} value={i}>{i}</CB.ComboboxItem>}</CB.ComboboxCollection></CB.ComboboxList></CB.ComboboxContent>,
      ]),
    );
    await settle("[data-slot=combobox-content]");
    const arrow = q("[data-slot=combobox-arrow]")!;
    expect(getComputedStyle(arrow).transform).toBe("none");
    const glyphs = [...arrow.querySelectorAll<SVGElement>("svg[data-slot=glyph]")];
    expect(glyphs.map((g) => g.getAttribute("data-glyph")).sort()).toEqual(["triangle-down", "triangle-left", "triangle-right", "triangle-up"]);
    const shown = glyphs.filter((g) => getComputedStyle(g).opacity === "1");
    expect(shown.map((g) => g.getAttribute("data-glyph"))).toEqual(["triangle-up"]); // popup is below the field
    const r = arrow.getBoundingClientRect();
    expect(r.width).toBe(12);
    expect(r.height).toBe(12);
  });

  test("autocomplete arrow and select arrow have no rotate", { timeout: 60_000 }, async () => {
    const Root = AC.Autocomplete as unknown as (p: Record<string, unknown>) => ReactNode;
    await mount(
      createElement(Root, { items: FRUITS, defaultOpen: true }, [
        <AC.AutocompleteInputGroup key="g"><AC.AutocompleteInput aria-label="과일" /></AC.AutocompleteInputGroup>,
        <AC.AutocompleteContent key="c"><AC.AutocompleteArrow /><AC.AutocompleteList>{(i: string) => <AC.AutocompleteItem key={i} value={i}>{i}</AC.AutocompleteItem>}</AC.AutocompleteList></AC.AutocompleteContent>,
      ]),
    );
    await settle("[data-slot=autocomplete-content]");
    const a = q("[data-slot=autocomplete-arrow]")!;
    expect(getComputedStyle(a).transform).toBe("none");
    expect(a.querySelectorAll("svg[data-slot=glyph]").length).toBe(4);
  });

  test("select arrow: glyph stack, no rotate", { timeout: 60_000 }, async () => {
    await mount(
      <SL.Select defaultOpen defaultValue="배" items={FRUITS.map((f) => ({ value: f, label: f }))}>
        <SL.SelectTrigger aria-label="과일 선택"><SL.SelectValue /></SL.SelectTrigger>
        <SL.SelectContent arrow>{FRUITS.map((f) => <SL.SelectItem key={f} value={f}>{f}</SL.SelectItem>)}</SL.SelectContent>
      </SL.Select>,
    );
    await settle("[data-slot=select-content]");
    const a = q("[data-slot=select-arrow]")!;
    expect(getComputedStyle(a).transform).toBe("none");
    expect(a.querySelectorAll("svg[data-slot=glyph]").length).toBe(4);
  });
});

describe("V4-156 loading", () => {
  test("combobox: spinner in the trigger cell, list busy at 60 %, status text, field rect constant", { timeout: 60_000 }, async () => {
    function Toggle() {
      const [on, setOn] = useState(false);
      return (
        <>
          <button type="button" data-testid="t" onClick={() => setOn((v) => !v)}>t</button>
          <Combo defaultOpen loading={on} />
        </>
      );
    }
    await mount(<Toggle />);
    await settle("[data-slot=combobox-content]");
    const group = q("[data-slot=combobox-input-group]")!;
    const input = q("[data-slot=combobox-input]")!;
    const trigger = q("[data-slot=combobox-trigger]")!;
    const before = { g: rect(group), i: rect(input), t: rect(trigger) };
    expect(q("[data-slot=spinner]", group)).toBeNull();
    expect(q("[data-slot=combobox-list]")!.hasAttribute("aria-busy")).toBe(false);
    q<HTMLButtonElement>("[data-testid=t]")!.click();
    await until(() => !!q("[data-slot=spinner]", group), "spinner");
    expect(trigger.contains(q("[data-slot=spinner]"))).toBe(true);
    expect(rect(group)).toEqual(before.g);
    expect(rect(input)).toEqual(before.i);
    expect(rect(trigger)).toEqual(before.t);
    const list = q("[data-slot=combobox-list]")!;
    expect(list.getAttribute("aria-busy")).toBe("true");
    expect(getComputedStyle(list).opacity).toBe("0.6");
    expect(q("[data-slot=combobox-status]")!.textContent).toMatch(/불러오는 중/);
    expect(list.querySelectorAll("[role=option]").length).toBe(FRUITS.length); // previous items stay
  });

  test("autocomplete: same contract", { timeout: 60_000 }, async () => {
    const Root = AC.Autocomplete as unknown as (p: Record<string, unknown>) => ReactNode;
    function Toggle() {
      const [on, setOn] = useState(false);
      return (
        <>
          <button type="button" data-testid="t" onClick={() => setOn((v) => !v)}>t</button>
          {createElement(Root, { items: FRUITS, defaultOpen: true, loading: on }, [
            <AC.AutocompleteInputGroup key="g"><AC.AutocompleteInput aria-label="과일" /><AC.AutocompleteClear /><AC.AutocompleteTrigger /></AC.AutocompleteInputGroup>,
            <AC.AutocompleteContent key="c"><AC.AutocompleteStatus /><AC.AutocompleteList>{(i: string) => <AC.AutocompleteItem key={i} value={i}>{i}</AC.AutocompleteItem>}</AC.AutocompleteList></AC.AutocompleteContent>,
          ])}
        </>
      );
    }
    await mount(<Toggle />);
    await settle("[data-slot=autocomplete-content]");
    const group = q("[data-slot=autocomplete-input-group]")!;
    const before = rect(group);
    const beforeInput = rect(q("[data-slot=autocomplete-input]")!);
    q<HTMLButtonElement>("[data-testid=t]")!.click();
    await until(() => !!q("[data-slot=spinner]", group), "spinner");
    expect(q("[data-slot=autocomplete-trigger]")!.contains(q("[data-slot=spinner]"))).toBe(true);
    expect(rect(group)).toEqual(before);
    expect(rect(q("[data-slot=autocomplete-input]")!)).toEqual(beforeInput);
    const list = q("[data-slot=autocomplete-list]")!;
    expect(list.getAttribute("aria-busy")).toBe("true");
    expect(getComputedStyle(list).opacity).toBe("0.6");
    expect(q("[data-slot=autocomplete-status]")!.textContent).toMatch(/불러오는 중/);
  });
});

describe("V4-157 select clearable", () => {
  const items = FRUITS.map((f) => ({ value: f, label: f }));
  const sel = (props: Record<string, unknown>) =>
    createElement(
      SL.Select as unknown as (p: Record<string, unknown>) => ReactNode,
      { items, defaultValue: "배", ...props },
      <SL.SelectTrigger aria-label="과일 선택"><SL.SelectValue placeholder="선택" /></SL.SelectTrigger>,
      <SL.SelectContent>{FRUITS.map((f) => <SL.SelectItem key={f} value={f}>{f}</SL.SelectItem>)}</SL.SelectContent>,
    );

  test("Backspace / Delete on the closed trigger clears to the placeholder", { timeout: 60_000 }, async () => {
    await mount(sel({ clearable: true }));
    const t = q<HTMLButtonElement>("[data-slot=select-trigger]")!;
    expect(t.textContent).toContain("배");
    t.focus();
    await userEvent.keyboard("{Backspace}");
    await until(() => !t.textContent!.includes("배"), "cleared");
    expect(t.textContent).toContain("선택");
    expect(t.getAttribute("aria-expanded")).toBe("false");
  });

  test("not clearable by default, not when required", { timeout: 60_000 }, async () => {
    await mount(sel({}));
    const t = q<HTMLButtonElement>("[data-slot=select-trigger]")!;
    t.focus();
    await userEvent.keyboard("{Delete}");
    await frames(4);
    expect(t.textContent).toContain("배");
    await mount(sel({ clearable: true, required: true }));
    const t2 = document.querySelectorAll<HTMLButtonElement>("[data-slot=select-trigger]")[1]!;
    t2.focus();
    await userEvent.keyboard("{Delete}");
    await frames(4);
    expect(t2.textContent).toContain("배");
  });
});

describe("V4-158 create row, +N chip, Esc", () => {
  test("ComboboxCreate appears for unmatched text, creates on Enter, and the popup closes", { timeout: 60_000 }, async () => {
    const created: string[] = [];
    await mount(<Combo defaultOpen>{(CB as any).ComboboxCreate ? <Create onCreate={(t: string) => created.push(t)} /> : null}</Combo>);
    await settle("[data-slot=combobox-content]");
    expect(q("[data-slot=combobox-create]")).toBeNull(); // nothing typed
    q<HTMLInputElement>("[data-slot=combobox-input]")!.focus();
    await userEvent.keyboard("라임");
    await until(() => !!q("[data-slot=combobox-create]"), "create row");
    const row = q("[data-slot=combobox-create]")!;
    expect(row.getAttribute("role")).toBe("option");
    expect(row.textContent).toContain("라임");
    await userEvent.keyboard("{ArrowDown}");
    await frames(3);
    await userEvent.keyboard("{Enter}");
    await until(() => created.length === 1, "created");
    expect(created).toEqual(["라임"]);
  });

  test("ComboboxCreate stays hidden when `exists`", { timeout: 60_000 }, async () => {
    await mount(<Combo defaultOpen>{(CB as any).ComboboxCreate ? <Create exists onCreate={() => {}} /> : null}</Combo>);
    await settle("[data-slot=combobox-content]");
    q<HTMLInputElement>("[data-slot=combobox-input]")!.focus();
    await userEvent.keyboard("사");
    await frames(6);
    expect(q("[data-slot=combobox-create]")).toBeNull();
  });

  test("the +N chip is a button that opens the popup", { timeout: 60_000 }, async () => {
    await mount(
      <div style={{ width: 260 }}>
        <Combo multiple defaultValue={FRUITS.slice(0, 8)} />
      </div>,
    );
    await until(() => !!q("[data-slot=combobox-chips-more]"), "+N chip");
    const more = q<HTMLElement>("[data-slot=combobox-chips-more]")!;
    expect(more.tagName).toBe("BUTTON");
    expect(more.getAttribute("aria-label")).toMatch(/^외 \d+개 선택됨/);
    const group = q("[data-slot=combobox-input-group]")!;
    const before = rect(group);
    expect(q("[data-slot=combobox-content]")).toBeNull();
    more.click();
    await until(() => !!q("[data-slot=combobox-content]"), "popup");
    expect(rect(group)).toEqual(before);
  });

  test("Esc with the popup closed clears a non-empty input (autocomplete keeps its text) and an empty input bubbles it", { timeout: 60_000 }, async () => {
    let bubbled = 0;
    const Root = AC.Autocomplete as unknown as (p: Record<string, unknown>) => ReactNode;
    await mount(
      createElement(Root, { items: FRUITS }, [
        <AC.AutocompleteInputGroup key="g"><AC.AutocompleteInput aria-label="과일" /></AC.AutocompleteInputGroup>,
        <AC.AutocompleteContent key="c"><AC.AutocompleteList>{(i: string) => <AC.AutocompleteItem key={i} value={i}>{i}</AC.AutocompleteItem>}</AC.AutocompleteList></AC.AutocompleteContent>,
      ]),
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") bubbled += 1;
    };
    document.body.addEventListener("keydown", onKey); // an ancestor above the React root, like a Dialog
    onTestFinished(() => document.body.removeEventListener("keydown", onKey));
    const input = q<HTMLInputElement>("[data-slot=autocomplete-input]")!;
    input.focus();
    await userEvent.keyboard("복");
    await until(() => !!q("[data-slot=autocomplete-content]"), "popup opens while typing");
    await userEvent.keyboard("{Escape}"); // 1st: closes the popup, text stays
    await until(() => !q("[data-slot=autocomplete-content]"), "popup closed");
    expect(input.value).toBe("복");
    const wasBubbling = bubbled;
    await userEvent.keyboard("{Escape}"); // 2nd: popup closed, input has text -> clears, does not bubble
    await until(() => input.value === "", "input cleared");
    expect(bubbled).toBe(wasBubbling);
    await userEvent.keyboard("{Escape}"); // empty: bubbles
    await frames(2);
    expect(bubbled).toBe(wasBubbling + 1);
  });

  test("combobox input: empty + closed Esc bubbles; typed text is cleared by Esc", { timeout: 60_000 }, async () => {
    let bubbled = 0;
    await mount(<Combo multiple />);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") bubbled += 1;
    };
    document.body.addEventListener("keydown", onKey); // an ancestor above the React root, like a Dialog
    onTestFinished(() => document.body.removeEventListener("keydown", onKey));
    const input = q<HTMLInputElement>("[data-slot=combobox-input]")!;
    input.focus();
    await userEvent.keyboard("{Escape}");
    await frames(2);
    expect(bubbled).toBe(1);
  });
});

describe("V4-159 select in a form", () => {
  test("name posts the value, required blocks an empty submit, reset restores the default", { timeout: 60_000 }, async () => {
    const items = FRUITS.map((f) => ({ value: f, label: f }));
    const host = await mount(
      <form data-testid="f">
        <SL.Select name="fruit" required defaultValue="배" items={items}>
          <SL.SelectTrigger aria-label="과일 선택"><SL.SelectValue placeholder="선택" /></SL.SelectTrigger>
          <SL.SelectContent>{FRUITS.map((f) => <SL.SelectItem key={f} value={f}>{f}</SL.SelectItem>)}</SL.SelectContent>
        </SL.Select>
        <button type="reset">reset</button>
      </form>,
    );
    const form = q<HTMLFormElement>("form", host)!;
    expect(new FormData(form).get("fruit")).toBe("배");
    const t = q<HTMLButtonElement>("[data-slot=select-trigger]", host)!;
    t.click();
    await settle("[data-slot=select-content]");
    const opt = [...document.querySelectorAll<HTMLElement>("[role=option]")].find((o) => o.textContent?.includes("포도"))!;
    opt.click();
    await until(() => t.textContent!.includes("포도"), "picked");
    expect(new FormData(form).get("fruit")).toBe("포도");
    q<HTMLButtonElement>("button[type=reset]", host)!.click();
    await until(() => t.textContent!.includes("배"), "reset restores");
    expect(new FormData(form).get("fruit")).toBe("배");
  });

  test("required with no value is invalid", { timeout: 60_000 }, async () => {
    const items = FRUITS.map((f) => ({ value: f, label: f }));
    const host = await mount(
      <form>
        <SL.Select name="fruit" required items={items}>
          <SL.SelectTrigger aria-label="과일 선택"><SL.SelectValue placeholder="선택" /></SL.SelectTrigger>
          <SL.SelectContent>{FRUITS.map((f) => <SL.SelectItem key={f} value={f}>{f}</SL.SelectItem>)}</SL.SelectContent>
        </SL.Select>
      </form>,
    );
    const form = q<HTMLFormElement>("form", host)!;
    expect(form.checkValidity()).toBe(false);
  });
});

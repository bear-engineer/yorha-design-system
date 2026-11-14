import { describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { expectPixelSnapped, expectSameHeight, expectWithinViewport } from "../.storybook/geometry";
import { frames, mountStory } from "./mount";

/**
 * v3 craft, family sel (menu, context-menu, menubar, menu-list, select, combobox, autocomplete, navigation-menu).
 * Every test measures geometry; a screenshot is never the only proof. One test per finding group so a failure names its id.
 */

const until = async (fn: () => boolean, label: string, ms = 4000) => {
  const start = performance.now();
  while (performance.now() - start < ms) {
    if (fn()) return;
    await frames(2);
  }
  throw new Error(`timeout: ${label}`);
};
const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const byText = (sel: string, text: string | RegExp) =>
  [...document.querySelectorAll<HTMLElement>(sel)].find((el) => (typeof text === "string" ? el.textContent?.trim() === text : text.test(el.textContent ?? "")));
const settled = async (el: HTMLElement) => {
  await until(() => !el.hasAttribute("data-starting-style") && el.getBoundingClientRect().width > 0, "popup open");
  await frames(30); // yorha-pop is a scale-in: wait for the final box
};
const rows = (popup: HTMLElement) => [...popup.querySelectorAll<HTMLElement>('[role^="menuitem"], [role="option"]')];
const px = (v: string) => parseFloat(v);
const token = (name: string) => {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:var(${name})`;
  document.body.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
};

async function openMenu(item: string, story: string, trigger: string) {
  await mountStory(item, story, { stage: "top" });
  const t = byText("button", trigger) ?? byText("[role=menuitem]", trigger);
  if (!t) throw new Error(`trigger ${trigger} not found`);
  await userEvent.click(t);
  await until(() => !!q("[role=menu]"), "menu");
  const popup = q<HTMLElement>("[role=menu]")!;
  await settled(popup);
  return { popup, trigger: t };
}

async function openSub(popup: HTMLElement, name: string) {
  const sub = rows(popup).find((r) => r.textContent?.trim().startsWith(name))!;
  sub.focus();
  await userEvent.keyboard("{ArrowRight}");
  await until(() => document.querySelectorAll("[role=menu]").length > 1, "submenu");
  const subPopup = [...document.querySelectorAll<HTMLElement>("[role=menu]")].find((m) => m !== popup)!;
  await settled(subPopup);
  return { sub, subPopup };
}

describe("FSEL-01 submenu opens to the side, beside its trigger row", () => {
  for (const [item, trigger, subName] of [
    ["menu", "파일 메뉴", "내보내기"],
    ["menubar", "파일", "내보내기"],
  ] as const) {
    test(`${item}`, { timeout: 60_000 }, async () => {
      const { popup } = await openMenu(item, "Default", trigger);
      const { sub, subPopup } = await openSub(popup, subName);
      const p = popup.getBoundingClientRect();
      const s = subPopup.getBoundingClientRect();
      const r = sub.getBoundingClientRect();
      expect(s.left, `sub.left ${s.left} parent.right ${p.right}`).toBeGreaterThanOrEqual(p.right - 2);
      expect(Math.abs(s.top - r.top), `sub.top ${s.top} trigger row top ${r.top}`).toBeLessThanOrEqual(8);
      expectWithinViewport(subPopup, 0);
    });
  }
  test("context-menu", { timeout: 60_000 }, async () => {
    await mountStory("context-menu", "Submenu", { stage: "top" });
    const area = q<HTMLElement>("[data-slot=context-menu-trigger]")!;
    area.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await until(() => !!q("[role=menu]"), "context menu");
    const popup = q<HTMLElement>("[role=menu]")!;
    await settled(popup);
    const { sub, subPopup } = await openSub(popup, "이동");
    const p = popup.getBoundingClientRect();
    const s = subPopup.getBoundingClientRect();
    expect(s.left, `sub.left ${s.left} parent.right ${p.right}`).toBeGreaterThanOrEqual(p.right - 2);
    expect(Math.abs(s.top - sub.getBoundingClientRect().top)).toBeLessThanOrEqual(8);
  });
});

describe("FSEL-03/04/06 one row recipe in the menu", () => {
  test("highlighted row has no ring and stays inside the popup (FSEL-03)", { timeout: 60_000 }, async () => {
    const { popup } = await openMenu("menu", "Default", "파일 메뉴");
    const first = rows(popup)[0]!;
    first.focus();
    await until(() => first.hasAttribute("data-highlighted"), "highlight");
    expect(getComputedStyle(first).outlineStyle).toBe("none");
    const p = popup.getBoundingClientRect();
    const r = first.getBoundingClientRect();
    expect(r.left).toBeGreaterThanOrEqual(p.left);
    expect(r.right).toBeLessThanOrEqual(p.right);
    // the fill must not paint outside the row either (no rule shadows past the box)
    expect(getComputedStyle(first).boxShadow).toBe("none");
  });

  test("rows share one height on the row token and sit on whole pixels (FSEL-04)", { timeout: 60_000 }, async () => {
    const { popup } = await openMenu("menu", "Default", "파일 메뉴");
    const list = rows(popup);
    expect(list.length).toBeGreaterThanOrEqual(6);
    for (const r of list) {
      expect(r.getBoundingClientRect().height, `${r.textContent?.trim()}`).toBe(token("--yorha-row"));
      expectPixelSnapped(r);
    }
    expectSameHeight(...list);
  });

  test("plain action rows have no bullet; labels align across row kinds (FSEL-06)", { timeout: 60_000 }, async () => {
    const { popup } = await openMenu("menu", "Default", "파일 메뉴");
    const action = rows(popup).find((r) => r.textContent?.includes("새 문서"))!;
    const check = rows(popup).find((r) => r.getAttribute("role") === "menuitemcheckbox")!;
    const radio = rows(popup).find((r) => r.getAttribute("role") === "menuitemradio")!;
    for (const pseudo of ["::before", "::after"] as const) {
      const c = getComputedStyle(action, pseudo).content;
      expect(["none", "normal", '""'], `${pseudo} content ${c}`).toContain(c);
    }
    expect(action.querySelector("[data-slot=row-indicator]")?.children.length ?? 0).toBe(0);
    const label = (r: HTMLElement) => r.querySelector<HTMLElement>("[data-slot=row-label]")!.getBoundingClientRect().left;
    expect(label(action)).toBe(label(check));
    expect(label(action)).toBe(label(radio));
  });
});

describe("FSEL-05 menubar popup clears the bar", () => {
  test("popup.top >= bar.bottom + 8", { timeout: 60_000 }, async () => {
    const { popup } = await openMenu("menubar", "Default", "파일");
    const bar = q<HTMLElement>("[data-slot=menubar]")!.getBoundingClientRect();
    const top = popup.getBoundingClientRect().top;
    expect(top, `popup.top ${top} bar.bottom ${bar.bottom}`).toBeGreaterThanOrEqual(bar.bottom + 8 - 0.5);
  });
});

describe("FSEL-02 item indicators carry no text (no emoji check)", () => {
  test("select", { timeout: 60_000 }, async () => {
    await mountStory("select", "AllParts", { stage: "top" }); // has a selected value
    const t = q<HTMLElement>("[data-slot=select-trigger]")!;
    t.focus();
    await userEvent.keyboard("{Enter}");
    await until(() => !!q("[role=listbox]"), "listbox");
    await settled(q<HTMLElement>("[data-slot=select-content]")!);
    const ind = [...document.querySelectorAll("[data-slot=select-item-indicator]")];
    expect(ind.length, "the selected row mounts its indicator").toBeGreaterThan(0);
    for (const i of ind) expect(i.textContent).toBe("");
  });
  test("combobox", { timeout: 60_000 }, async () => {
    await mountStory("combobox", "MultipleChips", { stage: "top" });
    const input = q<HTMLInputElement>("input")!;
    input.focus();
    await userEvent.keyboard("{ArrowDown}");
    await until(() => !!q("[role=listbox]"), "listbox");
    await settled(q<HTMLElement>("[data-slot=combobox-content]")!);
    const ind = [...document.querySelectorAll("[data-slot=combobox-item-indicator]")];
    expect(ind.length).toBeGreaterThan(0);
    for (const i of ind) expect(i.textContent).toBe("");
  });
});

describe("FSEL-03/04/09 select and combobox rows", () => {
  test("select rows: no ring, inside popup, one height", { timeout: 60_000 }, async () => {
    await mountStory("select", "Default", { stage: "top" });
    await userEvent.click(q("[data-slot=select-trigger]")!);
    await until(() => !!q("[role=listbox]"), "listbox");
    const popup = q<HTMLElement>("[data-slot=select-content]")!;
    await settled(popup);
    const list = rows(popup);
    expectSameHeight(...list);
    for (const r of list) expectPixelSnapped(r);
    const hot = list[0]!;
    hot.dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    await userEvent.hover(hot);
    await until(() => hot.hasAttribute("data-highlighted"), "highlight");
    expect(getComputedStyle(hot).outlineStyle).toBe("none");
    const p = popup.getBoundingClientRect();
    const r = hot.getBoundingClientRect();
    expect(r.left).toBeGreaterThanOrEqual(p.left);
    expect(r.right).toBeLessThanOrEqual(p.right);
  });

  test("trigger and combobox group sit on the control scale (FSEL-09)", { timeout: 60_000 }, async () => {
    await mountStory("select", "Default", { stage: "top" });
    const trig = q<HTMLElement>("[data-slot=select-trigger]")!;
    expect(trig.getBoundingClientRect().height).toBe(token("--yorha-control-md"));
    await mountStory("combobox", "Default", { stage: "top" });
    const group = q<HTMLElement>("[data-slot=combobox-input-group]")!;
    expect(group.getBoundingClientRect().height).toBe(trig.getBoundingClientRect().height);
    await mountStory("autocomplete", "Default", { stage: "top" });
    const ag = q<HTMLElement>("[data-slot=autocomplete-input-group]")!;
    expect(ag.getBoundingClientRect().height).toBe(trig.getBoundingClientRect().height);
  });
});

describe("FSEL-07 empty state", () => {
  for (const [item, slot] of [
    ["combobox", "combobox-empty"],
    ["autocomplete", "autocomplete-empty"],
  ] as const) {
    test(item, { timeout: 60_000 }, async () => {
      await mountStory(item, "EmptyState", { stage: "top" });
      const input = q<HTMLInputElement>("input")!;
      await userEvent.click(input);
      await userEvent.type(input, "zzz");
      await until(() => !!q(`[data-slot=${slot}]`)?.textContent, "empty message");
      const el = q<HTMLElement>(`[data-slot=${slot}]`)!;
      const cs = getComputedStyle(el);
      expect(px(cs.borderBottomWidth)).toBe(0);
      expect(cs.textAlign).toBe("center");
      const popup = el.closest<HTMLElement>("[data-slot$=-content]")!;
      // no stray rule: nothing below the message inside the popup but padding
      const list = popup.querySelector<HTMLElement>("[data-slot$=-list]");
      if (list) expect(list.getBoundingClientRect().height).toBe(0);
    });
  }
});

describe("FSEL-08 combobox chips", () => {
  test("every chip row has the same height and one gap", { timeout: 60_000 }, async () => {
    await mountStory("combobox", "MultipleChips", { stage: "top" });
    const chips = [...document.querySelectorAll<HTMLElement>("[data-slot=combobox-chip]")];
    const input = q<HTMLElement>("[data-slot=combobox-chips] input")!;
    expect(chips.length).toBeGreaterThanOrEqual(2);
    const hs = [...chips, input].map((e) => e.getBoundingClientRect().height);
    expect(new Set(hs).size, `heights ${hs.join(",")}`).toBe(1);
    expect(hs[0]).toBe(24);
    for (const c of chips) expectPixelSnapped(c);
    const group = q<HTMLElement>("[data-slot=combobox-input-group]")!;
    expectPixelSnapped(group);
    // chip rows: equal gaps (rows are 24px tall, so equal tops spacing = equal gaps)
    const tops = [...new Set(chips.map((c) => c.getBoundingClientRect().top))].sort((a, b) => a - b);
    const gaps = tops.slice(1).map((t, i) => t - tops[i]!);
    expect(new Set(gaps).size, `row pitch ${gaps.join(",")}`).toBeLessThanOrEqual(1);
  });
});

describe("FSEL-15 navigation-menu rows", () => {
  test("link rows are yorha-row full-bleed in the panel", { timeout: 60_000 }, async () => {
    await mountStory("navigation-menu", "Default", { stage: "top" });
    await userEvent.click(byText("button", "유닛")!);
    await until(() => !!byText("a", "유닛 목록"), "panel");
    const popup = q<HTMLElement>("[data-slot=navigation-menu-popup]")!;
    await settled(popup);
    const links = [...popup.querySelectorAll<HTMLElement>("[data-slot=navigation-menu-link]")];
    expect(links.length).toBeGreaterThanOrEqual(2);
    expectSameHeight(...links);
    for (const l of links) expectPixelSnapped(l);
    const p = popup.getBoundingClientRect();
    const l = links[0]!.getBoundingClientRect();
    expect(l.left - p.left, "full-bleed: row meets the popup border").toBeLessThanOrEqual(1);
    expect(getComputedStyle(popup.querySelector("[data-slot=navigation-menu-content]")!).maxWidth).not.toBe("none");
  });
});

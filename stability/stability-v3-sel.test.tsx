import { describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { expectPixelSnapped, expectSameHeight, expectWithinViewport } from "../.storybook/geometry";
import { frames, mountStory } from "./mount";
import { park } from "./measure";

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

describe("FSEL-08 / C2-221..223 combobox chips", () => {
  const frame = () => q<HTMLElement>("[data-slot=combobox-input-group]")!;
  test("chip row stays one line: height never changes with 1, 3 or 8 values; +N names the rest", { timeout: 60_000 }, async () => {
    await mountStory("combobox", "MultipleChips", { stage: "top" });
    const base = frame().getBoundingClientRect().height;
    expect(base).toBe(token("--yorha-control-md"));
    const sibling = frame().parentElement!.parentElement!.getBoundingClientRect().height;
    // select a 3rd value
    const input = q<HTMLElement>("[data-slot=combobox-chips] input")!;
    input.focus();
    await userEvent.keyboard("{ArrowDown}");
    await until(() => !!q("[role=listbox]"), "listbox");
    await userEvent.type(input, "des");
    await frames(5);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await frames(10);
    expect(frame().getBoundingClientRect().height, "3 values").toBe(base);
    expect(frame().parentElement!.parentElement!.getBoundingClientRect().height, "container").toBe(sibling);
    expectPixelSnapped(frame());
  });

  test("8 values: still one row, +N chip counts the hidden ones", { timeout: 60_000 }, async () => {
    await mountStory("combobox", "ManySelected", { stage: "top" });
    await frames(10);
    expect(frame().getBoundingClientRect().height, "8 values").toBe(token("--yorha-control-md"));
    const more = q<HTMLElement>("[data-slot=combobox-chips-more]")!;
    expect(more, "+N chip").toBeTruthy();
    expect(more.getAttribute("aria-label")).toMatch(/^외 \d+개 선택됨$/);
    const chips = [...document.querySelectorAll<HTMLElement>("[data-slot=combobox-chip]")];
    const visible = chips.filter((c) => c.getBoundingClientRect().height > 0);
    expect(visible.length + Number(more.textContent!.replace("+", "")), `visible ${visible.length} + more ${more.textContent} = 8, chips ${chips.length}`).toBe(8);
    const row = q<HTMLElement>("[data-slot=combobox-chips]")!.getBoundingClientRect();
    for (const c of visible) expect(c.getBoundingClientRect().height).toBe(24);
    expect(visible.length, "at least one chip stays visible").toBeGreaterThanOrEqual(1);
    expect(new Set(visible.map((c) => c.getBoundingClientRect().top)).size, "one row").toBe(1);
    for (const c of [...visible, more]) expect(c.getBoundingClientRect().right).toBeLessThanOrEqual(row.right + 0.5);
  });

  test("end cells fill the frame, one ring, same fill and body text as Input (C2-222/223)", { timeout: 60_000 }, async () => {
    await mountStory("combobox", "ManySelected", { stage: "top" });
    const f = frame().getBoundingClientRect();
    const trig = q<HTMLElement>("[data-slot=combobox-trigger]")!.getBoundingClientRect();
    const clear = q<HTMLElement>("[data-slot=combobox-clear]")!.getBoundingClientRect();
    expect(trig.height, "trigger fills inner height").toBe(f.height - 2);
    expect(clear.height).toBe(f.height - 2);
    expect(trig.left - clear.right, "clear and chevron are adjacent cells").toBeLessThanOrEqual(1);
    const cs = getComputedStyle(frame());
    const probe = document.createElement("div");
    probe.className = "bg-yorha-bg text-yorha-base";
    document.body.append(probe);
    const ref = getComputedStyle(probe);
    expect(cs.backgroundColor).toBe(ref.backgroundColor);
    expect(getComputedStyle(q("[data-slot=combobox-chips] input")!).fontSize).toBe(ref.fontSize);
    probe.remove();
    // focus inside: only the frame draws a ring; the focused cell draws none
    q<HTMLElement>("[data-slot=combobox-trigger]")!.focus();
    await frames(3);
    const ae = document.activeElement as HTMLElement;
    expect(ae.matches("[data-slot=combobox-trigger]")).toBe(true);
    expect(getComputedStyle(ae).outlineStyle === "none" || px(getComputedStyle(ae).outlineWidth) === 0, "cell has no ring").toBe(true);
    expect(px(getComputedStyle(frame()).outlineWidth), "frame ring").toBeGreaterThanOrEqual(2);
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

describe("menu-list rows (FSEL-03/04/10/14)", () => {
  test("rows sit on the row token, the selected row shows no ring, leaving rows drop at once", { timeout: 60_000 }, async () => {
    await mountStory("menu-list", "Default", { stage: "top" });
    await frames(40); // entry stagger
    const opts = [...document.querySelectorAll<HTMLElement>("[role=option]")];
    expect(opts.length).toBeGreaterThanOrEqual(4);
    for (const o of opts) {
      expect(o.getBoundingClientRect().height, o.textContent ?? "").toBe(token("--yorha-row"));
      expectPixelSnapped(o);
    }
    const sel = opts.find((o) => o.hasAttribute("data-selected"))!;
    sel.focus();
    expect(getComputedStyle(sel).outlineStyle).toBe("none"); // FSEL-03: the fill is the indicator
    const other = opts.find((o) => o !== sel)!;
    // FSEL-10: the wipe on a row that stops being selected has no duration, so only one wipe is on screen
    const dur = getComputedStyle(other).transitionDuration.split(",").map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 0.001 : 1));
    const props = getComputedStyle(other).transitionProperty.split(",").map((p) => p.trim());
    for (const [i, p] of props.entries()) if (p === "background-size" || p === "color") expect(dur[i]!, `${p} exit`).toBe(0);
  });

  test("description pane text starts level with the first row's label (FSEL-14)", { timeout: 60_000 }, async () => {
    await mountStory("menu-list", "WithDescriptionPane", { stage: "top" });
    await frames(40);
    const label = document.querySelector<HTMLElement>("[role=option] [data-menu-label]")!.getBoundingClientRect();
    const pane = document.querySelector<HTMLElement>("[role=status]")!;
    const range = document.createRange();
    range.selectNodeContents(pane);
    const text = range.getClientRects()[0]!;
    expect(Math.abs(text.top + text.height / 2 - (label.top + label.height / 2)), "first line centre vs first label centre").toBeLessThanOrEqual(2);
  });
});

describe("FSEL-10 triggers + FL-18 disabled row", () => {
  test("menubar and navigation-menu triggers drop the wipe at once; colour flips after the fill starts", { timeout: 60_000 }, async () => {
    for (const [item, slot] of [["menubar", "menubar-trigger"], ["navigation-menu", "navigation-menu-trigger"]] as const) {
      await park();
      await mountStory(item, "Default", { stage: "top" });
      // Rest-state trigger only: an open, highlighted or hovered trigger reports the entry duration by design.
      const t = document.querySelector<HTMLElement>(
        `[data-slot=${slot}]:not([data-popup-open]):not([data-highlighted]):not([data-panel-open])`,
      )!;
      expect(t, `${item} has a trigger at rest`).toBeTruthy();
      expect(t.matches(":hover"), `${item} trigger must be at rest`).toBe(false);
      const cs = getComputedStyle(t);
      const props = cs.transitionProperty.split(",").map((p) => p.trim());
      const dur = cs.transitionDuration.split(",").map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 0.001 : 1));
      const delay = cs.transitionDelay.split(",").map((d) => parseFloat(d) * (d.trim().endsWith("ms") ? 0.001 : 1));
      expect(dur[props.indexOf("background-size")], `${item} exit`).toBe(0);
      expect(delay[props.indexOf("color")], `${item} colour delay`).toBeGreaterThan(0);
    }
  });

  test("disabled menu-list row uses the disabled recipe and not-allowed cursor (FL-18)", { timeout: 60_000 }, async () => {
    await mountStory("menu-list", "Themes", { stage: "top" });
    const row = document.querySelector<HTMLElement>("[role=option][aria-disabled=true]")!;
    expect(row).toBeTruthy();
    const cs = getComputedStyle(row);
    expect(cs.cursor).toBe("not-allowed");
    expect(cs.color).not.toBe(getComputedStyle(document.querySelector<HTMLElement>("[role=option]:not([aria-disabled])")!).color);
  });
});

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { mountStory, frames } from "./mount";

/**
 * v3 layout, blocks and router family: geometry assertions for FL-01..FL-20
 * (findings from the v3 layout-family audit). Every layout claim is a measurement.
 */

const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const r = (el: Element) => el.getBoundingClientRect();
const px = (value: string) => {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:${value}`;
  document.body.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
};
/** Bounding box of the rendered text of an element (ignores padding, hit-slop and margins). */
const textBox = (el: Element) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect();
};
const settle = async () => {
  await frames(3);
  await Promise.allSettled(
    document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity)).map((a) => a.finished),
  );
};

/** Blocks are whole pages: drop mountStory's shrink-wrapping flex stage so they take the viewport width. */
const asPage = (root: HTMLElement) => {
  root.style.display = "block";
  root.style.minHeight = "0";
  return root;
};

describe("FL-10 breadcrumb", () => {
  // v4 craft: label boxes carry 4px ink padding; separators are 12px glyph cells with 12px margins, so the gap is measured to the label box.
  const labelBox = (item: Element) => r(item.querySelector("[data-slot=breadcrumb-label]") ?? item);
  const inkLeft = (item: Element) => {
    const t = item.querySelector("[data-slot=breadcrumb-label]") ?? item;
    const range = document.createRange();
    range.selectNodeContents(t.firstChild!);
    return range.getBoundingClientRect().left;
  };
  test("gaps around every separator are equal; links keep a hit target without shifting the text", async () => {
    const root = await mountStory("breadcrumb", "Default");
    await settle();
    const lis = qa(root, "li");
    const gaps: number[] = [];
    lis.forEach((li, i) => {
      if (i === 0) return;
      const sep = q(li, "[data-slot=breadcrumb-separator]");
      const item = [...li.children].find((c) => c !== sep)!;
      const prev = [...lis[i - 1]!.children].find((c) => c.getAttribute("data-slot") !== "breadcrumb-separator")!;
      gaps.push(r(sep).left - labelBox(prev).right, labelBox(item).left - r(sep).right);
    });
    const spread = Math.max(...gaps) - Math.min(...gaps);
    expect(spread, `separator gaps ${gaps.map((g) => g.toFixed(2)).join(", ")}`).toBeLessThanOrEqual(0.5);
    const nav = q(root, "nav");
    expect(Math.abs(inkLeft(lis[0]!.firstElementChild!) - r(nav).left), "first label text sits on the nav's left edge").toBeLessThanOrEqual(0.5);
    expect(Math.abs(labelBox(lis[0]!.firstElementChild!).left - (r(nav).left - 4)), "label box starts 4px left of the nav edge").toBeLessThanOrEqual(0.5);
  });

  test("a long label truncates with an ellipsis and keeps its full text in title", async () => {
    const root = await mountStory("breadcrumb", "LongLabel");
    await settle();
    const link = qa(root, "li").map((li) => [...li.children].find((c) => c.getAttribute("data-slot") !== "breadcrumb-separator")!).find((el) => (el.textContent ?? "").length > 30)!;
    expect(link, "long item rendered").toBeTruthy();
    const long = link.querySelector<HTMLElement>("[data-slot=breadcrumb-label]")!;
    expect(getComputedStyle(long).textOverflow).toBe("ellipsis");
    expect(long.scrollWidth, "truncated").toBeGreaterThan(long.clientWidth);
    expect(link.getAttribute("title")).toBe(link.textContent);
    expect(r(long).width, "max 24ch").toBeLessThanOrEqual(24 * 16);
  });
});

describe("FL-06 / FL-19 / FL-20 sidebar and nav rows", () => {
  test("every sidebar row is exactly the row token tall (integer, equal)", async () => {
    const root = await mountStory("sidebar", "Default");
    await settle();
    const rows = qa(root, 'nav[aria-label="주 메뉴"] a');
    expect(rows.length).toBeGreaterThan(2);
    const want = px("var(--yorha-row)");
    for (const a of rows) expect(r(a).height, `row "${a.textContent}"`).toBe(want);
    const tops = rows.map((a) => r(a).top);
    for (const t of tops) expect(t % 1, `row top ${t}`).toBeCloseTo(0, 5);
  });

  test("marker is a whole-pixel 12px glyph cell (v4 craft: it replaced the 6px '::before' square)", async () => {
    const root = await mountStory("sidebar", "Default");
    const marker = q(root, 'nav[aria-label="주 메뉴"] a [data-slot=nav-link-marker]');
    expect(r(marker).width).toBe(12);
    expect(r(marker).height).toBe(12);
  });

  test("nav rows have a pressed step (FL-20)", async () => {
    const root = await mountStory("sidebar", "Default");
    // :active cannot be driven from a vitest-browser story, so the rule is asserted on the class list (yorha-tint carries the :active step).
    const inactive = qa(root, 'nav[aria-label="주 메뉴"] a').find((a) => a.getAttribute("aria-current") !== "page")!;
    expect(inactive.className).toMatch(/yorha-tint/);
  });
});

describe("FL-09 split", () => {
  test("side by side: a 1px separator rule sits between the panes", async () => {
    const root = await mountStory("split", "WideSideBySide");
    await settle();
    const detail = q(root, "[data-slot=split-detail]");
    const cs = getComputedStyle(detail);
    expect(cs.borderLeftWidth).toBe("1px");
    expect(cs.borderLeftStyle).toBe("solid");
  });

  test("stacked: the rule moves to the top of the detail pane", async () => {
    const root = await mountStory("split", "NarrowStacks");
    await settle();
    const cs = getComputedStyle(q(root, "[data-slot=split-detail]"));
    expect(cs.borderTopWidth).toBe("1px");
    expect(cs.borderLeftWidth).toBe("0px");
  });
});

describe("FL-02 / FL-12 page-header", () => {
  test("the ornament rule is the band's bottom edge", async () => {
    const root = await mountStory("page-header", "Default");
    await settle();
    const header = q(root, "[data-slot=page-header]");
    const orn = q(header, "[data-slot=ornament]");
    const rule = r(orn).top + r(orn).height / 2;
    expect(Math.abs(rule - r(header).bottom), `rule ${rule} vs band bottom ${r(header).bottom}`).toBeLessThanOrEqual(1);
  });

  test("actions are centred on the title block", async () => {
    const root = await mountStory("page-header", "ActionsSlot");
    await settle();
    const title = q(root, "h1").parentElement!;
    const actions = q(root, "button").parentElement!;
    const mid = (el: Element) => r(el).top + r(el).height / 2;
    expect(Math.abs(mid(actions) - mid(title))).toBeLessThanOrEqual(1);
  });
});

describe("FL-04 yorha-demo", () => {
  test("header band and tab strip are 16px apart", async () => {
    const root = await mountStory("yorha-demo", "Default");
    await settle();
    const header = q(root, "[data-slot=page-header]");
    const tabs = q(root, "[role=tablist]");
    expect(r(tabs).top - r(header).bottom).toBe(16);
  });
});

describe("FL-01 / FL-15 bento-dashboard", () => {
  afterEach(async () => {
    await page.viewport(1280, 800);
  });
  test("코어 tile: the gauges follow the number, no dead gap inside the tile", async () => {
    await page.viewport(1280, 800);
    const root = asPage(await mountStory("bento-dashboard", "Default"));
    await settle();
    expect(r(q(root, "[data-slot=bento]")).width, "full dashboard grid (4 columns)").toBeGreaterThan(768);
    const tile = qa(root, "[data-slot=bento-tile]").find((t) => t.querySelector("h2")?.textContent === "코어")!;
    const number = q(tile, "p");
    const gauges = number.nextElementSibling!;
    expect(r(gauges).top - r(number).bottom, "gap between the number and the gauges").toBeLessThanOrEqual(24);
    const content = qa(tile, "[data-slot=bento-tile-body] *").reduce((m, e) => Math.max(m, r(e).bottom), 0);
    expect(r(tile).bottom - content, "tile height <= content + 32").toBeLessThanOrEqual(32);
  });

  for (const width of [360, 320]) {
    describe(`at ${width}px`, () => {
      beforeEach(async () => {
        await page.viewport(width, 700);
      });
      afterEach(async () => {
        await page.viewport(1280, 800);
      });
      test("no page-level horizontal scroll and symmetric margins", async () => {
        const root = asPage(await mountStory("bento-dashboard", "Default"));
        await settle();
        const doc = document.documentElement;
        expect(doc.scrollWidth, "scrollWidth").toBeLessThanOrEqual(doc.clientWidth);
        const tiles = qa(root, "[data-slot=bento-tile]");
        const left = Math.min(...tiles.map((t) => r(t).left));
        const right = Math.max(...tiles.map((t) => r(t).right));
        expect(Math.abs(left - (doc.clientWidth - right)), `left ${left}, right gap ${doc.clientWidth - right}`).toBeLessThanOrEqual(1);
      });
    });
  }
});

describe("FL-03 settings-form", () => {
  test("the form sits in a framed panel no wider than 40rem", async () => {
    const root = await mountStory("settings-form", "Default");
    await settle();
    const form = q(root, "form");
    const panel = form.closest("section,article,div")!.closest("[data-slot=form-panel]") as HTMLElement | null;
    expect(panel, "form is wrapped in [data-slot=form-panel]").toBeTruthy();
    expect(getComputedStyle(panel!).borderTopWidth).toBe("1px");
    expect(r(panel!).width).toBeLessThanOrEqual(640 + 1);
  });
});

describe("FL-18 / FL-19 system-menu-layout", () => {
  test("disabled row keeps aria-disabled and shows the not-allowed cursor", async () => {
    const root = await mountStory("system-menu-layout", "Default", { stage: "top" });
    await settle();
    const row = qa(root, "[role=option]").find((o) => o.textContent?.includes("보안 키"))!;
    expect(row.getAttribute("aria-disabled")).toBe("true");
    expect(getComputedStyle(row).cursor).toBe("not-allowed");
  });

  test("row text starts at the same x selected or not", async () => {
    const root = await mountStory("system-menu-layout", "Default", { stage: "top" });
    await settle();
    const [a, b] = qa(root, "[role=option]").filter((o) => o.getAttribute("aria-disabled") !== "true");
    const labelX = (el: Element) => textBox(el.querySelector("span") ?? el).left;
    expect(a!.getAttribute("aria-selected")).toBe("true");
    expect(Math.abs(labelX(a!) - labelX(b!))).toBeLessThanOrEqual(0.5);
  });
});

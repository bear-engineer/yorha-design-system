import { afterEach, describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { mountStory, frames, animationsFinished } from "./mount";

/** v4 bento: the docs hero is a real desktop dashboard (1200px), varied tile sizes, stable hover, a focus ring inside the gap. */

const r = (el: Element) => el.getBoundingClientRect();
const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const tiles = (root: ParentNode) => qa(root, '[data-slot="bento-tile"]');
const tile = (root: ParentNode, id: string) => q(root, `[data-tile="${id}"]`);
const tracks = (el: Element, prop: "gridTemplateColumns" | "gridTemplateRows") => getComputedStyle(el)[prop].split(" ").map(parseFloat);
const gapOf = (el: Element) => parseFloat(getComputedStyle(el).columnGap);
const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const close = (a: number, b: number, msg: string) => expect(Math.abs(a - b), msg).toBeLessThanOrEqual(0.5);

async function mount(width = 1200) {
  await page.viewport(1280, 900);
  const root = await mountStory("bento", "Default");
  root.style.display = "block";
  root.style.minHeight = "0";
  const frame = q(root, "[data-frame]");
  frame.style.width = `${width}px`;
  await animationsFinished();
  await frames(2);
  return root;
}

afterEach(async () => {
  await page.viewport(1280, 800);
});

describe("V4 bento docs hero at a 1200px container", () => {
  test("the grid is 12 columns and the hero tile spans 2x2 cells", async () => {
    const root = await mount();
    const grid = q(root, '[data-slot="bento"]');
    const cols = tracks(grid, "gridTemplateColumns");
    const rows = tracks(grid, "gridTemplateRows");
    expect(cols.length).toBeGreaterThanOrEqual(4);
    const gap = gapOf(grid);
    const hero = r(tile(root, "hero"));
    close(hero.width, cols[0]! * 2 + gap, "hero spans 2 columns");
    close(hero.height, rows[0]! + gap + rows[1]!, "hero spans 2 rows");
  });

  test("wide tiles span 2 columns and tall tiles span 2 rows; the sizes are varied", async () => {
    const root = await mount();
    const grid = q(root, '[data-slot="bento"]');
    const cols = tracks(grid, "gridTemplateColumns");
    const gap = gapOf(grid);
    const wides = qa(root, '[data-tile][data-size="wide"], [data-tile][data-size="2x1"]');
    expect(wides.length).toBeGreaterThanOrEqual(1);
    for (const w of wides) close(r(w).width, cols[0]! * 2 + gap, `${(w as HTMLElement).dataset.tile} spans 2 columns`);
    const talls = qa(root, '[data-tile][data-size="tall"], [data-tile][data-size="1x2"]');
    expect(talls.length).toBeGreaterThanOrEqual(1);
    const unit = r(tile(root, "metric"));
    for (const t of talls) expect(r(t).height, "tall is about twice a 1x1").toBeGreaterThan(unit.height * 1.9);
    const footprints = new Set(tiles(root).map((t) => `${Math.round(r(t).width)}x${Math.round(r(t).height)}`));
    expect(footprints.size, "at least four distinct tile footprints").toBeGreaterThanOrEqual(4);
  });

  test("tiles never overlap, fill the grid width, and leave no big empty band inside", async () => {
    const root = await mount();
    const all = tiles(root);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect(intersects(r(all[i]!), r(all[j]!)), `${all[i]!.dataset.tile} vs ${all[j]!.dataset.tile}`).toBe(false);
    const grid = r(q(root, '[data-slot="bento"]'));
    expect(Math.max(...all.map((t) => r(t).right))).toBeGreaterThanOrEqual(grid.right - 0.5);
    for (const t of all) {
      const pad = parseFloat(getComputedStyle(t).paddingBottom);
      const content = qa(t, "[data-slot=bento-tile-body] *").reduce((m, e) => Math.max(m, r(e).bottom), 0);
      expect(r(t).bottom - pad - content, `${t.dataset.tile}: empty band under content`).toBeLessThanOrEqual(120);
    }
  });

  test("tile anatomy: title row with glyph + meta on the right, then body; one-glyph integer-grid padding", async () => {
    const root = await mount();
    const metric = tile(root, "metric");
    const title = q(metric, '[data-slot="bento-tile-title"]');
    const meta = q(metric, '[data-slot="bento-tile-meta"]');
    expect(q(metric, '[data-slot="bento-tile-glyph"]')).toBeTruthy();
    expect(r(meta).right).toBeGreaterThan(r(title).right);
    close(r(meta).right, r(metric).right - 1 - parseFloat(getComputedStyle(metric).paddingRight), "meta is flush with the tile's inner right edge");
    expect(r(q(metric, '[data-slot="bento-tile-content"]')).top).toBeGreaterThanOrEqual(r(title).bottom);
    for (const t of tiles(root)) {
      const cs = getComputedStyle(t);
      for (const side of ["Top", "Right", "Bottom", "Left"] as const) expect(parseFloat(cs[`padding${side}`]) % 4, `${t.dataset.tile} padding ${side}`).toBe(0);
    }
    const footer = q(root, '[data-slot="bento-tile-footer"]');
    expect(parseFloat(getComputedStyle(footer).borderTopWidth), "footer rule is a hard 1px line").toBe(1);
  });

  test("tile states: loading is a single status region, error is an alert", async () => {
    const root = await mount();
    const loading = tile(root, "loading");
    expect(qa(loading, '[role="status"]').length).toBe(1);
    expect(loading.dataset.state).toBe("loading");
    const error = tile(root, "error");
    expect(error.dataset.state).toBe("error");
    expect(qa(error, '[role="alert"]').length).toBe(1);
  });
});

describe("V4 bento link tiles", () => {
  test("hover moves and resizes nothing (all tile rects identical) but does change the frame", async () => {
    const root = await mount();
    const links = qa(root, "[data-slot=bento-tile] a");
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const a of links) {
      const owner = a.closest<HTMLElement>('[data-slot="bento-tile"]')!;
      const before = tiles(root).map((t) => JSON.stringify(r(t).toJSON()));
      const frameBefore = getComputedStyle(owner).boxShadow + getComputedStyle(owner).borderColor;
      await userEvent.hover(owner);
      await new Promise((res) => setTimeout(res, 400));
      expect(tiles(root).map((t) => JSON.stringify(r(t).toJSON())), `rects while hovering ${owner.dataset.tile}`).toEqual(before);
      expect(getComputedStyle(owner).boxShadow + getComputedStyle(owner).borderColor, `${owner.dataset.tile} hover emphasis`).not.toBe(frameBefore);
      await userEvent.unhover(owner);
    }
  });

  test("keyboard focus ring box stays inside the gap and touches no neighbour tile", async () => {
    const root = await mount();
    const links = qa(root, "[data-slot=bento-tile] a");
    const seen = new Set<string>();
    for (let i = 0; i < links.length; i++) {
      await userEvent.tab();
      const active = document.activeElement as HTMLElement;
      const owner = active.closest<HTMLElement>('[data-slot="bento-tile"]')!;
      expect(owner, "focus lands in a bento tile").toBeTruthy();
      seen.add(owner.dataset.tile!);
      // The element that draws the ring: the tile (has-focus-visible) or the link itself.
      const ringEl = [owner, active].find((el) => getComputedStyle(el).outlineStyle !== "none")!;
      expect(ringEl, `${owner.dataset.tile}: a focus ring is drawn`).toBeTruthy();
      const cs = getComputedStyle(ringEl);
      const grow = parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset);
      const box = r(ringEl);
      const ring = new DOMRect(box.left - grow, box.top - grow, box.width + grow * 2, box.height + grow * 2);
      expect(r(ringEl).width, "ring belongs to the tile or a part of it").toBeLessThanOrEqual(r(owner).width + 0.5);
      for (const other of tiles(root).filter((t) => t !== owner)) expect(intersects(ring, r(other)), `ring of ${owner.dataset.tile} vs ${other.dataset.tile}`).toBe(false);
      const gap = gapOf(q(root, '[data-slot="bento"]'));
      expect(grow, "ring fits in the gap").toBeLessThan(gap);
    }
    expect(seen.size, "every link tile is reachable by Tab").toBe(links.length);
  });

  test("the tab order of the link tiles is the DOM order", async () => {
    const root = await mount();
    const order = qa(root, "[data-slot=bento-tile] a").map((a) => a.closest<HTMLElement>('[data-slot="bento-tile"]')!.dataset.tile);
    const got: (string | undefined)[] = [];
    for (let i = 0; i < order.length; i++) {
      await userEvent.tab();
      got.push((document.activeElement as HTMLElement).closest<HTMLElement>('[data-slot="bento-tile"]')?.dataset.tile);
    }
    expect(got).toEqual(order);
  });
});

describe("V4 bento at a 360px container", () => {
  test("one column, visual order equals DOM order, tiles fill the width", async () => {
    const root = await mount(360);
    const grid = q(root, '[data-slot="bento"]');
    expect(tracks(grid, "gridTemplateColumns").length).toBe(1);
    const all = tiles(root);
    const visual = [...all].sort((a, b) => r(a).top - r(b).top || r(a).left - r(b).left);
    expect(visual.map((t) => t.dataset.tile)).toEqual(all.map((t) => t.dataset.tile));
    for (const t of all) close(r(t).width, r(grid).width, `${t.dataset.tile} width`);
    expect(document.documentElement.scrollWidth, "no horizontal overflow").toBeLessThanOrEqual(1280);
  });
});

describe("V4 bento entrance", () => {
  test("stagger plays once: no animation is running again after it settled", async () => {
    const root = await mount();
    const t = tile(root, "hero");
    expect(getComputedStyle(t).animationName).toBe("yorha-stagger-in");
    expect(getComputedStyle(t).animationIterationCount).toBe("1");
    expect(t.getAnimations().filter((a) => a.playState === "running").length).toBe(0);
  });
});

import { describe, expect, test } from "vitest";
import { checkControl, fmt, settle, visibleControls } from "./measure";
import { mountStory, storyModule } from "./mount";

export interface ItemConfig {
  /** Item name (`dialog`). */
  item: string;
  /** Stories to exercise; default `["States"]`. */
  stories?: string[];
  /** false when the row legitimately grows with state (expanders). The control itself is always checked. */
  rowCheck?: boolean;
  /** Stage alignment; expanders use "top" so their own growth does not re-centre the story. */
  stage?: "center" | "top";
  /** Selector override for items whose control is not a button/input (e.g. a context-menu trigger area). */
  selector?: string;
  /** Controls matching this selector are skipped; state the reason in the config line comment. */
  exclude?: string;
  /** Max controls per story (default 6): each costs ~2s of real-time sampling. */
  max?: number;
}

/**
 * One test per item/story: hover, pointer-down, click and keyboard on each control must not move or resize the control
 * or its row (a symmetric press scale is allowed, see measure.ts). Popups opened by an action are
 * closed with Escape before the next control.
 */
export function stabilitySuite(title: string, items: ItemConfig[]) {
  describe(title, () => {
    for (const cfg of items) {
      for (const name of cfg.stories ?? ["States"]) {
        if (!storyModule(cfg.item)?.[name]) continue;
        test(`${cfg.item} / ${name}`, { timeout: 120_000 }, async () => {
          const wrapper = await mountStory(cfg.item, name, { stage: cfg.stage });
          const controls = visibleControls(wrapper, cfg.max ?? 6, cfg.selector).filter((el) => !cfg.exclude || !el.matches(cfg.exclude));
          expect(controls.length, "no interactive control found (vacuous pass)").toBeGreaterThan(0);
          const failures: string[] = [];
          const block = (e: Event) => e.preventDefault();
          document.addEventListener("click", block, true); // anchors must not navigate the test frame
          try {
            for (const [i, el] of controls.entries()) {
              if (!el.isConnected) continue;
              const shifts = await checkControl(el, { rowCheck: cfg.rowCheck });
              if (shifts.length) failures.push(`#${i} ${el.getAttribute("role") ?? el.tagName} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 20)}": ${fmt(shifts)}`);
              await settle();
            }
          } finally {
            document.removeEventListener("click", block, true);
          }
          expect(failures, failures.join("\n")).toEqual([]);
        });
      }
    }
  });
}

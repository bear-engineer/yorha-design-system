import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../../registry/yorha/ui/menu/menu";
import { tokens } from "./tokens.generated";

const DENSITIES = ["compact", "default", "comfortable"] as const;
const MOTIONS = ["full", "reduced", "off"] as const;
type Theme = "light" | "dark" | "high-contrast" | "authentic";

const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
/** "180ms" -> "0.18s", the form getComputedStyle reports. */
const toSeconds = (ms: string) => `${parseFloat(ms) / 1000}s`;

function DensityDemo() {
  return (
    <div className="flex flex-wrap items-start gap-4 font-yorha text-yorha-fg">
      {DENSITIES.map((density) => (
        <div key={density} role="group" aria-label={`밀도 ${density}`} data-density={density} className="border border-yorha-border bg-yorha-panel">
          <div data-testid={`spacing-${density}`} className="p-4" />
          <div data-testid={`box-${density}`} className="grid h-control-md place-items-center px-pad-md">
            <p className="text-yorha-sm tracking-yorha-wide uppercase">{density}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MotionDemo() {
  return (
    <div className="flex flex-wrap items-start gap-4 font-yorha text-yorha-fg">
      {MOTIONS.map((mode) => (
        <div key={mode} role="group" aria-label={`모션 ${mode}`} data-motion={mode} className="border border-yorha-border bg-yorha-panel">
          <p data-testid={`probe-${mode}`} className="p-4 text-yorha-sm" style={{ transitionProperty: "opacity", transitionDuration: "var(--motion-select)" }}>
            data-motion={mode}
          </p>
        </div>
      ))}
    </div>
  );
}

const SWIPED = { "--drawer-swipe-movement-y": "24px" } as CSSProperties;
const STAGGER_INDEXES = [0, 1, 2, 40] as const;

/** One static probe per utility and state, in each motion mode: the play test reads their computed styles. */
function MotionUtilityDemo() {
  const box = "size-6 bg-yorha-ink";
  return (
    <div className="flex flex-wrap items-start gap-4 font-yorha text-yorha-fg">
      {MOTIONS.map((mode) => (
        <div key={mode} role="group" aria-label={`모션 유틸리티 ${mode}`} data-motion={mode} className="flex w-48 flex-col gap-2 border border-yorha-border bg-yorha-panel p-4">
          <p className="text-yorha-sm tracking-yorha-wide uppercase">data-motion={mode}</p>
          {(["pop", "panel", "fade", "slide-up", "slide-down", "slide-left", "slide-right"] as const).map((name) => (
            <div key={name} className="flex gap-2">
              <div data-testid={`${name}-open-${mode}`} className={`yorha-${name} ${box}`} />
              <div data-testid={`${name}-start-${mode}`} data-starting-style="" className={`yorha-${name} ${box}`} />
              <div data-testid={`${name}-end-${mode}`} data-ending-style="" className={`yorha-${name} ${box}`} />
            </div>
          ))}
          <div data-testid={`slide-up-swiping-${mode}`} data-swiping="" style={SWIPED} className={`yorha-slide-up ${box}`} />
          {/* The short fading slide the Motion page documents for toasts. */}
          <div data-testid={`slide-short-${mode}`} data-starting-style="" className={`yorha-slide-left [--yorha-slide-distance:1rem] data-[starting-style]:opacity-0 ${box}`} />
          <div data-testid={`collapse-open-${mode}`} style={{ "--collapsible-panel-height": "40px" } as CSSProperties} className="yorha-collapse bg-yorha-grid">
            {/* An accordion panel nested in a collapsible must read its own height variable, not the inherited one. */}
            <div data-testid={`collapse-accordion-${mode}`} data-index="0" style={{ "--accordion-panel-height": "24px" } as CSSProperties} className="yorha-collapse bg-yorha-ink" />
          </div>
          <div data-testid={`collapse-start-${mode}`} data-starting-style="" style={{ "--collapsible-panel-height": "40px" } as CSSProperties} className="yorha-collapse bg-yorha-grid" />
          <button type="button" data-testid={`press-${mode}`} className="yorha-press border border-yorha-border bg-yorha-control px-3 py-2 text-yorha-sm text-yorha-on-control focus-visible:yorha-focus">
            누름 {mode}
          </button>
          <div className="flex gap-2">
            {STAGGER_INDEXES.map((index) => (
              <div key={index} data-testid={`stagger-${index}-${mode}`} style={{ "--yorha-stagger-index": index } as CSSProperties} className={`yorha-stagger ${box}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** First style rule matching `test`, searching nested rules and layers; `inside` is true below a rule whose selector matched `scope`. */
function findStyleRule(scope: string, test: (selector: string) => boolean): CSSStyleRule | undefined {
  const visit = (rules: CSSRuleList, inside: boolean): CSSStyleRule | undefined => {
    for (const rule of rules) {
      const selector = rule instanceof CSSStyleRule ? rule.selectorText : "";
      const scoped = inside || selector.includes(scope);
      if (rule instanceof CSSStyleRule && scoped && test(selector)) return rule;
      const found = "cssRules" in rule ? visit(rule.cssRules as CSSRuleList, scoped) : undefined;
      if (found) return found;
    }
    return undefined;
  };
  for (const sheet of document.styleSheets) {
    const found = visit(sheet.cssRules, false);
    if (found) return found;
  }
  return undefined;
}

function ThemeSurfaces({ themes }: { themes: readonly Theme[] }) {
  return (
    <div className="grid gap-4 font-yorha md:grid-cols-3">
      {themes.map((theme) => (
        <div key={theme} role="group" aria-label={`테마 ${theme}`} data-theme={theme} data-testid={`theme-${theme}`} className="flex flex-col gap-3 bg-yorha-bg p-4 text-yorha-fg">
          <p className="text-yorha-lg tracking-yorha-heading text-yorha-fg-ink uppercase text-shadow-yorha">{theme}</p>
          <div className="flex flex-col gap-1 border border-yorha-border bg-yorha-panel p-4 shadow-yorha-md">
            <p className="text-yorha-fg-strong">강조 본문 fg-strong</p>
            <p>기본 본문 fg</p>
            <p className="text-yorha-fg-soft">보조 텍스트 fg-soft</p>
            <p className="text-yorha-fg-muted">흐린 텍스트 fg-muted</p>
            <p className="text-yorha-alert">경고 텍스트 alert</p>
          </div>
          <p className="bg-yorha-ink p-2 text-yorha-on-ink">
            선택 행 on-ink · <span className="text-yorha-on-ink-soft">on-ink-soft</span> · <span className="text-yorha-alert-on-ink">alert-on-ink</span>
          </p>
          <p className="bg-yorha-control p-2 text-yorha-on-control">컨트롤 면 on-control</p>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: "파운데이션/Tokens",
  tags: ["autodocs"],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** `[data-density]` rescales the size tokens (control height, row, padding) in that subtree; the 4px grid itself never changes. */
export const Density: Story = {
  render: () => <DensityDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = (density: (typeof DENSITIES)[number]) => getComputedStyle(canvas.getByTestId(`box-${density}`));
    const control = tokens.sizes.find((size) => size.name === "control.md");
    await expect(control).toBeDefined();
    if (!control) return;
    for (const density of DENSITIES) {
      // h-control-md = the density's control.md token, a whole px on the 4px grid.
      const expected = parseFloat(control[density]) * rootFontSize();
      await expect(parseFloat(box(density).height)).toBeCloseTo(expected, 1);
      await expect(expected % 4).toBe(0);
    }
    await expect(parseFloat(box("compact").height)).toBeLessThan(parseFloat(box("default").height));
    await expect(parseFloat(box("default").height)).toBeLessThan(parseFloat(box("comfortable").height));
    // spacing is not density-dependent: p-4 is 16px everywhere
    for (const density of DENSITIES) await expect(canvas.getByTestId(`spacing-${density}`)).toHaveStyle({ paddingTop: "16px" });
  },
};

/** Caret, selection and decor layering (G12, G13). Autofill cannot be driven headless; it needs a manual check. */
export const BaseRules: Story = {
  render: () => (
    <div className="font-yorha text-yorha-fg">
      <input data-testid="field" aria-label="입력" className="border border-yorha-border bg-yorha-bg px-pad-sm" />
      <p data-testid="text">선택 영역은 잉크 바탕에 반전 글자</p>
      <button type="button" data-testid="button">버튼</button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(getComputedStyle(canvas.getByTestId("field")).caretColor).not.toBe("auto");
    const root = getComputedStyle(document.documentElement);
    const ink = root.getPropertyValue("--yorha-ink").trim();
    await expect(ink).not.toBe("");
    const selection = getComputedStyle(canvas.getByTestId("text"), "::selection");
    await expect(selection.backgroundColor).toBe(getComputedStyle(canvas.getByTestId("field")).caretColor);
    await expect(getComputedStyle(canvas.getByTestId("button")).userSelect).toBe("none");
    await expect(root.getPropertyValue("--yorha-z-decor").trim()).toBe("-1");
  },
};

/** State recipes (G7): tint, disabled, read-only, invalid. Each box has a fixed size; no state changes it. */
function StateRecipeDemo() {
  const box = "grid h-control-md w-40 place-items-center border border-yorha-border bg-yorha-bg px-pad-md";
  return (
    <div className="flex flex-col gap-4 font-yorha text-yorha-fg">
      {(["light", "high-contrast"] as const).map((theme) => (
        <div key={theme} data-theme={theme} data-testid={`states-${theme}`} className="flex flex-wrap items-start gap-4 bg-yorha-bg p-4">
          <button type="button" data-testid={`tint-${theme}`} className={`${box} yorha-tint`}>tint</button>
          <button type="button" data-selected="" data-testid={`tint-selected-${theme}`} className={`${box} yorha-tint bg-yorha-ink text-yorha-on-ink`}>selected</button>
          <button type="button" disabled data-testid={`disabled-${theme}`} className={`${box} yorha-tint yorha-disabled shadow-yorha-sm`}>disabled</button>
          <button type="button" disabled data-checked="" data-testid={`disabled-checked-${theme}`} className={`${box} yorha-disabled bg-yorha-ink text-yorha-on-ink`}>checked</button>
          <input readOnly defaultValue="읽기 전용" aria-label={`읽기 전용 ${theme}`} data-testid={`readonly-${theme}`} className={`${box} yorha-readonly`} />
          <input aria-invalid="true" defaultValue="잘못된 값" aria-label={`잘못됨 ${theme}`} data-testid={`invalid-${theme}`} className={`${box} yorha-invalid`} />
          <span data-testid={`probe-disabled-${theme}`} className="text-yorha-disabled" />
          <span data-testid={`probe-bg-${theme}`} className="text-yorha-bg" />
          <span data-testid={`probe-hover-${theme}`} className="bg-yorha-hover" />
          <span data-testid={`probe-pressed-${theme}`} className="bg-yorha-pressed" />
          <span data-testid={`probe-alert-${theme}`} className="text-yorha-alert-ui" />
        </div>
      ))}
    </div>
  );
}

export const StateRecipes: Story = {
  render: () => <StateRecipeDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const style = (id: string) => getComputedStyle(canvas.getByTestId(id));
    const TRANSPARENT = "rgba(0, 0, 0, 0)";
    for (const theme of ["light", "high-contrast"]) {
      const probe = (name: string, prop: "color" | "backgroundColor") => style(`probe-${name}-${theme}`)[prop];
      // Real :hover cannot be driven from a story (synthetic events); the recipe's selectors are asserted in
      // build-tokens.test.ts and a CDP pointer hover runs in stability/. Here: the resting boxes and the state colours.
      await expect(style(`tint-${theme}`).backgroundColor).not.toBe(probe("hover", "backgroundColor"));
      await expect(probe("hover", "backgroundColor")).not.toBe(TRANSPARENT);
      await expect(probe("pressed", "backgroundColor")).not.toBe(probe("hover", "backgroundColor"));
      await expect(style(`tint-selected-${theme}`).backgroundColor).not.toBe(TRANSPARENT);

      // disabled: no opacity, content and border in the disabled colour, no shadow, no tint on hover
      const disabled = style(`disabled-${theme}`);
      await expect(disabled.opacity).toBe("1");
      await expect(disabled.color).toBe(probe("disabled", "color"));
      await expect(disabled.borderTopColor).toBe(probe("disabled", "color"));
      await expect(disabled.boxShadow).toBe("none");
      await expect(disabled.cursor).toBe("not-allowed");
      await expect(disabled.backgroundColor).toBe(TRANSPARENT);
      // a checked disabled control keeps its mark in the disabled colour
      const checked = style(`disabled-checked-${theme}`);
      await expect(checked.backgroundColor).toBe(probe("disabled", "color"));
      await expect(checked.color).toBe(probe("bg", "color"));
      await expect(checked.opacity).toBe("1");

      // read-only: only the bottom rule remains
      const readonly = style(`readonly-${theme}`);
      await expect(readonly.borderTopColor).toBe(TRANSPARENT);
      await expect(readonly.borderBottomColor).not.toBe(TRANSPARENT);
      await expect(readonly.backgroundColor).toBe(TRANSPARENT);

      // invalid: alert edge, an inset shadow makes it 2px; border width is untouched
      const invalid = style(`invalid-${theme}`);
      await expect(invalid.borderTopColor).toBe(probe("alert", "color"));
      await expect(invalid.boxShadow).toContain("inset");
      await expect(invalid.borderTopWidth).toBe("1px");
    }
  },
};

/** `[data-motion=reduced|off]` zeroes every motion duration, so transitions land on their final state at once. */
export const Motion: Story = {
  render: () => <MotionDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = tokens.motion.durations.find((d) => d.name === "select");
    await expect(select).toBeDefined();
    if (!select) return;
    await expect(parseFloat(select.value)).toBeGreaterThan(0);
    const probe = (mode: (typeof MOTIONS)[number]) => getComputedStyle(canvas.getByTestId(`probe-${mode}`));

    await expect(probe("full").getPropertyValue(select.cssVar).trim()).toBe(select.value);
    await expect(probe("full").transitionDuration).toBe(toSeconds(select.value));
    for (const mode of ["reduced", "off"] as const) {
      for (const duration of tokens.motion.durations) {
        // --motion-loop is the exception: reduced keeps a slow (2400ms) loader pulse, off is 0
        const expected = duration.name === "loop" && mode === "reduced" ? "2400ms" : "0ms";
        await expect(probe(mode).getPropertyValue(duration.cssVar).trim()).toBe(expected);
        await expect(probe(mode).getPropertyValue(duration.alias).trim()).toBe(expected);
      }
      await expect(probe(mode).transitionDuration).toBe("0s");
    }
  },
};

/**
 * Base motion utilities (`yorha-pop`, `yorha-panel`, `yorha-fade`, `yorha-slide-*`, `yorha-collapse`, `yorha-press`, `yorha-stagger`).
 * full: token durations and spatial movement. reduced: opacity only, at most 120ms. off: no transition at all.
 */
export const MotionUtilities: Story = {
  render: () => <MotionUtilityDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    type Mode = (typeof MOTIONS)[number];
    const style = (id: string, mode: Mode) => getComputedStyle(canvas.getByTestId(`${id}-${mode}`));
    const seconds = (list: string) => list.split(",").map((value) => parseFloat(value));
    const durations = (id: string, mode: Mode) => seconds(style(id, mode).transitionDuration);
    /** Computed `translate` as [x, y] numbers ("none" -> [0, 0]); percentages keep their number. */
    const translate = (id: string, mode: Mode) => {
      const [x = 0, y = 0] = style(id, mode).translate.split(" ").map((value) => parseFloat(value) || 0);
      return [x, y];
    };
    const token = (name: string) => {
      const found = tokens.motion.durations.find((duration) => duration.name === name);
      if (!found) throw new Error(`no motion duration token "${name}"`);
      return parseFloat(found.value) / 1000;
    };
    const OPEN_CLOSE = ["pop", "panel", "fade", "slide-up", "slide-down", "slide-left", "slide-right"] as const;

    // The entrance keyframes exist: a running CSS animation is only created when @keyframes resolved.
    const running = canvasElement.getAnimations({ subtree: true }).map((animation) => (animation instanceof CSSAnimation ? animation.animationName : ""));
    await expect(running).toContain("yorha-stagger-in");

    // The spec table and the stylesheet agree: every listed utility resolves to a real class.
    await expect(tokens.motion.utilities).toHaveLength(11); // + yorha-wipe (design review M15)
    for (const name of tokens.motion.utilities) await expect(findStyleRule(`.${name}`, () => true), name).toBeDefined();

    // full: token durations, exit faster than enter, spatial start values.
    await expect(style("pop-open", "full").transitionProperty).toBe("opacity, scale");
    await expect(durations("pop-open", "full")).toEqual([token("popover")]);
    await expect(durations("pop-end", "full")).toEqual([token("popover-exit")]);
    await expect(style("pop-start", "full").opacity).toBe("0");
    await expect(parseFloat(style("pop-start", "full").scale)).toBeCloseTo(0.96, 3);
    await expect(style("pop-open", "full").opacity).toBe("1");
    await expect(durations("panel-open", "full")).toEqual([token("panel")]);
    await expect(durations("panel-end", "full")).toEqual([token("panel-exit")]);
    await expect(translate("panel-start", "full")).toEqual([0, 0.5 * rootFontSize()]);
    await expect(style("fade-open", "full").transitionProperty).toBe("opacity");
    await expect(durations("fade-open", "full")).toEqual([token("panel")]);
    await expect(durations("fade-end", "full")).toEqual([token("panel-exit")]);
    await expect(style("fade-start", "full").opacity).toBe("0");
    await expect(translate("slide-up-start", "full")).toEqual([0, 100]);
    await expect(translate("slide-down-start", "full")).toEqual([0, -100]);
    await expect(translate("slide-left-start", "full")).toEqual([100, 0]);
    await expect(translate("slide-right-start", "full")).toEqual([-100, 0]);
    await expect(durations("slide-up-open", "full")).toEqual([token("drawer")]);
    // A full-size slide does not fade; a dragged drawer follows the finger with no transition.
    await expect(style("slide-up-start", "full").opacity).toBe("1");
    await expect(translate("slide-up-swiping", "full")).toEqual([0, 24]);
    await expect(durations("slide-up-swiping", "full")).toEqual([0]);
    await expect(translate("slide-short", "full")).toEqual([rootFontSize(), 0]);
    await expect(style("slide-short", "full").opacity).toBe("0");
    await expect(style("collapse-open", "full").height).toBe("40px");
    await expect(style("collapse-accordion", "full").height).toBe("24px");
    await expect(style("collapse-start", "full").height).toBe("0px");
    await expect(style("collapse-start", "full").opacity).toBe("0");
    await expect(style("collapse-open", "full").transitionProperty).toBe("height, opacity");
    await expect(durations("collapse-open", "full")).toEqual([token("collapse"), token("collapse")]);
    await expect(style("press", "full").transitionProperty.split(", ")[0]).toBe("scale");
    await expect(durations("press", "full")[0]).toBe(token("press"));
    const active = findStyleRule(".yorha-press", (selector) => selector.includes(":active"));
    await expect(active?.style.getPropertyValue("scale")).toContain("--motion-scale-press");
    await expect(style("stagger-0", "full").animationName).toBe("yorha-stagger-in");
    await expect(seconds(style("stagger-0", "full").animationDuration)).toEqual([token("stagger-enter")]);
    for (const index of [0, 1, 2] as const) await expect(parseFloat(style(`stagger-${index}`, "full").animationDelay)).toBeCloseTo(token("stagger") * index, 5);
    // Rows past the cap enter together, so a long list never takes seconds to appear.
    await expect(parseFloat(style("stagger-40", "full").animationDelay)).toBeCloseTo(token("stagger") * 6, 5);

    // reduced: opacity only, at most 120ms. No scale, no translate, no height animation, no stagger delay.
    for (const name of OPEN_CLOSE) {
      for (const state of ["open", "end"] as const) {
        const list = durations(`${name}-${state}`, "reduced");
        await expect(Math.max(...list), `${name}-${state}`).toBeLessThanOrEqual(0.12);
        await expect(list[0], `${name}-${state} opacity fade`).toBeGreaterThan(0);
      }
      await expect(style(`${name}-start`, "reduced").opacity, name).toBe("0");
      await expect(translate(`${name}-start`, "reduced"), name).toEqual([0, 0]);
      await expect(["none", "1"], name).toContain(style(`${name}-start`, "reduced").scale);
    }
    await expect(durations("collapse-open", "reduced")).toEqual([0, 0.12]);
    await expect(durations("press", "reduced").every((value) => value === 0)).toBe(true);
    await expect(seconds(style("stagger-2", "reduced").animationDuration)).toEqual([0.12]);
    await expect(parseFloat(style("stagger-2", "reduced").animationDelay)).toBe(0);

    // off: nothing transitions or animates over time.
    for (const name of [...OPEN_CLOSE.flatMap((utility) => [`${utility}-open`, `${utility}-end`]), "collapse-open", "press"]) {
      await expect(durations(name, "off").every((value) => value === 0), name).toBe(true);
    }
    for (const name of OPEN_CLOSE) {
      await expect(translate(`${name}-start`, "off"), name).toEqual([0, 0]);
      await expect(["none", "1"], name).toContain(style(`${name}-start`, "off").scale);
    }
    await expect(seconds(style("stagger-2", "off").animationDuration)).toEqual([0]);
    await expect(parseFloat(style("stagger-2", "off").animationDelay)).toBe(0);

    // Let the entrance animations finish before the a11y pass looks at the canvas.
    await Promise.all(canvasElement.getAnimations({ subtree: true }).map((animation) => animation.finished));
  },
};

/** The three accessible themes side by side; axe checks the rendered contrast of every text role. */
export const Themes: Story = {
  render: () => <ThemeSurfaces themes={["light", "dark", "high-contrast"]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bg = (theme: Theme) => getComputedStyle(canvas.getByTestId(`theme-${theme}`)).backgroundColor;
    await expect(new Set([bg("light"), bg("dark"), bg("high-contrast")]).size).toBe(3);
    await expect(bg("light")).not.toBe("rgba(0, 0, 0, 0)");
  },
};

/** Authentic = the original low-contrast fan palette, kept as an opt-in decoration mode. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  render: () => <ThemeSurfaces themes={["authentic"]} />,
  // The authentic palette fails WCAG AA by design (see the Contrast page), so axe violations are reported, not enforced.
  parameters: { a11y: { test: "todo" } },
};

/** Open/close transitions (opacity, scale, translate) still running on the menu popup; item highlight fills do not count. */
const popupTransitions = (menu: Element) =>
  document.getAnimations().filter((animation) => {
    const target = animation instanceof CSSTransition && animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
    return target instanceof Element && (target === menu || target.contains(menu)) && /^(opacity|scale|translate)$/.test((animation as CSSTransition).transitionProperty);
  });

const InstantMenuDemo = () => (
  <Menu>
    <MenuTrigger>열기</MenuTrigger>
    <MenuContent>
      <MenuItem>항목</MenuItem>
    </MenuContent>
  </Menu>
);

/** yorha-pop honours Base UI data-instant: a keyboard-opened menu has no running transition; a pointer-opened one keeps its duration. */
export const InstantKeyboardOpen: Story = {
  render: () => <InstantMenuDemo />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "열기" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    await expect(menu.closest("[data-instant]") ?? menu).toHaveAttribute("data-instant");
    await expect(getComputedStyle(menu).transitionDuration).toBe("0s");
    await expect(popupTransitions(menu)).toHaveLength(0);
  },
};

export const PointerOpenAnimates: Story = {
  render: () => <InstantMenuDemo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "열기" }));
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu).not.toHaveAttribute("data-instant"));
    await waitFor(() => expect(parseFloat(getComputedStyle(menu).transitionDuration)).toBeGreaterThan(0));
  },
};

/** The toolbar default is `system`: no data-motion on <html>, so the OS reduced-motion preference decides. */
export const SystemMotion: Story = {
  globals: { motion: "system" },
  render: () => <p>system</p>,
  play: async () => {
    const html = document.documentElement;
    await waitFor(() => expect(html).not.toHaveAttribute("data-motion"));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    await expect(getComputedStyle(html).getPropertyValue("--motion-spatial").trim()).toBe(reduce ? "0" : "1");
  },
};

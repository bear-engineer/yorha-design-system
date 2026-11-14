import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
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
          <div data-testid={`box-${density}`} className="p-4">
            <p className="text-yorha-sm tracking-yorha-wide uppercase">{density}</p>
            <p className="text-yorha-sm text-yorha-fg-soft">p-4 = --spacing × 4</p>
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

/** `[data-density]` on any element rescales Tailwind spacing utilities inside that subtree only. */
export const Density: Story = {
  render: () => <DensityDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const padding = (density: (typeof DENSITIES)[number]) => parseFloat(getComputedStyle(canvas.getByTestId(`box-${density}`)).paddingTop);
    for (const density of DENSITIES) {
      // p-4 = 4 × the density's --spacing step, taken from the generated tokens (single source).
      await expect(padding(density)).toBeCloseTo(parseFloat(tokens.density[density]) * rootFontSize() * 4, 1);
    }
    await expect(padding("compact")).toBeLessThan(padding("default"));
    await expect(padding("default")).toBeLessThan(padding("comfortable"));
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
        await expect(probe(mode).getPropertyValue(duration.cssVar).trim()).toBe("0ms");
        await expect(probe(mode).getPropertyValue(duration.alias).trim()).toBe("0ms");
      }
      await expect(probe(mode).transitionDuration).toBe("0s");
    }
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
  render: () => <ThemeSurfaces themes={["authentic"]} />,
  // The authentic palette fails WCAG AA by design (see the Contrast page), so axe violations are reported, not enforced.
  parameters: { a11y: { test: "todo" } },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Progress } from "@/components/ui/progress";


const THEMES = [
  { theme: "light", label: "light" },
  { theme: "dark", label: "dark" },
  { theme: "high-contrast", label: "high-contrast" },
] as const;

const meta = {
  title: "컴포넌트/피드백/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "전송", value: 40, max: 100, segments: 10 },
  decorators: [
    (Story) => (
      <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bar = c.getByRole("progressbar", { name: "전송" });
    await expect(bar).toHaveAttribute("aria-valuenow", "40");
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
    await expect(bar).toHaveAttribute("aria-valuetext", "40%");
  },
};

export const Indeterminate: Story = {
  args: { value: null, label: "처리 중" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bar = c.getByRole("progressbar", { name: "처리 중" });
    await expect(bar).not.toHaveAttribute("aria-valuenow");
    await expect(bar).toHaveAttribute("data-indeterminate");
  },
};

/** Indeterminate loops while mounted: still moving after 6 s (full); reduced = one opacity animation; off = none, striped. */
export const ReducedMotion: Story = {
  args: { value: null, label: "처리 중" },
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const indicator = c.getByRole("progressbar", { name: "처리 중" }).querySelector<HTMLElement>("[data-yorha-sweep]");
    await expect(indicator).not.toBeNull();
    const track = indicator!.parentElement!;
    const keys = (a: Animation) => Object.keys((a.effect as KeyframeEffect).getKeyframes()[0]!);
    try {
      html.dataset.motion = "full";
      await waitFor(() => expect(indicator!.getAnimations().length).toBe(1));
      await expect(keys(indicator!.getAnimations()[0]!)).toContain("transform");
      await new Promise((r) => setTimeout(r, 6200));
      await expect(indicator!.getAnimations()[0]!.playState).toBe("running");
      // a moving segment, not a 35% value bar
      await expect(indicator!.getBoundingClientRect().width).toBeLessThan(track.getBoundingClientRect().width * 0.5);
      html.dataset.motion = "reduced";
      await waitFor(() => {
        expect(indicator!.getAnimations().length).toBe(1);
        expect(keys(indicator!.getAnimations()[0]!)).toContain("opacity");
      });
      await expect(keys(indicator!.getAnimations()[0]!)).not.toContain("transform");
      html.dataset.motion = "off";
      await waitFor(() => expect(indicator!.getAnimations().length).toBe(0));
      // static but busy: full-width stripes, never a lone block that reads as a value
      await expect(getComputedStyle(indicator!).backgroundImage).toMatch(/repeating-linear-gradient/);
      await expect(Math.round(indicator!.getBoundingClientRect().width)).toBe(Math.round(track.clientWidth));
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map(({ theme, label }) => (
        <div key={theme} data-theme={theme} className="flex flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{label}</span>
          <Progress {...args} label={label} />
          <Progress {...args} label={`${label} 처리 중`} value={null} />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Progress {...args} />
    </div>
  ),
};

/** Dot-matrix gauge: whole 4 px columns, ghost track behind the fill. Opt-in; segments stay the default. */
export const Dots: Story = {
  args: { variant: "dots", label: "전송", value: 62 },
  play: async ({ canvasElement }) => {
    const fill = canvasElement.querySelector<HTMLElement>("[data-slot=dots-fill]")!;
    await expect(fill.getBoundingClientRect().width % 4).toBe(0);
  },
};

export const DotsIndeterminate: Story = { args: { variant: "dots", value: null, label: "처리 중" } };

/** `formatValue` feeds both the visible value and `aria-valuetext`. */
export const FormatValue: Story = {
  args: { value: 3, max: 8, label: "업로드", formatValue: (v: number | null) => (v === null ? "대기" : `${v}/8 파일`) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("progressbar")).toHaveAttribute("aria-valuetext", "3/8 파일");
  },
};

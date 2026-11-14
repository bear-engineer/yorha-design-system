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
      <div className="w-96 bg-yorha-panel p-6 text-yorha-fg">
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

export const ReducedMotion: Story = {
  args: { value: null, label: "처리 중" },
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const indicator = c.getByRole("progressbar", { name: "처리 중" }).querySelector<HTMLElement>("[data-yorha-sweep]");
    await expect(indicator).not.toBeNull();
    try {
      html.dataset.motion = "full";
      await waitFor(() => expect(indicator!.getAnimations().length).toBeGreaterThan(0));
      html.dataset.motion = "reduced";
      await waitFor(() => expect(indicator!.getAnimations().length).toBe(0));
      html.dataset.motion = "off";
      await expect(indicator!.getAnimations().length).toBe(0);
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
    <div data-theme="authentic" className="bg-yorha-panel p-6 text-yorha-fg">
      <Progress {...args} />
    </div>
  ),
};

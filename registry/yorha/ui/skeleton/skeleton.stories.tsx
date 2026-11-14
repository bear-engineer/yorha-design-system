import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Skeleton } from "@/components/ui/skeleton";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/피드백/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "불러오는 중", className: "h-4 w-64" },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

const shimmerOf = (el: HTMLElement) => el.querySelector<HTMLElement>("[data-yorha-shimmer]");

export const Default: Story = {
  render: (args) => (
    <div className="w-80 bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const status = c.getByRole("status", { name: "불러오는 중" });
    await expect(status).toHaveAttribute("aria-busy", "true");
    const shimmer = shimmerOf(status);
    await expect(shimmer).not.toBeNull();
    await expect(shimmer!).toHaveAttribute("aria-hidden", "true");
    await expect(shimmer!).toHaveStyle({ pointerEvents: "none" });
  },
};

export const ReducedMotion: Story = {
  render: (args) => (
    <div className="w-80 bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const shimmer = shimmerOf(c.getByRole("status"));
    await expect(shimmer).not.toBeNull();
    try {
      html.dataset.motion = "full";
      await expect(getComputedStyle(shimmer!).animationName).not.toBe("none");
      html.dataset.motion = "reduced";
      await expect(getComputedStyle(shimmer!).animationName).toBe("none");
      html.dataset.motion = "off";
      await expect(getComputedStyle(shimmer!).animationName).toBe("none");
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <Skeleton {...args} className="h-4 w-full" />
          <Skeleton {...args} className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="w-80 bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
};

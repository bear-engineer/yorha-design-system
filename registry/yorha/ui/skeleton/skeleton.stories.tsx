import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
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
    <div className="w-80 max-w-full bg-yorha-panel p-6 text-yorha-fg">
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
    <div className="w-80 max-w-full bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const shimmer = shimmerOf(c.getByRole("status"));
    await expect(shimmer).not.toBeNull();
    // shimmer is a Web Animation (no keyframes in kit CSS): count running animations
    try {
      html.dataset.motion = "full";
      await waitFor(() => expect(shimmer!.getAnimations().length).toBeGreaterThan(0));
      html.dataset.motion = "reduced";
      await waitFor(() => expect(shimmer!.getAnimations().length).toBe(0));
      html.dataset.motion = "off";
      await expect(shimmer!.getAnimations().length).toBe(0);
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
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="w-80 max-w-full bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
};

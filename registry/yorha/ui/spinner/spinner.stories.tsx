import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Spinner } from "@/components/ui/spinner";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/피드백/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "불러오는 중" },
  decorators: [
    (Story) => (
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

const dotsOf = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>("[data-yorha-dot]"));

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const status = c.getByRole("status", { name: "불러오는 중" });
    await expect(status).toHaveTextContent("불러오는 중");
    const dots = dotsOf(status);
    await expect(dots.length).toBe(3);
    for (const dot of dots) {
      await expect(dot).toHaveAttribute("aria-hidden", "true");
    }
  },
};

/** Loops while mounted: still animating after 6 s (full); reduced = one opacity animation; off = none. */
export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const status = c.getByRole("status");
    const running = () => status.getAnimations({ subtree: true }).filter((a) => a.playState === "running");
    try {
      html.dataset.motion = "full";
      await waitFor(() => expect(running().length).toBe(3));
      await new Promise((r) => setTimeout(r, 6200));
      await expect(running().length).toBe(3);
      html.dataset.motion = "reduced";
      await waitFor(() => expect(status.getAnimations({ subtree: true }).length).toBe(1));
      const [only] = status.getAnimations({ subtree: true });
      await expect(Object.keys((only!.effect as KeyframeEffect).getKeyframes()[0]!)).toContain("opacity");
      await expect(Object.keys((only!.effect as KeyframeEffect).getKeyframes()[0]!)).not.toContain("transform");
      html.dataset.motion = "off";
      await waitFor(() => expect(status.getAnimations({ subtree: true }).length).toBe(0));
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
          <Spinner {...args} label={`불러오는 중 ${t}`} />
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
      <Spinner {...args} />
    </div>
  ),
};

/** Dots use the emphasized motion-token easing, not the raw `ease-in-out` keyword. */
export const DotEasingToken: Story = {
  args: { label: "불러오는 중" },
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    try {
      html.dataset.motion = "full";
      const dot = canvasElement.querySelector<HTMLElement>("[data-yorha-dot]")!;
      await waitFor(() => expect(dot.getAnimations().length).toBeGreaterThan(0));
      const easing = (dot.getAnimations()[0]!.effect as KeyframeEffect).getTiming().easing;
      await expect(easing).toMatch(/^cubic-bezier\(/);
      await expect(easing).not.toBe("ease-in-out");
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

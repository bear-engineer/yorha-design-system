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
      <div className="bg-yorha-panel p-6 text-yorha-fg">
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

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const dots = dotsOf(c.getByRole("status"));
    try {
      html.dataset.motion = "full";
      await waitFor(() => expect(dots.some((d) => d.getAnimations().length > 0)).toBe(true));
      html.dataset.motion = "reduced";
      await waitFor(() => expect(dots.every((d) => d.getAnimations().length === 0)).toBe(true));
      html.dataset.motion = "off";
      await expect(dots.every((d) => d.getAnimations().length === 0)).toBe(true);
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
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="bg-yorha-panel p-6 text-yorha-fg">
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
      const easing = (dot.getAnimations()[0].effect as KeyframeEffect).getTiming().easing;
      await expect(easing).toMatch(/^cubic-bezier\(/);
      await expect(easing).not.toBe("ease-in-out");
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

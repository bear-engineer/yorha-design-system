import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Slider } from "./slider";

import { expectTargetSize } from "../../../../.storybook/preview";
/** Reduced motion: transitions collapse to <=120ms (opacity-only in practice); full keeps a real duration. */
function motionSeconds(el: Element): number {
  return Math.max(0, ...getComputedStyle(el).transitionDuration.split(",").map((s) => parseFloat(s)));
}
async function expectReducedMotion(el: Element) {
  const root = document.documentElement;
  const prev = root.dataset.motion;
  try {
    root.dataset.motion = "full";
    await waitFor(() => expect(motionSeconds(el)).toBeGreaterThan(0));
    root.dataset.motion = "reduced";
    await waitFor(() => expect(motionSeconds(el)).toBeLessThanOrEqual(0.12));
  } finally {
    if (prev === undefined) delete root.dataset.motion;
    else root.dataset.motion = prev;
  }
}

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/폼/Slider",
  component: Slider,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-80 max-w-[calc(100vw-2rem)] max-w-full"><Story /></div>],
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "출력", defaultValue: 50, min: 0, max: 100, step: 10 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const thumb = c.getByRole("slider", { name: "출력" });
    await expect(thumb).toHaveAttribute("aria-valuenow", "50");
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "60");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "40");
    await userEvent.keyboard("{ArrowUp}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "50");
    await userEvent.keyboard("{ArrowDown}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "40");
    await userEvent.keyboard("{Home}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "0");
    await userEvent.keyboard("{End}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "100");
  },
};

export const WithValue: Story = {
  args: { label: "내구도", defaultValue: 30, showValue: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("slider", { name: "내구도" })).toHaveAttribute("aria-valuenow", "30");
    await expect(c.getByRole("status")).toHaveTextContent("30");
    c.getByRole("slider", { name: "내구도" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("status")).toHaveTextContent("31");
  },
};

export const Disabled: Story = {
  args: { label: "잠금", defaultValue: 40, disabled: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const thumb = c.getByRole("slider", { name: "잠금" });
    await expect(thumb).toBeDisabled();
    await expect(thumb).toHaveAttribute("aria-valuenow", "40");
  },
};

export const Range: Story = {
  args: { label: "범위", defaultValue: [20, 70] },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sliders = c.getAllByRole("slider");
    await expect(sliders).toHaveLength(2);
    await expect(sliders[0]!).toHaveAttribute("aria-valuenow", "20");
    await expect(sliders[1]!).toHaveAttribute("aria-valuenow", "70");
    sliders[1]?.focus();
    await userEvent.keyboard("{End}");
    await expect(sliders[1]!).toHaveAttribute("aria-valuenow", "100");
  },
};

export const Themes: Story = {
  args: { label: "테마", defaultValue: 60 },
  render: (args) => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          <Slider {...args} label={`테마 ${t}`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("slider")).toHaveLength(3);
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  args: { label: "테마 authentic", defaultValue: 60 },
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <Slider label="테마 authentic" defaultValue={60} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("slider")).toHaveAttribute("aria-valuenow", "60");
  },
};

export const ReducedMotion: Story = {
  args: { label: "모션", defaultValue: 50, showValue: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Direct manipulation: nothing that follows the pointer (fill, thumb) transitions in any motion mode.
    const root = document.documentElement;
    const prev = root.dataset.motion;
    const parts = [
      canvasElement.querySelector<HTMLElement>('[data-index], [class*="size-6"]'),
      ...canvasElement.querySelectorAll<HTMLElement>("div"),
    ].filter((el): el is HTMLElement => !!el && (el.className.includes("h-full") || el.className.includes("size-6")));
    await expect(parts.length).toBeGreaterThan(1);
    try {
      for (const mode of ["full", "reduced", "off"]) {
        root.dataset.motion = mode;
        for (const el of parts) await expect(motionSeconds(el)).toBe(0);
      }
    } finally {
      if (prev === undefined) delete root.dataset.motion;
      else root.dataset.motion = prev;
    }
    await expect(c.getByRole("slider", { name: "모션" })).toHaveAttribute("aria-valuenow", "50");
  },
};

export const States: Story = {
  args: { label: "기본", defaultValue: 40 },
  render: () => (
    <div className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-4">
      <Slider label="기본" defaultValue={40} />
      <Slider label="범위" defaultValue={[20, 70]} />
      <Slider label="잠금" defaultValue={40} disabled />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("slider", { name: "잠금" })).toBeDisabled();
    const thumb = c.getByRole("slider", { name: "기본" });
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(thumb).toHaveAttribute("aria-valuenow", "41");
    await expectTargetSize(canvasElement);
  },
};

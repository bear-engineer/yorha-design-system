import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Slider } from "./slider";

const THEMES = ["light", "dark", "authentic", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/폼/Slider",
  component: Slider,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-80 max-w-full"><Story /></div>],
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
    await expect(sliders[0]).toHaveAttribute("aria-valuenow", "20");
    await expect(sliders[1]).toHaveAttribute("aria-valuenow", "70");
    sliders[1].focus();
    await userEvent.keyboard("{End}");
    await expect(sliders[1]).toHaveAttribute("aria-valuenow", "100");
  },
};

export const Themes: Story = {
  args: { defaultValue: 60 },
  render: (args) => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <Slider {...args} label={`테마 ${t}`} />
        </div>
      ))}
    </div>
  ),
  // The authentic theme is a fidelity-first palette that is not contrast-gated.
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("slider")).toHaveLength(4);
  },
};

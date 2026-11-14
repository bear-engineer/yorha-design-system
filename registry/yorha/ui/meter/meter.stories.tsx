import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Meter } from "@/components/ui/meter";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/피드백/Meter",
  component: Meter,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "HP", value: 120, min: 0, max: 150 },
  decorators: [
    (Story) => (
      <div className="w-96 max-w-full bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Meter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const meter = c.getByRole("meter", { name: "HP" });
    await expect(meter).toHaveAttribute("aria-valuenow", "120");
    await expect(meter).toHaveAttribute("aria-valuemin", "0");
    await expect(meter).toHaveAttribute("aria-valuemax", "150");
    await expect(meter).toHaveAttribute("aria-valuetext", "120/150");
    await expect(c.getByText("120/150")).toBeVisible();
  },
};

export const Low: Story = {
  args: { label: "HP 위험", value: 15, min: 0, max: 150 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const meter = c.getByRole("meter", { name: "HP 위험" });
    await expect(meter).toHaveAttribute("aria-valuenow", "15");
    await expect(meter).toHaveAttribute("aria-valuetext", "15/150");
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <Meter {...args} label={`HP ${t}`} />
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
      <Meter {...args} />
    </div>
  ),
};

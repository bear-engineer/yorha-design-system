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
      <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
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
  args: { label: "HP 위험", value: 15, min: 0, max: 150, low: 30, critical: 10 },
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
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Meter {...args} />
    </div>
  ),
};

/** Dots variant: low = every 2nd column, critical = every 3rd in the alert colour (readable without colour). */
export const Dots: Story = {
  render: () => (
    <div className="flex w-80 max-w-full flex-col gap-4">
      <Meter label="HP" value={80} variant="dots" low={30} critical={10} />
      <Meter label="HP 낮음" value={25} variant="dots" low={30} critical={10} />
      <Meter label="HP 위험" value={6} variant="dots" low={30} critical={10} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const pitches = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=dots-fill]")].map((e) => Number(e.dataset.pitch));
    await expect(pitches).toEqual([4, 8, 12]);
  },
};

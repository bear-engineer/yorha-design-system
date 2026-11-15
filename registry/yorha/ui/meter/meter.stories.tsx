import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row, Sheet } from "../../../../src/docs/sheet";
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
    (Story, { name }) =>
      name === "구성 한눈에" ? (
        <Story />
      ) : (
      <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Meter>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <Sheet title="Meter">
      <Row label="정상 · 120/150"><div className="w-80"><Meter label="HP" value={120} min={0} max={150} low={75} critical={30} /></div></Row>
      <Row label="주의 · 60/150"><div className="w-80"><Meter label="HP" value={60} min={0} max={150} low={75} critical={30} /></div></Row>
      <Row label="위험 · 12/150"><div className="w-80"><Meter label="HP" value={12} min={0} max={150} low={75} critical={30} /></div></Row>
    </Sheet>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
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

/** Thresholds: notches at `low` and `critical` in the bottom frame padding, alert frame at or below low, alert fill at or below critical. */
export const Thresholds: Story = {
  render: () => (
    <div className="flex w-80 max-w-full flex-col gap-4">
      <Meter label="HP" value={120} max={150} low={45} critical={15} />
      <Meter label="HP 낮음" value={30} max={150} low={45} critical={15} />
      <Meter label="HP 위험" value={9} max={150} low={45} critical={15} />
      <Meter label="HP SM" value={30} max={150} low={45} critical={15} size="sm" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const tracks = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=meter-track]")];
    await expect(tracks.map((t) => t.hasAttribute("data-low"))).toEqual([false, true, true, true]);
    await expect(tracks.map((t) => t.hasAttribute("data-critical"))).toEqual([false, false, true, false]);
    await expect(canvasElement.querySelectorAll("[data-slot=meter-notch]").length).toBe(8);
  },
};

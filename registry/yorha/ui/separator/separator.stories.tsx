import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Separator } from "./separator";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo() {
  return (
    <div className="flex w-72 max-w-full flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
      <p>상단 항목</p>
      <Separator />
      <div className="flex h-8 items-center gap-3">
        <span>좌</span>
        <Separator orientation="vertical" />
        <span>우</span>
      </div>
    </div>
  );
}

const meta = {
  title: "컴포넌트/구조/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const seps = c.getAllByRole("separator");
    await expect(seps).toHaveLength(2);
    await expect(seps[0]).toHaveAttribute("data-orientation", "horizontal");
    await expect(seps[1]).toHaveAttribute("data-orientation", "vertical");
    await expect(seps[0]).toHaveClass("bg-yorha-separator");
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t}>
          <Demo />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic">
      <Demo />
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Card } from "./card";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/YoRHa/Card",
  component: Card,
  tags: ["autodocs"],
  args: {
    title: "유닛 A-2",
    meta: "상태: 대기",
    media: <div className="h-16 w-full bg-yorha-grid" />,
    actions: (
      <button type="button" className="border border-yorha-border px-2 py-1 text-yorha-sm" onClick={fn()}>
        상세
      </button>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-72 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("유닛 A-2")).toBeVisible();
    await expect(c.getByText("상태: 대기")).toBeVisible();
    await expect(c.queryByRole("link")).toBeNull();
    await expect(c.getByRole("button", { name: "상세" })).toBeVisible();
  },
};

export const WholeCardLink: Story = {
  args: { href: "#unit-a-2" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const link = c.getByRole("link", { name: "유닛 A-2" });
    await expect(link).toHaveAttribute("href", "#unit-a-2");
    // no nested interactive: the action button must not live inside the link
    await expect(link.querySelector("button")).toBeNull();
    await expect(c.getAllByRole("link")).toHaveLength(1);
    // reachable once by Tab: first stop is the link, the next stop leaves the card
    await userEvent.tab();
    await expect(link).toHaveFocus();
    await userEvent.tab();
    await expect(link).not.toHaveFocus();
    await expect(c.getByRole("button", { name: "상세" })).toHaveFocus();
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col gap-2 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <Card {...args} />
        </div>
      ))}
    </div>
  ),
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // authentic palette is intentionally low-contrast (decorative mode): only this story skips a11y.
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="w-72 bg-yorha-panel p-6 text-yorha-fg">
      <Card {...args} />
    </div>
  ),
};

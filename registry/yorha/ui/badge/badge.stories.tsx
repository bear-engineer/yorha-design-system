import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Badge } from "./badge";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/표시/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "대기" },
  argTypes: { variant: { control: "inline-radio", options: ["neutral", "alert"] } },
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: { variant: "neutral" },
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText("대기");
    await expect(badge).toHaveAttribute("data-variant", "neutral");
    await expect(badge.querySelector("[data-shape]")).toBeNull();
  },
};

export const Alert: Story = {
  args: { variant: "alert", children: "경고" },
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText("경고");
    await expect(badge).toHaveAttribute("data-variant", "alert");
    // shape cue: alert carries a non-colour marker, so state is not conveyed by colour alone
    await expect(badge).toHaveAttribute("data-shape", "diamond");
    await expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
};

export const Matrix: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="neutral">대기</Badge>
      <Badge variant="alert">경고</Badge>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText(/대기|경고/)).toHaveLength(2);
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col items-start gap-2 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <Badge variant="neutral">대기</Badge>
          <Badge variant="alert">경고</Badge>
        </div>
      ))}
    </div>
  ),
};

export const Authentic: Story = {
  // authentic palette is intentionally low-contrast (decorative mode): only this story skips a11y.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-6 text-yorha-fg">
      <Badge variant="alert">경고</Badge>
    </div>
  ),
};

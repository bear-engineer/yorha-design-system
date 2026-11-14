import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Toggle } from "./toggle";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/폼/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "자동 전투", defaultPressed: false },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const btn = c.getByRole("button", { name: "자동 전투" });
    await expect(btn).toHaveAttribute("aria-pressed", "false");
    btn.focus();
    await userEvent.keyboard(" ");
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard(" ");
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  },
};

export const Pressed: Story = {
  args: { children: "스캔 모드", defaultPressed: true },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "스캔 모드" });
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(btn);
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  },
};

export const Disabled: Story = {
  args: { children: "잠금", defaultPressed: false, disabled: true },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "잠금" });
    await expect(btn).toBeDisabled();
    btn.focus();
    await userEvent.keyboard(" ");
    await userEvent.click(btn);
    await expect(btn).toHaveAttribute("aria-pressed", "false");
  },
};

export const FocusVisible: Story = {
  args: { children: "포커스 대상", defaultPressed: false },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "포커스 대상" });
    await userEvent.tab();
    await expect(btn).toHaveFocus();
    const style = getComputedStyle(btn);
    await expect(style.outlineStyle).toBe("solid");
    await expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  },
};

export const States: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Toggle defaultPressed={false}>꺼짐</Toggle>
      <Toggle defaultPressed>켜짐</Toggle>
      <Toggle disabled>꺼짐 비활성</Toggle>
      <Toggle defaultPressed disabled>켜짐 비활성</Toggle>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "꺼짐" })).toHaveAttribute("aria-pressed", "false");
    await expect(c.getByRole("button", { name: "켜짐" })).toHaveAttribute("aria-pressed", "true");
    await expect(c.getByRole("button", { name: "꺼짐 비활성" })).toBeDisabled();
    await expect(c.getByRole("button", { name: "켜짐 비활성" })).toBeDisabled();
  },
};

export const Themes: Story = {
  args: { children: "" },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <Toggle defaultPressed>{`테마 ${t}`}</Toggle>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("button")).toHaveLength(3);
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  args: { children: "오리지널 팔레트", defaultPressed: true },
  render: (args) => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <Toggle {...args} />
    </div>
  ),
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "오리지널 팔레트" });
    await expect(btn).toHaveAttribute("aria-pressed", "true");
  },
};

import { expectTargetSize } from "../../../../.storybook/preview";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Chip } from "./chip";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/YoRHa/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { label: "모듈 A", capacity: 0.6, segments: 5, sizeLabel: "64 KB" },
  decorators: [
    (Story) => (
      <div className="w-72 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("모듈 A")).toBeVisible();
    await expect(c.getByText("64 KB")).toBeVisible();
    await expect(c.getByRole("img", { name: "용량 60%" })).toBeVisible();
    await expect(c.queryByRole("button")).toBeNull();
  },
};

export const RemoveViaKeyboard: Story = {
  args: { onRemove: fn(), removeLabel: "제거" },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const remove = c.getByRole("button", { name: "모듈 A 제거" });
    await userEvent.tab();
    await expect(remove).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onRemove).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(" ");
    await expect(args.onRemove).toHaveBeenCalledTimes(2);
  },
};

export const SelectableToggle: Story = {
  args: { selectable: true, label: "모듈 B", defaultPressed: false, onPressedChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const chip = c.getByRole("button", { name: /^모듈 B/ });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(args.onPressedChange).toHaveBeenLastCalledWith(true);
    await userEvent.keyboard(" ");
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect(args.onPressedChange).toHaveBeenLastCalledWith(false);
  },
};

export const Themes: Story = {
  args: { onRemove: fn() },
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col gap-2 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <Chip {...args} />
          <Chip {...args} selectable label={`선택 ${t}`} sizeLabel={undefined} />
        </div>
      ))}
    </div>
  ),
};

export const Authentic: Story = {
  // authentic palette is intentionally low-contrast (decorative mode): only this story skips a11y.
  parameters: { a11y: { test: "todo" } },
  args: { onRemove: fn() },
  render: (args) => (
    <div data-theme="authentic" className="w-72 bg-yorha-panel p-6 text-yorha-fg">
      <Chip {...args} />
    </div>
  ),
};

/** State matrix: static, removable, selectable (unpressed/pressed). Targets >= 24px in both densities. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Chip label="정적" capacity={0.4} sizeLabel="8 KB" />
      <Chip label="삭제형" capacity={0.6} sizeLabel="64 KB" onRemove={() => {}} />
      <Chip label="선택형" capacity={0.2} selectable />
      <Chip label="선택됨" capacity={0.8} selectable defaultPressed />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "삭제형 제거" })).toBeVisible();
    await expect(c.getByRole("button", { name: /선택형/ })).toHaveAttribute("aria-pressed", "false");
    await expect(c.getByRole("button", { name: /선택됨/ })).toHaveAttribute("aria-pressed", "true");
    await expectTargetSize(canvasElement);
  },
};

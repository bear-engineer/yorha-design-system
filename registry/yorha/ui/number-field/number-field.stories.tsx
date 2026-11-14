import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { NumberField } from "./number-field";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/폼/NumberField",
  component: NumberField,
  tags: ["autodocs"],
} satisfies Meta<typeof NumberField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "수량", defaultValue: 5, min: 0, max: 10 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "수량" });
    await expect(input).toHaveValue("5");
    await userEvent.click(c.getByRole("button", { name: "증가" }));
    await expect(input).toHaveValue("6");
    await userEvent.click(c.getByRole("button", { name: "감소" }));
    await userEvent.click(c.getByRole("button", { name: "감소" }));
    await expect(input).toHaveValue("4");
    input.focus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(input).toHaveValue("5");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect(input).toHaveValue("3");
  },
};

export const Bounds: Story = {
  args: { label: "한계", defaultValue: 9, min: 0, max: 10 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "한계" });
    input.focus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
    await expect(input).toHaveValue("10");
    await expect(c.getByRole("button", { name: "증가" })).toHaveAttribute("aria-disabled", "true");
  },
};

export const Step: Story = {
  args: { label: "단계", defaultValue: 0, step: 5 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "증가" }));
    await expect(c.getByRole("textbox", { name: "단계" })).toHaveValue("5");
  },
};

export const Disabled: Story = {
  args: { label: "잠금", defaultValue: 3, disabled: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("textbox", { name: "잠금" })).toBeDisabled();
    await expect(c.getByRole("button", { name: "증가" })).toHaveAttribute("aria-disabled", "true");
  },
};

export const ReadOnly: Story = {
  args: { label: "읽기 전용", defaultValue: 7, readOnly: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "읽기 전용" });
    await expect(input).toHaveAttribute("readonly");
    input.focus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(input).toHaveValue("7");
  },
};

export const Themes: Story = {
  args: { label: "테마", defaultValue: 3 },
  render: (args) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <NumberField {...args} label={`테마 ${t}`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("textbox")).toHaveLength(3);
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  name: "Authentic (원작 팔레트)",
  args: { label: "테마 authentic", defaultValue: 3 },
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <NumberField label="테마 authentic" defaultValue={3} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox", { name: "테마 authentic" })).toHaveValue("3");
  },
};

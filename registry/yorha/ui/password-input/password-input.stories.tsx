import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { PasswordInput } from "./password-input";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };
const wrapper = (Story: React.ComponentType) => (
  <div lang="ko" className="w-96 bg-yorha-panel p-6 text-yorha-fg">
    <Story />
  </div>
);
async function inMotion(mode: "reduced" | "off", run: () => Promise<void>) {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", mode);
  try {
    await run();
  } finally {
    if (prev === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", prev);
  }
}
const seconds = (el: Element) => parseFloat(getComputedStyle(el).transitionDuration) || 0;

const meta = {
  title: "컴포넌트/폼/PasswordInput",
  component: PasswordInput,
  tags: ["autodocs"],
  args: { label: "비밀번호" },
  decorators: [wrapper],
} satisfies Meta<typeof PasswordInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("비밀번호", { selector: "input" });
    await expect(input).toHaveAttribute("type", "password");
    await expect(input).toHaveAttribute("autocomplete", "current-password");
    await userEvent.type(input, "secret");
    await expect(input).toHaveValue("secret");
  },
};

export const RevealToggle: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("비밀번호", { selector: "input" });
    const toggle = c.getByRole("button", { name: "비밀번호 표시" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.type(input, "secret");
    await userEvent.click(toggle);
    await expect(input).toHaveAttribute("type", "text");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAccessibleName("비밀번호 표시");
    await expect(input).toHaveValue("secret");
    await userEvent.click(toggle);
    await expect(input).toHaveAttribute("type", "password");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  },
};

export const ToggleByKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("비밀번호", { selector: "input" });
    await userEvent.click(input);
    await userEvent.tab();
    const toggle = c.getByRole("button", { name: "비밀번호 표시" });
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(input).toHaveAttribute("type", "text");
    await userEvent.keyboard(" ");
    await expect(input).toHaveAttribute("type", "password");
  },
};

export const CapsLockHint: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("비밀번호", { selector: "input" });
    await userEvent.click(input);
    await expect(c.queryByText("Caps Lock이 켜져 있습니다")).toBeNull();
    fireEvent.keyDown(input, { key: "A", modifierCapsLock: true });
    await waitFor(() => expect(c.getByText("Caps Lock이 켜져 있습니다")).toBeVisible());
    await expect(c.getByRole("status")).toHaveTextContent("Caps Lock이 켜져 있습니다");
    await expect(input).toHaveAccessibleDescription(expect.stringContaining("Caps Lock"));
    fireEvent.keyUp(input, { key: "CapsLock", modifierCapsLock: false });
    await waitFor(() => expect(c.queryByText("Caps Lock이 켜져 있습니다")).toBeNull());
    fireEvent.keyDown(input, { key: "A", modifierCapsLock: true });
    await waitFor(() => expect(c.getByText("Caps Lock이 켜져 있습니다")).toBeVisible());
    await userEvent.tab();
    await waitFor(() => expect(c.queryByText("Caps Lock이 켜져 있습니다")).toBeNull());
  },
};

export const NewPasswordAndError: Story = {
  args: { label: "새 비밀번호", autoComplete: "new-password", error: "8자 이상이어야 합니다" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("새 비밀번호", { selector: "input" });
    await expect(input).toHaveAttribute("autocomplete", "new-password");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(c.getByRole("alert")).toHaveTextContent("8자 이상");
  },
};

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("비밀번호", { selector: "input" });
    const toggle = c.getByRole("button", { name: "비밀번호 표시" });
    await inMotion("reduced", async () => {
      await expect(seconds(input)).toBeLessThanOrEqual(0.12);
      await expect(seconds(toggle)).toBeLessThanOrEqual(0.12);
    });
    await inMotion("off", async () => expect(seconds(input)).toBe(0));
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <PasswordInput label={`비밀번호 (${THEME_LABEL[t]})`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) await expect(c.getByLabelText(`비밀번호 (${THEME_LABEL[t]})`, { selector: "input" })).toBeInTheDocument();
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <PasswordInput label="오리지널 팔레트" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText("오리지널 팔레트", { selector: "input" })).toHaveAttribute("type", "password");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-4">
      <PasswordInput label="기본" />
      <PasswordInput label="오류" error="8자 이상이어야 합니다" />
      <PasswordInput label="잠김" disabled />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByLabelText("오류", { selector: "input" });
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(bad.getAttribute("aria-describedby") ?? "").toContain(c.getByRole("alert").id);
    await expect(c.getByLabelText("잠김", { selector: "input" })).toBeDisabled();
    const toggle = c.getAllByRole("button", { name: "비밀번호 표시" })[0]!;
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expectTargetSize(canvasElement);
  },
};

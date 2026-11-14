import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { ColorInput } from "./color-input";

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

const picker = (c: ReturnType<typeof within>, label: string) => c.getByLabelText(`${label} 색상 선택`) as HTMLInputElement;
const swatchOf = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-slot=color-swatch]")!;

const meta = {
  title: "컴포넌트/폼/ColorInput",
  component: ColorInput,
  tags: ["autodocs"],
  args: { label: "강조색", defaultValue: "#336699" },
  decorators: [wrapper],
} satisfies Meta<typeof ColorInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("강조색")).toHaveValue("#336699");
    await expect(picker(c, "강조색")).toHaveAttribute("type", "color");
    await expect(picker(c, "강조색")).toHaveValue("#336699");
    await expect(getComputedStyle(swatchOf(canvasElement)).backgroundColor).toBe("rgb(51, 102, 153)");
  },
};

export const NativePickerSyncsText: Story = {
  args: { onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    fireEvent.input(picker(c, "강조색"), { target: { value: "#ff0000" } });
    fireEvent.change(picker(c, "강조색"), { target: { value: "#ff0000" } });
    await waitFor(() => expect(c.getByLabelText("강조색")).toHaveValue("#ff0000"));
    await expect(args.onValueChange).toHaveBeenLastCalledWith("#ff0000");
    await expect(getComputedStyle(swatchOf(canvasElement)).backgroundColor).toBe("rgb(255, 0, 0)");
  },
};

export const TypedHexSyncsPicker: Story = {
  args: { onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const text = c.getByLabelText("강조색");
    await userEvent.clear(text);
    await userEvent.type(text, "#00ff00");
    await expect(picker(c, "강조색")).toHaveValue("#00ff00");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("#00ff00");
    await expect(getComputedStyle(swatchOf(canvasElement)).backgroundColor).toBe("rgb(0, 255, 0)");
    // three-digit shorthand is expanded on blur
    await userEvent.clear(text);
    await userEvent.type(text, "#0af");
    await userEvent.tab();
    await expect(text).toHaveValue("#00aaff");
    await expect(picker(c, "강조색")).toHaveValue("#00aaff");
  },
};

export const InvalidHexIsFlagged: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const text = c.getByLabelText("강조색");
    await userEvent.clear(text);
    await userEvent.type(text, "#zz1");
    await expect(text).toHaveAttribute("aria-invalid", "true");
    await expect(picker(c, "강조색")).toHaveValue("#336699");
    await userEvent.tab();
    // blur with invalid text restores the last good value
    await waitFor(() => expect(text).toHaveValue("#336699"));
    await expect(text).not.toHaveAttribute("aria-invalid", "true");
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("강조색")).toBeDisabled();
    await expect(picker(c, "강조색")).toBeDisabled();
  },
};

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    const text = within(canvasElement).getByLabelText("강조색");
    await inMotion("reduced", async () => expect(seconds(text)).toBeLessThanOrEqual(0.12));
    await inMotion("off", async () => expect(seconds(text)).toBe(0));
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <ColorInput label={`강조색 (${THEME_LABEL[t]})`} defaultValue="#336699" />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) await expect(c.getByLabelText(`강조색 (${THEME_LABEL[t]})`)).toBeInTheDocument();
  },
};

export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <ColorInput label="오리지널 팔레트" defaultValue="#336699" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText("오리지널 팔레트")).toHaveValue("#336699");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-4">
      <ColorInput label="기본" defaultValue="#336699" />
      <ColorInput label="잠김" defaultValue="#336699" disabled />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("잠김", { selector: "input[type=text]" })).toBeDisabled();
    const text = c.getByLabelText("기본", { selector: "input[type=text]" });
    await userEvent.clear(text);
    await userEvent.type(text, "#zz1");
    await expect(text).toHaveAttribute("aria-invalid", "true");
    await expect(text.getAttribute("aria-describedby") ?? "").toContain(c.getByRole("alert").id);
    await expectTargetSize(canvasElement);
  },
};

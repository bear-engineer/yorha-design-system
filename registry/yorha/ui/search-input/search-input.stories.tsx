import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { SearchInput } from "./search-input";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };
const wrapper = (Story: React.ComponentType) => (
  <div lang="ko" className="w-96 max-w-full bg-yorha-panel p-6 text-yorha-fg">
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
  title: "컴포넌트/폼/SearchInput",
  component: SearchInput,
  tags: ["autodocs"],
  args: { label: "검색" },
  decorators: [wrapper],
} satisfies Meta<typeof SearchInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const input = c.getByRole("searchbox", { name: "검색" });
    await expect(input).toHaveAttribute("type", "search");
    await expect(c.queryByRole("button", { name: "검색어 지우기" })).toBeNull();
    await userEvent.type(input, "2B");
    await expect(input).toHaveValue("2B");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("2B");
  },
};

export const ClearButton: Story = {
  args: { defaultValue: "9S" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("searchbox", { name: "검색" });
    await userEvent.click(c.getByRole("button", { name: "검색어 지우기" }));
    await expect(input).toHaveValue("");
    await expect(input).toHaveFocus();
    await waitFor(() => expect(c.queryByRole("button", { name: "검색어 지우기" })).toBeNull());
  },
};

export const EscapeClears: Story = {
  args: { defaultValue: "A2", onValueChange: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const input = c.getByRole("searchbox", { name: "검색" });
    await userEvent.click(input);
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveValue("");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("");
    await expect(input).toHaveFocus();
  },
};

export const EnterSearches: Story = {
  args: { onSearch: fn() },
  play: async ({ canvasElement, args }) => {
    const input = within(canvasElement).getByRole("searchbox", { name: "검색" });
    await userEvent.type(input, "pod{Enter}");
    await expect(args.onSearch).toHaveBeenCalledWith("pod");
  },
};

export const Disabled: Story = {
  args: { defaultValue: "잠김", disabled: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("searchbox", { name: "검색" })).toBeDisabled();
    await expect(c.getByRole("button", { name: "검색어 지우기" })).toBeDisabled();
  },
};

export const ReducedMotion: Story = {
  args: { defaultValue: "A" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("searchbox", { name: "검색" });
    const clear = c.getByRole("button", { name: "검색어 지우기" });
    await inMotion("reduced", async () => {
      await expect(seconds(input)).toBeLessThanOrEqual(0.12);
      await expect(seconds(clear)).toBeLessThanOrEqual(0.12);
    });
    await inMotion("off", async () => expect(seconds(input)).toBe(0));
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <SearchInput label={`검색 (${THEME_LABEL[t]})`} defaultValue="유닛" />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) await expect(c.getByRole("searchbox", { name: `검색 (${THEME_LABEL[t]})` })).toBeInTheDocument();
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <SearchInput label="오리지널 팔레트" defaultValue="유닛" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("searchbox", { name: "오리지널 팔레트" })).toHaveValue("유닛");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-96 max-w-full flex-col gap-4">
      <SearchInput label="기본" />
      <SearchInput label="값 있음" defaultValue="유닛" />
      <SearchInput label="오류" defaultValue="??" error="검색어를 확인하세요" />
      <SearchInput label="잠김" defaultValue="잠김" disabled />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByRole("searchbox", { name: "오류" });
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(bad.getAttribute("aria-describedby") ?? "").toContain(c.getByRole("alert").id);
    await expect(c.getByRole("searchbox", { name: "잠김" })).toBeDisabled();
    await expectTargetSize(canvasElement);
  },
};

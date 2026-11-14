import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

interface DemoProps {
  multiple?: boolean;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  defaultValue?: string[];
  onValueChange?: (v: string[]) => void;
}

function Demo({ multiple, orientation, disabled, defaultValue = ["left"], onValueChange }: DemoProps) {
  return (
    <div lang="ko" className="bg-yorha-panel p-6 text-yorha-fg">
      <ToggleGroup
        aria-label="텍스트 정렬"
        multiple={multiple}
        orientation={orientation}
        disabled={disabled}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
      >
        <ToggleGroupItem value="left">왼쪽</ToggleGroupItem>
        <ToggleGroupItem value="center">가운데</ToggleGroupItem>
        <ToggleGroupItem value="right">오른쪽</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

const meta = {
  title: "컴포넌트/폼/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof ToggleGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const group = () => within(document.body).getByRole("group", { name: "텍스트 정렬" });
const btn = (name: string) => within(group()).getByRole("button", { name });
const pressed = () => within(group()).getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent?.trim());

export const Single: Story = {
  render: () => <Demo />,
  play: async () => {
    await expect(pressed()).toEqual(["왼쪽"]);
    await userEvent.click(btn("가운데"));
    await expect(pressed()).toEqual(["가운데"]);
    await expect(group()).toHaveAttribute("data-orientation", "horizontal");
    await expect(btn("가운데").querySelector("[data-yorha-bullet]")).not.toBeNull();
  },
};

export const Multiple: Story = {
  render: () => <Demo multiple />,
  play: async () => {
    await userEvent.click(btn("가운데"));
    await expect(pressed()).toEqual(["왼쪽", "가운데"]);
    await userEvent.click(btn("왼쪽"));
    await expect(pressed()).toEqual(["가운데"]);
    await expect(group()).toHaveAttribute("data-multiple");
  },
};

export const KeyboardHorizontal: Story = {
  render: () => <Demo />,
  play: async () => {
    btn("왼쪽").focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(btn("가운데")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    // loopFocus defaults to true
    await expect(btn("왼쪽")).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(btn("오른쪽")).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(pressed()).toEqual(["오른쪽"]);
    await userEvent.keyboard("{Enter}");
    await expect(pressed()).toEqual([]);
  },
};

export const Vertical: Story = {
  render: () => <Demo orientation="vertical" />,
  play: async () => {
    await expect(group()).toHaveAttribute("data-orientation", "vertical");
    const a = btn("왼쪽").getBoundingClientRect();
    const b = btn("가운데").getBoundingClientRect();
    await expect(b.top).toBeGreaterThan(a.bottom - 2);
    btn("왼쪽").focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(btn("가운데")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(btn("왼쪽")).toHaveFocus();
  },
};

export const Disabled: Story = {
  render: () => <Demo disabled />,
  play: async () => {
    await expect(group()).toHaveAttribute("data-disabled");
    await userEvent.click(btn("가운데"), { pointerEventsCheck: 0 });
    await expect(pressed()).toEqual(["왼쪽"]);
  },
};

export const ReducedMotion: Story = {
  render: () => <Demo />,
  play: async () => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    try {
      root.setAttribute("data-motion", "reduced");
      await userEvent.click(btn("가운데"));
      await waitFor(() => expect(pressed()).toEqual(["가운데"]));
      await expect(parseFloat(getComputedStyle(btn("가운데")).transitionDuration)).toBe(0);
      root.setAttribute("data-motion", "off");
      await expect(parseFloat(getComputedStyle(btn("가운데")).transitionDuration)).toBe(0);
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Light: Story = { globals: { theme: "light" }, render: () => <Demo multiple defaultValue={["left", "right"]} /> };
export const Dark: Story = { ...Light, globals: { theme: "dark" } };
export const HighContrast: Story = { ...Light, globals: { theme: "high-contrast" } };
export const Authentic: Story = { ...Light, parameters: { a11y: { test: "todo" } }, globals: { theme: "authentic" } };

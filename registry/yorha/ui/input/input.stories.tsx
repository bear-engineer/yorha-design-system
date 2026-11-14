import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Input } from "./input";

import { expectTargetSize } from "../../../../.storybook/preview";
const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = {
  light: "라이트",
  dark: "다크",
  "high-contrast": "고대비",
};

const meta = {
  title: "컴포넌트/폼/Input",
  component: Input,
  tags: ["autodocs"],
  args: { "aria-label": "유닛 코드", placeholder: "예: 2B" },
  decorators: [
    (Story) => (
      <div className="w-72 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "유닛 코드" });
    await userEvent.type(input, "2B");
    await expect(input).toHaveValue("2B");
  },
};

export const PassesNativeProps: Story = {
  args: { name: "unit", required: true, maxLength: 4, autoComplete: "off", defaultValue: "9S" },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "유닛 코드" });
    await expect(input).toHaveAttribute("name", "unit");
    await expect(input).toBeRequired();
    await expect(input).toHaveAttribute("maxlength", "4");
    await expect(input).toHaveAttribute("autocomplete", "off");
    await expect(input).toHaveValue("9S");
  },
};

// forwardRef: the ref must reach the native <input>.
const RefProbe = (props: React.ComponentProps<typeof Input>) => {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.dataset.refReached = "yes";
  }, []);
  return <Input ref={ref} {...props} />;
};

export const ForwardsRef: Story = {
  render: (args) => <RefProbe {...args} />,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "유닛 코드" });
    await expect(input.tagName).toBe("INPUT");
    await expect(input).toHaveAttribute("data-ref-reached", "yes");
  },
};

export const ClassNameMerges: Story = {
  args: { className: "w-40 uppercase" },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "유닛 코드" });
    await expect(input).toHaveClass("w-40");
    await expect(input).toHaveClass("uppercase");
  },
};

export const KeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "유닛 코드" });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    const style = getComputedStyle(input);
    await expect(style.outlineStyle).toBe("solid");
    await expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  },
};

export const InvalidAndDisabled: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input aria-label="잘못된 값" aria-invalid="true" defaultValue="??" />
      <Input aria-label="잠긴 값" disabled defaultValue="locked" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("textbox", { name: "잘못된 값" })).toHaveAttribute("aria-invalid", "true");
    await expect(c.getByRole("textbox", { name: "잠긴 값" })).toBeDisabled();
  },
};

export const ReducedMotion: Story = {
  play: async ({ canvasElement }) => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    root.setAttribute("data-motion", "reduced");
    try {
      const input = within(canvasElement).getByRole("textbox", { name: "유닛 코드" });
      const seconds = parseFloat(getComputedStyle(input).transitionDuration) || 0;
      await expect(seconds).toBeLessThanOrEqual(0.12);
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4 text-yorha-fg">
          <Input aria-label={`유닛 코드 (${THEME_LABEL[theme]})`} placeholder="예: 2B" />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const theme of THEMES) {
      await expect(c.getByRole("textbox", { name: `유닛 코드 (${THEME_LABEL[theme]})` })).toBeInTheDocument();
    }
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <Input aria-label="오리지널 팔레트" placeholder="예: 2B" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "오리지널 팔레트" });
    await userEvent.click(input);
    await expect(input).toHaveFocus();
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input aria-label="기본" placeholder="기본" />
      <Input aria-label="읽기 전용" readOnly defaultValue="읽기 전용 값" />
      <Input aria-label="잠김" disabled defaultValue="locked" />
      <Input aria-label="오류" aria-invalid="true" aria-describedby="input-states-err" defaultValue="??" />
      <p id="input-states-err" role="alert">형식이 올바르지 않습니다</p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByRole("textbox", { name: "오류" });
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(bad.getAttribute("aria-describedby")).toBe(c.getByRole("alert").id);
    await expect(c.getByRole("textbox", { name: "읽기 전용" })).toHaveAttribute("readonly");
    await expect(c.getByRole("textbox", { name: "잠김" })).toBeDisabled();
    await expectTargetSize(canvasElement);
  },
};

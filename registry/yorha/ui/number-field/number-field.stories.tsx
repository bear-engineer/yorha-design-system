import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { NumberField } from "./number-field";

import { expectTargetSize } from "../../../../.storybook/preview";
/** Reduced motion: transitions collapse to <=120ms (opacity-only in practice); full keeps a real duration. */
function motionSeconds(el: Element): number {
  return Math.max(0, ...getComputedStyle(el).transitionDuration.split(",").map((s) => parseFloat(s)));
}
async function expectReducedMotion(el: Element) {
  const root = document.documentElement;
  const prev = root.dataset.motion;
  try {
    root.dataset.motion = "full";
    await waitFor(() => expect(motionSeconds(el)).toBeGreaterThan(0));
    root.dataset.motion = "reduced";
    await waitFor(() => expect(motionSeconds(el)).toBeLessThanOrEqual(0.12));
  } finally {
    if (prev === undefined) delete root.dataset.motion;
    else root.dataset.motion = prev;
  }
}

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
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
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
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  args: { label: "테마 authentic", defaultValue: 3 },
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <NumberField label="테마 authentic" defaultValue={3} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox", { name: "테마 authentic" })).toHaveValue("3");
  },
};

export const ScrubArea: Story = {
  args: { label: "스크럽", defaultValue: 5 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const scrub = c.getByText("스크럽").closest("span");
    await expect(scrub).not.toBeNull();
    await expect(getComputedStyle(scrub!).cursor).toBe("ew-resize");
    await expectReducedMotion(c.getByRole("button", { name: "증가" }));
  },
};

export const States: Story = {
  args: { label: "기본", defaultValue: 3 },
  render: () => (
    <div className="flex flex-col gap-4">
      <NumberField label="기본" defaultValue={3} />
      <NumberField label="읽기 전용" defaultValue={7} readOnly />
      <NumberField label="잠금" defaultValue={3} disabled />
      <NumberField label="오류" defaultValue={120} max={99} error="99 이하여야 합니다" description="최대 99" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("textbox", { name: "읽기 전용" })).toHaveAttribute("readonly");
    await expect(c.getByRole("textbox", { name: "잠금" })).toBeDisabled();
    await expectTargetSize(canvasElement);
  },
};

/** Shift+Arrow = large step, Alt+Arrow = small step, drag the label to scrub. */
export const Modifiers: Story = {
  args: { label: "수량", defaultValue: 10, step: 1, largeStep: 10, smallStep: 0.1 } as never,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("수량", { selector: "input" });
    input.focus();
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
    await expect(input).toHaveValue("20");
  },
};

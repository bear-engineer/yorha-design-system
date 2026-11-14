import { expectTargetSize } from "../../../../.storybook/preview";
import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Checkbox } from "./checkbox";

const THEMES = ["light", "dark", "high-contrast"] as const;

// --- motion helpers (reduced: <=120ms; off: 0) ---
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
function durationsMs(el: Element): number[] {
  return getComputedStyle(el)
    .transitionDuration.split(",")
    .map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000));
}

const BOOL = { control: "inline-radio", options: [false, true] } as const;

const meta = {
  title: "컴포넌트/폼/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  // Radio instead of the default boolean switch: Storybook greys its inactive "True"/"False" label below 4.5:1 (docs axe).
  argTypes: {
    defaultChecked: BOOL,
    disabled: BOOL,
  },
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "알림 수신", defaultChecked: false },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const box = c.getByRole("checkbox", { name: "알림 수신" });
    await expect(box).toHaveAttribute("aria-checked", "false");
    box.focus();
    await userEvent.keyboard(" ");
    await expect(box).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard(" ");
    await expect(box).toHaveAttribute("aria-checked", "false");
  },
};

export const LabelClick: Story = {
  args: { children: "자동 저장", defaultChecked: false },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByText("자동 저장"));
    await expect(c.getByRole("checkbox", { name: "자동 저장" })).toHaveAttribute("aria-checked", "true");
  },
};

// indeterminate is controlled: the parent clears it when the user clicks.
const IndeterminateDemo = ({ children }: { children: React.ReactNode }) => {
  const [indeterminate, setIndeterminate] = React.useState(true);
  const [checked, setChecked] = React.useState(false);
  return (
    <Checkbox
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={(next) => {
        setChecked(next);
        setIndeterminate(false);
      }}
    >
      {children}
    </Checkbox>
  );
};

export const Indeterminate: Story = {
  args: { children: "일부 선택" },
  render: (args) => <IndeterminateDemo>{args.children}</IndeterminateDemo>,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const box = c.getByRole("checkbox", { name: "일부 선택" });
    await expect(box).toHaveAttribute("aria-checked", "mixed");
    await userEvent.click(c.getByText("일부 선택"));
    await expect(box).toHaveAttribute("aria-checked", "true");
  },
};

export const Disabled: Story = {
  args: { children: "잠긴 옵션", defaultChecked: false, disabled: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const box = c.getByRole("checkbox", { name: "잠긴 옵션" });
    await expect(box).toHaveAttribute("aria-disabled", "true");
    box.focus();
    await userEvent.keyboard(" ");
    await userEvent.click(c.getByText("잠긴 옵션"));
    await expect(box).toHaveAttribute("aria-checked", "false");
  },
};

export const FocusVisible: Story = {
  args: { children: "포커스 대상", defaultChecked: false },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox", { name: "포커스 대상" });
    await userEvent.tab();
    await expect(box).toHaveFocus();
    const style = getComputedStyle(box);
    await expect(style.outlineStyle).toBe("solid");
    await expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  },
};

export const States: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Checkbox defaultChecked={false}>꺼짐</Checkbox>
      <Checkbox defaultChecked>켜짐</Checkbox>
      <Checkbox indeterminate>일부</Checkbox>
      <Checkbox disabled>꺼짐 비활성</Checkbox>
      <Checkbox defaultChecked disabled>켜짐 비활성</Checkbox>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("checkbox", { name: "꺼짐" })).toHaveAttribute("aria-checked", "false");
    await expect(c.getByRole("checkbox", { name: "켜짐" })).toHaveAttribute("aria-checked", "true");
    await expect(c.getByRole("checkbox", { name: "일부" })).toHaveAttribute("aria-checked", "mixed");
    await expect(c.getByRole("checkbox", { name: "꺼짐 비활성" })).toHaveAttribute("aria-disabled", "true");
    await expectTargetSize(canvasElement);
  },
};

export const Themes: Story = {
  args: { children: "" },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <Checkbox defaultChecked>{`테마 ${t}`}</Checkbox>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("checkbox")).toHaveLength(3);
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  args: { children: "오리지널 팔레트", defaultChecked: true },
  render: (args) => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <Checkbox {...args} />
    </div>
  ),
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("checkbox", { name: "오리지널 팔레트" });
    await expect(box).toHaveAttribute("aria-checked", "true");
  },
};

export const ReducedMotion: Story = {
  args: { children: "알림 수신", defaultChecked: true },
  play: async ({ canvasElement }) => {
    const els = (): Element[] => {
      const c = within(canvasElement);
      return [c.getByRole("checkbox")];
    };
    await inMotion("reduced", async () => {
      for (const el of els()) {
        expect(getComputedStyle(el).transitionProperty).not.toBe("none");
        expect(Math.max(...durationsMs(el))).toBeLessThanOrEqual(120);
      }
    });
    await inMotion("off", async () => {
      for (const el of els()) expect(Math.max(...durationsMs(el))).toBe(0);
    });
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "./button";

const VARIANTS = ["default", "primary", "ghost", "danger"] as const;
const SIZES = ["sm", "md", "lg"] as const;
const THEMES = ["light", "dark", "authentic", "high-contrast"] as const;
const LABEL: Record<(typeof VARIANTS)[number], string> = {
  default: "기본",
  primary: "주요",
  ghost: "고스트",
  danger: "위험",
};

const meta = {
  title: "컴포넌트/폼/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "확인", onClick: fn() },
  argTypes: {
    variant: { control: "select", options: [...VARIANTS] },
    size: { control: "inline-radio", options: [...SIZES] },
  },
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "확인" });
    await expect(btn.tagName).toBe("BUTTON");
  },
};

export const KeyboardActivation: Story = {
  play: async ({ canvasElement, args }) => {
    const btn = within(canvasElement).getByRole("button", { name: "확인" });
    await userEvent.tab();
    await expect(btn).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

export const FocusVisibleRing: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "확인" });
    await userEvent.tab();
    await expect(btn).toHaveFocus();
    await expect(btn).toHaveClass("focus-visible:yorha-focus");
    await waitFor(() => {
      const cs = getComputedStyle(btn);
      expect(cs.outlineStyle).not.toBe("none");
      expect(parseFloat(cs.outlineWidth)).toBeGreaterThan(0);
    });
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const btn = within(canvasElement).getByRole("button", { name: "확인" });
    await expect(btn).toBeDisabled();
    await userEvent.click(btn);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvasElement, args }) => {
    const btn = within(canvasElement).getByRole("button", { name: "확인" });
    await expect(btn).toHaveAttribute("aria-busy", "true");
    await expect(btn).toHaveTextContent("확인");
    await userEvent.click(btn);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const SelectionWipe: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "확인" });
    await expect(getComputedStyle(btn).transitionDuration).toContain("0.18s");
  },
};

export const WipeRespectsMotionOff: Story = {
  play: async ({ canvasElement }) => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    root.setAttribute("data-motion", "off");
    try {
      const btn = within(canvasElement).getByRole("button", { name: "확인" });
      await waitFor(() => expect(parseFloat(getComputedStyle(btn).transitionDuration)).toBe(0));
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Matrix: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {VARIANTS.map((v) => (
        <div key={v} className="flex flex-wrap items-center gap-3">
          {SIZES.map((s) => (
            <Button key={`${v}-${s}`} {...args} variant={v} size={s}>
              {LABEL[v]} {s}
            </Button>
          ))}
          <Button {...args} variant={v} loading>
            {LABEL[v]} 로딩
          </Button>
          <Button {...args} variant={v} disabled>
            {LABEL[v]} 비활성
          </Button>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("button")).toHaveLength(VARIANTS.length * (SIZES.length + 2));
    await expect(c.getAllByRole("button", { busy: true })).toHaveLength(VARIANTS.length);
  },
};

export const Themes: Story = {
  // authentic theme is intentionally low-contrast (faithful palette), so a11y is todo here
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div className="grid grid-cols-2 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => (
              <Button key={v} {...args} variant={v}>
                {LABEL[v]}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button")).toHaveLength(THEMES.length * VARIANTS.length);
  },
};

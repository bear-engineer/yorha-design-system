import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "./button";

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

const VARIANTS = ["default", "primary", "ghost", "danger"] as const;
const SIZES = ["sm", "md", "lg"] as const;
const THEMES = ["light", "dark", "high-contrast"] as const;
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
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
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
    // The indicator is overlaid: it pulses (opacity) and takes no room in the button.
    const dot = btn.querySelector<HTMLElement>("[data-yorha-busy]")!;
    await expect(getComputedStyle(dot).position).toBe("absolute");
    await waitFor(() => expect(dot.getAnimations().length).toBeGreaterThan(0));
    await expect(dot.getAnimations().every((a) => (a.effect as KeyframeEffect).getKeyframes().every((k) => !("transform" in k)))).toBe(true);
    const w = btn.offsetWidth;
    dot.style.display = "none";
    await expect(btn.offsetWidth).toBe(w);
    dot.style.display = "";
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

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="flex flex-wrap gap-2 bg-yorha-panel p-4 text-yorha-fg">
      {VARIANTS.map((v) => (
        <Button key={v} {...args} variant={v}>
          {LABEL[v]}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button")).toHaveLength(VARIANTS.length);
  },
};

export const PressFeedback: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "확인" });
    await expect(getComputedStyle(btn).transitionProperty).toContain("scale");
    await expectReducedMotion(btn);
  },
};

/** State matrix: default, disabled, loading (keeps focus, blocks activation). Targets stay >= 24px. */
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SIZES.map((s) => (
        <Button key={s} size={s}>{`기본 ${s}`}</Button>
      ))}
      <Button disabled>비활성</Button>
      <Button loading>로딩</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "비활성" })).toBeDisabled();
    const busy = c.getByRole("button", { name: "로딩" });
    busy.focus();
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).not.toBeDisabled();
    await userEvent.keyboard("{Enter}");
    await expect(busy).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};

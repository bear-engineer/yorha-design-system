import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { IconButton } from "./icon-button";

import { expectTargetSize } from "../../../../.storybook/preview";
const VARIANTS = ["default", "primary", "ghost", "danger"] as const;
const SIZES = ["sm", "md", "lg"] as const;
const THEMES = ["light", "dark", "high-contrast"] as const;

function Glyph() {
  return <span aria-hidden="true" className="block size-3 border-2 border-current" />;
}

const meta = {
  title: "컴포넌트/폼/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: { "aria-label": "닫기", children: <Glyph />, onClick: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "닫기" });
    await expect(btn.tagName).toBe("BUTTON");
    const r = btn.getBoundingClientRect();
    await expect(Math.round(r.width)).toBe(Math.round(r.height));
  },
};

export const KeyboardActivation: Story = {
  play: async ({ canvasElement, args }) => {
    const btn = within(canvasElement).getByRole("button", { name: "닫기" });
    await userEvent.tab();
    await expect(btn).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

export const FocusVisibleRing: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "닫기" });
    await userEvent.tab();
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
    const btn = within(canvasElement).getByRole("button", { name: "닫기" });
    await expect(btn).toBeDisabled();
    await userEvent.click(btn);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvasElement, args }) => {
    const btn = within(canvasElement).getByRole("button", { name: "닫기" });
    await expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Matrix: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {VARIANTS.map((v) => (
        <div key={v} className="flex flex-wrap items-center gap-3">
          {SIZES.map((s) => (
            <IconButton key={s} {...args} aria-label={`${v} ${s}`} variant={v} size={s} />
          ))}
          <IconButton {...args} aria-label={`${v} 로딩`} variant={v} loading />
          <IconButton {...args} aria-label={`${v} 비활성`} variant={v} disabled />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button")).toHaveLength(VARIANTS.length * (SIZES.length + 2));
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex min-w-0 flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((v) => (
              <IconButton key={v} {...args} aria-label={`${t} ${v}`} variant={v} />
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
    <div data-theme="authentic" className="flex gap-2 bg-yorha-panel p-4 text-yorha-fg">
      {VARIANTS.map((v) => (
        <IconButton key={v} {...args} aria-label={`authentic ${v}`} variant={v} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button")).toHaveLength(VARIANTS.length);
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {SIZES.map((s) => (
        <IconButton key={s} size={s} aria-label={`닫기 ${s}`}>
          <Glyph />
        </IconButton>
      ))}
      <IconButton aria-label="비활성" disabled>
        <Glyph />
      </IconButton>
      <IconButton aria-label="로딩" loading>
        <Glyph />
      </IconButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "비활성" })).toBeDisabled();
    const busy = c.getByRole("button", { name: "로딩" });
    busy.focus();
    await userEvent.keyboard("{Enter}");
    await expect(busy).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};

export const TooltipFromLabel: Story = {
  name: "Tooltip (V4-087)",
  args: { "aria-label": "복사", shortcut: "C" },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "복사" });
    await userEvent.hover(btn);
    const tip = await within(document.body).findByRole("tooltip", undefined, { timeout: 3000 });
    await expect(tip).toHaveTextContent("복사");
    await expect(btn).not.toHaveAttribute("aria-describedby");
  },
};

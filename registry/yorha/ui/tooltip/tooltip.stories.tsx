import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const THEMES = ["light", "dark", "high-contrast"] as const;

const TRIGGER_CLASS =
  "rounded-yorha border border-yorha-border bg-yorha-panel px-3 py-2 font-yorha text-yorha-sm text-yorha-fg focus-visible:yorha-focus";

const LABEL = "재장전";
const DESCRIPTION = "현재 무기의 탄약을 채운다. 소모 시간 2초.";

function Demo({ defaultOpen, open, onOpenChange }: { defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <div className="flex min-h-64 items-start justify-center bg-yorha-panel p-16 text-yorha-fg">
      <Tooltip defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger className={TRIGGER_CLASS}>{LABEL}</TooltipTrigger>
        <TooltipContent>{DESCRIPTION}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** One themed cell; the tooltip portals into the cell so the theme's tokens apply. */
function ThemeCell({ theme }: { theme: (typeof THEMES)[number] }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setContainer} data-theme={theme} className="relative flex min-h-72 flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
      <span className="text-yorha-sm">{theme}</span>
      <Tooltip defaultOpen>
        <TooltipTrigger className={TRIGGER_CLASS}>{LABEL}</TooltipTrigger>
        <TooltipContent container={container}>{DESCRIPTION}</TooltipContent>
      </Tooltip>
    </div>
  );
}

const body = () => within(document.body);
const trigger = () => body().getByRole("button", { name: LABEL });
const tooltip = async () => {
  const t = await body().findByRole("tooltip");
  await waitFor(() => expect(t).toBeVisible());
  return t;
};

const meta = {
  title: "컴포넌트/오버레이/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    await expect(body().queryByRole("tooltip")).toBeNull();
    // 키보드 포커스만으로 표시된다 (WCAG 1.4.13)
    await userEvent.tab();
    await waitFor(() => expect(t).toHaveFocus());
    const tip = await tooltip();
    // 툴팁 텍스트가 트리거의 접근 가능한 설명이다
    await waitFor(() => expect(t).toHaveAccessibleDescription(DESCRIPTION));
    await expect(t.getAttribute("aria-describedby")).toBe(tip.id);
    await expect(tip).toHaveTextContent(DESCRIPTION);
  },
};

export const HoverOpens: Story = {
  render: () => <Demo />,
  play: async () => {
    await userEvent.hover(trigger());
    const tip = await tooltip();
    await expect(tip).toHaveTextContent(DESCRIPTION);
    await userEvent.unhover(trigger());
    await waitFor(() => expect(body().queryByRole("tooltip")).toBeNull());
  },
};

export const EscapeDismissesFocusStays: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    await userEvent.tab();
    await tooltip();
    // Escape로 닫는다 (WCAG 1.4.13 dismissible); 포커스는 트리거에 남는다
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("tooltip")).toBeNull());
    await expect(t).toHaveFocus();
    await expect(t.getAttribute("aria-describedby")).toBeNull();
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <ThemeCell key={t} theme={t} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("button", { name: LABEL })).toHaveLength(THEMES.length);
  },
};

// authentic theme is intentionally low-contrast (faithful palette), so a11y is todo here
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <Demo defaultOpen />
    </div>
  ),
};

import { useState } from "react";
import { OverlayHero, overlayHeroParameters } from "../../../../src/docs/overlay-hero";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipViewport,
  createTooltipHandle,
} from "@/components/ui/tooltip";

// --- motion helpers (reduced: opacity-only, <=120ms; off: 0) ---
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
/** Reduced: a fade of at most 120ms and no spatial travel (--motion-spatial is 0). */
async function expectReduced(el: Element) {
  // Base UI sets an inline `transition: none` for the first frame of some popups.
  await waitFor(() => expect(getComputedStyle(el).transitionProperty).not.toBe("none"));
  const max = Math.max(...durationsMs(el));
  expect(max).toBeGreaterThan(0);
  expect(max).toBeLessThanOrEqual(120);
  expect(getComputedStyle(el).transitionProperty).toContain("opacity");
  expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-spatial").trim()).toBe("0");
}
async function expectOff(el: Element) {
  expect(Math.max(...durationsMs(el))).toBe(0);
}

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

/** Docs hero: the tooltip open over a header button. */
export const Overview: Story = {
  name: "열린 상태",
  parameters: overlayHeroParameters,
  render: () => (
    <OverlayHero
      toolbar={
        <Tooltip defaultOpen>
          <TooltipTrigger className={TRIGGER_CLASS}>{LABEL}</TooltipTrigger>
          <TooltipContent>{DESCRIPTION}</TooltipContent>
        </Tooltip>
      }
    />
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
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
  tags: ["!autodocs"],
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
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <Demo defaultOpen />
    </div>
  ),
};

const shared = createTooltipHandle<string>();

/** Provider shares the delay; one handle, two triggers, one popup. Viewport cross-fades the text, Arrow points at the trigger. */
export const SharedTooltip: Story = {
  render: () => (
    <TooltipProvider delay={0}>
      <div className="flex min-h-48 items-start justify-center gap-3 bg-yorha-panel p-16 text-yorha-fg">
        <TooltipTrigger handle={shared} payload="재장전 설명" className={TRIGGER_CLASS}>
          재장전
        </TooltipTrigger>
        <TooltipTrigger handle={shared} payload="회피 설명" className={TRIGGER_CLASS}>
          회피
        </TooltipTrigger>
        <Tooltip handle={shared}>
          {({ payload }) => (
            <TooltipContent>
              <TooltipArrow />
              <TooltipViewport>{payload as string}</TooltipViewport>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
  play: async () => {
    await userEvent.hover(body().getByRole("button", { name: "재장전" }));
    const tip = await tooltip();
    await expect(tip).toHaveTextContent("재장전 설명");
    await expect(tip.querySelector("[data-slot=tooltip-arrow]")).not.toBeNull();
    await userEvent.hover(body().getByRole("button", { name: "회피" }));
    await waitFor(() => expect(tip).toHaveTextContent("회피 설명"));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("tooltip")).toBeNull());
  },
};

export const ReducedMotion: Story = {
  tags: ["!autodocs"],
  render: () => <Demo />,
  play: async () => {
    for (const mode of ["reduced", "off"] as const) {
      await inMotion(mode, async () => {
        await userEvent.hover(trigger());
        const tip = await screen.findByRole("tooltip");
        await (mode === "reduced" ? expectReduced : expectOff)(tip);
        await userEvent.unhover(trigger());
        await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull(), { timeout: 600 });
      });
    }
  },
};

/** States: default, focus-visible (opens tooltip), disabled-free. The trigger is the only target. >= 24px at both densities. */
export const States: Story = {
  tags: ["!autodocs"],
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    await expectTargetSize(canvasElement);
    await userEvent.tab();
    await expect(trigger()).toHaveFocus();
    const t = await tooltip();
    await expect(t).toBeVisible();
    await expectTargetSize(canvasElement);
    await userEvent.keyboard("{Escape}");
  },
};

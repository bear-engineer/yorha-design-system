import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  PopoverViewport,
  createPopoverHandle,
} from "@/components/ui/popover";

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

interface DemoProps {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Demo({ defaultOpen, onOpenChange }: DemoProps) {
  return (
    <div className="flex min-h-64 items-start justify-center bg-yorha-panel p-16 text-yorha-fg">
      <Popover defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger className={TRIGGER_CLASS}>유닛 정보</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>2B 상세</PopoverTitle>
          <PopoverDescription>전투 보조 유닛. 현재 위치는 지하 격납고다.</PopoverDescription>
          <PopoverClose>닫기</PopoverClose>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const panels = createPopoverHandle<string>();

/** Two triggers share one popup (handle). Viewport cross-fades the content, Arrow follows the popup, Backdrop dims in modal mode. */
function SharedDemo({ modal = false }: { modal?: boolean }) {
  return (
    <div className="flex min-h-64 items-start justify-center gap-3 bg-yorha-panel p-16 text-yorha-fg">
      <PopoverTrigger handle={panels} payload="알림 내용" className={TRIGGER_CLASS}>
        알림
      </PopoverTrigger>
      <PopoverTrigger handle={panels} payload="활동 내용" className={TRIGGER_CLASS}>
        활동
      </PopoverTrigger>
      <Popover handle={panels} modal={modal}>
        {({ payload }) => (
          <>
            <PopoverContent aria-label="공유 팝오버" backdrop={modal}>
              <PopoverArrow />
              <PopoverViewport>
                <PopoverDescription>{payload as string}</PopoverDescription>
              </PopoverViewport>
            </PopoverContent>
          </>
        )}
      </Popover>
    </div>
  );
}

/** One themed cell; the popup portals into the cell so the theme's tokens apply. */
function ThemeCell({ theme }: { theme: (typeof THEMES)[number] }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setContainer}
      data-theme={theme}
      className="relative flex min-h-72 flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg"
    >
      <span className="text-yorha-sm">{theme}</span>
      <Popover defaultOpen modal={false}>
        <PopoverTrigger className={TRIGGER_CLASS}>유닛 정보</PopoverTrigger>
        <PopoverContent container={container} initialFocus={false}>
          <PopoverTitle>2B 상세</PopoverTitle>
          <PopoverDescription>전투 보조 유닛. 현재 위치는 지하 격납고다.</PopoverDescription>
          <PopoverClose>닫기</PopoverClose>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const body = () => within(document.body);
const trigger = () => body().getByRole("button", { name: "유닛 정보" });
const dialog = async () => {
  const d = await body().findByRole("dialog", { name: "2B 상세" });
  await waitFor(() => expect(d).toBeVisible());
  return d;
};

const meta = {
  title: "컴포넌트/오버레이/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    await expect(t).toHaveAttribute("aria-expanded", "false");
    await expect(body().queryByRole("dialog")).toBeNull();
    // 키보드로 연다
    t.focus();
    await userEvent.keyboard("{Enter}");
    const d = await dialog();
    await expect(t).toHaveAttribute("aria-expanded", "true");
    // 팝업 내용은 제목과 설명을 가진다
    await expect(d).toHaveAccessibleDescription("전투 보조 유닛. 현재 위치는 지하 격납고다.");
    // 팝업은 포털에 렌더링된다
    await expect(t.parentElement?.contains(d)).toBe(false);
  },
};

export const KeyboardOpenEscapeReturnsFocus: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    t.focus();
    await userEvent.keyboard("{Enter}");
    await dialog();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await expect(t).toHaveAttribute("aria-expanded", "false");
    // Escape 후 포커스는 트리거로 돌아온다
    await waitFor(() => expect(t).toHaveFocus());
  },
};

export const CloseButtonReturnsFocus: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    t.focus();
    await userEvent.keyboard(" ");
    const d = await dialog();
    // 팝업 안의 닫기 버튼으로 닫는다
    await userEvent.click(within(d).getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(t).toHaveFocus());
  },
};

export const OpenChangeReports: Story = {
  render: () => {
    const log: boolean[] = [];
    (window as unknown as { __popoverLog?: boolean[] }).__popoverLog = log;
    return <Demo onOpenChange={(open) => log.push(open)} />;
  },
  play: async () => {
    const t = trigger();
    t.focus();
    await userEvent.keyboard("{Enter}");
    await dialog();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await expect((window as unknown as { __popoverLog?: boolean[] }).__popoverLog).toEqual([true, false]);
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
    await expect(c.getAllByRole("button", { name: "유닛 정보" })).toHaveLength(THEMES.length);
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

export const SharedPopup: Story = {
  render: () => <SharedDemo />,
  play: async () => {
    await userEvent.click(body().getByRole("button", { name: "알림" }));
    const d = await body().findByRole("dialog", { name: "공유 팝오버" });
    await waitFor(() => expect(d).toBeVisible());
    await expect(within(d).getByText("알림 내용")).toBeVisible();
    // the arrow is a real part of the popup
    await expect(d.querySelector("[data-slot=popover-arrow]")).not.toBeNull();
    // second trigger swaps the content inside the same popup
    await userEvent.click(body().getByRole("button", { name: "활동" }));
    await waitFor(() => expect(within(d).getByText("활동 내용")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
  },
};

export const ModalBackdrop: Story = {
  render: () => <SharedDemo modal />,
  play: async () => {
    await userEvent.click(body().getByRole("button", { name: "알림" }));
    await body().findByRole("dialog", { name: "공유 팝오버" });
    await waitFor(() => expect(document.querySelector("[data-slot=popover-backdrop]")).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
  },
};

export const ReducedMotion: Story = {
  render: () => <SharedDemo modal />,
  play: async () => {
    for (const mode of ["reduced", "off"] as const) {
      await inMotion(mode, async () => {
        await userEvent.click(body().getByRole("button", { name: "알림" }));
        const d = await screen.findByRole("dialog", { name: "공유 팝오버" });
        const backdrop = document.querySelector("[data-slot=popover-backdrop]")!;
        for (const el of [d, backdrop]) await (mode === "reduced" ? expectReduced : expectOff)(el);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 400 });
      });
    }
  },
};

/** States: closed trigger and open popover with close button. Targets >= 24px at both densities. */
export const States: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    await expectTargetSize(canvasElement);
    await userEvent.click(trigger());
    const d = await dialog();
    await expectTargetSize(d);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
  },
};

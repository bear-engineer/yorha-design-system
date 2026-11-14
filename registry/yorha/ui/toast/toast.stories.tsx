import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { ToastProvider, ToastViewport, useToast, type ToastType } from "./toast";

const THEMES = ["light", "dark", "high-contrast"] as const;
const LABEL: Record<ToastType, string> = { info: "정보 알림", success: "성공 알림", alert: "경고 알림" };
const TITLE: Record<ToastType, string> = { info: "동기화 시작", success: "저장 완료", alert: "연결 끊김" };

function Triggers({ timeout }: { timeout?: number }) {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(LABEL) as ToastType[]).map((type) => (
        <Button
          key={type}
          onClick={() =>
            toast.add({
              type,
              title: TITLE[type],
              description: "변경 사항이 기록되었습니다.",
              timeout,
              priority: type === "alert" ? "high" : "low",
            })
          }
        >
          {LABEL[type]}
        </Button>
      ))}
    </div>
  );
}

interface DemoProps {
  /** Auto-dismiss delay in ms; 0 keeps toasts until closed. */
  timeout?: number;
}

function ToastDemo({ timeout }: DemoProps) {
  return (
    <ToastProvider>
      <Triggers timeout={timeout} />
    </ToastProvider>
  );
}

const meta = {
  title: "컴포넌트/피드백/Toast",
  component: ToastDemo,
  tags: ["autodocs"],
  args: { timeout: 5000 },
  decorators: [
    (Story) => (
      <div className="min-h-72 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToastDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = (el: HTMLElement) => within(el.ownerDocument.body);

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL.success }));
    const toast = await body(canvasElement).findByRole("dialog");
    await expect(toast).toHaveAttribute("data-type", "success");
    await waitFor(() => expect(within(toast).getByText(TITLE.success)).toBeVisible());
  },
};

export const AnnouncedInLiveRegion: Story = {
  play: async ({ canvasElement }) => {
    const region = await body(canvasElement).findByRole("region", { name: "알림" });
    await expect(region).toHaveAttribute("aria-live", "polite");
    await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL.info }));
    await waitFor(() => expect(within(region).getByText(TITLE.info)).toBeVisible());
    // The toast text sits inside the live region, so assistive tech announces additions.
    await expect(region.contains(within(region).getByText(TITLE.info))).toBe(true);
  },
};

export const VariantsHaveShapeCue: Story = {
  args: { timeout: 0 },
  play: async ({ canvasElement }) => {
    for (const type of ["info", "success", "alert"] as const) {
      await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL[type] }));
    }
    const region = await body(canvasElement).findByRole("region", { name: "알림" });
    await waitFor(() => expect(region.querySelectorAll("[data-slot=toast]")).toHaveLength(3));
    for (const type of ["info", "success", "alert"] as const) {
      const el = region.querySelector(`[data-slot=toast][data-type=${type}]`) as HTMLElement;
      // Each variant carries a decorative shape plus a hidden text label, not colour alone.
      await expect(el.querySelector("[aria-hidden=true]")).not.toBeNull();
      await expect(el.querySelector(".sr-only")).not.toBeNull();
    }
  },
};

export const CloseWithKeyboard: Story = {
  args: { timeout: 0 },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL.success }));
    const close = await body(canvasElement).findByRole("button", { name: "닫기" });
    for (let i = 0; i < 6 && document.activeElement !== close; i++) await userEvent.tab();
    await expect(close).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body(canvasElement).queryByText(TITLE.success)).toBeNull());
  },
};

export const AutoDismiss: Story = {
  args: { timeout: 600 },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL.info }));
    await body(canvasElement).findByText(TITLE.info);
    await waitFor(() => expect(body(canvasElement).queryByText(TITLE.info)).toBeNull(), { timeout: 4000 });
  },
};

export const PausesOnHoverAndFocus: Story = {
  args: { timeout: 800 },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL.info }));
    const title = await body(canvasElement).findByText(TITLE.info);
    // Hover: outlives the timeout.
    await userEvent.hover(title);
    await new Promise((r) => setTimeout(r, 1600));
    await expect(body(canvasElement).queryByText(TITLE.info)).not.toBeNull();
    await userEvent.unhover(title);
    await waitFor(() => expect(body(canvasElement).queryByText(TITLE.info)).toBeNull(), { timeout: 4000 });

    // Focus: keyboard focus inside the viewport also holds the timer.
    await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL.success }));
    const close = await body(canvasElement).findByRole("button", { name: "닫기" });
    close.focus();
    await new Promise((r) => setTimeout(r, 1600));
    await expect(body(canvasElement).queryByText(TITLE.success)).not.toBeNull();
  },
};

/** Light, dark and high-contrast only. Each pane has its own provider and a contained viewport. */
function ThemedPane({ theme }: { theme: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  return (
    <div data-theme={theme} ref={setHost} className="relative h-96 overflow-hidden bg-yorha-panel p-4 text-yorha-fg">
      <span className="text-yorha-sm">{theme}</span>
      {host ? (
        <ToastProvider viewport={false} timeout={0}>
          <Seed />
          <ToastViewport container={host} contained aria-label={`알림 (${theme})`} />
        </ToastProvider>
      ) : null}
    </div>
  );
}

function Seed() {
  const toast = useToast();
  const [done, setDone] = useState(false);
  if (!done) {
    setDone(true);
    (["info", "success", "alert"] as const).forEach((type) =>
      toast.add({ type, title: TITLE[type], description: "변경 사항이 기록되었습니다.", timeout: 0 }),
    );
  }
  return null;
}

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <ThemedPane key={t} theme={t} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll("[data-slot=toast]")).toHaveLength(THEMES.length * 3));
  },
};

/** Authentic theme exercises the source look, which fails contrast on purpose, so only this story skips a11y. */
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <ToastDemo timeout={0} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: LABEL.info })).toBeVisible();
  },
};

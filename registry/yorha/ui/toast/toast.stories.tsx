import { expectTargetSize } from "../../../../.storybook/preview";
import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { ToastProvider, ToastViewport, useToast, type ToastType } from "./toast";

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

/** Samples one value per animation frame until `done` or `ms` elapse. */
async function sample<T>(read: () => T, ms: number, done?: (values: T[]) => boolean): Promise<T[]> {
  const values: T[] = [];
  const end = performance.now() + ms;
  while (performance.now() < end && !(done && done(values))) {
    values.push(read());
    await new Promise((r) => requestAnimationFrame(r));
  }
  return values;
}

export const MotionRecipe: Story = {
  args: { timeout: 0 },
  play: async ({ canvasElement }) => {
    const toasts = () => [...canvasElement.ownerDocument.querySelectorAll<HTMLElement>("[data-slot=toast]")];
    const add = within(canvasElement).getByRole("button", { name: LABEL.info });

    // Enter: starts transparent and fades in.
    await userEvent.click(add);
    const first = await waitFor(() => {
      const [t] = toasts();
      expect(t).toBeDefined();
      return t;
    });
    const enter = await sample(() => +getComputedStyle(first).opacity, 700, (v) => v.at(-1) === 1);
    await expect(enter[0]).toBeLessThan(1);

    // Adding another toast moves the first with a transition, not a jump.
    await userEvent.click(add);
    await waitFor(() => expect(toasts()).toHaveLength(2));
    const lift = await sample(() => first.getBoundingClientRect().y, 700, (v) => v.length > 3 && v.at(-1) === v.at(-2));
    await expect(new Set(lift.map((y) => Math.round(y))).size).toBeGreaterThan(2);

    // Exit: opacity falls gradually; the node is not held at 1 and then removed.
    const [newest] = toasts();
    const exit = (async () => sample(() => +getComputedStyle(newest).opacity, 700, () => !newest.isConnected))();
    await userEvent.click(within(newest).getByRole("button", { name: "닫기" }));
    const fade = await exit;
    await expect(fade.filter((o) => o < 1 && o > 0).length).toBeGreaterThan(1);
    await expect(Math.min(...fade)).toBeLessThan(0.5);

    // The remaining toast settles back down over more than one frame.
    await waitFor(() => expect(toasts()).toHaveLength(1));
    const [rest] = toasts();
    const drop = await sample(() => rest.getBoundingClientRect().y, 700, (v) => v.length > 3 && v.at(-1) === v.at(-2));
    await expect(new Set(drop.map((y) => Math.round(y))).size).toBeGreaterThan(1);
  },
};

/** A swipe release carries on outward from where it was let go; it does not snap back first. */
export const SwipeContinues: Story = {
  args: { timeout: 0 },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: LABEL.info }));
    const toast = await waitFor(() => {
      const t = canvasElement.ownerDocument.querySelector<HTMLElement>("[data-slot=toast]");
      expect(t).not.toBeNull();
      return t as HTMLElement;
    });
    await new Promise((r) => setTimeout(r, 600));
    const box = toast.getBoundingClientRect();
    const x0 = box.x + 40;
    const y0 = box.y + 20;
    const opts = { pointerId: 1, pointerType: "mouse", isPrimary: true, bubbles: true, clientY: y0 } as const;
    const frame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    fireEvent.pointerDown(toast, { ...opts, clientX: x0, buttons: 1 });
    for (let dx = 10; dx <= 120; dx += 10) {
      fireEvent.pointerMove(toast, { ...opts, clientX: x0 + dx, buttons: 1 });
      await frame();
    }
    await expect(toast).toHaveAttribute("data-swiping");
    const release = toast.getBoundingClientRect().x;
    const run = (async () => sample(() => toast.getBoundingClientRect().x, 700, () => !toast.isConnected))();
    fireEvent.pointerUp(toast, { ...opts, clientX: x0 + 120, buttons: 0 });
    const xs = await run;
    await expect(release).toBeGreaterThan(box.x);
    await expect(xs.length).toBeGreaterThan(2);
    for (let i = 1; i < xs.length; i++) await expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1] - 0.5);
    await expect(Math.max(...xs)).toBeGreaterThan(release + 20);
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
    <div className="grid w-[min(72rem,calc(100vw-2rem))] grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-4">
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
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <ToastDemo timeout={0} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: LABEL.info })).toBeVisible();
  },
};

function PartsTriggers() {
  const toast = useToast();
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          toast.add({
            type: "info",
            title: "기록 삭제됨",
            description: "되돌릴 수 있다.",
            timeout: 0,
            actionProps: { children: "되돌리기" },
          })
        }
      >
        실행 취소 토스트
      </Button>
      <Button
        ref={anchorRef}
        onClick={() =>
          toast.add({
            type: "success",
            title: "복사됨",
            timeout: 0,
            positionerProps: { anchor: anchorRef.current, sideOffset: 10 },
          })
        }
      >
        복사
      </Button>
    </div>
  );
}

const PartsDemo = () => (
  <ToastProvider>
    <PartsTriggers />
  </ToastProvider>
);

/** Action button in a stacked toast; Positioner + Arrow in an anchored one. */
export const ActionAndAnchored: Story = {
  render: () => <PartsDemo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "실행 취소 토스트" }));
    const region = await body(canvasElement).findByRole("region", { name: "알림" });
    const action = await within(region).findByRole("button", { name: "되돌리기" });
    await expect(action).toHaveAttribute("data-slot", "toast-action");
    await userEvent.click(within(canvasElement).getByRole("button", { name: "복사" }));
    await waitFor(() => expect(region.querySelector("[data-slot=toast-positioner]")).not.toBeNull());
    const anchored = region.querySelector("[data-slot=toast-positioner] [data-slot=toast]") as HTMLElement;
    await expect(anchored.querySelector("[data-slot=toast-arrow]")).not.toBeNull();
  },
};

export const ReducedMotion: Story = {
  render: () => <PartsDemo />,
  play: async ({ canvasElement }) => {
    for (const mode of ["reduced", "off"] as const) {
      await inMotion(mode, async () => {
        await userEvent.click(within(canvasElement).getByRole("button", { name: "실행 취소 토스트" }));
        const region = await screen.findByRole("region", { name: "알림" });
        const stacked = await waitFor(() => {
          const el = region.querySelector("[data-slot=toast]:not([data-slot=toast-positioner] *)");
          expect(el).not.toBeNull();
          return el as HTMLElement;
        });
        await userEvent.click(within(canvasElement).getByRole("button", { name: "복사" }));
        const anchored = await waitFor(() => {
          const el = region.querySelector("[data-slot=toast-positioner] [data-slot=toast]");
          expect(el).not.toBeNull();
          return el as HTMLElement;
        });
        for (const el of [stacked, anchored]) await (mode === "reduced" ? expectReduced : expectOff)(el);
        for (const b of within(region).getAllByRole("button", { name: "닫기" })) await userEvent.click(b);
        await waitFor(() => expect(region.querySelectorAll("[data-slot=toast]")).toHaveLength(0), { timeout: 800 });
      });
    }
  },
};

/** State matrix: info/success/alert toasts with close buttons, focus stays on the trigger when a toast is added. Targets >= 24px. */
export const States: Story = {
  args: { timeout: 0 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const type of ["info", "success", "alert"] as const) {
      const trigger = c.getByRole("button", { name: LABEL[type] });
      trigger.focus();
      await userEvent.click(trigger);
      // adding a toast must not steal focus from the control
      await expect(trigger).toHaveFocus();
    }
    const region = await body(canvasElement).findByRole("region", { name: "알림" });
    await waitFor(() => expect(region.querySelectorAll("[data-slot=toast]")).toHaveLength(3));
    await waitFor(() => expect(within(region).getAllByRole("button").length).toBeGreaterThan(0));
    await expectTargetSize(canvasElement.ownerDocument.body);
  },
};

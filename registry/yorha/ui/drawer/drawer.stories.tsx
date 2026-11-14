import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerGrip,
  DrawerSwipeArea,
  DrawerTitle,
  DrawerTrigger,
  drawerStyles,
} from "./drawer";

const THEMES = ["light", "dark", "high-contrast"] as const;
type Side = "top" | "right" | "bottom" | "left";
const SIDES: Side[] = ["top", "right", "bottom", "left"];

interface DemoProps {
  side?: Side;
  snapPoints?: (number | string)[];
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Demo({ side = "right", ...root }: DemoProps) {
  return (
    <div lang="ko" className="min-h-64 bg-yorha-panel p-8 text-yorha-fg">
      <Drawer side={side} {...root}>
        <DrawerTrigger>유닛 목록 열기</DrawerTrigger>
        <DrawerContent>
          {side === "bottom" && <DrawerGrip />}
          <DrawerTitle>유닛 목록</DrawerTitle>
          <DrawerBody>
            <DrawerDescription>격납고에 등록된 유닛을 확인한다.</DrawerDescription>
            <ul className="mt-3 list-disc pl-5 text-yorha-sm">
              <li>2B</li>
              <li>9S</li>
              <li>A2</li>
            </ul>
          </DrawerBody>
          <DrawerFooter>
            <DrawerClose>닫기</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function SideSwitch() {
  const [side, setSide] = useState<Side>("right");
  return (
    <div lang="ko" className="bg-yorha-panel text-yorha-fg">
      <div role="radiogroup" aria-label="방향" className="flex gap-3 p-4 text-yorha-sm">
        {SIDES.map((s) => (
          <label key={s} className="flex items-center gap-1">
            <input type="radio" name="side" className="size-6" checked={side === s} onChange={() => setSide(s)} />
            {s}
          </label>
        ))}
      </div>
      <Demo key={side} side={side} />
    </div>
  );
}

function NestedDemo() {
  return (
    <div lang="ko" className="min-h-64 bg-yorha-panel p-8 text-yorha-fg">
      <Drawer side="right">
        <DrawerTrigger>첫째 서랍 열기</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>첫째 서랍</DrawerTitle>
          <DrawerBody>
            <DrawerDescription>안쪽에 둘째 서랍이 있다.</DrawerDescription>
            <Drawer side="right">
              <DrawerTrigger>둘째 서랍 열기</DrawerTrigger>
              <DrawerContent>
                <DrawerTitle>둘째 서랍</DrawerTitle>
                <DrawerBody>
                  <DrawerDescription>겹쳐 쌓인 서랍.</DrawerDescription>
                </DrawerBody>
                <DrawerFooter>
                  <DrawerClose>둘째 닫기</DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </DrawerBody>
          <DrawerFooter>
            <DrawerClose>첫째 닫기</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function KeyboardDemo() {
  return (
    <div lang="ko" className="min-h-64 bg-yorha-panel p-8 text-yorha-fg">
      <Drawer side="bottom">
        <DrawerTrigger>입력 서랍 열기</DrawerTrigger>
        <DrawerContent keyboardAware>
          <DrawerGrip />
          <DrawerTitle>메모 입력</DrawerTitle>
          <DrawerBody>
            <label className="flex flex-col gap-1 text-yorha-sm">
              메모
              <input className="border border-yorha-border bg-yorha-panel px-2 py-1" />
            </label>
          </DrawerBody>
          <DrawerFooter>
            <DrawerClose>닫기</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** Static look of the popup per theme (portaled overlays are not opened side by side). */
function StaticPreview({ side }: { side: Side }) {
  return (
    <div className={`${drawerStyles.surface} relative flex min-h-48 flex-col`}>
      {side === "bottom" && <DrawerGripStatic />}
      <h2 className={drawerStyles.title}>유닛 목록</h2>
      <div className={drawerStyles.body}>
        <p className={drawerStyles.description}>격납고에 등록된 유닛을 확인한다.</p>
      </div>
      <div className={drawerStyles.footer}>
        <span className="font-yorha text-yorha-sm">닫기</span>
      </div>
    </div>
  );
}
function DrawerGripStatic() {
  return <div aria-hidden="true" className={drawerStyles.grip} />;
}

const body = () => within(document.body);
const trigger = (name = "유닛 목록 열기") => body().getByRole("button", { name });
const dialog = async (name = "유닛 목록") => {
  const d = await body().findByRole("dialog", { name });
  await waitFor(() => expect(d).toBeVisible());
  return d;
};

const meta = {
  title: "컴포넌트/오버레이/Drawer",
  component: Demo,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    await expect(t).toHaveAttribute("aria-expanded", "false");
    await expect(body().queryByRole("dialog")).toBeNull();
    t.focus();
    await userEvent.keyboard("{Enter}");
    const d = await dialog();
    await expect(d).toHaveAccessibleDescription("격납고에 등록된 유닛을 확인한다.");
    await expect(d.className).toContain("yorha-slide-left");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
  },
};

export const KeyboardEscapeReturnsFocus: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    t.focus();
    await userEvent.keyboard("{Enter}");
    await dialog();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(t).toHaveFocus());
  },
};

export const FocusTrap: Story = {
  render: () => <Demo />,
  play: async () => {
    trigger().focus();
    await userEvent.keyboard(" ");
    const d = await dialog();
    // focus starts inside, and Tab/Shift+Tab never leave the popup
    await waitFor(() => expect(d.contains(document.activeElement)).toBe(true), { timeout: 3000 });
    for (let i = 0; i < 4; i += 1) {
      await userEvent.tab();
      await waitFor(() => expect(d.contains(document.activeElement)).toBe(true), { timeout: 3000 });
    }
    await userEvent.tab({ shift: true });
    await waitFor(() => expect(d.contains(document.activeElement)).toBe(true), { timeout: 3000 });
    await userEvent.click(within(d).getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger()).toHaveFocus());
  },
};

export const Sides: Story = {
  render: () => <SideSwitch />,
  play: async () => {
    const expected: Record<Side, string> = {
      bottom: "yorha-slide-up",
      top: "yorha-slide-down",
      right: "yorha-slide-left",
      left: "yorha-slide-right",
    };
    for (const side of SIDES) {
      await userEvent.click(body().getByRole("radio", { name: side }));
      trigger().focus();
      await userEvent.keyboard("{Enter}");
      const d = await dialog();
      await expect(d.className).toContain(expected[side]);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
    }
  },
};

export const Bottom: Story = { render: () => <Demo side="bottom" /> };
export const Left: Story = { render: () => <Demo side="left" /> };
export const Top: Story = { render: () => <Demo side="top" /> };

export const SwipeToDismiss: Story = {
  render: () => <Demo side="bottom" />,
  play: async () => {
    trigger().focus();
    await userEvent.keyboard("{Enter}");
    const d = await dialog();
    await expect(d).toHaveAttribute("data-swipe-direction", "down");
    // let the opening transition finish so the pointer lands on the title, not on a moving popup
    await waitFor(() => expect(d).not.toHaveAttribute("data-starting-style"), { timeout: 4000 });
    await waitFor(() => expect(d.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 1), { timeout: 4000 });
    await new Promise((res) => setTimeout(res, 100));
    const target = within(d).getByRole("heading", { name: "유닛 목록" });
    const r = target.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const opts = { pointerId: 1, pointerType: "mouse", isPrimary: true, bubbles: true, clientX: x } as const;
    fireEvent.pointerDown(target, { ...opts, clientY: y, buttons: 1 });
    const frame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    for (let i = 1; i <= 12; i += 1) {
      fireEvent.pointerMove(target, { ...opts, clientY: y + i * 50, buttons: 1 });
      await frame();
    }
    // while dragging, Base UI exposes the swiping state and --drawer-swipe-movement-y
    await expect(d).toHaveAttribute("data-swiping");
    // release straight after the last move so the release velocity stays high
    fireEvent.pointerMove(target, { ...opts, clientY: y + 650, buttons: 1 });
    fireEvent.pointerUp(target, { ...opts, clientY: y + 650, buttons: 0 });
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull(), { timeout: 4000 });
  },
};

export const SnapPoints: Story = {
  render: () => <Demo side="bottom" snapPoints={["240px", 1]} defaultOpen />,
  play: async () => {
    const d = await dialog();
    await expect(d.className).toContain("yorha-slide-up");
    // the utility reads --drawer-snap-point-offset; Base UI sets it only when snapPoints exist
    await waitFor(() => expect(getComputedStyle(d).getPropertyValue("--drawer-snap-point-offset")).not.toBe(""));
  },
};

export const Nested: Story = {
  render: () => <NestedDemo />,
  play: async () => {
    trigger("첫째 서랍 열기").focus();
    await userEvent.keyboard("{Enter}");
    const first = await dialog("첫째 서랍");
    await userEvent.click(within(first).getByRole("button", { name: "둘째 서랍 열기" }));
    const second = await dialog("둘째 서랍");
    await waitFor(() => expect(first).toHaveAttribute("data-nested-drawer-open"));
    await expect(getComputedStyle(first).getPropertyValue("--nested-drawers").trim()).toBe("1");
    await expect(second).not.toHaveAttribute("data-nested-drawer-open");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(first).not.toHaveAttribute("data-nested-drawer-open"));
    await expect(first).toBeVisible();
  },
};

export const KeyboardInset: Story = {
  render: () => <KeyboardDemo />,
  play: async () => {
    trigger("입력 서랍 열기").focus();
    await userEvent.keyboard("{Enter}");
    const d = await dialog("메모 입력");
    const footer = d.querySelector("[data-slot='drawer-footer']") as HTMLElement;
    // footer padding reserves --drawer-keyboard-inset (0 without a software keyboard)
    await expect(footer.className).toContain("--drawer-keyboard-inset");
    await userEvent.type(within(d).getByLabelText("메모"), "ok");
    await expect(within(d).getByLabelText("메모")).toHaveValue("ok");
  },
};

export const SwipeArea: Story = {
  render: () => (
    <div lang="ko" className="min-h-40 bg-yorha-panel p-8 text-yorha-fg">
      <Drawer side="right">
        <DrawerSwipeArea data-testid="edge" />
        <DrawerContent>
          <DrawerTitle>가장자리 서랍</DrawerTitle>
        </DrawerContent>
      </Drawer>
    </div>
  ),
  play: async () => {
    const edge = body().getByTestId("edge");
    await expect(edge).toHaveAttribute("data-swipe-direction", "left");
    await expect(edge).toHaveAttribute("data-closed");
  },
};

export const ReducedMotion: Story = {
  render: () => <Demo />,
  play: async () => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    root.setAttribute("data-motion", "reduced");
    try {
      trigger().focus();
      await userEvent.keyboard("{Enter}");
      const d = await dialog();
      // opacity-only fade, no longer than 120ms (spatial travel is 0)
      const [dur] = getComputedStyle(d).transitionDuration.split(",").map(parseFloat);
      await expect(dur).toBeLessThanOrEqual(0.12);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body().queryByRole("dialog")).toBeNull(), { timeout: 400 });
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Themes: Story = {
  render: () => (
    <div lang="ko" className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          <StaticPreview side="bottom" />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("heading", { name: "유닛 목록" })).toHaveLength(THEMES.length);
  },
};

// authentic theme is intentionally low-contrast (faithful palette), so a11y is todo here
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div lang="ko" data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <StaticPreview side="bottom" />
    </div>
  ),
};

/** States: closed trigger and open drawer (focus inside). Targets >= 24px at both densities. */
export const States: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    await expectTargetSize(canvasElement);
    await userEvent.click(trigger());
    const d = await dialog();
    await waitFor(() => expect(d.contains(document.activeElement)).toBe(true));
    await expectTargetSize(d);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("dialog")).toBeNull());
  },
};

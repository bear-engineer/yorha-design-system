import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

const THEMES = ["light", "dark", "high-contrast"] as const;

interface DemoProps {
  onSelect?: (label: string) => void;
  container?: HTMLElement | null;
}

function MenubarDemo({ onSelect, container }: DemoProps) {
  const [grid, setGrid] = useState(true);
  const [zoom, setZoom] = useState("100");
  return (
    <div lang="ko">
      <Menubar aria-label="앱 메뉴">
        <MenubarMenu>
          <MenubarTrigger>파일</MenubarTrigger>
          <MenubarContent container={container}>
            <MenubarGroup>
              <MenubarLabel>문서</MenubarLabel>
              <MenubarItem onClick={() => onSelect?.("새 문서")}>
                새 문서
                <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onClick={() => onSelect?.("열기")}>열기</MenubarItem>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>내보내기</MenubarSubTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => onSelect?.("PDF")}>PDF</MenubarItem>
              </MenubarContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>보기</MenubarTrigger>
          <MenubarContent container={container}>
            <MenubarCheckboxItem checked={grid} onCheckedChange={setGrid}>격자 표시</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarRadioGroup value={zoom} onValueChange={setZoom}>
              <MenubarRadioItem value="100">100%</MenubarRadioItem>
              <MenubarRadioItem value="200">200%</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>도움말</MenubarTrigger>
          <MenubarContent container={container}>
            <MenubarItem onClick={() => onSelect?.("정보")}>정보</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}


/** Page stub under the app-top bar so the bar reads as part of an app. */
function PageStub() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <p className="m-0 font-yorha-mono text-yorha-xs text-yorha-fg-soft">SEC-07 · 기체 목록</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-yorha-border bg-yorha-panel p-3 text-yorha-sm">2B · 정상</div>
        <div className="border border-yorha-border bg-yorha-panel p-3 text-yorha-sm">9S · 점검 중</div>
      </div>
    </div>
  );
}

const meta = {
  title: "컴포넌트/내비게이션/Menubar",
  component: MenubarDemo,
  tags: ["autodocs"],
  args: { onSelect: fn() },
  decorators: [
    (Story) => (
      <div className="min-h-72 w-[720px] max-w-full border border-yorha-border bg-yorha-bg text-yorha-fg">
        <div className="border-b border-yorha-border bg-yorha-panel px-3 py-1">
          <Story />
        </div>
        <PageStub />
      </div>
    ),
  ],
} satisfies Meta<typeof MenubarDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = (el: HTMLElement) => within(el.ownerDocument.body);
const setMotion = (m: string) => {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", m);
  return () => (prev === null ? root.removeAttribute("data-motion") : root.setAttribute("data-motion", prev));
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole("menubar", { name: "앱 메뉴" });
    await expect(within(bar).getAllByRole("menuitem")).toHaveLength(3);
    await userEvent.click(within(bar).getByRole("menuitem", { name: "파일" }));
    const menu = await body(canvasElement).findByRole("menu");
    await expect(within(menu).getAllByRole("menuitem").length).toBeGreaterThanOrEqual(3);
    await waitFor(() => expect(within(menu).getByText("⌘N")).toBeVisible());
  },
};

/** 한 번만 Tab으로 들어가 ←/→로 메뉴 사이를 옮기고, ↓로 열고, Escape로 닫으면 포커스가 돌아옵니다. */
export const KeyboardNavigation: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement, args }) => {
    const bar = within(canvasElement).getByRole("menubar");
    const file = within(bar).getByRole("menuitem", { name: "파일" });
    const view = within(bar).getByRole("menuitem", { name: "보기" });
    await userEvent.tab();
    await expect(file).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(view).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(file).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    const menu = await body(canvasElement).findByRole("menu");
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: /새 문서/ })).toHaveAttribute("data-highlighted"));
    // Arrow right while a menu is open moves to the neighbouring menu (the submenu row is not focused).
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
    await expect(file).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await body(canvasElement).findByRole("menu");
    await waitFor(() => expect(body(canvasElement).getByRole("menuitem", { name: /새 문서/ })).toHaveAttribute("data-highlighted"));
    await waitFor(() => expect(body(canvasElement).getByRole("menuitem", { name: /새 문서/ })).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(args.onSelect).toHaveBeenCalledWith("새 문서"));
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
  },
};

/** 메뉴가 열린 상태에서 다른 트리거에 마우스를 올리면 그 메뉴로 바뀝니다. */
export const SwitchesWhileOpen: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole("menubar");
    await userEvent.click(within(bar).getByRole("menuitem", { name: "파일" }));
    await body(canvasElement).findByRole("menuitem", { name: /새 문서/ });
    await userEvent.hover(within(bar).getByRole("menuitem", { name: "보기" }));
    await body(canvasElement).findByRole("menuitemcheckbox", { name: "격자 표시" });
    await waitFor(() => expect(body(canvasElement).queryByRole("menuitem", { name: /새 문서/ })).toBeNull());
    await expect(within(bar).getByRole("menuitem", { name: "보기" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
  },
};

export const CheckboxAndRadio: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(within(canvasElement).getByRole("menubar")).getByRole("menuitem", { name: "보기" }));
    const menu = await body(canvasElement).findByRole("menu");
    const grid = within(menu).getByRole("menuitemcheckbox", { name: "격자 표시" });
    await expect(grid).toHaveAttribute("aria-checked", "true");
    await userEvent.click(grid);
    await waitFor(() => expect(grid).toHaveAttribute("aria-checked", "false"));
    const two = within(menu).getByRole("menuitemradio", { name: "200%" });
    await userEvent.click(two);
    await waitFor(() => expect(two).toHaveAttribute("aria-checked", "true"));
  },
};

/** 모션을 줄이면 트리거 채움과 팝업이 전환 없이 바뀝니다. */
export const ReducedMotionHasNoTransition: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const restore = setMotion("reduced");
    try {
      const trigger = within(within(canvasElement).getByRole("menubar")).getByRole("menuitem", { name: "파일" });
      await userEvent.click(trigger);
      const menu = await body(canvasElement).findByRole("menu");
      const zero = (el: Element) => getComputedStyle(el).transitionDuration.split(",").every((d) => parseFloat(d) === 0);
      await waitFor(() => {
        expect(zero(trigger)).toBe(true);
        // Popup may fade (opacity only) for at most 120ms; it never travels.
        expect(getComputedStyle(menu).transitionDuration.split(",").every((d) => parseFloat(d) <= 0.12)).toBe(true);
        expect(getComputedStyle(menu).opacity).toBe("1");
      });
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
    } finally {
      restore();
    }
  },
};

/** Light, dark and high-contrast only. Each popup mounts inside its own themed box. */
function ThemedBars() {
  const [hosts, setHosts] = useState<Record<string, HTMLElement | null>>({});
  return (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div
          key={t}
          data-theme={t}
          ref={(el) => {
            if (el && hosts[t] !== el) setHosts((h) => ({ ...h, [t]: el }));
          }}
          className="relative h-72 bg-yorha-panel p-4 text-yorha-fg"
        >
          <span className="block pb-2 text-yorha-sm">{t}</span>
          {hosts[t] ? <MenubarDemo container={hosts[t]} /> : null}
        </div>
      ))}
    </div>
  );
}

export const Themes: Story = {
  render: () => <ThemedBars />,
  play: async ({ canvasElement }) => {
    for (const t of THEMES) {
      const box = canvasElement.querySelector(`[data-theme="${t}"]`) as HTMLElement;
      await waitFor(() => expect(within(box).getByRole("menuitem", { name: "파일" })).toBeVisible());
      if (body(canvasElement).queryByRole("menu")) await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
      await userEvent.click(within(box).getByRole("menuitem", { name: "파일" }));
      const menu = await body(canvasElement).findByRole("menu");
      await expect(box.contains(menu)).toBe(true);
    }
  },
};

/** The authentic theme is a fidelity exercise that fails contrast on purpose, so only this story skips a11y. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <MenubarDemo />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("menubar")).toBeVisible();
  },
};

/** States: closed bar, open menu with checkbox/radio rows. Targets >= 24px at both densities. */
export const States: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    await expectTargetSize(canvasElement);
    await userEvent.click(within(canvasElement).getByRole("menuitem", { name: "보기" }));
    const menu = await body(canvasElement).findByRole("menu");
    await expect(within(menu).getByRole("menuitemcheckbox", { name: "격자 표시" })).toHaveAttribute("aria-checked", "true");
    await expectTargetSize(menu);
    await userEvent.keyboard("{Escape}");
    // Wait out the close transition so the a11y scan never sees Base UI's transient focus guards.
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull(), { timeout: 5000 });
  },
};

const popupMs = (el: Element) =>
  getComputedStyle(el)
    .transitionDuration.split(",")
    .map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000));

/** Menubar popup shares Menu's motion: reduced is an opacity-only fade of at most 120ms with no travel; off is 0. */
export const PopupMotionMatchesMenu: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole("menubar");
    for (const mode of ["reduced", "off"] as const) {
      const restore = setMotion(mode);
      try {
        await userEvent.click(within(bar).getByRole("menuitem", { name: "파일" }));
        const menu = await body(canvasElement).findByRole("menu");
        if (mode === "reduced") {
          // Base UI sets an inline `transition: none` for the first frame.
          await waitFor(() => expect(getComputedStyle(menu).transitionProperty).not.toBe("none"), { timeout: 3000 });
          const max = Math.max(...popupMs(menu));
          expect(max).toBeGreaterThan(0);
          expect(max).toBeLessThanOrEqual(120);
          expect(getComputedStyle(menu).transitionProperty).toContain("opacity");
          expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-spatial").trim()).toBe("0");
        } else {
          expect(Math.max(...popupMs(menu))).toBe(0);
        }
        await userEvent.keyboard("{Escape}");
        await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull(), { timeout: 600 });
      } finally {
        restore();
      }
    }
  },
};

/** V4-170: F10 focuses the first enabled trigger. */
export const F10FocusesBar: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("{F10}");
    const first = canvasElement.querySelector<HTMLElement>('[data-slot="menubar-trigger"]')!;
    await expect(document.activeElement).toBe(first);
  },
};

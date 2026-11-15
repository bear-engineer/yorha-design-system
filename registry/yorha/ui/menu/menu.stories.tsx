import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import {
  Menu,
  MenuArrow,
  MenuCheckboxItem,
  MenuClear,
  MenuContent,
  MenuEmpty,
  MenuFilterProvider,
  MenuGroup,
  MenuInput,
  MenuItem,
  MenuLabel,
  MenuLinkItem,
  MenuList,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
  MenuViewport,
  createMenuHandle,
} from "./menu";

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

interface DemoProps {
  onSelect?: (label: string) => void;
  defaultOpen?: boolean;
  container?: HTMLElement | null;
}

function MenuDemo({ onSelect, defaultOpen, container }: DemoProps) {
  const [autosave, setAutosave] = useState(true);
  const [view, setView] = useState("list");
  return (
    <Menu defaultOpen={defaultOpen}>
      <MenuTrigger>파일 메뉴</MenuTrigger>
      <MenuContent container={container}>
        <MenuGroup>
          <MenuLabel>문서</MenuLabel>
          <MenuItem onClick={() => onSelect?.("새 문서")}>
            새 문서
            <MenuShortcut>⌘N</MenuShortcut>
          </MenuItem>
          <MenuItem onClick={() => onSelect?.("열기")}>
            열기
            <MenuShortcut>⌘O</MenuShortcut>
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuSub>
          <MenuSubTrigger>내보내기</MenuSubTrigger>
          <MenuContent>
            <MenuItem onClick={() => onSelect?.("PDF")}>PDF</MenuItem>
            <MenuItem onClick={() => onSelect?.("이미지")}>이미지</MenuItem>
          </MenuContent>
        </MenuSub>
        <MenuSeparator />
        <MenuCheckboxItem checked={autosave} onCheckedChange={setAutosave}>
          자동 저장
        </MenuCheckboxItem>
        <MenuRadioGroup value={view} onValueChange={setView}>
          <MenuRadioItem value="list">목록 보기</MenuRadioItem>
          <MenuRadioItem value="grid">격자 보기</MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem disabled>휴지통 비우기</MenuItem>
      </MenuContent>
    </Menu>
  );
}

const meta = {
  title: "컴포넌트/오버레이/Menu",
  component: MenuDemo,
  tags: ["autodocs"],
  args: { onSelect: fn() },
  decorators: [
    (Story) => (
      <div className="min-h-72 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = (el: HTMLElement) => within(el.ownerDocument.body);

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "파일 메뉴" });
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    const menu = await body(canvasElement).findByRole("menu");
    await expect(within(menu).getAllByRole("menuitem").length).toBeGreaterThanOrEqual(3);
    await expect(within(menu).getAllByRole("separator").length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(within(menu).getByText("⌘N")).toBeVisible());
  },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "파일 메뉴" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const menu = await body(canvasElement).findByRole("menu");
    const first = within(menu).getByRole("menuitem", { name: /새 문서/ });
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"), { timeout: 5000 });
    await waitFor(() => expect(first).toHaveFocus(), { timeout: 5000 });
    await userEvent.keyboard("{ArrowDown}");
    const second = within(menu).getByRole("menuitem", { name: /열기/ });
    await waitFor(() => expect(second).toHaveAttribute("data-highlighted"), { timeout: 5000 });
    await expect(first).not.toHaveAttribute("data-highlighted");
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"), { timeout: 5000 });
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(args.onSelect).toHaveBeenCalledWith("열기");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull(), { timeout: 5000 });
    await expect(trigger).toHaveFocus();
  },
};

export const EscapeReturnsFocus: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "파일 메뉴" });
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    await body(canvasElement).findByRole("menu");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

export const Submenu: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const menu = await body(canvasElement).findByRole("menu");
    const sub = within(menu).getByRole("menuitem", { name: "내보내기" });
    await expect(sub).toHaveAttribute("aria-haspopup", "menu");
    // Rows: 새 문서, 열기, 내보내기
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: /새 문서/ })).toHaveFocus(), { timeout: 5000 });
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: /열기/ })).toHaveAttribute("data-highlighted"), { timeout: 5000 });
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(sub).toHaveAttribute("data-highlighted"), { timeout: 5000 });
    await userEvent.keyboard("{ArrowRight}");
    const pdf = await body(canvasElement).findByRole("menuitem", { name: "PDF" });
    await waitFor(() => expect(pdf).toHaveFocus(), { timeout: 5000 });
    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menuitem", { name: "PDF" })).toBeNull(), { timeout: 5000 });
    await waitFor(() => expect(sub).toHaveFocus(), { timeout: 5000 });
    await userEvent.keyboard("{ArrowRight}");
    const again = await body(canvasElement).findByRole("menuitem", { name: "PDF" });
    await waitFor(() => expect(again).toHaveFocus(), { timeout: 5000 });
    await userEvent.keyboard("{Enter}");
    await expect(args.onSelect).toHaveBeenCalledWith("PDF");
    // Wait out the close transition so the a11y scan never sees Base UI's transient focus guards.
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull(), { timeout: 5000 });
  },
};

export const CheckboxAndRadio: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "파일 메뉴" }));
    const menu = await body(canvasElement).findByRole("menu");
    const autosave = within(menu).getByRole("menuitemcheckbox", { name: "자동 저장" });
    await expect(autosave).toHaveAttribute("aria-checked", "true");
    const grid = within(menu).getByRole("menuitemradio", { name: "격자 보기" });
    const list = within(menu).getByRole("menuitemradio", { name: "목록 보기" });
    await expect(list).toHaveAttribute("aria-checked", "true");
    await expect(grid).toHaveAttribute("aria-checked", "false");
    await userEvent.click(autosave);
    await waitFor(() => expect(autosave).toHaveAttribute("aria-checked", "false"));
    await userEvent.click(grid);
    await waitFor(() => expect(grid).toHaveAttribute("aria-checked", "true"));
    await expect(list).toHaveAttribute("aria-checked", "false");
  },
};

export const SelectedRowLook: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const menu = await body(canvasElement).findByRole("menu");
    const row = within(menu).getByRole("menuitem", { name: /새 문서/ });
    await waitFor(() => expect(row).toHaveAttribute("data-highlighted"));
    // Highlighted row inverts: text takes the on-ink colour, fill is the ink gradient.
    await waitFor(() => expect(getComputedStyle(row).backgroundSize).toContain("100%"));
    await expect(getComputedStyle(row).backgroundImage).toContain("gradient");
  },
};

/** Light, dark and high-contrast only. Each menu mounts its popup inside its own themed box. */
function ThemedMenus() {
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
          className="relative h-96 bg-yorha-panel p-4 text-yorha-fg"
        >
          <span className="text-yorha-sm">{t}</span>
          {hosts[t] ? <MenuDemo container={hosts[t]} /> : null}
        </div>
      ))}
    </div>
  );
}

export const Themes: Story = {
  render: () => <ThemedMenus />,
  // Opens each themed menu in turn (Base UI keeps one modal menu open at a time); the last stays open for the a11y scan.
  play: async ({ canvasElement }) => {
    for (const t of THEMES) {
      const box = canvasElement.querySelector(`[data-theme="${t}"]`) as HTMLElement;
      await waitFor(() => expect(within(box).getByRole("button", { name: "파일 메뉴" })).toBeVisible());
      if (body(canvasElement).queryByRole("menu")) await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
      await userEvent.click(within(box).getByRole("button", { name: "파일 메뉴" }));
      const menu = await body(canvasElement).findByRole("menu");
      await expect(box.contains(menu)).toBe(true);
    }
  },
};

/** The authentic theme is a fidelity exercise that fails contrast on purpose, so only this story skips a11y. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => {
    return (
      <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
        <MenuDemo />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "파일 메뉴" })).toBeVisible();
  },
};

function FilterDemo() {
  return (
    <MenuFilterProvider>
      <Menu>
        <MenuTrigger>명령 검색</MenuTrigger>
        <MenuContent>
          <MenuInput aria-label="명령 필터" placeholder="검색" />
          <MenuClear aria-label="필터 지우기">지우기</MenuClear>
          <MenuEmpty>일치하는 명령이 없다.</MenuEmpty>
          <MenuList>
            <MenuItem>이름 바꾸기</MenuItem>
            <MenuItem>복제</MenuItem>
            <MenuItem>삭제</MenuItem>
            <MenuLinkItem href="#projects">프로젝트로 이동</MenuLinkItem>
          </MenuList>
        </MenuContent>
      </Menu>
    </MenuFilterProvider>
  );
}

export const Filterable: Story = {
  render: () => <FilterDemo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "명령 검색" }));
    const menu = await body(canvasElement).findByRole("menu");
    await expect(within(menu).getAllByRole("menuitem")).toHaveLength(4);
    // the link row is a real anchor with the menuitem role
    await expect(within(menu).getByRole("menuitem", { name: "프로젝트로 이동" })).toHaveAttribute("href", "#projects");
    const input = body(canvasElement).getByLabelText("명령 필터");
    await userEvent.type(input, "삭");
    await waitFor(() => expect(within(menu).getAllByRole("menuitem")).toHaveLength(1));
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: "삭제" })).toBeVisible());
    // no match shows the empty message
    await userEvent.clear(input);
    await userEvent.type(input, "zzz");
    await waitFor(() => expect(within(menu).queryAllByRole("menuitem")).toHaveLength(0));
    await waitFor(() => expect(body(canvasElement).getByText("일치하는 명령이 없다.")).toBeVisible());
    // clear is pointer-only (Base UI hides it from the a11y tree); it restores every row
    await userEvent.click(body(canvasElement).getByText("지우기"));
    await waitFor(() => expect(within(menu).getAllByRole("menuitem")).toHaveLength(4));
  },
};

const shared = createMenuHandle<string>();

/** Two triggers, one popup (handle). Backdrop dims, Arrow points at the trigger, Viewport cross-fades rows. */
function SharedDemo() {
  return (
    <div className="flex min-h-48 items-start gap-3">
      <MenuTrigger handle={shared} payload="편집">
        편집
      </MenuTrigger>
      <MenuTrigger handle={shared} payload="보기">
        보기
      </MenuTrigger>
      <Menu handle={shared}>
        {({ payload }) => (
          <MenuContent backdrop>
            <MenuArrow />
            <MenuViewport>
              <MenuItem>{String(payload)} 항목 1</MenuItem>
              <MenuItem>{String(payload)} 항목 2</MenuItem>
            </MenuViewport>
          </MenuContent>
        )}
      </Menu>
    </div>
  );
}

export const SharedMenu: Story = {
  render: () => <SharedDemo />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "편집" });
    await userEvent.click(trigger);
    const menu = await body(canvasElement).findByRole("menu");
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: "편집 항목 1" })).toBeVisible());
    await expect(menu.querySelector("[data-slot=menu-arrow]")).not.toBeNull();
    await expect(document.querySelector("[data-slot=menu-backdrop]")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    // The fading scrim must not keep eating clicks: 50ms after Esc the trigger is the hit target again.
    await new Promise((r) => setTimeout(r, 50));
    const box = trigger.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    await expect(hit === trigger || trigger.contains(hit)).toBe(true);
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
  },
};

export const ReducedMotion: Story = {
  render: () => <SharedDemo />,
  play: async ({ canvasElement }) => {
    for (const mode of ["reduced", "off"] as const) {
      await inMotion(mode, async () => {
        await userEvent.click(within(canvasElement).getByRole("button", { name: "편집" }));
        const menu = await screen.findByRole("menu");
        const backdrop = document.querySelector("[data-slot=menu-backdrop]")!;
        for (const el of [menu, backdrop]) await (mode === "reduced" ? expectReduced : expectOff)(el);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull(), { timeout: 600 });
      });
    }
  },
};

/** States: closed trigger, open menu with highlighted, checked, radio and disabled rows. Targets >= 24px at both densities. */
export const States: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "파일 메뉴" });
    await expectTargetSize(canvasElement);
    await userEvent.click(trigger);
    const menu = await body(canvasElement).findByRole("menu");
    await expect(within(menu).getByRole("menuitem", { name: "휴지통 비우기" })).toHaveAttribute("aria-disabled", "true");
    await expect(within(menu).getByRole("menuitemcheckbox", { name: "자동 저장" })).toHaveAttribute("aria-checked", "true");
    await expectTargetSize(menu);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
  },
};

/** Filterable menu: input, clear and rows are all >= 24px. */
export const StatesFilterable: Story = {
  render: () => <FilterDemo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "명령 검색" }));
    const menu = await body(canvasElement).findByRole("menu");
    await userEvent.type(body(canvasElement).getByLabelText("명령 필터"), "삭");
    await waitFor(() => expect(within(menu).getAllByRole("menuitem")).toHaveLength(1));
    await expectTargetSize(menu);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull(), { timeout: 5000 });
  },
};

/** V4-169: `shortcut` renders a KbdCombo and sets `aria-keyshortcuts` (display only; bind the key yourself with `useShortcut`). */
export const Shortcuts: Story = {
  render: () => (
    <Menu>
      <MenuTrigger>파일</MenuTrigger>
      <MenuContent>
        <MenuItem shortcut="mod+S">저장</MenuItem>
        <MenuItem shortcut="mod+shift+S">다른 이름으로 저장</MenuItem>
        <MenuItem>닫기</MenuItem>
      </MenuContent>
    </Menu>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "파일" }));
    const menu = await body(canvasElement).findByRole("menu");
    const save = within(menu).getAllByRole("menuitem", { name: /저장/ })[0]!;
    await expect(save.getAttribute("aria-keyshortcuts")).toMatch(/^(Meta|Control)\+S$/);
    await expect(menu.querySelectorAll('[data-slot="kbd-combo"]')).toHaveLength(2);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull(), { timeout: 5000 });
  },
};

/** V4-166 + V4-173: a long menu scrolls inside the available height with a bottom rule until the end; the arrow is a pixel triangle. */
export const LongWithArrow: Story = {
  render: () => (
    <Menu>
      <MenuTrigger>긴 목록</MenuTrigger>
      <MenuContent>
        <MenuArrow />
        {Array.from({ length: 40 }, (_, i) => (
          <MenuItem key={i}>항목 {i + 1}</MenuItem>
        ))}
      </MenuContent>
    </Menu>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "긴 목록" }));
    const menu = await body(canvasElement).findByRole("menu");
    const scroll = menu.querySelector<HTMLElement>('[data-slot="menu-scroll"]')!;
    await expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
    await expect(menu.querySelector('[data-slot="menu-arrow"] svg')).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull(), { timeout: 5000 });
  },
};

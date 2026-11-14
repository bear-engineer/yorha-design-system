import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
} from "./menu";

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
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{ArrowDown}");
    const second = within(menu).getByRole("menuitem", { name: /열기/ });
    await waitFor(() => expect(second).toHaveAttribute("data-highlighted"));
    await expect(first).not.toHaveAttribute("data-highlighted");
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(first).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(args.onSelect).toHaveBeenCalledWith("열기");
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
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
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: /새 문서/ })).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await waitFor(() => expect(sub).toHaveAttribute("data-highlighted"));
    await userEvent.keyboard("{ArrowRight}");
    const pdf = await body(canvasElement).findByRole("menuitem", { name: "PDF" });
    await waitFor(() => expect(pdf).toHaveFocus());
    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(body(canvasElement).queryByRole("menuitem", { name: "PDF" })).toBeNull());
    await waitFor(() => expect(sub).toHaveFocus());
    await userEvent.keyboard("{ArrowRight}");
    const again = await body(canvasElement).findByRole("menuitem", { name: "PDF" });
    await waitFor(() => expect(again).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await expect(args.onSelect).toHaveBeenCalledWith("PDF");
    // Wait out the close transition so the a11y scan never sees Base UI's transient focus guards.
    await waitFor(() => expect(body(canvasElement).queryByRole("menu")).toBeNull());
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
  parameters: { a11y: { test: "todo" } },
  render: () => {
    return (
      <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
        <MenuDemo />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "파일 메뉴" })).toBeVisible();
  },
};

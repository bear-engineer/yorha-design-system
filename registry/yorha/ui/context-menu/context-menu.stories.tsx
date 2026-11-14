import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuLinkItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  contextMenuStyles,
} from "./context-menu";

const THEMES = ["light", "dark", "high-contrast"] as const;

interface DemoProps {
  onSelect?: (label: string) => void;
  defaultOpen?: boolean;
}

function Demo({ onSelect, defaultOpen }: DemoProps) {
  const [pinned, setPinned] = useState(true);
  const [sort, setSort] = useState("name");
  return (
    <div lang="ko" className="min-h-64 bg-yorha-panel p-8 text-yorha-fg">
      <ContextMenu defaultOpen={defaultOpen}>
        <ContextMenuTrigger
          aria-label="유닛 카드"
          className="grid h-32 place-items-center border border-dashed border-yorha-border text-yorha-sm"
        >
          우클릭 또는 Shift+F10
        </ContextMenuTrigger>
        <ContextMenuContent arrow>
          <ContextMenuGroup>
            <ContextMenuLabel>유닛</ContextMenuLabel>
            <ContextMenuItem onClick={() => onSelect?.("복제")}>
              복제
              <ContextMenuShortcut>⌘D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuLinkItem href="#detail">상세 보기</ContextMenuLinkItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>이동</ContextMenuSubTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onSelect?.("격납고")}>격납고</ContextMenuItem>
              <ContextMenuItem onClick={() => onSelect?.("벙커")}>벙커</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenuSub>
          <ContextMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>
            고정
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
            <ContextMenuRadioItem value="name">이름순</ContextMenuRadioItem>
            <ContextMenuRadioItem value="date">날짜순</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuItem disabled>삭제</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

/** Static look per theme (portaled popups are not opened side by side). */
function StaticPreview() {
  return (
    <div className={`${contextMenuStyles.popup} relative`}>
      <div className={contextMenuStyles.label}>유닛</div>
      <div className={contextMenuStyles.item}>복제</div>
      <div className={contextMenuStyles.separator} />
      <div data-highlighted className={contextMenuStyles.item}>
        이동
      </div>
    </div>
  );
}

const body = () => within(document.body);
const area = () => body().getByLabelText("유닛 카드");
const menu = async () => {
  const m = await body().findByRole("menu");
  await waitFor(() => expect(m).toBeVisible());
  return m;
};

const meta = {
  title: "컴포넌트/오버레이/ContextMenu",
  component: Demo,
  tags: ["autodocs"],
  args: { onSelect: fn() },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ args }) => {
    await expect(body().queryByRole("menu")).toBeNull();
    await userEvent.pointer({ keys: "[MouseRight]", target: area() });
    const m = await menu();
    await expect(within(m).getAllByRole("menuitem").length).toBeGreaterThan(2);
    await userEvent.click(within(m).getByRole("menuitem", { name: /복제/ }));
    await expect(args.onSelect).toHaveBeenCalledWith("복제");
    await waitFor(() => expect(body().queryByRole("menu")).toBeNull());
  },
};

export const ShiftF10Opens: Story = {
  render: (args) => <Demo {...args} />,
  play: async () => {
    area().focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    const m = await menu();
    // arrows move the selected row; Escape closes and focus returns to the trigger area
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(within(m).getAllByRole("menuitem").some((i) => i.hasAttribute("data-highlighted"))).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("menu")).toBeNull());
    await waitFor(() => expect(area()).toHaveFocus());
  },
};

export const ContextMenuKeyOpens: Story = {
  render: (args) => <Demo {...args} />,
  play: async () => {
    area().focus();
    await userEvent.keyboard("{ContextMenu}");
    await menu();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("menu")).toBeNull());
  },
};

export const Submenu: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ args }) => {
    area().focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    const m = await menu();
    const sub = within(m).getByRole("menuitem", { name: "이동" });
    sub.focus();
    await userEvent.keyboard("{ArrowRight}");
    const item = await body().findByRole("menuitem", { name: "벙커" });
    await userEvent.click(item);
    await expect(args.onSelect).toHaveBeenCalledWith("벙커");
  },
};

export const CheckboxAndRadio: Story = {
  render: (args) => <Demo {...args} />,
  play: async () => {
    area().focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    const m = await menu();
    const pin = within(m).getByRole("menuitemcheckbox", { name: "고정" });
    await expect(pin).toHaveAttribute("aria-checked", "true");
    await userEvent.click(pin);
    await waitFor(() => expect(within(document.body).getByRole("menuitemcheckbox", { name: "고정" })).toHaveAttribute("aria-checked", "false"));
  },
};

export const ReducedMotion: Story = {
  render: (args) => <Demo {...args} />,
  play: async () => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    root.setAttribute("data-motion", "reduced");
    try {
      area().focus();
      await userEvent.keyboard("{Shift>}{F10}{/Shift}");
      const m = await menu();
      const [dur] = getComputedStyle(m).transitionDuration.split(",").map(parseFloat);
      await expect(dur).toBeLessThanOrEqual(0.12);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body().queryByRole("menu")).toBeNull(), { timeout: 400 });
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
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <StaticPreview />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("복제")).toHaveLength(THEMES.length);
  },
};

// authentic theme is intentionally low-contrast (faithful palette), so a11y is todo here
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div lang="ko" data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <StaticPreview />
    </div>
  ),
};

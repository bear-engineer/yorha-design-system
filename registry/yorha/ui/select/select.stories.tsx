import { expectTargetSize } from "../../../../.storybook/preview";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const UNITS = [
  { value: "archive", label: "Archive" },
  { value: "bunker", label: "Bunker" },
  { value: "command", label: "Command" },
  { value: "desert", label: "Desert" },
  { value: "factory", label: "Factory" },
];

interface DemoProps {
  disabled?: boolean;
  defaultValue?: string;
  onValueChange?: (value: string | null) => void;
}

function Demo({ disabled, defaultValue, onValueChange }: DemoProps) {
  return (
    <div className="w-72 max-w-full bg-yorha-panel p-6 text-yorha-fg">
      <Select items={UNITS} disabled={disabled} defaultValue={defaultValue} onValueChange={onValueChange}>
        <SelectTrigger aria-label="유닛 선택">
          <SelectValue placeholder="유닛을 선택" />
        </SelectTrigger>
        <SelectContent>
          {UNITS.map((u) => (
            <SelectItem key={u.value} value={u.value} disabled={u.value === "command"}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GroupedDemo() {
  return (
    <div className="w-72 max-w-full bg-yorha-panel p-6 text-yorha-fg">
      <Select items={UNITS}>
        <SelectTrigger aria-label="유닛 선택">
          <SelectValue placeholder="유닛을 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectGroupLabel>지상</SelectGroupLabel>
            <SelectItem value="bunker">Bunker</SelectItem>
            <SelectItem value="desert">Desert</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectGroupLabel>시설</SelectGroupLabel>
            <SelectItem value="archive">Archive</SelectItem>
            <SelectItem value="factory">Factory</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

const meta = {
  title: "컴포넌트/폼/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const trigger = () => body().getByRole("combobox", { name: "유닛 선택" });
const listbox = async () => {
  const list = await body().findByRole("listbox");
  // popup fades in; wait for the final opacity before asserting visibility / axe runs
  await waitFor(() => expect(list).toBeVisible());
  return list;
};
const highlighted = () => body().getAllByRole("option").findIndex((o) => o.hasAttribute("data-highlighted"));
const optionNames = () => body().getAllByRole("option").map((o) => o.textContent?.trim());

export const Default: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    await expect(t).toHaveAttribute("aria-expanded", "false");
    await expect(t).toHaveTextContent("유닛을 선택");
    await expect(body().queryByRole("listbox")).toBeNull();
    // 키보드로 열기
    t.focus();
    await userEvent.keyboard("{Enter}");
    const list = await listbox();
    await expect(list).toBeVisible();
    await expect(t).toHaveAttribute("aria-expanded", "true");
    // 팝업은 포털에 렌더링된다
    await expect(list.closest("[data-yorha-select-popup]")).not.toBeNull();
    await expect(document.body.contains(list)).toBe(true);
    await expect(t.parentElement?.contains(list)).toBe(false);
    await expect(body().getAllByRole("option")).toHaveLength(5);
  },
};

export const KeyboardNavigation: Story = {
  render: () => <Demo />,
  play: async () => {
    const t = trigger();
    t.focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    await waitFor(() => expect(highlighted()).toBeGreaterThanOrEqual(0));
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(highlighted()).toBe(0));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(1));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(2));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(optionNames()[highlighted()]).toBe("Desert"));
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(highlighted()).toBe(2));
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(optionNames()[highlighted()]).toBe("Bunker"));
    // 하이라이트된 행은 YoRHa 선택 행 표식(화살표 커서, 사각 불릿)을 가진다
    const row = body().getAllByRole("option")[highlighted()]!;
    await expect(row.querySelector("[data-yorha-cursor]")).not.toBeNull();
    await expect(row.querySelector("[data-yorha-bullet]")).not.toBeNull();
  },
};

export const SelectWithEnter: Story = {
  args: {},
  render: () => {
    return <Demo onValueChange={(v) => ((window as unknown as { __selected?: unknown }).__selected = v)} />;
  },
  play: async () => {
    const t = trigger();
    t.focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(highlighted()).toBe(0));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(optionNames()[highlighted()]).toBe("Bunker"));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
    await expect(t).toHaveTextContent("Bunker");
    await expect(t).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(t).toHaveFocus());
    await expect((window as unknown as { __selected?: unknown }).__selected).toBe("bunker");
    // 다시 열면 선택 항목에 불릿이 표시된다
    await userEvent.keyboard("{Enter}");
    await listbox();
    const selected = body().getByRole("option", { name: "Bunker" });
    await expect(selected).toHaveAttribute("aria-selected", "true");
  },
};

export const EscapeReturnsFocus: Story = {
  render: () => <Demo defaultValue="factory" />,
  play: async () => {
    const t = trigger();
    await expect(t).toHaveTextContent("Factory");
    t.focus();
    await userEvent.keyboard("{Enter}");
    await listbox();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
    await waitFor(() => expect(t).toHaveFocus());
    // 값은 바뀌지 않는다
    await expect(t).toHaveTextContent("Factory");
  },
};

export const Typeahead: Story = {
  render: () => <Demo />,
  play: async () => {
    trigger().focus();
    await userEvent.keyboard("{Enter}");
    await listbox();
    await userEvent.keyboard("d");
    await waitFor(() => expect(optionNames()[highlighted()]).toBe("Desert"));
    // 타입어헤드 버퍼가 비도록 닫았다 다시 연다
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
    await userEvent.keyboard("{Enter}");
    await listbox();
    await userEvent.keyboard("f");
    await waitFor(() => expect(optionNames()[highlighted()]).toBe("Factory"));
  },
};

export const DisabledItems: Story = {
  render: () => <Demo />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
    const command = body().getByRole("option", { name: "Command" });
    await expect(command).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(command);
    await expect(body().queryByRole("listbox")).not.toBeNull();
    await expect(trigger()).toHaveTextContent("유닛을 선택");
    // 키보드로 비활성 항목에 올라가 Enter 를 눌러도 선택되지 않는다
    await userEvent.keyboard("{Home}");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await waitFor(() => expect(optionNames()[highlighted()]).toBe("Command"));
    await userEvent.keyboard("{Enter}");
    await expect(trigger()).toHaveTextContent("유닛을 선택");
  },
};

export const Grouped: Story = {
  render: () => <GroupedDemo />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
    const groups = body().getAllByRole("group");
    await expect(groups).toHaveLength(2);
    await waitFor(() => expect(body().getByText("지상")).toBeVisible());
    await expect(body().getByText("시설")).toBeVisible();
    await expect(groups[0]).toHaveAccessibleName("지상");
  },
};

export const Disabled: Story = {
  render: () => <Demo disabled />,
  play: async () => {
    const t = trigger();
    await expect(t).toBeDisabled();
    await userEvent.click(t, { pointerEventsCheck: 0 });
    await expect(body().queryByRole("listbox")).toBeNull();
  },
};

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <Demo defaultValue="bunker" />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => <Demo defaultValue="bunker" />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
  },
};

export const HighContrast: Story = {
  globals: { theme: "high-contrast" },
  render: () => <Demo defaultValue="bunker" />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // authentic 테마는 원작 색감 재현이 목적이라 대비 기준을 일부러 낮춘다: a11y 는 todo.
  parameters: { a11y: { test: "todo" } },
  globals: { theme: "authentic" },
  render: () => <Demo defaultValue="bunker" />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
  },
};

const MANY = Array.from({ length: 40 }, (_, i) => ({ value: `u${i + 1}`, label: `Unit ${String(i + 1).padStart(2, "0")}` }));

/** Label, Arrow, Backdrop, scroll arrows (40 rows) and the item indicator of the selected row. */
function PartsDemo() {
  return (
    <div className="w-72 max-w-full bg-yorha-panel p-6 text-yorha-fg">
      <Select items={MANY} defaultValue="u3">
        <SelectLabel className="mb-1 block">유닛 목록</SelectLabel>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent backdrop arrow className="max-h-48">
          {MANY.map((u) => (
            <SelectItem key={u.value} value={u.value}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const AllParts: Story = {
  render: () => <PartsDemo />,
  play: async () => {
    await userEvent.click(body().getByRole("combobox", { name: "유닛 목록" }));
    const list = await listbox();
    await waitFor(() => expect(document.querySelector("[data-slot=select-backdrop]")).not.toBeNull());
    await expect(document.querySelector("[data-slot=select-arrow]")).not.toBeNull();
    await expect(document.querySelector("[data-slot=select-label]")).not.toBeNull();
    // selected row shows its indicator, others do not
    const selected = within(list).getByRole("option", { name: /Unit 03/ });
    await expect(selected.querySelector("[data-slot=select-item-indicator]")).not.toBeNull();
    await expect(within(list).getByRole("option", { name: /Unit 04/ }).querySelector("[data-slot=select-item-indicator]")).toBeNull();
    // 40 rows overflow the popup: the down arrow appears
    await waitFor(() => expect(document.querySelector("[data-slot=select-scroll-down-arrow][data-visible]")).not.toBeNull());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
  },
};

export const ReducedMotion: Story = {
  render: () => <PartsDemo />,
  play: async () => {
    for (const mode of ["reduced", "off"] as const) {
      await inMotion(mode, async () => {
        await userEvent.click(body().getByRole("combobox", { name: "유닛 목록" }));
        const list = await screen.findByRole("listbox");
        const popup = list.closest("[data-yorha-select-popup]")!;
        await waitFor(() => expect(document.querySelector("[data-slot=select-backdrop]")).not.toBeNull());
        const backdrop = document.querySelector("[data-slot=select-backdrop]")!;
        for (const el of [popup, backdrop]) await (mode === "reduced" ? expectReduced : expectOff)(el);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull(), { timeout: 600 });
      });
    }
  },
};

/** State matrix: default, disabled, open (rows incl. a disabled one). Targets stay >= 24px in both densities. */
export const States: Story = {
  render: () => (
    <div className="flex w-72 max-w-full flex-col gap-3 bg-yorha-panel p-6 text-yorha-fg">
      <Select items={UNITS}>
        <SelectTrigger aria-label="기본">
          <SelectValue placeholder="기본" />
        </SelectTrigger>
        <SelectContent>
          {UNITS.map((u) => (
            <SelectItem key={u.value} value={u.value} disabled={u.value === "command"}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select items={UNITS} disabled>
        <SelectTrigger aria-label="비활성">
          <SelectValue placeholder="비활성" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="archive">Archive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("combobox", { name: "비활성" })).toBeDisabled();
    const t = c.getByRole("combobox", { name: "기본" });
    await expectTargetSize(canvasElement);
    t.focus();
    await userEvent.keyboard("{Enter}");
    const list = await listbox();
    await expect(t).toHaveAttribute("aria-expanded", "true");
    await expect(body().getByRole("option", { name: "Command" })).toHaveAttribute("aria-disabled", "true");
    await expectTargetSize(list.closest<HTMLElement>("[data-yorha-select-popup]") ?? (list as HTMLElement));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(t).toHaveFocus());
  },
};

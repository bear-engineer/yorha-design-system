import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="w-72 bg-yorha-panel p-6 text-yorha-fg">
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
    <div className="w-72 bg-yorha-panel p-6 text-yorha-fg">
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
const listbox = () => body().findByRole("listbox");
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
    // ArrowDown 은 비활성 항목(Command)을 건너뛴다
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(highlighted()).toBe(0));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(1));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(optionNames()[highlighted()]).toBe("Desert"));
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
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(highlighted()).toBe(0));
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
  },
};

export const Grouped: Story = {
  render: () => <GroupedDemo />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
    const groups = body().getAllByRole("group");
    await expect(groups).toHaveLength(2);
    await expect(body().getByText("지상")).toBeVisible();
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
  // authentic 테마는 원작 색감 재현이 목적이라 대비 기준을 일부러 낮춘다: a11y 는 todo.
  parameters: { a11y: { test: "todo" } },
  globals: { theme: "authentic" },
  render: () => <Demo defaultValue="bunker" />,
  play: async () => {
    await userEvent.click(trigger());
    await listbox();
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  Autocomplete,
  AutocompleteClear,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteSeparator,
  AutocompleteStatus,
  AutocompleteTrigger,
} from "./autocomplete";

const UNITS = ["Archive", "Bunker", "Command", "Desert", "Factory", "사막 구역", "벙커"];
const GROUPS = [
  { value: "지상", items: ["Bunker", "Desert"] },
  { value: "시설", items: ["Archive", "Factory"] },
];

interface DemoProps {
  onValueChange?: (value: string) => void;
  autoHighlight?: boolean;
  grouped?: boolean;
  disabled?: boolean;
}

function Demo({ onValueChange, autoHighlight, grouped, disabled }: DemoProps) {
  return (
    <div lang="ko" className="w-72 bg-yorha-panel p-6 text-yorha-fg">
      <Autocomplete
        items={(grouped ? GROUPS : UNITS) as never}
        onValueChange={onValueChange}
        autoHighlight={autoHighlight}
        disabled={disabled}
      >
        <AutocompleteInputGroup>
          <AutocompleteInput aria-label="유닛 검색" placeholder="유닛 검색" />
          <AutocompleteClear />
          <AutocompleteTrigger />
        </AutocompleteInputGroup>
        <AutocompleteContent>
          <AutocompleteEmpty>일치하는 유닛이 없습니다</AutocompleteEmpty>
          <AutocompleteList>
            {grouped
              ? (group: (typeof GROUPS)[number]) => (
                  <AutocompleteGroup key={group.value} items={group.items}>
                    <AutocompleteGroupLabel>{group.value}</AutocompleteGroupLabel>
                    {group.items.map((u) => (
                      <AutocompleteItem key={u} value={u}>
                        {u}
                      </AutocompleteItem>
                    ))}
                  </AutocompleteGroup>
                )
              : (u: string) => (
                  <AutocompleteItem key={u} value={u}>
                    {u}
                  </AutocompleteItem>
                )}
          </AutocompleteList>
          <AutocompleteSeparator />
          <AutocompleteStatus className="sr-only" />
        </AutocompleteContent>
      </Autocomplete>
    </div>
  );
}

const meta = {
  title: "컴포넌트/폼/Autocomplete",
  component: Autocomplete,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Autocomplete>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const input = () => body().getByRole("combobox", { name: "유닛 검색" }) as HTMLInputElement;
const options = () => body().queryAllByRole("option");
const names = () => options().map((o) => o.textContent?.trim());
const highlighted = () => options().findIndex((o) => o.hasAttribute("data-highlighted"));
const listbox = async () => {
  const list = await body().findByRole("listbox");
  await waitFor(() => expect(list).toBeVisible());
  return list;
};

export const Default: Story = {
  render: () => <Demo />,
  play: async () => {
    await expect(input()).toHaveAttribute("aria-expanded", "false");
    await expect(body().queryByRole("listbox")).toBeNull();
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    const list = await listbox();
    await expect(input()).toHaveAttribute("aria-expanded", "true");
    // popup lives in a portal; options carry the YoRHa row markers
    await expect(list.closest("[data-yorha-autocomplete-popup]")).not.toBeNull();
    await expect(body().getAllByRole("option")).toHaveLength(UNITS.length);
    const row = options()[0]!;
    await expect(row.querySelector("[data-yorha-cursor]")).not.toBeNull();
    await expect(row.querySelector("[data-yorha-bullet]")).not.toBeNull();
  },
};

export const TypingFilters: Story = {
  render: () => <Demo />,
  play: async () => {
    await userEvent.click(input());
    await userEvent.type(input(), "ar");
    await listbox();
    await waitFor(() => expect(names()).toEqual(["Archive"]));
    await userEvent.clear(input());
    await userEvent.type(input(), "벙");
    await waitFor(() => expect(names()).toEqual(["벙커"]));
  },
};

export const KeyboardNavigation: Story = {
  render: () => <Demo />,
  play: async () => {
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    // first ArrowDown only opens the popup; nothing is highlighted yet
    await expect(highlighted()).toBe(-1);
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(0));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(1));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(2));
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(names()[highlighted()]).toBe("Bunker"));
    // input keeps DOM focus; the row is referenced through aria-activedescendant
    await expect(input()).toHaveFocus();
    await expect(input().getAttribute("aria-activedescendant")).toBe(options()[highlighted()]!.id);
  },
};

export const EnterSelects: Story = {
  render: () => <Demo onValueChange={(v) => ((window as unknown as { __v?: string }).__v = v)} />,
  play: async () => {
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await waitFor(() => expect(names()[highlighted()]).toBe("Bunker"));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
    await expect(input()).toHaveValue("Bunker");
    await expect((window as unknown as { __v?: string }).__v).toBe("Bunker");
  },
};

export const EscapeCloses: Story = {
  render: () => <Demo />,
  play: async () => {
    await userEvent.click(input());
    await userEvent.type(input(), "d");
    await listbox();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
    await expect(input()).toHaveFocus();
  },
};

export const EmptyState: Story = {
  render: () => <Demo />,
  play: async () => {
    await userEvent.click(input());
    await userEvent.type(input(), "zzz");
    await waitFor(() => expect(body().getByText("일치하는 유닛이 없습니다")).toBeVisible());
    await expect(options()).toHaveLength(0);
    await expect(input()).toHaveAttribute("data-list-empty");
  },
};

export const Grouped: Story = {
  render: () => <Demo grouped />,
  play: async () => {
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    const groups = within(await listbox()).getAllByRole("group");
    await expect(groups).toHaveLength(2);
    await expect(groups[0]).toHaveAccessibleName("지상");
  },
};

/** IME: Enter that confirms a composition must not choose the highlighted row. */
export const ImeDoesNotCommit: Story = {
  render: () => <Demo autoHighlight onValueChange={(v) => ((window as unknown as { __ime?: string[] }).__ime = [...((window as unknown as { __ime?: string[] }).__ime ?? []), v])} />,
  play: async () => {
    (window as unknown as { __ime?: string[] }).__ime = [];
    const el = input();
    el.focus();
    // highlight a row first, then start composing: an unguarded Enter would choose it
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await listbox();
    await waitFor(() => expect(highlighted()).toBeGreaterThanOrEqual(0));
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, isComposing: true, bubbles: true, cancelable: true }));
    await expect((window as unknown as { __ime?: string[] }).__ime).toEqual([]);
    await expect(el).toHaveValue("");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, "ㅅ");
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ㅅ", inputType: "insertCompositionText", isComposing: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, isComposing: true, bubbles: true, cancelable: true }));
    await expect((window as unknown as { __ime?: string[] }).__ime).toEqual([]);
    await expect(el).toHaveValue("ㅅ");
    // composition ends with the committed syllables; the list filters on the final text
    setter.call(el, "사막");
    el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "사막" }));
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "사막", inputType: "insertText" }));
    await waitFor(() => expect(names()).toEqual(["사막 구역"]));
    // compositionend itself does not select
    await expect((window as unknown as { __ime?: string[] }).__ime).not.toContain("사막 구역");
  },
};

export const Disabled: Story = {
  render: () => <Demo disabled />,
  play: async () => {
    await expect(input()).toBeDisabled();
    await userEvent.click(input(), { pointerEventsCheck: 0 });
    await expect(body().queryByRole("listbox")).toBeNull();
  },
};

export const ReducedMotion: Story = {
  render: () => <Demo />,
  play: async () => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    try {
      root.setAttribute("data-motion", "reduced");
      input().focus();
      await userEvent.keyboard("{ArrowDown}");
      const list = await listbox();
      const popup = list.closest("[data-yorha-autocomplete-popup]") as HTMLElement;
      // reduced: opacity-only fade, at most 120ms, no scale
      const dur = parseFloat(getComputedStyle(popup).transitionDuration);
      await expect(dur).toBeLessThanOrEqual(0.12);
      await expect(getComputedStyle(popup).transitionProperty).toContain("opacity");
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body().queryByRole("listbox")).toBeNull(), { timeout: 400 });
      root.setAttribute("data-motion", "off");
      await userEvent.keyboard("{ArrowDown}");
      const list2 = await listbox();
      const popup2 = list2.closest("[data-yorha-autocomplete-popup]") as HTMLElement;
      await expect(parseFloat(getComputedStyle(popup2).transitionDuration)).toBe(0);
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <Demo />,
  play: async () => {
    input().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
  },
};
export const Dark: Story = { ...Light, globals: { theme: "dark" } };
export const HighContrast: Story = { ...Light, globals: { theme: "high-contrast" } };
export const Authentic: Story = {
  ...Light,
  parameters: { a11y: { test: "todo" } },
  globals: { theme: "authentic" },
};


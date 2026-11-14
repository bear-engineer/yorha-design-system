import { expectTargetSize } from "../../../../.storybook/preview";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxStatus,
  ComboboxTrigger,
  ComboboxValue,
} from "./combobox";

const UNITS = ["Archive", "Bunker", "Command", "Desert", "Factory", "사막 구역", "벙커", "Depot", "Eden", "Foundry"];
const GROUPS = [
  { value: "지상", items: ["Bunker", "Desert"] },
  { value: "시설", items: ["Archive", "Factory"] },
];

function Single({ defaultValue, grouped, disabled }: { defaultValue?: string; grouped?: boolean; disabled?: boolean }) {
  return (
    <div lang="ko" className="w-72 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Combobox items={(grouped ? GROUPS : UNITS) as never} defaultValue={defaultValue ?? null} disabled={disabled}>
        <ComboboxLabel className="mb-1 block">유닛</ComboboxLabel>
        <ComboboxInputGroup>
          <ComboboxInput aria-label="유닛 선택" placeholder="유닛 선택" />
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>일치하는 유닛이 없습니다</ComboboxEmpty>
          <ComboboxList>
            {grouped
              ? (group: (typeof GROUPS)[number]) => (
                  <ComboboxGroup key={group.value} items={group.items}>
                    <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
                    {group.items.map((u) => (
                      <ComboboxItem key={u} value={u}>
                        {u}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                )
              : (u: string) => (
                  <ComboboxItem key={u} value={u}>
                    {u}
                  </ComboboxItem>
                )}
          </ComboboxList>
          <ComboboxSeparator />
          <ComboboxStatus className="sr-only" />
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

function Multiple({ onChange, initial = ["Archive", "Bunker"] }: { onChange?: (v: string[]) => void; initial?: string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <div lang="ko" className="w-80 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Combobox
        items={UNITS}
        multiple
        value={value}
        onValueChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
      >
        <ComboboxInputGroup>
          <ComboboxValue>
            {(selected: string[]) => (
              <ComboboxChips aria-label={selected.length > 0 ? "선택한 유닛" : undefined}>
                {selected.map((u) => (
                  <ComboboxChip key={u} aria-label={u}>
                    {u}
                    <ComboboxChipRemove aria-label={`${u} 제거`} />
                  </ComboboxChip>
                ))}
                <ComboboxInput aria-label="유닛 여러 개 선택" placeholder={selected.length > 0 ? "" : "유닛 선택"} />
              </ComboboxChips>
            )}
          </ComboboxValue>
          {value.length > 1 && <ComboboxClear />}
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>일치하는 유닛이 없습니다</ComboboxEmpty>
          <ComboboxList>
            {(u: string) => (
              <ComboboxItem key={u} value={u}>
                {u}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

const meta = {
  title: "컴포넌트/폼/Combobox",
  component: Combobox,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const single = () => body().getByRole("combobox", { name: "유닛 선택" }) as HTMLInputElement;
const multi = () => body().getByRole("combobox", { name: "유닛 여러 개 선택" }) as HTMLInputElement;
const options = () => body().queryAllByRole("option");
const names = () => options().map((o) => o.textContent?.trim());
const highlighted = () => options().findIndex((o) => o.hasAttribute("data-highlighted"));
const listbox = async () => {
  const list = await body().findByRole("listbox");
  await waitFor(() => expect(list).toBeVisible());
  return list;
};
const chips = () => Array.from(document.querySelectorAll("[data-yorha-chip]")).map((c) => c.getAttribute("aria-label"));

export const Default: Story = {
  render: () => <Single />,
  play: async () => {
    await expect(single()).toHaveAttribute("aria-expanded", "false");
    single().focus();
    await userEvent.keyboard("{ArrowDown}");
    const list = await listbox();
    await expect(list.closest("[data-yorha-combobox-popup]")).not.toBeNull();
    await expect(options()).toHaveLength(UNITS.length);
    const row = options()[0]!;
    await expect(row.querySelector("[data-yorha-cursor]")).not.toBeNull();
    await expect(row.querySelector("[data-yorha-bullet]")).not.toBeNull();
  },
};

export const TypingFiltersAndEnterSelects: Story = {
  render: () => <Single />,
  play: async () => {
    await userEvent.click(single());
    await userEvent.type(single(), "fa");
    await listbox();
    await waitFor(() => expect(names()).toEqual(["Factory"]));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(0));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
    await expect(single()).toHaveValue("Factory");
  },
};

export const KeyboardNavigation: Story = {
  render: () => <Single />,
  play: async () => {
    single().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    // opening with ArrowDown highlights the first row
    await waitFor(() => expect(highlighted()).toBe(0));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(highlighted()).toBe(1));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(names()[highlighted()]).toBe("Command"));
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(names()[highlighted()]).toBe("Bunker"));
    await expect(single()).toHaveFocus();
  },
};

export const EscapeCloses: Story = {
  render: () => <Single />,
  play: async () => {
    await userEvent.click(single());
    await listbox();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull());
    await expect(single()).toHaveFocus();
  },
};

export const EmptyState: Story = {
  render: () => <Single />,
  play: async () => {
    await userEvent.click(single());
    await userEvent.type(single(), "zzz");
    await waitFor(() => expect(body().getByText("일치하는 유닛이 없습니다")).toBeVisible());
    await expect(options()).toHaveLength(0);
  },
};

export const SelectedBullet: Story = {
  render: () => <Single defaultValue="Bunker" />,
  play: async () => {
    await expect(single()).toHaveValue("Bunker");
    single().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    const selected = body().getByRole("option", { name: "Bunker" });
    await expect(selected).toHaveAttribute("aria-selected", "true");
    // filled square lives in ItemIndicator and exists only for the selected row
    await expect(selected.querySelector("[data-yorha-indicator]")).not.toBeNull();
    await expect(body().getByRole("option", { name: "Desert" }).querySelector("[data-yorha-indicator]")).toBeNull();
  },
};

export const ClearButton: Story = {
  render: () => <Single defaultValue="Bunker" />,
  play: async () => {
    await userEvent.click(body().getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(single()).toHaveValue(""));
    await waitFor(() => expect(body().queryByRole("button", { name: "지우기" })).toBeNull());
  },
};

export const Grouped: Story = {
  render: () => <Single grouped />,
  play: async () => {
    single().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    const groups = within(await listbox()).getAllByRole("group");
    await expect(groups).toHaveLength(2);
    await expect(groups[0]).toHaveAccessibleName("지상");
  },
};

export const MultipleChips: Story = {
  render: () => <Multiple />,
  play: async () => {
    await expect(chips()).toEqual(["Archive", "Bunker"]);
    multi().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
    await userEvent.type(multi(), "des");
    await waitFor(() => expect(names()).toEqual(["Desert"]));
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(chips()).toEqual(["Archive", "Bunker", "Desert"]));
    // multiple: popup stays open after choosing
    await expect(body().queryByRole("listbox")).not.toBeNull();
  },
};

/** Eight values selected: the chips row stays one line, the rest collapse into a "+N" count chip. */
export const ManySelected: Story = {
  render: () => <Multiple initial={UNITS.slice(0, 8)} />,
  play: async () => {
    await expect(body().getByRole("img", { name: /^외 \d+개 선택됨$/ })).toBeVisible();
  },
};

export const ChipRemovalByBackspace: Story = {
  render: () => <Multiple />,
  play: async () => {
    await userEvent.click(multi());
    await userEvent.keyboard("{Escape}");
    // empty input: Backspace removes the last chip
    await userEvent.keyboard("{Backspace}");
    await waitFor(() => expect(chips()).toEqual(["Archive"]));
    // ArrowLeft focuses a chip; Backspace on a focused chip removes it
    await userEvent.keyboard("{ArrowLeft}");
    const chip = document.querySelector<HTMLElement>("[data-yorha-chip]")!;
    await waitFor(() => expect(chip).toHaveFocus());
    await userEvent.keyboard("{Backspace}");
    await waitFor(() => expect(chips()).toEqual([]));
  },
};

export const ChipRemoveButton: Story = {
  render: () => <Multiple />,
  play: async () => {
    await userEvent.click(body().getByRole("button", { name: "Archive 제거" }));
    await waitFor(() => expect(chips()).toEqual(["Bunker"]));
  },
};

/** IME: confirming a composition with Enter must not choose the highlighted row. */
export const ImeDoesNotCommit: Story = {
  render: () => <Multiple />,
  play: async () => {
    const el = multi();
    el.focus();
    el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, "ㅅ");
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "ㅅ", inputType: "insertCompositionText", isComposing: true }));
    await listbox();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, isComposing: true, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", keyCode: 229, isComposing: true, bubbles: true, cancelable: true }));
    await expect(chips()).toEqual(["Archive", "Bunker"]);
    setter.call(el, "사막");
    el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "사막" }));
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "사막", inputType: "insertText" }));
    await waitFor(() => expect(names()).toEqual(["사막 구역"]));
    await expect(chips()).toEqual(["Archive", "Bunker"]);
  },
};

export const Disabled: Story = {
  render: () => <Single disabled />,
  play: async () => {
    await expect(single()).toBeDisabled();
    await userEvent.click(single(), { pointerEventsCheck: 0 });
    await expect(body().queryByRole("listbox")).toBeNull();
  },
};

export const ReducedMotion: Story = {
  render: () => <Single />,
  play: async () => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    try {
      root.setAttribute("data-motion", "reduced");
      single().focus();
      await userEvent.keyboard("{ArrowDown}");
      const list = await listbox();
      const popup = list.closest("[data-yorha-combobox-popup]") as HTMLElement;
      await expect(parseFloat(getComputedStyle(popup).transitionDuration)).toBeLessThanOrEqual(0.12);
      await expect(getComputedStyle(popup).transitionProperty).toContain("opacity");
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body().queryByRole("listbox")).toBeNull(), { timeout: 400 });
      root.setAttribute("data-motion", "off");
      await userEvent.keyboard("{ArrowDown}");
      const popup2 = (await listbox()).closest("[data-yorha-combobox-popup]") as HTMLElement;
      await expect(parseFloat(getComputedStyle(popup2).transitionDuration)).toBe(0);
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Light: Story = {
  globals: { theme: "light" },
  render: () => <Multiple />,
  play: async () => {
    multi().focus();
    await userEvent.keyboard("{ArrowDown}");
    await listbox();
  },
};
export const Dark: Story = { ...Light, globals: { theme: "dark" } };
export const HighContrast: Story = { ...Light, globals: { theme: "high-contrast" } };
export const Authentic: Story = { ...Light, tags: ["!autodocs"], parameters: { a11y: { test: "todo" } }, globals: { theme: "authentic" } };

/** State matrix: default, selected (clear button), disabled, multiple chips (remove buttons), open list. Targets >= 24px. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Single />
      <Single defaultValue="Bunker" />
      <Multiple />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(body().getByRole("button", { name: "Archive 제거" })).toBeVisible();
    await expect(body().getAllByRole("button", { name: "지우기" })[0]).toBeVisible();
    await expectTargetSize(canvasElement);
    await userEvent.click(multi());
    const list = await listbox();
    await expectTargetSize((list.closest("[data-yorha-combobox-popup],[role=presentation]") as HTMLElement | null) ?? (list as HTMLElement));
    await userEvent.keyboard("{Escape}");
    // Let the popup unmount before the a11y pass: a closing listbox has no accessible name.
    await waitFor(() => expect(body().queryByRole("listbox")).toBeNull(), { timeout: 3000 });
  },
};

export const DisabledState: Story = {
  render: () => <Single disabled defaultValue="Bunker" />,
  play: async ({ canvasElement }) => {
    await expect(single()).toBeDisabled();
    await expectTargetSize(canvasElement);
  },
};

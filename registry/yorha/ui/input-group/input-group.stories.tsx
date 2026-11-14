import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { expectPixelSnapped, expectSameHeight } from "../../../../.storybook/geometry";
import { SearchIcon, CrossIcon, EyeIcon } from "../icons/icons";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "./input-group";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/폼/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div lang="ko" className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const px = (value: string) => {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;height:${value}`;
  document.body.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
};

function Search({ size, ...props }: React.ComponentProps<typeof InputGroup> & { size?: "sm" | "md" | "lg" }) {
  return (
    <InputGroup size={size} {...props}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput aria-label="검색" placeholder="검색" defaultValue={props.readOnly ? "유닛 2B" : undefined} readOnly={props.readOnly} disabled={props.disabled} aria-invalid={props.invalid || undefined} />
      <InputGroupButton aria-label="지우기" disabled={props.disabled}>
        <CrossIcon />
      </InputGroupButton>
    </InputGroup>
  );
}

export const Default: Story = {
  render: () => <Search />,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>("[data-slot=input-group]")!;
    const input = within(canvasElement).getByRole("textbox");
    const addon = canvasElement.querySelector<HTMLElement>("[data-slot=input-group-addon]")!;
    const button = within(canvasElement).getByRole("button", { name: "지우기" });
    await expect(group.getAttribute("role")).toBe("group");
    // The frame is exactly one control high; the three children fill the same inner height.
    await expect(group.getBoundingClientRect().height).toBe(px("var(--yorha-control-md)"));
    expectSameHeight(input, addon, button);
    // Adornments are squares on the inner height: whole pixels on both axes, no half-pixel offsets.
    for (const el of [group, input, addon, button]) expectPixelSnapped(el, { axes: "xy" });
    await expect(addon.getBoundingClientRect().width).toBe(addon.getBoundingClientRect().height);
    await expect(button.getBoundingClientRect().width).toBe(button.getBoundingClientRect().height);
    // Addon is decorative and does not take pointer events.
    await expect(getComputedStyle(addon).pointerEvents).toBe("none");
  },
};

/** Every state in one place; the frame never changes size between them. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div data-case="default"><Search /></div>
      <div data-case="invalid"><Search invalid /></div>
      <div data-case="disabled"><Search disabled /></div>
      <div data-case="readonly"><Search readOnly /></div>
      <div data-case="wrap">
        <InputGroup variant="wrap">
          <InputGroupInput aria-label="태그" placeholder="태그" />
        </InputGroup>
      </div>
      <div data-case="text">
        <InputGroup>
          <InputGroupInput aria-label="금액" inputMode="numeric" defaultValue="1,200" className="text-right tabular-nums" />
          <InputGroupText>원</InputGroupText>
        </InputGroup>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const groups = [...canvasElement.querySelectorAll<HTMLElement>("[data-case] [data-slot=input-group]")];
    await expect(groups).toHaveLength(6);
    const [normal, invalid, disabled, readonly, , withText] = groups as [HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement];
    const md = px("var(--yorha-control-md)");
    for (const g of [normal, invalid, disabled, readonly, withText]) {
      await expect(g.getBoundingClientRect().height).toBe(md);
      expectPixelSnapped(g, { axes: "xy" });
      for (const part of g.querySelectorAll<HTMLElement>("input, button, [data-slot^=input-group-]")) expectSameHeight(part, g.querySelector("input")!);
    }
    // Width does not move with state.
    await expect(invalid.getBoundingClientRect().width).toBe(normal.getBoundingClientRect().width);
    // invalid: alert border and no resize; disabled: not-allowed; read-only: printed line (bottom border only).
    await expect(getComputedStyle(invalid).borderTopColor).not.toBe(getComputedStyle(normal).borderTopColor);
    await expect(getComputedStyle(disabled).cursor).toBe("not-allowed");
    await expect(within(disabled as HTMLElement).getByRole("textbox")).toBeDisabled();
    await expect(getComputedStyle(readonly).borderTopColor).toBe("rgba(0, 0, 0, 0)");
    await expect(getComputedStyle(readonly).borderBottomColor).not.toBe("rgba(0, 0, 0, 0)");
    // hover on the frame darkens the border (not for invalid/disabled/read-only).
    await userEvent.hover(normal);
    await expect(getComputedStyle(normal).borderTopColor).not.toBe(getComputedStyle(disabled).borderTopColor);
    await userEvent.unhover(normal);
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["sm", "md", "lg"] as const).map((s) => (
        <Search key={s} size={s} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const groups = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=input-group]")];
    for (const [i, s] of (["sm", "md", "lg"] as const).entries()) {
      const g = groups[i]!;
      await expect(g.getBoundingClientRect().height).toBe(px(`var(--yorha-control-${s})`));
      expectSameHeight(g.querySelector("input")!, g.querySelector("button")!);
      expectPixelSnapped(g, { axes: "xy" });
    }
  },
};

/** The ring belongs to the frame once: the control is outline-none; the button gets an inset ring. */
export const Focus: Story = {
  render: () => <Search />,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>("[data-slot=input-group]")!;
    const input = within(canvasElement).getByRole("textbox");
    const before = group.getBoundingClientRect();
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await expect(getComputedStyle(input).outlineStyle).toBe("none");
    await expect(getComputedStyle(group).outlineStyle).not.toBe("none");
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("button", { name: "지우기" })).toHaveFocus();
    await expect(getComputedStyle(group).outlineStyle).toBe("none");
    await expect(getComputedStyle(within(canvasElement).getByRole("button", { name: "지우기" })).outlineStyle).not.toBe("none");
    const after = group.getBoundingClientRect();
    await expect([after.width, after.height]).toEqual([before.width, before.height]);
  },
};

/** A button that can disappear stays mounted and toggles `invisible`: the group keeps its size. */
export const RevealToggle: Story = {
  render: () => {
    const [shown, setShown] = React.useState(false);
    return (
      <InputGroup>
        <InputGroupInput aria-label="비밀번호" type={shown ? "text" : "password"} defaultValue="secret" />
        <InputGroupButton aria-label={shown ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={shown} onClick={() => setShown((v) => !v)}>
          <EyeIcon />
        </InputGroupButton>
        <InputGroupButton aria-label="지우기" className={shown ? "" : "invisible"} tabIndex={shown ? undefined : -1}>
          <CrossIcon />
        </InputGroupButton>
      </InputGroup>
    );
  },
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>("[data-slot=input-group]")!;
    const before = group.getBoundingClientRect();
    await userEvent.click(within(canvasElement).getByRole("button", { name: "비밀번호 보기" }));
    const after = group.getBoundingClientRect();
    await expect([after.width, after.height]).toEqual([before.width, before.height]);
    const input = canvasElement.querySelector("input")!;
    for (const b of canvasElement.querySelectorAll("button")) expectSameHeight(input, b);
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <Search />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("[data-slot=input-group]")).toHaveLength(THEMES.length);
  },
};

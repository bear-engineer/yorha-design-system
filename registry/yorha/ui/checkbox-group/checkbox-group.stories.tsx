import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "./checkbox-group";

import { expectTargetSize } from "../../../../.storybook/preview";
const THEMES = ["light", "dark", "high-contrast"] as const;
const FRUITS = ["fuji", "gala", "granny"] as const;

const meta = {
  title: "컴포넌트/폼/CheckboxGroup",
  component: CheckboxGroup,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CheckboxGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const Items = () => (
  <>
    <Checkbox value="fuji">후지</Checkbox>
    <Checkbox value="gala">갈라</Checkbox>
    <Checkbox value="granny">그래니 스미스</Checkbox>
  </>
);

/** Parent "select all" box driven by the group's allValues. */
const SelectAll = (props: React.ComponentProps<typeof CheckboxGroup>) => (
  <CheckboxGroup aria-labelledby="fruit-label" allValues={[...FRUITS]} className="flex flex-col gap-2" {...props}>
    <div id="fruit-label" className="font-yorha-bold text-yorha-base text-yorha-fg-strong">
      과일
    </div>
    <Checkbox parent>전체</Checkbox>
    <div className="flex flex-col gap-2 pl-6">
      <Items />
    </div>
  </CheckboxGroup>
);

export const Default: Story = {
  args: { "aria-label": "과일 선택", defaultValue: ["fuji"], onValueChange: fn() },
  render: (args) => (
    <CheckboxGroup {...args} className="flex flex-col gap-2">
      <Items />
    </CheckboxGroup>
  ),
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("group", { name: "과일 선택" })).toBeInTheDocument();
    await expect(c.getByRole("checkbox", { name: "후지" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(c.getByText("갈라"));
    await expect(c.getByRole("checkbox", { name: "갈라" })).toHaveAttribute("aria-checked", "true");
    await expect(args.onValueChange).toHaveBeenLastCalledWith(["fuji", "gala"], expect.anything());
  },
};

export const KeyboardToggle: Story = {
  args: { "aria-label": "과일 선택", defaultValue: [] },
  render: (args) => (
    <CheckboxGroup {...args} className="flex flex-col gap-2">
      <Items />
    </CheckboxGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("checkbox", { name: "후지" })).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(c.getByRole("checkbox", { name: "후지" })).toHaveAttribute("aria-checked", "true");
    await userEvent.tab();
    await expect(c.getByRole("checkbox", { name: "갈라" })).toHaveFocus();
  },
};

export const ParentSelectAll: Story = {
  args: { "aria-label": undefined },
  render: () => <SelectAll />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const parent = c.getByRole("checkbox", { name: "전체" });
    await userEvent.click(parent);
    for (const name of ["후지", "갈라", "그래니 스미스"]) {
      await expect(c.getByRole("checkbox", { name })).toHaveAttribute("aria-checked", "true");
    }
    await userEvent.click(parent);
    await expect(c.getByRole("checkbox", { name: "후지" })).toHaveAttribute("aria-checked", "false");
  },
};

export const PartialShowsMixedParent: Story = {
  render: () => <SelectAll />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("checkbox", { name: "후지" }));
    await expect(c.getByRole("checkbox", { name: "전체" })).toHaveAttribute("aria-checked", "mixed");
  },
};

export const Disabled: Story = {
  args: { "aria-label": "과일 선택", disabled: true, defaultValue: ["gala"] },
  render: (args) => (
    <CheckboxGroup {...args} className="flex flex-col gap-2">
      <Items />
    </CheckboxGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("group", { name: "과일 선택" })).toHaveAttribute("data-disabled");
    await userEvent.click(c.getByText("후지"));
    await expect(c.getByRole("checkbox", { name: "후지" })).toHaveAttribute("aria-checked", "false");
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <CheckboxGroup aria-label={`테마 ${t}`} defaultValue={["fuji"]} className="flex flex-col gap-2">
            <Items />
          </CheckboxGroup>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("group")).toHaveLength(3);
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <CheckboxGroup aria-label="오리지널 팔레트" defaultValue={["gala"]} className="flex flex-col gap-2">
        <Items />
      </CheckboxGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("checkbox", { name: "갈라" })).toHaveAttribute("aria-checked", "true");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <CheckboxGroup aria-label="기본" defaultValue={["gala"]}>
        <Items />
      </CheckboxGroup>
      <CheckboxGroup aria-label="비활성" defaultValue={["fuji"]} disabled>
        <Items />
      </CheckboxGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const boxes = c.getAllByRole("checkbox");
    await expect(boxes.some((b) => b.getAttribute("aria-checked") === "true")).toBe(true);
    await expect(boxes.some((b) => b.getAttribute("aria-disabled") === "true")).toBe(true);
    await expectTargetSize(canvasElement);
  },
};

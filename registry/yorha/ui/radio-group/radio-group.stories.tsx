import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Radio, RadioGroup } from "./radio-group";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/폼/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const Options = ({ disabledBravo = false }: { disabledBravo?: boolean }) => (
  <>
    <Radio value="alpha">알파 유닛</Radio>
    <Radio value="bravo" disabled={disabledBravo}>브라보 유닛</Radio>
    <Radio value="charlie">찰리 유닛</Radio>
  </>
);

export const Default: Story = {
  args: { "aria-label": "유닛 선택", defaultValue: "alpha" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole("radiogroup", { name: "유닛 선택" });
    await expect(group).toBeInTheDocument();
    const radios = c.getAllByRole("radio");
    await expect(radios).toHaveLength(3);
    await expect(c.getByRole("radio", { name: "알파 유닛" })).toBeChecked();
    radios[0]?.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("radio", { name: "찰리 유닛" })).toBeChecked();
    await userEvent.keyboard("{ArrowUp}");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

export const DisabledOption: Story = {
  args: { "aria-label": "유닛 선택 (일부 비활성)", defaultValue: "alpha" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options disabledBravo />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toHaveAttribute("aria-disabled", "true");
    c.getByRole("radio", { name: "알파 유닛" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("radio", { name: "찰리 유닛" })).toBeChecked();
  },
};

export const DisabledGroup: Story = {
  args: { "aria-label": "유닛 선택 (비활성)", defaultValue: "bravo", disabled: true },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const r of c.getAllByRole("radio")) await expect(r).toHaveAttribute("aria-disabled", "true");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

export const Horizontal: Story = {
  args: { "aria-label": "방향 선택", defaultValue: "alpha", orientation: "horizontal" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    c.getByRole("radio", { name: "알파 유닛" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

export const ClickSelect: Story = {
  args: { "aria-label": "클릭 선택" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByText("찰리 유닛"));
    await expect(c.getByRole("radio", { name: "찰리 유닛" })).toBeChecked();
  },
};

export const Themes: Story = {
  args: { "aria-label": "테마", defaultValue: "bravo" },
  render: (args) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <RadioGroup {...args} aria-label={`테마 ${t}`}>
            <Options />
          </RadioGroup>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("radiogroup")).toHaveLength(3);
    await expect(c.getAllByRole("radio", { name: "브라보 유닛" })).toHaveLength(3);
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <RadioGroup aria-label="테마 authentic" defaultValue="bravo">
        <Options />
      </RadioGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("radiogroup")).toBeInTheDocument();
    await expect(within(canvasElement).getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

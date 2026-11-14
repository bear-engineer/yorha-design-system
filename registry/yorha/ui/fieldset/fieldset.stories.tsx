import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Field, FieldControl, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "./fieldset";

const THEMES = ["light", "dark", "high-contrast"] as const;

const controlClass =
  "h-9 w-full rounded-yorha border border-yorha-border bg-yorha-bg px-3 font-yorha text-yorha-base text-yorha-fg-strong focus-visible:yorha-focus";

const Billing = ({ disabled = false, label = "청구 정보" }: { disabled?: boolean; label?: string }) => (
  <Fieldset disabled={disabled}>
    <FieldsetLegend>{label}</FieldsetLegend>
    <Field name="company" className="flex flex-col gap-1">
      <FieldLabel>회사명</FieldLabel>
      <FieldControl placeholder="회사 이름" className={controlClass} />
    </Field>
    <Field name="taxId" className="flex flex-col gap-1">
      <FieldLabel>사업자 구분</FieldLabel>
      <FieldControl placeholder="구분" className={controlClass} />
    </Field>
  </Fieldset>
);

const meta = {
  title: "컴포넌트/폼/Fieldset",
  component: Fieldset,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-80 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Fieldset>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Billing />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole("group", { name: "청구 정보" });
    await expect(group).toBeInTheDocument();
    await userEvent.click(c.getByRole("textbox", { name: "회사명" }));
    await expect(c.getByRole("textbox", { name: "회사명" })).toHaveFocus();
  },
};

export const LegendNamesGroup: Story = {
  render: () => <Billing label="배송지" />,
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("group", { name: "배송지" });
    await expect(group).toHaveAccessibleName("배송지");
    await expect(within(group).getByText("배송지")).toBeInTheDocument();
  },
};

export const DisabledPropagates: Story = {
  render: () => <Billing disabled />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("group", { name: "청구 정보" })).toHaveAttribute("data-disabled");
    await expect(c.getByRole("textbox", { name: "회사명" })).toBeDisabled();
    await expect(c.getByRole("textbox", { name: "사업자 구분" })).toBeDisabled();
  },
};

export const KeyboardTabsThroughFields: Story = {
  render: () => <Billing />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("textbox", { name: "회사명" })).toHaveFocus();
    await userEvent.tab();
    await expect(c.getByRole("textbox", { name: "사업자 구분" })).toHaveFocus();
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-6">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <Billing label={`청구 정보 (${t})`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("group")).toHaveLength(THEMES.length);
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <Billing label="오리지널 팔레트" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("group", { name: "오리지널 팔레트" })).toBeInTheDocument();
  },
};

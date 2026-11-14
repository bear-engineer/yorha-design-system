import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form, FormSubmit } from "./form";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = {
  light: "라이트",
  dark: "다크",
  "high-contrast": "고대비",
};
const REQUIRED = "필수 입력 항목입니다";

const controlClass =
  "h-9 w-full rounded-yorha border border-yorha-border bg-yorha-bg px-3 font-yorha text-yorha-base text-yorha-fg-strong focus-visible:yorha-focus data-[invalid]:border-yorha-alert-ui";

/** Two required fields. `serverErrors` is the error map returned by a server. */
const UnitForm = ({
  serverErrors,
  onFormSubmit,
  id = "unit-form",
}: {
  serverErrors?: Record<string, string>;
  onFormSubmit?: React.ComponentProps<typeof Form>["onFormSubmit"];
  id?: string;
}) => (
  <Form id={id} errors={serverErrors} onFormSubmit={onFormSubmit} className="flex w-72 max-w-full flex-col gap-4">
    <Field name="unitName" className="flex flex-col gap-1">
      <FieldLabel>유닛 이름</FieldLabel>
      <FieldControl required placeholder="예: 2B" className={controlClass} />
      <FieldDescription>영문 대문자와 숫자 8자 이내</FieldDescription>
      <FieldError>{serverErrors?.unitName ?? REQUIRED}</FieldError>
    </Field>
    <Field name="unitClass" className="flex flex-col gap-1">
      <FieldLabel>소속</FieldLabel>
      <FieldControl required placeholder="예: 전투형" className={controlClass} />
      <FieldError>{serverErrors?.unitClass ?? REQUIRED}</FieldError>
    </Field>
    <FormSubmit>등록</FormSubmit>
  </Form>
);

const meta = {
  title: "컴포넌트/폼/Form",
  component: Form,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Form>;
export default meta;
type Story = StoryObj<typeof meta>;

const field = (c: ReturnType<typeof within>, name: string) => c.getByRole("textbox", { name });

export const Default: Story = {
  args: { onFormSubmit: fn() },
  render: (args) => <UnitForm {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(field(c, "유닛 이름"), "2B");
    await userEvent.type(field(c, "소속"), "전투형");
    await userEvent.click(c.getByRole("button", { name: "등록" }));
    await expect(args.onFormSubmit).toHaveBeenCalledTimes(1);
    const values = (args.onFormSubmit as ReturnType<typeof fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    await expect(values).toMatchObject({ unitName: "2B", unitClass: "전투형" });
  },
};

export const InvalidSubmitFocusesFirstError: Story = {
  args: { onFormSubmit: fn() },
  render: (args) => <UnitForm {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "등록" }));
    await expect(args.onFormSubmit).not.toHaveBeenCalled();
    const first = field(c, "유닛 이름");
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await expect(first).toHaveFocus();
    await expect(c.getAllByRole("alert")[0]).toHaveTextContent(REQUIRED);
  },
};

export const EnterKeySubmits: Story = {
  args: { onFormSubmit: fn() },
  render: (args) => <UnitForm {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.type(field(c, "유닛 이름"), "9S");
    await userEvent.type(field(c, "소속"), "정찰형{Enter}");
    await expect(args.onFormSubmit).toHaveBeenCalledTimes(1);
  },
};

export const ServerErrorWiredToField: Story = {
  args: { onFormSubmit: fn() },
  render: () => {
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    return (
      <UnitForm
        serverErrors={errors}
        onFormSubmit={async (values) => {
          // Stand-in for a server call: the name is already taken.
          if (values.unitName === "2B") {
            setErrors({ unitName: "이미 사용 중인 이름입니다" });
            return;
          }
          setErrors({});
        }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(field(c, "유닛 이름"), "2B");
    await userEvent.type(field(c, "소속"), "전투형");
    await userEvent.click(c.getByRole("button", { name: "등록" }));
    const name = field(c, "유닛 이름");
    await waitFor(() => expect(c.getByText("이미 사용 중인 이름입니다")).toBeInTheDocument());
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAccessibleDescription(/이미 사용 중인 이름입니다/);
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-6">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4 text-yorha-fg">
          <UnitForm id={`form-${theme}`} serverErrors={{ unitName: `${THEME_LABEL[theme]} 오류` }} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("alert").length).toBeGreaterThanOrEqual(THEMES.length);
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <UnitForm id="form-authentic" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "등록" })).toBeInTheDocument();
  },
};

export const States: Story = {
  args: { onFormSubmit: fn() },
  render: (args) => <UnitForm {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expectTargetSize(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "등록" }));
    await expect(args.onFormSubmit).not.toHaveBeenCalled();
    const first = field(c, "유닛 이름");
    await expect(first).toHaveFocus();
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await expect(first.getAttribute("aria-describedby") ?? "").toContain(c.getAllByRole("alert")[0]!.id);
    await expectTargetSize(canvasElement);
  },
};

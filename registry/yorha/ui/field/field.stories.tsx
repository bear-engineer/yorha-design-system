import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldFrame,
  FieldItem,
  FieldValidity,
  FieldLabel,
  Fieldset,
  FieldsetLegend,
} from "./field";

const DESCRIPTION = "영문 대문자와 숫자 8자 이내";
const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = {
  light: "라이트",
  dark: "다크",
  "high-contrast": "고대비",
};

function describedIds(el: Element): string[] {
  return (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
}

const meta = {
  title: "컴포넌트/폼/Field",
  component: FieldFrame,
  tags: ["autodocs"],
  args: {
    label: "유닛 코드",
    description: DESCRIPTION,
    children: <FieldControl placeholder="예: 2B-9S" />,
  },
  decorators: [
    (Story) => (
      <div className="w-72 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FieldFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "유닛 코드" });
    const description = canvas.getByText(DESCRIPTION);
    await expect(description.id).not.toBe("");
    await expect(describedIds(input)).toContain(description.id);
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
  },
};

export const LabelFocusesControl: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "유닛 코드" });
    await userEvent.click(canvas.getByText("유닛 코드"));
    await expect(input).toHaveFocus();
  },
};

export const Invalid: Story = {
  args: { error: "필수 입력 항목입니다" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "유닛 코드" });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("필수 입력 항목입니다");
    await expect(alert.id).not.toBe("");
    await expect(describedIds(input)).toContain(alert.id);
    // Shape/icon cue, not colour alone: the icon is decorative and sits inside the alert.
    await expect(alert.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-6">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4 text-yorha-fg">
          <FieldFrame
            label={`유닛 코드 (${THEME_LABEL[theme]})`}
            description={DESCRIPTION}
            error="필수 입력 항목입니다"
            invalid
          >
            <FieldControl />
          </FieldFrame>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole("textbox");
    await expect(inputs).toHaveLength(THEMES.length);
    for (const input of inputs) {
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await expect(describedIds(input).length).toBeGreaterThanOrEqual(2);
    }
    for (const theme of THEMES) {
      await userEvent.click(canvas.getByText(`유닛 코드 (${THEME_LABEL[theme]})`));
      await expect(canvas.getByRole("textbox", { name: `유닛 코드 (${THEME_LABEL[theme]})` })).toHaveFocus();
    }
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // Authentic is the fan palette; it fails AA by design (dossier §9). Opt-in decorative only,
  // so this single story renders that theme alone and skips the a11y gate.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <FieldFrame label="유닛 코드" description={DESCRIPTION}>
        <FieldControl />
      </FieldFrame>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("유닛 코드"));
    await expect(canvas.getByRole("textbox", { name: "유닛 코드" })).toHaveFocus();
  },
};

export const Parts: Story = {
  render: () => (
    <Field>
      <FieldLabel>작전 코드</FieldLabel>
      <FieldControl placeholder="예: YK-07" />
      <FieldDescription>자동 발급 코드를 그대로 입력하십시오</FieldDescription>
      <FieldError match>오류 메시지 자리</FieldError>
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "작전 코드" });
    await userEvent.click(canvas.getByText("작전 코드"));
    await expect(input).toHaveFocus();
    const description = canvas.getByText("자동 발급 코드를 그대로 입력하십시오");
    await expect(describedIds(input)).toContain(description.id);
  },
};

export const FieldsetGroup: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>작전 설정</FieldsetLegend>
      <FieldFrame label="유닛 코드" description={DESCRIPTION}>
        <FieldControl />
      </FieldFrame>
      <FieldFrame label="작전 구역">
        <FieldControl />
      </FieldFrame>
    </Fieldset>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("group", { name: "작전 설정" });
    await expect(within(group).getAllByRole("textbox")).toHaveLength(2);
    await userEvent.click(canvas.getByText("작전 구역"));
    await expect(canvas.getByRole("textbox", { name: "작전 구역" })).toHaveFocus();
  },
};

export const ItemAndValidity: Story = {
  render: () => (
    <form className="flex w-80 max-w-full flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <Field name="code" validationMode="onBlur">
        <FieldLabel>코드</FieldLabel>
        <FieldItem>
          <FieldDescription>3자 이상 입력하세요.</FieldDescription>
        </FieldItem>
        <FieldControl minLength={3} required />
        <FieldValidity>
          {(state) =>
            state.validity.valueMissing ? "필수 입력입니다" : state.validity.tooShort ? "3자 이상 입력하세요" : null
          }
        </FieldValidity>
      </Field>
      <button type="submit">제출</button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "코드" });
    // Base UI flags valueMissing only once the field is dirty, so type, clear, then blur.
    // (tooShort is not reachable here: browsers only report it for user-edited values.)
    await userEvent.type(input, "a");
    await userEvent.clear(input);
    await userEvent.tab();
    const message = await c.findByText("필수 입력입니다");
    await expect(message).toBeInTheDocument();
    await expect(message.closest('[role="alert"]')).not.toBeNull();
    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <FieldFrame label="기본" description={DESCRIPTION}>
        <FieldControl />
      </FieldFrame>
      <FieldFrame label="읽기 전용">
        <FieldControl readOnly defaultValue="고정 값" />
      </FieldFrame>
      <FieldFrame label="잠김" disabled>
        <FieldControl defaultValue="locked" />
      </FieldFrame>
      <FieldFrame label="오류" error="필수 입력 항목입니다">
        <FieldControl />
      </FieldFrame>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByRole("textbox", { name: "오류" });
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(describedIds(bad)).toContain(c.getByRole("alert").id);
    await expect(c.getByRole("textbox", { name: "읽기 전용" })).toHaveAttribute("readonly");
    await expect(c.getByRole("textbox", { name: "잠김" })).toBeDisabled();
    await expectTargetSize(canvasElement);
  },
};

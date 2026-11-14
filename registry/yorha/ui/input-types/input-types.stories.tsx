import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, Fieldset, FieldsetLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ColorInput } from "../color-input/color-input";
import { DateInput } from "../date-input/date-input";
import { FileInput } from "../file-input/file-input";
import { PasswordInput } from "../password-input/password-input";
import { SearchInput } from "../search-input/search-input";
import { INPUT_TYPES, INPUT_TYPE_TABLE, inputPresets } from "./input-types";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };
const wrapper = (Story: React.ComponentType) => (
  <div lang="ko" className="w-[56rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
    <Story />
  </div>
);
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
const seconds = (el: Element) => parseFloat(getComputedStyle(el).transitionDuration) || 0;

const IMAGE_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect x="4" y="4" width="16" height="16" fill="black"/></svg>');

/** One control per HTML input type, each rendered by the yorha item that owns it. */
function InputTypesGallery({ formLabel = "모든 입력 유형" }: { formLabel?: string }) {
  return (
    <form
      lang="ko"
      className="grid grid-cols-[minmax(0,1fr)] gap-8"
      onSubmit={(e) => e.preventDefault()}
      onReset={(e) => e.preventDefault()}
      aria-label={formLabel}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
        <Field>
          <FieldLabel>텍스트</FieldLabel>
          <Input {...inputPresets.text} />
        </Field>
        <Field>
          <FieldLabel>이메일</FieldLabel>
          <Input {...inputPresets.email} />
        </Field>
        <Field>
          <FieldLabel>전화번호</FieldLabel>
          <Input {...inputPresets.tel} />
        </Field>
        <Field>
          <FieldLabel>URL</FieldLabel>
          <Input {...inputPresets.url} />
        </Field>
        <Field>
          <FieldLabel>숫자</FieldLabel>
          <Input type="number" inputMode="numeric" min={0} max={99} step={1} />
        </Field>
        <NumberField label="수량 (NumberField)" defaultValue={1} min={0} max={99} />
        <SearchInput label="검색" />
        <PasswordInput label="비밀번호" />
        <ColorInput label="색상" defaultValue="#336699" />
        <FileInput label="파일" multiple />
        <DateInput label="날짜" picker />
        <DateInput type="datetime-local" label="날짜와 시각" />
        <DateInput type="month" label="월" />
        <DateInput type="week" label="주" />
        <DateInput type="time" label="시각" />
        <Slider label="범위" defaultValue={40} showValue />
        <Field>
          <Checkbox>약관 동의</Checkbox>
        </Field>
        <Fieldset>
          <FieldsetLegend>등급</FieldsetLegend>
          <RadioGroup defaultValue="a" aria-label="등급">
            <Radio value="a">A형</Radio>
            <Radio value="b">B형</Radio>
          </RadioGroup>
        </Fieldset>
        <Field>
          <FieldLabel>버튼 (input type=button)</FieldLabel>
          <input type="button" value="버튼" className={buttonVariants()} />
        </Field>
        <Field>
          <FieldLabel>전송 (input type=submit)</FieldLabel>
          <input type="submit" value="전송" className={buttonVariants({ variant: "primary" })} />
        </Field>
        <Field>
          <FieldLabel>초기화 (input type=reset)</FieldLabel>
          <input type="reset" value="초기화" className={buttonVariants({ variant: "ghost" })} />
        </Field>
        <Field>
          <FieldLabel>이미지 버튼 (input type=image)</FieldLabel>
          <input type="image" src={IMAGE_SRC} alt="이미지 전송" width={24} height={24} className={buttonVariants({ square: true })} />
        </Field>
        <div data-slot="hidden-doc" className="text-yorha-sm">
          type=hidden: 화면에 나타나지 않고 폼 값만 전달합니다. 이 폼에는 name=&quot;csrf&quot; 입력이 있습니다.
          <input type="hidden" name="csrf" value="demo-token" />
        </div>
      </div>
      <div className="overflow-x-auto">
      <table aria-label="입력 유형과 담당 아이템" className="w-full border-collapse text-left text-yorha-sm">
        <thead>
          <tr>
            <th scope="col" className="border border-yorha-border p-2">type</th>
            <th scope="col" className="border border-yorha-border p-2">item</th>
            <th scope="col" className="border border-yorha-border p-2">how</th>
          </tr>
        </thead>
        <tbody>
          {INPUT_TYPES.map((type) => (
            <tr key={type}>
              <td className="border border-yorha-border p-2 font-yorha-mono">{type}</td>
              <td className="border border-yorha-border p-2">{INPUT_TYPE_TABLE[type].item}</td>
              <td className="border border-yorha-border p-2">{INPUT_TYPE_TABLE[type].how}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </form>
  );
}

const meta = {
  title: "컴포넌트/폼/InputTypes",
  component: InputTypesGallery,
  tags: ["autodocs"],
  decorators: [wrapper],
} satisfies Meta<typeof InputTypesGallery>;
export default meta;
type Story = StoryObj<typeof meta>;

const EXPECTED = ["button", "checkbox", "color", "date", "datetime-local", "email", "file", "hidden", "image", "month", "number", "password", "radio", "range", "reset", "search", "submit", "tel", "text", "time", "url", "week"];

export const Types22: Story = {
  play: async () => {
    await expect([...INPUT_TYPES].sort()).toEqual([...EXPECTED].sort());
    await expect(INPUT_TYPES).toHaveLength(22);
    await expect(Object.keys(INPUT_TYPE_TABLE).sort()).toEqual([...EXPECTED].sort());
  },
};

export const Presets: Story = {
  play: async () => {
    await expect(inputPresets.text).toMatchObject({ type: "text", inputMode: "text" });
    await expect(inputPresets.email).toMatchObject({ type: "email", inputMode: "email", autoComplete: "email" });
    await expect(inputPresets.tel).toMatchObject({ type: "tel", inputMode: "tel", autoComplete: "tel" });
    await expect(inputPresets.tel.pattern).toBeTruthy();
    await expect(inputPresets.url).toMatchObject({ type: "url", inputMode: "url", autoComplete: "url" });
    // pattern is a valid regular expression and accepts a Korean phone number
    await expect(new RegExp(`^(?:${inputPresets.tel.pattern})$`).test("010-1234-5678")).toBe(true);
  },
};

export const AllInputTypes: Story = {
  play: async ({ canvasElement }) => {
    for (const type of EXPECTED) {
      const found = canvasElement.querySelector(`input[type="${type}"]`);
      await expect(found, `input[type=${type}] present`).not.toBeNull();
    }
    // hidden is documented and present in the DOM, but not visible
    await expect(within(canvasElement).getByText(/hidden/, { selector: "[data-slot=hidden-doc]" })).toBeInTheDocument();
    // type -> item table has one row per type
    const table = within(canvasElement).getByRole("table", { name: "입력 유형과 담당 아이템" });
    await expect(within(table).getAllByRole("row")).toHaveLength(23);
    for (const type of EXPECTED) {
      await expect(within(table).getByRole("cell", { name: (n: string) => n === type })).toBeInTheDocument();
    }
  },
};

export const EveryControlIsLabelled: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const name of ["텍스트", "이메일", "전화번호", "URL", "검색", "비밀번호", "색상", "파일", "범위"]) {
      await expect(c.getAllByLabelText(name, { exact: false }).length).toBeGreaterThan(0);
    }
    // typing works through the presets
    const email = c.getByLabelText("이메일", { selector: "input" });
    await userEvent.type(email, "a@b.co");
    await expect(email).toHaveValue("a@b.co");
    await expect(email).toHaveAttribute("inputmode", "email");
    await expect(email).toHaveAttribute("autocomplete", "email");
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
          <InputTypesGallery formLabel={`모든 입력 유형 (${THEME_LABEL[t]})`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(3);
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <InputTypesGallery />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('input[type="week"]')).not.toBeNull();
  },
};

export const States: Story = {
  play: async ({ canvasElement }) => {
    await expectTargetSize(canvasElement);
  },
};

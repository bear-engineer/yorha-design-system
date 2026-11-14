import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { INPUT_TYPES, INPUT_TYPE_TABLE, inputPresets } from "./input-types";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = { light: "라이트", dark: "다크", "high-contrast": "고대비" };
const wrapper = (Story: React.ComponentType) => (
  <div lang="ko" className="w-[56rem] bg-yorha-panel p-6 text-yorha-fg">
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

function InputTypesGallery(_props: { idPrefix?: string }) {
  return null;
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
      await expect(within(table).getByRole("cell", { name: type, exact: true })).toBeInTheDocument();
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
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <InputTypesGallery />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(3);
  },
};

export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <InputTypesGallery />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('input[type="week"]')).not.toBeNull();
  },
};

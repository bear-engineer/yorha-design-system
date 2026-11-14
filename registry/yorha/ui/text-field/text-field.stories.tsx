import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { TextField } from "./text-field";

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

/** WCAG contrast ratio; colours are resolved through a canvas so oklch() works. */
function toRgb(css: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#ffffff";
  ctx.fillStyle = css;
  if (ctx.fillStyle === "#ffffff" && css.trim().toLowerCase() !== "#ffffff") throw new Error(`unparsed colour: ${css}`);
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const la = luminance(toRgb(a));
  const lb = luminance(toRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function placeholderContrast(input: HTMLInputElement): number {
  return contrast(getComputedStyle(input, "::placeholder").color, getComputedStyle(input).backgroundColor);
}

const meta = {
  title: "컴포넌트/폼/TextField",
  component: TextField,
  tags: ["autodocs"],
  args: {
    label: "유닛 이름",
    description: DESCRIPTION,
    placeholder: "예: 2B",
  },
  decorators: [
    (Story) => (
      <div className="w-72 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "유닛 이름" });
    const description = canvas.getByText(DESCRIPTION);
    await expect(describedIds(input)).toContain(description.id);
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
  },
};

export const LabelFocusesInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("유닛 이름"));
    await expect(canvas.getByRole("textbox", { name: "유닛 이름" })).toHaveFocus();
  },
};

export const TypingUpdatesValue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "유닛 이름" });
    await userEvent.type(input, "한글 입력 2B");
    await expect(input).toHaveValue("한글 입력 2B");
  },
};

export const PlaceholderContrast: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "유닛 이름" }) as HTMLInputElement;
    await expect(placeholderContrast(input)).toBeGreaterThanOrEqual(4.5);
  },
};

export const Invalid: Story = {
  args: { error: "필수 입력 항목입니다" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "유닛 이름" });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("필수 입력 항목입니다");
    await expect(describedIds(input)).toContain(alert.id);
    await expect(alert.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("textbox", { name: "유닛 이름" })).toBeDisabled();
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-6">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4 text-yorha-fg">
          <TextField
            label={`유닛 이름 (${THEME_LABEL[theme]})`}
            description={DESCRIPTION}
            placeholder="예: 2B"
            error="필수 입력 항목입니다"
            invalid
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const theme of THEMES) {
      const name = `유닛 이름 (${THEME_LABEL[theme]})`;
      const input = canvas.getByRole("textbox", { name }) as HTMLInputElement;
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await expect(describedIds(input).length).toBeGreaterThanOrEqual(2);
      await expect(placeholderContrast(input)).toBeGreaterThanOrEqual(4.5);
      await userEvent.click(canvas.getByText(name));
      await expect(input).toHaveFocus();
    }
  },
};

export const Authentic: Story = {
  // Authentic is the fan palette; it fails AA by design (dossier §9). Opt-in decorative only,
  // so this single story renders that theme alone and skips the a11y gate.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <TextField label="유닛 이름" description={DESCRIPTION} placeholder="예: 2B" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("유닛 이름"));
    await expect(canvas.getByRole("textbox", { name: "유닛 이름" })).toHaveFocus();
  },
};

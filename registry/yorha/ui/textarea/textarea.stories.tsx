import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Textarea } from "./textarea";

import { expectTargetSize } from "../../../../.storybook/preview";
const DESCRIPTION = "최대 500자";
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
function placeholderContrast(el: HTMLTextAreaElement): number {
  return contrast(getComputedStyle(el, "::placeholder").color, getComputedStyle(el).backgroundColor);
}

// --- motion helpers (reduced: <=120ms; off: 0) ---
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
function durationsMs(el: Element): number[] {
  return getComputedStyle(el)
    .transitionDuration.split(",")
    .map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000));
}

const meta = {
  title: "컴포넌트/폼/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: {
    label: "작전 메모",
    description: DESCRIPTION,
    placeholder: "메모를 입력하세요",
  },
  decorators: [
    (Story) => (
      <div className="w-80 bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const area = canvas.getByRole("textbox", { name: "작전 메모" });
    const description = canvas.getByText(DESCRIPTION);
    await expect(describedIds(area)).toContain(description.id);
    await expect(area).not.toHaveAttribute("aria-invalid", "true");
    await userEvent.click(canvas.getByText("작전 메모"));
    await expect(area).toHaveFocus();
  },
};

export const TypingUpdatesValue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const area = canvas.getByRole("textbox", { name: "작전 메모" }) as HTMLTextAreaElement;
    await userEvent.type(area, "첫 줄{Enter}둘째 줄");
    await expect(area).toHaveValue("첫 줄\n둘째 줄");
  },
};

export const PlaceholderContrast: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const area = canvas.getByRole("textbox", { name: "작전 메모" }) as HTMLTextAreaElement;
    await expect(placeholderContrast(area)).toBeGreaterThanOrEqual(4.5);
  },
};

export const AutoSize: Story = {
  args: { autoSize: true, label: "자동 높이 메모" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const area = canvas.getByRole("textbox", { name: "자동 높이 메모" }) as HTMLTextAreaElement;
    await expect(getComputedStyle(area).getPropertyValue("field-sizing")).toBe("content");
    const before = area.getBoundingClientRect().height;
    await userEvent.type(area, "여섯 줄{Enter}둘째{Enter}셋째{Enter}넷째{Enter}다섯째{Enter}여섯째");
    await expect(area.getBoundingClientRect().height).toBeGreaterThan(before);
  },
};

export const Invalid: Story = {
  args: { error: "메모는 필수입니다" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const area = canvas.getByRole("textbox", { name: "작전 메모" });
    await expect(area).toHaveAttribute("aria-invalid", "true");
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("메모는 필수입니다");
    await expect(describedIds(area)).toContain(alert.id);
    await expect(alert.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-6">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4 text-yorha-fg">
          <Textarea
            label={`작전 메모 (${THEME_LABEL[theme]})`}
            description={DESCRIPTION}
            placeholder="메모를 입력하세요"
            error="메모는 필수입니다"
            invalid
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const theme of THEMES) {
      const name = `작전 메모 (${THEME_LABEL[theme]})`;
      const area = canvas.getByRole("textbox", { name }) as HTMLTextAreaElement;
      await expect(area).toHaveAttribute("aria-invalid", "true");
      await expect(describedIds(area).length).toBeGreaterThanOrEqual(2);
      await expect(placeholderContrast(area)).toBeGreaterThanOrEqual(4.5);
      await userEvent.click(canvas.getByText(name));
      await expect(area).toHaveFocus();
    }
  },
};

export const Authentic: Story = {
  // Authentic is the fan palette; it fails AA by design (dossier §9). Opt-in decorative only,
  // so this single story renders that theme alone and skips the a11y gate.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <Textarea label="작전 메모" description={DESCRIPTION} placeholder="메모를 입력하세요" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("작전 메모"));
    await expect(canvas.getByRole("textbox", { name: "작전 메모" })).toHaveFocus();
  },
};

export const ReducedMotion: Story = {
  args: { label: "보고" },
  play: async ({ canvasElement }) => {
    const els = (): Element[] => {
      const c = within(canvasElement);
      return [c.getByRole("textbox")];
    };
    await inMotion("reduced", async () => {
      for (const el of els()) {
        expect(getComputedStyle(el).transitionProperty).not.toBe("none");
        expect(Math.max(...durationsMs(el))).toBeLessThanOrEqual(120);
      }
    });
    await inMotion("off", async () => {
      for (const el of els()) expect(Math.max(...durationsMs(el))).toBe(0);
    });
  },
};

export const States: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-4">
      <Textarea label="기본" />
      <Textarea label="읽기 전용" readOnly defaultValue="고정 값" />
      <Textarea label="잠김" disabled defaultValue="locked" />
      <Textarea label="오류" error="필수 입력 항목입니다" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bad = c.getByRole("textbox", { name: "오류" });
    await expect(bad).toHaveAttribute("aria-invalid", "true");
    await expect(bad.getAttribute("aria-describedby") ?? "").toContain(c.getByRole("alert").id);
    await expect(c.getByRole("textbox", { name: "읽기 전용" })).toHaveAttribute("readonly");
    await expect(c.getByRole("textbox", { name: "잠김" })).toBeDisabled();
    await expectTargetSize(canvasElement);
  },
};

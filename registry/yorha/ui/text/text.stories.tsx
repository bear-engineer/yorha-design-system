import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Text } from "./text";

const THEMES = ["light", "dark", "high-contrast"] as const;
const LONG =
  "Unit 7 channel 12 telemetry buffer holds 4096 samples before the oldest entries are overwritten by the next capture window.";

const meta = {
  title: "컴포넌트/YoRHa/Text",
  component: Text,
  tags: ["autodocs"],
  args: { children: "장비 상태 요약" },
  decorators: [
    (Story) => (
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("장비 상태 요약")).toBeInTheDocument();
  },
};

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Text tone="default">default tone</Text>
      <Text tone="muted">muted tone</Text>
      <Text tone="strong">strong tone</Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const muted = within(canvasElement).getByText("muted tone");
    const strong = within(canvasElement).getByText("strong tone");
    await expect(getComputedStyle(muted).color).not.toBe(getComputedStyle(strong).color);
  },
};

export const Truncate: Story = {
  render: () => (
    <div style={{ width: "12rem" }}>
      <Text truncate>{LONG}</Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const el = within(canvasElement).getByText(LONG);
    await expect(el.scrollWidth > el.clientWidth).toBe(true);
    await expect(el.textContent).toBe(LONG);
    await expect(el.getAttribute("title")).toBe(LONG);
  },
};

export const LineClamp: Story = {
  render: () => (
    <div style={{ width: "14rem" }}>
      <Text lineClamp={2}>{LONG}</Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const el = within(canvasElement).getByText(LONG);
    await expect(el.scrollHeight > el.clientHeight).toBe(true);
    await expect(el.textContent).toBe(LONG);
    await expect(el.getAttribute("title")).toBe(LONG);
  },
};

/** V4-267: clamped text offers an `aria-expanded` toggle; its row is reserved and hidden while the text fits. */
export const Expandable: Story = {
  render: () => (
    <div style={{ width: "14rem" }} className="flex flex-col gap-4">
      <Text lineClamp={2} expandable>
        {LONG}
      </Text>
      <Text lineClamp={2} expandable data-testid="short">
        짧은 문장
      </Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const text = c.getByText(LONG);
    const toggle = c.getByRole("button", { name: "더 보기" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(text.scrollHeight > text.clientHeight).toBe(true);
    await expect(toggle.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveTextContent("접기");
    await expect(text.scrollHeight <= text.clientHeight + 1).toBe(true);
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // text that fits: the control keeps its slot but is not exposed
    const short = canvasElement.querySelector<HTMLElement>('[data-testid="short"]')!;
    const shortToggle = short.parentElement!.querySelector<HTMLElement>("[data-slot=text-expand]")!;
    await expect(getComputedStyle(shortToggle).visibility).toBe("hidden");
    await expect(shortToggle.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  },
};

export const Tabular: Story = {
  render: () => (
    <div className="flex flex-col gap-1">
      <Text tabular data-testid="tab">{"1111111.00"}</Text>
      <Text>{"1111111.00"}</Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const tab = within(canvasElement).getByTestId("tab");
    await expect(getComputedStyle(tab).fontVariantNumeric).toContain("tabular-nums");
  },
};

export const KoreanWrapper: Story = {
  render: () => (
    <div lang="ko">
      <Text size="lg" weight="bold">
        보고서 요약
      </Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const el = within(canvasElement).getByText("보고서 요약");
    await expect(getComputedStyle(el).textTransform).toBe("none");
  },
};

export const ThemeGallery: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
          <Text>{`테마 ${t}`}</Text>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) {
      await expect(c.getByText(`테마 ${t}`)).toBeInTheDocument();
    }
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
      <Text>권위 테마 본문</Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("권위 테마 본문")).toBeInTheDocument();
  },
};

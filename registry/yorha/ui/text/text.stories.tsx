import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
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
      <div className="bg-yorha-panel p-6 text-yorha-fg">
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
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
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
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <Text>권위 테마 본문</Text>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("권위 테마 본문")).toBeInTheDocument();
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row, Sheet } from "../../../../src/docs/sheet";
import { expect, within } from "storybook/test";
import { Badge } from "./badge";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/표시/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "대기" },
  argTypes: { variant: { control: "inline-radio", options: ["neutral", "alert"] } },
  decorators: [
    (Story, { name }) =>
      name === "구성 한눈에" ? (
        <Story />
      ) : (
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <Sheet title="Badge">
      <Row label="neutral"><Badge variant="neutral">대기</Badge><Badge variant="neutral">정상</Badge><Badge variant="neutral">12</Badge></Row>
      <Row label="alert"><Badge variant="alert">경고</Badge><Badge variant="alert">수리 필요</Badge><Badge variant="alert">NEW</Badge></Row>
      <Row label="문장 속"><span className="flex items-center gap-2 text-yorha-sm">9S 정찰 유닛 <Badge variant="neutral">정상</Badge></span><span className="flex items-center gap-2 text-yorha-sm">A2 전투 유닛 <Badge variant="alert">수리 필요</Badge></span></Row>
    </Sheet>
  ),
};

export const Neutral: Story = {
  tags: ["!autodocs"],
  args: { variant: "neutral" },
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText("대기");
    await expect(badge).toHaveAttribute("data-variant", "neutral");
    await expect(badge.querySelector("[data-shape]")).toBeNull();
  },
};

export const Alert: Story = {
  tags: ["!autodocs"],
  args: { variant: "alert", children: "경고" },
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText("경고");
    await expect(badge).toHaveAttribute("data-variant", "alert");
    // shape cue: alert carries a non-colour marker, so state is not conveyed by colour alone
    await expect(badge).toHaveAttribute("data-shape", "diamond");
    await expect(badge.querySelector("svg[data-glyph=diamond]")).not.toBeNull(); // V4-092: a glyph, not a rotated square
    await expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
  },
};

export const Matrix: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="neutral">대기</Badge>
      <Badge variant="alert">경고</Badge>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText(/대기|경고/)).toHaveLength(2);
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col items-start gap-2 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <Badge variant="neutral">대기</Badge>
          <Badge variant="alert">경고</Badge>
        </div>
      ))}
    </div>
  ),
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // authentic palette is intentionally low-contrast (decorative mode): only this story skips a11y.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Badge variant="alert">경고</Badge>
    </div>
  ),
};

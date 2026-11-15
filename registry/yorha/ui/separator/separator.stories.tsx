import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row, Sheet } from "../../../../src/docs/sheet";
import { expect, within } from "storybook/test";
import { Separator } from "./separator";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo() {
  return (
    <div className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
      <p>상단 항목</p>
      <Separator />
      <div className="flex h-8 items-center gap-3">
        <span>좌</span>
        <Separator orientation="vertical" />
        <span>우</span>
      </div>
    </div>
  );
}

const meta = {
  title: "컴포넌트/구조/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <Sheet title="Separator">
      <Row label="수평" align="start"><div className="flex w-72 flex-col gap-3 text-yorha-sm"><p>유닛 정보</p><Separator /><p>작전 기록</p><Separator /><p>통신 로그</p></div></Row>
      <Row label="수직"><div className="flex h-8 items-center gap-3 text-yorha-sm"><span>개요</span><Separator orientation="vertical" /><span>상세</span><Separator orientation="vertical" /><span>기록</span></div></Row>
    </Sheet>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const seps = c.getAllByRole("separator");
    await expect(seps).toHaveLength(2);
    await expect(seps[0]).toHaveAttribute("data-orientation", "horizontal");
    await expect(seps[1]).toHaveAttribute("data-orientation", "vertical");
    await expect(seps[0]).toHaveClass("bg-yorha-separator");
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t}>
          <Demo />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic">
      <Demo />
    </div>
  ),
};

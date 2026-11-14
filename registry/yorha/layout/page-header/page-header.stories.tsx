import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { withRouter } from "../../../../.storybook/decorators";
import { PageHeader } from "./page-header";
import { Button } from "@/components/ui/button";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "레이아웃/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } }, layout: "padded", route: { path: "/" } },
  args: {
    title: "유닛 상태",
    eyebrow: "SEC-07",
    description: "전술 유닛의 현재 상태와 최근 점검 기록을 확인합니다.",
  },
} satisfies Meta<typeof PageHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 페이지에는 h1이 정확히 하나만 있고, 구역 코드는 제목 위에 표시됩니다. */
export const Default: Story = {
  args: {
    actions: <Button variant="primary">새로고침</Button>,
  },
  render: (args) => (
    <main className="bg-yorha-panel text-yorha-fg">
      <PageHeader {...args} />
    </main>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const headings = c.getAllByRole("heading", { level: 1 });
    await expect(headings).toHaveLength(1);
    await expect(headings[0]).toHaveTextContent("유닛 상태");
    await expect(c.getByText("SEC-07")).toBeInTheDocument();
    await expect(c.getByText("전술 유닛의 현재 상태와 최근 점검 기록을 확인합니다.")).toBeInTheDocument();
  },
};

/** 작업 슬롯의 버튼은 키보드로 포커스됩니다. */
export const ActionsSlot: Story = {
  args: {
    actions: (
      <>
        <Button variant="ghost">내보내기</Button>
        <Button variant="primary">점검 시작</Button>
      </>
    ),
  },
  render: (args) => (
    <main className="bg-yorha-panel text-yorha-fg">
      <PageHeader {...args} />
    </main>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const start = c.getByRole("button", { name: "점검 시작" });
    await userEvent.tab();
    await userEvent.tab();
    await expect(start).toHaveFocus();
  },
};

/** 장식 띠는 보조 기술에 숨겨지며, 제목 없이도 h1을 만들지 않습니다. */
export const OrnamentIsDecorative: Story = {
  args: { eyebrow: undefined, description: undefined, ornament: true },
  render: (args) => (
    <main className="bg-yorha-panel text-yorha-fg">
      <PageHeader {...args} />
    </main>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const ornaments = canvasElement.querySelectorAll('[data-slot="ornament"]');
    await expect(ornaments.length).toBeGreaterThan(0);
    ornaments.forEach((o) => expect(o).toHaveAttribute("aria-hidden", "true"));
  },
};

export const ThemeGallery: Story = {
  parameters: { yorha: { manageRoot: false } },
  args: { actions: undefined, eyebrow: "SEC-07" },
  render: (args) => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <PageHeader {...args} title={`테마 ${t}`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("heading", { level: 1 })).toHaveLength(THEMES.length);
    for (const t of THEMES) {
      await expect(c.getByRole("heading", { level: 1, name: `테마 ${t}` })).toBeInTheDocument();
    }
  },
};

/** 권위 테마는 토큰 대비 기준을 통과하지 않으므로 이 스토리에서만 렌더링합니다. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" }, yorha: { manageRoot: false } },
  args: { actions: undefined },
  render: (args) => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <PageHeader {...args} title="권위 테마" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { level: 1, name: "권위 테마" })).toBeInTheDocument();
  },
};

/** 기본 버튼, 비활성 버튼, 키보드 포커스 상태의 타깃을 측정한다. */
export const States: Story = {
  args: {
    actions: (
      <>
        <Button variant="ghost">내보내기</Button>
        <Button variant="primary">점검 시작</Button>
        <Button disabled>잠금</Button>
      </>
    ),
  },
  render: (args) => (
    <main className="bg-yorha-panel text-yorha-fg">
      <PageHeader {...args} />
    </main>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "잠금" })).toBeDisabled();
    await userEvent.tab();
    await userEvent.tab();
    await expect(c.getByRole("button", { name: "점검 시작" })).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};

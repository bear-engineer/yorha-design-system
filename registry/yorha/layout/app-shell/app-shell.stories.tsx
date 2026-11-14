import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { withRouter } from "../../../../.storybook/decorators";
import { AppShell } from "@/components/app-shell";
import { Sidebar, type SidebarSection } from "@/components/sidebar";
import { GridBackground } from "@/components/ui/grid-background";
import { Vignette } from "@/components/ui/vignette";

const THEMES = ["light", "dark", "high-contrast"] as const;

const SECTIONS: SidebarSection[] = [
  {
    id: "ops",
    title: "작전",
    items: [
      { to: "/", label: "홈", end: true },
      { to: "/units", label: "유닛" },
      { to: "/logs", label: "로그" },
    ],
  },
  { id: "sys", title: "시스템", items: [{ to: "/settings", label: "설정" }] },
];

interface DemoProps {
  grid?: boolean;
  vignette?: boolean;
  className?: string;
}

function Demo({ grid = false, vignette = false, className }: DemoProps) {
  return (
    <AppShell
      header={<span className="font-yorha font-yorha-bold uppercase tracking-yorha-wide">YoRHa 데모</span>}
      nav={<Sidebar sections={SECTIONS} />}
      grid={grid ? <GridBackground /> : undefined}
      vignette={vignette ? <Vignette /> : undefined}
      footer={<p className="text-yorha-sm text-yorha-fg-soft">비공식 팬 프로젝트</p>}
      className={className}
    >
      <p className="text-yorha-base text-yorha-fg">본문 내용</p>
    </AppShell>
  );
}

const meta = {
  title: "레이아웃/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  decorators: [withRouter],
  args: { children: null },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 건너뛰기 링크가 탭 순서 첫 번째이며, Enter로 본문 main에 포커스를 옮긴다. 랜드마크는 이름이 있다. */
export const Default: Story = {
  render: () => <Demo grid vignette className="min-h-0 h-96" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("banner")).toBeInTheDocument();
    await expect(c.getByRole("main", { name: "본문" })).toBeInTheDocument();
    await expect(c.getByRole("navigation", { name: "주 메뉴" })).toBeInTheDocument();
    await expect(c.getByRole("contentinfo", { name: "하단 정보" })).toBeInTheDocument();
    await userEvent.tab();
    await expect(c.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(c.getByRole("main", { name: "본문" })).toHaveFocus();
  },
};

/**
 * One theme per story: a banner, main and nav landmark each, so several shells in one
 * document would break the landmark-unique and no-duplicate-banner checks.
 */
function themePlay(theme: (typeof THEMES)[number]): Story["play"] {
  return async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(canvasElement.querySelector("[data-theme]")).toHaveAttribute("data-theme", theme);
    await expect(c.getByRole("banner")).toBeInTheDocument();
    await expect(c.getByRole("main", { name: "본문" })).toBeInTheDocument();
    await expect(c.getByRole("navigation", { name: "주 메뉴" })).toBeInTheDocument();
  };
}

export const LightTheme: Story = {
  name: "라이트 테마",
  render: () => (
    <div data-theme="light">
      <Demo grid vignette className="min-h-0 h-96" />
    </div>
  ),
  play: themePlay("light"),
};

export const DarkTheme: Story = {
  name: "다크 테마",
  render: () => (
    <div data-theme="dark">
      <Demo grid vignette className="min-h-0 h-96" />
    </div>
  ),
  play: themePlay("dark"),
};

export const HighContrastTheme: Story = {
  name: "고대비 테마",
  render: () => (
    <div data-theme="high-contrast">
      <Demo grid vignette className="min-h-0 h-96" />
    </div>
  ),
  play: themePlay("high-contrast"),
};

/** Authentic palette alone. a11y is "todo": the authentic palette is decorative-only (tokens.md). */
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic">
      <Demo grid vignette className="min-h-0 h-96" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("main", { name: "본문" })).toBeInTheDocument();
  },
};

/** 360px 폭: 메뉴 버튼(aria-expanded)으로 내비게이션을 펼치고 접는다. 키보드로 조작한다. */
export const MobileDisclosure: Story = {
  render: () => (
    <div data-frame style={{ width: "360px" }}>
      <Demo className="min-h-0 h-[32rem]" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const toggle = c.getByRole("button", { name: "메뉴" });
    const region = canvasElement.querySelector<HTMLElement>('[data-slot="app-shell-nav"]')!;
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(region).not.toBeVisible();
    await userEvent.tab();
    await expect(c.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveFocus();
    await userEvent.tab();
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(region).toBeVisible();
    await userEvent.tab();
    await expect(c.getByRole("link", { name: "홈" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(region).not.toBeVisible();
  },
};

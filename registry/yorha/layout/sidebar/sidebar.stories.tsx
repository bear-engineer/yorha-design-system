import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { withRouter } from "../../../../.storybook/decorators";
import { Sidebar, type SidebarProps, type SidebarSection } from "@/components/sidebar";
import { Breadcrumb } from "@/components/breadcrumb";
import { Glyph } from "@/components/ui/glyph";
import { PageHeader } from "@/components/page-header";

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
  {
    id: "sys",
    title: "시스템",
    items: [{ to: "/settings", label: "설정" }],
  },
];

const LONG_SECTIONS: SidebarSection[] = [
  {
    id: "ops",
    title: "작전 지휘 및 정기 점검 일정 관리 구역",
    items: [
      { to: "/", label: "홈", end: true },
      { to: "/units", label: "비공식 팬 프로젝트 유닛 운용 기록 보관소 및 정기 점검 일정 관리" },
      { to: "/logs", label: "Long unbroken label ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
    ],
  },
];

const MANY_SECTIONS: SidebarSection[] = ["작전", "시스템", "기록", "장비", "통신", "보급"].map((title, s) => ({
  id: `s${s}`,
  title,
  items: Array.from({ length: 5 }, (_, i) => ({ to: s === 0 && i === 0 ? "/" : `/${title}/${i}`, label: `${title} ${i + 1}`, end: s === 0 && i === 0 })),
}));

const HEADER = (collapsed: boolean) => (
  <div className="flex items-center gap-2 font-yorha-bold text-yorha-sm">
    <Glyph name="diamond-target" />
    {!collapsed && <span className="truncate">YoRHa 유닛</span>}
  </div>
);
const FOOTER = (collapsed: boolean) => (
  <p className="m-0 flex items-center gap-2 font-yorha-mono text-yorha-xs text-yorha-fg-soft">
    <Glyph name="disc" className="shrink-0" />
    {!collapsed && <span className="truncate">연결됨 · 지휘 서버</span>}
  </p>
);

const meta = {
  title: "레이아웃/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  decorators: [withRouter],
  args: { sections: SECTIONS },
  parameters: { docs: { story: { inline: false, iframeHeight: 760 } }, layout: "padded" },
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The sidebar docked in an app frame: column on the left, page header + content placeholder on the right (1280 x 720). */
function Dock({ children, theme }: { children: ReactNode; theme?: string }) {
  return (
    <div data-theme={theme} className="flex h-[720px] w-[1280px] max-w-full overflow-hidden border border-yorha-border bg-yorha-bg text-yorha-fg">
      {children}
      <div className="min-w-0 flex-1 overflow-hidden">
        <PageHeader
          breadcrumb={<Breadcrumb items={[{ label: "본부", to: "/hq" }, { label: "기체 목록", to: "/hq/list" }, { label: "A-2 기체" }]} />}
          eyebrow="SEC-07"
          title="유닛"
          description="본문 영역의 자리 표시자입니다. 사이드바는 256px 고정 열이고 높이를 끝까지 채웁니다."
        />
        <div className="grid grid-cols-3 gap-4 p-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} aria-hidden="true" className="h-28 border border-yorha-border bg-yorha-panel" />
          ))}
        </div>
      </div>
    </div>
  );
}

const docked = (extra: Partial<SidebarProps> = {}, theme?: string): Story["render"] => (args) => (
  <Dock theme={theme}>
    <Sidebar {...args} {...extra} />
  </Dock>
);

/** 주 메뉴 landmark, 섹션 제목(h2)마다 이름 붙은 목록, 활성 링크는 aria-current=page. 폭은 256px 고정이고 높이는 컨테이너를 채운다. */
export const Default: Story = {
  render: docked({ header: HEADER, footer: FOOTER }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const nav = c.getByRole("navigation", { name: "주 메뉴" });
    await expect(nav).toBeInTheDocument();
    await expect(c.getByRole("heading", { name: "작전", level: 2 })).toBeInTheDocument();
    const list = c.getByRole("list", { name: "작전" });
    await expect(within(list).getAllByRole("link")).toHaveLength(3);
    await expect(c.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
    await expect(c.getByRole("link", { name: "유닛" })).not.toHaveAttribute("aria-current");
  },
};

/** 접으면 64px 레일. 이름은 title과 보조 기술에 남고, 머리말/꼬리말은 아이콘만 남는다. */
export const Collapsible: Story = {
  render: docked({ collapsible: true, header: HEADER, footer: FOOTER }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const nav = c.getByRole("navigation", { name: "주 메뉴" });
    await expect(nav.getBoundingClientRect().width).toBe(256);
    await userEvent.click(c.getByRole("button", { name: "메뉴 접기" }));
    await expect(nav.getBoundingClientRect().width).toBe(64);
    await expect(c.getByRole("link", { name: "유닛" })).toBeInTheDocument();
  },
};

/** 키보드: Tab으로 링크를 순서대로 이동하고 Enter로 경로를 바꾼다. */
export const KeyboardPath: Story = {
  parameters: { route: { routes: [{ path: "/*", element: <Dock><Sidebar sections={SECTIONS} /></Dock> }] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("link", { name: "홈" })).toHaveFocus();
    await userEvent.tab();
    await expect(c.getByRole("link", { name: "유닛" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(c.getByRole("link", { name: "유닛" })).toHaveAttribute("aria-current", "page");
    await expect(c.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current");
  },
};

/** 긴 이름은 한 줄 말줄임(title과 접근 가능한 이름은 전체 텍스트), 행 높이와 폭은 그대로. */
export const LongLabels: Story = {
  args: { sections: LONG_SECTIONS },
  render: docked(),
  play: async ({ canvasElement }) => {
    const long = within(canvasElement).getByRole("link", { name: /비공식 팬 프로젝트/ });
    const label = long.querySelector<HTMLElement>("span:last-child")!;
    await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
  },
};

/** 항목이 많으면 목록만 안에서 스크롤하고(위·아래 단서선), 머리말과 꼬리말은 고정된다. */
export const ManyItems: Story = {
  args: { sections: MANY_SECTIONS },
  render: docked({ header: HEADER, footer: FOOTER }),
  play: async ({ canvasElement }) => {
    const body = canvasElement.querySelector<HTMLElement>('[data-slot="sidebar-body"]')!;
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    await expect(within(canvasElement).getByText("연결됨 · 지휘 서버")).toBeVisible();
  },
};

/** 360px 이하에서는 사이드바를 줄이지 않는다. AppShell이 시트(오버레이)로 열어 준다. */
export const MobileNote: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <p className="m-0 max-w-prose text-yorha-sm leading-yorha-body text-yorha-fg">
      사이드바는 256px(레일 64px) 고정 열입니다. 좁은 화면에서는 줄이지 않고 AppShell의 모바일 메뉴(시트)로 엽니다.{" "}
      <a className="underline underline-offset-4" target="_top" href="?path=/docs/레이아웃-appshell--docs">
        AppShell 문서로 이동
      </a>
    </p>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("link", { name: /AppShell/ })).toBeInTheDocument();
  },
};

/** One theme per story (see the AppShell note on landmark uniqueness). */
function themeStory(theme: (typeof THEMES)[number], name: string): Story {
  return {
    name,
    render: docked({ header: HEADER, footer: FOOTER }, theme),
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector("[data-theme]")).toHaveAttribute("data-theme", theme);
      await expect(within(canvasElement).getByRole("navigation", { name: "주 메뉴" })).toBeInTheDocument();
    },
  };
}

export const LightTheme = themeStory("light", "라이트 테마");
export const DarkTheme = themeStory("dark", "다크 테마");
export const HighContrastTheme = themeStory("high-contrast", "고대비 테마");

/** Authentic palette alone. a11y is "todo": the authentic palette is decorative-only (tokens.md). */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: docked({}, "authentic"),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("navigation", { name: "주 메뉴" })).toBeInTheDocument();
  },
};

/** 기본, 현재 경로(aria-current=page), 호버, 키보드 포커스 상태의 링크 타깃을 측정한다. */
export const States: Story = {
  parameters: { route: { routes: [{ path: "/*", element: <Dock><Sidebar sections={SECTIONS} header={HEADER} footer={FOOTER} /></Dock> }], initialEntries: ["/units"] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("link", { name: "유닛" })).toHaveAttribute("aria-current", "page");
    await userEvent.tab();
    await expect(c.getByRole("link", { name: "홈" })).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { withRouter } from "../../../../.storybook/decorators";
import { Sidebar, type SidebarSection } from "@/components/sidebar";

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

const meta = {
  title: "레이아웃/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  decorators: [withRouter],
  args: { sections: SECTIONS },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 주 메뉴 landmark, 섹션 제목(h2)마다 이름 붙은 목록, 활성 링크는 aria-current=page. */
export const Default: Story = {
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

/** 키보드: Tab으로 링크를 순서대로 이동하고 Enter로 경로를 바꾼다. */
export const KeyboardPath: Story = {
  parameters: { route: { routes: [{ path: "/*", element: <Sidebar sections={SECTIONS} /> }] } },
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

/** One theme per story (see the AppShell note on landmark uniqueness). */
function themeStory(theme: (typeof THEMES)[number], name: string): Story {
  return {
    name,
    render: (args) => (
      <div data-theme={theme} className="bg-yorha-bg text-yorha-fg">
        <Sidebar {...args} />
      </div>
    ),
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
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="bg-yorha-bg text-yorha-fg">
      <Sidebar {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("navigation", { name: "주 메뉴" })).toBeInTheDocument();
  },
};

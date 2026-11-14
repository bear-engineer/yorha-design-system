import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Link, useLocation, useNavigate } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";
import { SystemMenuLayout, type SystemMenuSection } from "@/components/system-menu-layout";

const THEMES = ["light", "dark", "high-contrast"] as const;

const SECTIONS: SystemMenuSection[] = [
  {
    id: "items",
    label: "아이템",
    items: [
      { id: "kit", label: "회복 키트", description: "x3", content: <p>체력을 즉시 회복하는 휴대용 키트입니다. 전투 중에도 사용할 수 있습니다.</p> },
      { id: "chip", label: "강화 칩", description: "x1", content: <p>장착 슬롯에 끼워 능력치를 높이는 소형 칩입니다.</p> },
      { id: "key", label: "보안 키", disabled: true, content: <p>잠긴 구역을 여는 열쇠입니다.</p> },
    ],
  },
  {
    id: "map",
    label: "지도",
    items: [
      { id: "city", label: "폐허 도시", content: <p>무너진 고층 건물이 이어진 지역입니다. 적 반응이 다수 감지됩니다.</p> },
      { id: "factory", label: "버려진 공장", content: <p>가동이 멈춘 생산 시설입니다. 지하 통로가 열려 있습니다.</p> },
    ],
  },
  {
    id: "system",
    label: "시스템",
    items: [
      { id: "display", label: "화면 설정", content: <p>밝기와 테마, 모션 강도를 조절합니다.</p> },
      { id: "sound", label: "사운드 설정", content: <p>효과음과 음악 음량을 조절합니다.</p> },
    ],
  },
];

const meta = {
  title: "레이아웃/SystemMenuLayout",
  component: SystemMenuLayout,
  tags: ["autodocs"],
  args: { sections: SECTIONS },
  parameters: { layout: "padded" },
} satisfies Meta<typeof SystemMenuLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 탭(구역) → 목록 → 상세 패널 구조. 라우터 없이 동작한다. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("tablist", { name: "시스템 메뉴" })).toBeInTheDocument();
    await expect(c.getAllByRole("tab")).toHaveLength(3);
    await expect(c.getByRole("tab", { name: "아이템" })).toHaveAttribute("aria-selected", "true");
    await expect(c.getByRole("listbox", { name: "아이템 목록" })).toBeInTheDocument();
    await expect(c.getAllByRole("option")).toHaveLength(3);
    await expect(c.getByRole("region", { name: "회복 키트" })).toBeInTheDocument();
    await expect(c.getByText(/체력을 즉시 회복/)).toBeVisible();
  },
};

/** 키보드: 탭 → 목록 → 상세. 화살표로 구역/항목을 바꾸고 Enter로 상세에 들어간다. */
export const KeyboardPath: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("tab", { name: "아이템" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("tab", { name: "지도" })).toHaveFocus();
    await expect(c.getByRole("tab", { name: "지도" })).toHaveAttribute("aria-selected", "true");
    await userEvent.tab();
    await waitFor(() => expect(c.getByRole("option", { name: /폐허 도시/ })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("option", { name: /버려진 공장/ })).toHaveFocus();
    await waitFor(() => expect(c.getByRole("region", { name: "버려진 공장" })).toBeVisible());
    await userEvent.keyboard("{Enter}");
    await expect(c.getByRole("region", { name: "버려진 공장" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(c.getByRole("option", { name: /버려진 공장/ })).toHaveFocus();
  },
};

/** 상세 패널 전환은 --motion-panel(400ms)을 따른다. */
export const PanelTransition: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = canvasElement.querySelector<HTMLElement>("[data-slot=system-menu-detail]")!;
    await waitFor(() => expect(getComputedStyle(detail).transitionDuration).toBe("0.4s"));
    await userEvent.click(c.getByRole("option", { name: /강화 칩/ }));
    await waitFor(() => expect(c.getByRole("region", { name: "강화 칩" })).toBeVisible());
  },
};

/** 좁은 컨테이너에서는 목록 위, 상세 아래로 쌓인다. */
export const NarrowStacks: Story = {
  render: (args) => (
    <div style={{ width: "20rem" }}>
      <SystemMenuLayout {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = c.getByRole("listbox").getBoundingClientRect();
    const detail = c.getByRole("region", { name: "회복 키트" }).getBoundingClientRect();
    await expect(detail.top).toBeGreaterThanOrEqual(list.bottom - 1);
  },
};

function RouteTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = pathname.split("/")[1] || "items";
  return (
    <div>
      <Link to="/map">지도로 이동</Link>
      <SystemMenuLayout sections={SECTIONS} value={current} onValueChange={(id) => navigate(`/${id}`)} />
    </div>
  );
}

/** 탭 하나가 라우트 하나. 경로가 바뀌면 선택된 탭이 따라간다. */
export const RouteSync: Story = {
  decorators: [withRouter],
  parameters: { route: { initialEntries: ["/items"], routes: [{ path: "/*", element: <RouteTabs /> }] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("tab", { name: "아이템" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(c.getByRole("link", { name: "지도로 이동" }));
    await waitFor(() => expect(c.getByRole("tab", { name: "지도" })).toHaveAttribute("aria-selected", "true"));
    await expect(c.getByRole("tab", { name: "아이템" })).toHaveAttribute("aria-selected", "false");
    await userEvent.click(c.getByRole("tab", { name: "시스템" }));
    await waitFor(() => expect(c.getByRole("tab", { name: "시스템" })).toHaveAttribute("aria-selected", "true"));
    await expect(c.getByRole("listbox", { name: "시스템 목록" })).toBeVisible();
  },
};

function themeStory(theme: (typeof THEMES)[number], name: string): Story {
  return {
    name,
    render: (args) => (
      <div data-theme={theme} className="bg-yorha-bg p-4 text-yorha-fg">
        <SystemMenuLayout {...args} />
      </div>
    ),
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector("[data-theme]")).toHaveAttribute("data-theme", theme);
      await expect(within(canvasElement).getByRole("tablist", { name: "시스템 메뉴" })).toBeInTheDocument();
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
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <SystemMenuLayout {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("tablist", { name: "시스템 메뉴" })).toBeInTheDocument();
  },
};

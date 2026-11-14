import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { withRouter } from "../../../../.storybook/decorators";
import { RouteTransition } from "@/components/route-transition";
import BentoDashboardRoute, { meta as routeMeta } from "./bento-dashboard";

const meta = {
  title: "블록/BentoDashboard",
  component: BentoDashboardRoute,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { layout: "fullscreen", route: { path: "/" } },
} satisfies Meta<typeof BentoDashboardRoute>;
export default meta;
type Story = StoryObj<typeof meta>;

async function expectPage(canvasElement: HTMLElement, theme: string) {
  const c = within(canvasElement);
  await expect(document.documentElement).toHaveAttribute("data-theme", theme);
  await expect(c.getByRole("main", { name: "본문" })).toBeInTheDocument();
  await expect(c.getByRole("heading", { level: 1, name: "유닛 대시보드" })).toBeInTheDocument();
  await expect(c.getByRole("meter", { name: "코어 가동률" })).toBeInTheDocument();
  await expect(c.getByRole("table", { name: "유닛 목록" })).toBeInTheDocument();
  await expect(c.getByRole("list", { name: "최근 기록" })).toBeInTheDocument();
}

export const Default: Story = {
  name: "라이트 테마",
  globals: { theme: "light" },
  play: async ({ canvasElement }) => expectPage(canvasElement, "light"),
};
export const DarkTheme: Story = {
  name: "다크 테마",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => expectPage(canvasElement, "dark"),
};
export const HighContrastTheme: Story = {
  name: "고대비 테마",
  globals: { theme: "high-contrast" },
  play: async ({ canvasElement }) => expectPage(canvasElement, "high-contrast"),
};
/** Authentic 테마 단독 스토리. 원본 팔레트는 대비 검증 대상이 아니므로 a11y를 todo로 둔다. */
export const Authentic: Story = {
  name: "Authentic",
  globals: { theme: "authentic" },
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => expectPage(canvasElement, "authentic"),
};

export const Meta: Story = {
  name: "meta 제목",
  play: async () => {
    const [entry] = routeMeta() as Array<{ title: string }>;
    await expect(entry?.title).toMatch(/대시보드/);
  },
};

/** 상태 전환: 버튼은 계속 마운트되어 포커스를 유지하고, 오류의 다시 시도는 포커스를 콘텐츠 영역으로 옮긴다. */
export const StateSwitching: Story = {
  name: "상태 전환과 포커스",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole("group", { name: "표시 상태" });
    const btn = (name: string) => within(group).getByRole("button", { name });
    await expect(btn("정상")).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(btn("로딩"));
    await expect(btn("로딩")).toHaveFocus();
    await expect(btn("로딩")).toHaveAttribute("aria-pressed", "true");
    await expect((await c.findAllByRole("status")).length).toBeGreaterThan(0);
    await expect(c.queryByRole("meter", { name: "코어 가동률" })).toBeNull();

    await userEvent.click(btn("비어 있음"));
    await expect(btn("비어 있음")).toHaveFocus();
    await expect(await c.findByText("표시할 유닛이 없습니다")).toBeInTheDocument();
    await expect(c.queryByRole("status")).toBeNull();

    await userEvent.click(btn("오류"));
    await expect(btn("오류")).toHaveFocus();
    await expect(await c.findByRole("alert")).toHaveTextContent("데이터를 불러오지 못했습니다");

    await userEvent.click(c.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(c.getByRole("meter", { name: "코어 가동률" })).toBeInTheDocument());
    await expect(btn("정상")).toHaveAttribute("aria-pressed", "true");
    // 사라진 버튼 대신 body로 떨어지지 않고 콘텐츠 영역에 포커스가 있다.
    await expect(c.getByRole("region", { name: "대시보드 내용" })).toHaveFocus();
  },
};

const routes = [
  {
    path: "/",
    element: <RouteTransition />,
    children: [{ index: true, element: <BentoDashboardRoute /> }],
  },
];

const transitionSettled = () =>
  waitFor(() => expect((document as Document & { activeViewTransition?: unknown }).activeViewTransition ?? null).toBeNull(), { timeout: 3000 });

/** 목록의 유닛 이름이 상세 제목으로 이어진다(SharedElement). 뒤로 가면 목록으로 돌아온다. */
export const ListToDetail: Story = {
  name: "목록에서 상세로",
  parameters: { route: { routes } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole("link", { name: "유닛 9S" }));
    await expect(await c.findByRole("heading", { level: 2, name: "유닛 9S" })).toBeInTheDocument();
    await expect(c.queryByRole("table", { name: "유닛 목록" })).toBeNull();
    await transitionSettled();
    await userEvent.click(c.getByRole("link", { name: "목록으로" }));
    await expect(await c.findByRole("link", { name: "유닛 9S" }, { timeout: 2000 })).toBeInTheDocument();
  },
};

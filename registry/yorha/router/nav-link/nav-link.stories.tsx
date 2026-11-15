import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { useRender } from "@base-ui/react/use-render";
import { Outlet, useLocation } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";
import { NavLink } from "@/components/nav-link";

const meta = {
  title: "라우터/NavLink",
  component: NavLink,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } }, layout: "padded" },
} satisfies Meta<typeof NavLink>;
export default meta;
type Story = StoryObj<typeof meta>;

/** HUD readout of the route: mono caption + value in a 1px frame. The value keeps `data-testid="path"` for the tests. */
function CurrentPath() {
  const { pathname } = useLocation();
  return (
    <div data-slot="path-readout" className="flex items-center justify-between gap-2 border border-yorha-border px-3 py-1 font-yorha-mono text-yorha-xs text-yorha-fg-soft">
      <span>현재 경로</span>
      <span data-testid="path" className="text-yorha-fg">{pathname}</span>
    </div>
  );
}

/** A real sidebar column: 256px wide, panel ground, 1px right rule, rows with no gap (stacked like the Sidebar). */
function Nav() {
  return (
    <div className="flex h-80 w-64 max-w-[calc(100vw-2rem)] flex-col gap-4 border-r border-yorha-border bg-yorha-panel p-4">
      <nav aria-label="주 메뉴" className="flex flex-col">
        <NavLink to="/" end>홈</NavLink>
        <NavLink to="/units">유닛</NavLink>
        <NavLink to="/logs">로그</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}

const routes = [
  {
    path: "/",
    element: <Nav />,
    children: [
      { index: true, element: <CurrentPath /> },
      { path: "units", element: <CurrentPath /> },
      { path: "logs", element: <CurrentPath /> },
    ],
  },
];

/** 활성 경로의 링크만 `aria-current="page"`를 가지며, 클릭하면 경로와 선택 행이 함께 바뀝니다. */
export const Default: Story = {
  args: { to: "/", children: "홈" },
  parameters: { route: { routes, initialEntries: ["/"] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const home = await c.findByRole("link", { name: "홈" });
    await expect(home).toHaveAttribute("aria-current", "page");
    await expect(c.getByRole("link", { name: "유닛" })).not.toHaveAttribute("aria-current");
    await userEvent.click(c.getByRole("link", { name: "유닛" }));
    await waitFor(() => expect(c.getByTestId("path")).toHaveTextContent("/units"));
    await expect(c.getByRole("link", { name: "유닛" })).toHaveAttribute("aria-current", "page");
    await expect(c.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current");
    // 선택 행은 어두운 채움 색을 쓴다.
    const active = c.getByRole("link", { name: "유닛" });
    await expect(getComputedStyle(active).backgroundImage).not.toBe("none");
    await expect(getComputedStyle(active).backgroundSize).toContain("100%");
    await expect(getComputedStyle(c.getByRole("link", { name: "로그" })).backgroundSize).toContain("0%");
  },
};

/** 링크 안에 다른 인터랙티브 요소가 없고, 키보드로 이동할 수 있습니다. */
export const Keyboard: Story = {
  args: { to: "/", children: "홈" },
  parameters: { route: { routes, initialEntries: ["/units"] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const link = await c.findByRole("link", { name: "로그" });
    await expect(link.querySelector("a, button, input, select, textarea, [tabindex]")).toBeNull();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(link).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(c.getByTestId("path")).toHaveTextContent("/logs"));
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(link).toHaveFocus();
    // 포커스 링은 행 안쪽에 그려져 이웃 행을 덮지 않는다.
    await expect(getComputedStyle(link).outlineOffset).toBe("-2px");
  },
};

function MenuRow({ to, children }: { to: string; children: string }) {
  return useRender({ render: <NavLink to={to} />, props: { children } });
}

function MenuListDemo() {
  return (
    <div className="flex h-60 w-64 max-w-[calc(100vw-2rem)] flex-col gap-4 border-r border-yorha-border bg-yorha-panel p-4">
      <ul role="list" className="m-0 flex list-none flex-col p-0">
        <li><MenuRow to="/">홈</MenuRow></li>
        <li><MenuRow to="/units">유닛</MenuRow></li>
      </ul>
      <Outlet />
    </div>
  );
}

/** `render` 프롭으로 메뉴 목록의 행처럼 쓸 수 있습니다. 행 하나에 링크 하나만 렌더링됩니다. */
export const AsMenuRow: Story = {
  args: { to: "/", children: "홈" },
  parameters: {
    route: {
      routes: [{ path: "/", element: <MenuListDemo />, children: [{ index: true, element: <CurrentPath /> }, { path: "units", element: <CurrentPath /> }] }],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findAllByRole("link")).toHaveLength(2);
    await expect(c.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(c.getByRole("link", { name: "유닛" }));
    await waitFor(() => expect(c.getByRole("link", { name: "유닛" })).toHaveAttribute("aria-current", "page"));
    await expect(c.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current");
  },
};

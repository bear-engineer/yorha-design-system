import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { withRouter } from "../../../../.storybook/decorators";
import { RouteTransition } from "@/components/route-transition";
import { NavLink } from "@/components/nav-link";

const meta = {
  title: "라우터/RouteTransition",
  component: RouteTransition,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { layout: "padded" },
} satisfies Meta<typeof RouteTransition>;
export default meta;
type Story = StoryObj<typeof meta>;

function Layout() {
  return (
    <div className="flex w-96 flex-col gap-2 bg-yorha-panel p-2">
      <nav aria-label="주 메뉴" className="flex">
        <NavLink to="/" end>홈</NavLink>
        <NavLink to="/units">유닛</NavLink>
      </nav>
      <section aria-label="본문" className="border border-yorha-border p-4 text-yorha-fg-ink">
        <RouteTransition />
      </section>
    </div>
  );
}

const routes = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <h2 className="text-yorha-lg">홈 화면</h2> },
      { path: "units", element: <h2 className="text-yorha-lg">유닛 목록</h2> },
    ],
  },
];

/** 라우트를 바꾸면 새 화면이 나타납니다. 모션이 `full`일 때만 전환 래퍼가 켜집니다. */
export const Default: Story = {
  parameters: { route: { routes } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole("heading", { name: "홈 화면" })).toBeInTheDocument();
    const wrapper = canvasElement.querySelector("[data-route-transition]");
    await expect(wrapper).toHaveAttribute("data-route-transition", "on");
    await userEvent.click(c.getByRole("link", { name: "유닛" }));
    await waitFor(() => expect(c.getByRole("heading", { name: "유닛 목록" })).toBeInTheDocument());
    await expect(c.queryByRole("heading", { name: "홈 화면" })).toBeNull();
  },
};

/** `data-motion="reduced"`에서는 전환 없이 바로 최종 화면이 렌더링됩니다. */
export const ReducedMotion: Story = {
  parameters: { route: { routes } },
  globals: { motion: "reduced" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-motion", "reduced"));
    await expect(await c.findByRole("heading", { name: "홈 화면" })).toBeInTheDocument();
    await waitFor(() => expect(canvasElement.querySelector("[data-route-transition]")).toHaveAttribute("data-route-transition", "off"));
    await userEvent.click(c.getByRole("link", { name: "유닛" }));
    await waitFor(() => expect(c.getByRole("heading", { name: "유닛 목록" })).toBeInTheDocument());
    await expect(canvasElement.querySelector("[data-route-transition]")).toHaveAttribute("data-route-transition", "off");
  },
};

/** `off`도 같은 방식으로 전환을 끕니다. */
export const MotionOff: Story = {
  parameters: { route: { routes } },
  globals: { motion: "off" },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector("[data-route-transition]")).toHaveAttribute("data-route-transition", "off"));
  },
};

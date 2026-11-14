import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { Outlet, useLocation } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

const THEMES = ["light", "dark", "high-contrast"] as const;

const ITEMS: BreadcrumbItem[] = [
  { label: "홈", to: "/" },
  { label: "유닛", to: "/units" },
  { label: "A-2 기체" },
];

const meta = {
  title: "레이아웃/Breadcrumb",
  component: Breadcrumb,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } }, layout: "padded", route: { path: "/units" } },
  args: { items: ITEMS },
} satisfies Meta<typeof Breadcrumb>;
export default meta;
type Story = StoryObj<typeof meta>;

function PathProbe() {
  const { pathname } = useLocation();
  return <p data-testid="path">{pathname}</p>;
}

function Shell({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex flex-col gap-2 bg-yorha-panel p-4 text-yorha-fg">
      <Breadcrumb items={items} />
      <Outlet />
    </div>
  );
}

const routedElements = (items: BreadcrumbItem[]) => [
  {
    path: "/",
    element: <Shell items={items} />,
    children: [
      { index: true, element: <PathProbe /> },
      { path: "units", element: <PathProbe /> },
    ],
  },
];

/** 마지막 항목만 `aria-current="page"`를 가지며, 목록은 nav 랜드마크 안의 순서 목록입니다. */
export const Default: Story = {
  parameters: {
    route: { routes: routedElements(ITEMS), initialEntries: ["/units"] },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const nav = await c.findByRole("navigation", { name: "경로" });
    await expect(nav.querySelector("ol")).not.toBeNull();
    await expect(nav.querySelectorAll("li")).toHaveLength(3);
    const current = nav.querySelectorAll('[aria-current="page"]');
    await expect(current).toHaveLength(1);
    await expect(current[0]).toHaveTextContent("A-2 기체");
    await expect(c.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
    await expect(c.getByRole("link", { name: "유닛" })).not.toHaveAttribute("aria-current");
  },
};

/** 구분자는 장식이므로 보조 기술에 숨겨지고, 항목 수보다 하나 적습니다. */
export const SeparatorsHidden: Story = {
  parameters: {
    route: { routes: routedElements(ITEMS), initialEntries: ["/units"] },
  },
  play: async ({ canvasElement }) => {
    const nav = await within(canvasElement).findByRole("navigation", { name: "경로" });
    const separators = nav.querySelectorAll('[data-slot="breadcrumb-separator"]');
    await expect(separators).toHaveLength(2);
    separators.forEach((s) => expect(s).toHaveAttribute("aria-hidden", "true"));
  },
};

/** 링크는 키보드로 포커스되고 Enter로 라우터 이동합니다. */
export const KeyboardNavigate: Story = {
  parameters: {
    route: { routes: routedElements(ITEMS), initialEntries: ["/units"] },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const home = await c.findByRole("link", { name: "홈" });
    await userEvent.tab();
    await expect(home).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(c.getByTestId("path")).toHaveTextContent("/"));
    // 현재 위치 항목은 링크가 아니다.
    await expect(c.getByText("A-2 기체").closest("a")).toBeNull();
  },
};

export const ThemeGallery: Story = {
  parameters: { yorha: { manageRoot: false } },
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <Breadcrumb items={ITEMS} label={`경로 ${t}`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) {
      await expect(c.getByRole("navigation", { name: `경로 ${t}` })).toBeInTheDocument();
    }
  },
};

/** 권위 테마는 토큰 대비 기준을 통과하지 않으므로 이 스토리에서만 렌더링합니다. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" }, yorha: { manageRoot: false } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <Breadcrumb items={ITEMS} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("navigation", { name: "경로" })).toBeInTheDocument();
  },
};

/** 기본, 현재 위치(aria-current), 키보드 포커스 상태의 링크 타깃을 측정한다. */
export const States: Story = {
  parameters: {
    route: { routes: routedElements(ITEMS), initialEntries: ["/units"] },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("link", { name: "홈" })).toHaveFocus();
    await expect(c.getByText("A-2 기체")).toHaveAttribute("aria-current", "page");
    await expectTargetSize(canvasElement);
  },
};

import { expectTargetSize } from "../../../../.storybook/preview";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Outlet, useLocation } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";
import { NavLink } from "@/components/nav-link";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarInput,
  ToolbarLink,
  ToolbarSeparator,
  ToolbarToggle,
} from "./toolbar";

const THEMES = ["light", "dark", "high-contrast"] as const;

function EditorToolbar({ orientation }: { orientation?: "horizontal" | "vertical" }) {
  return (
    <div lang="ko">
      <Toolbar aria-label="편집 도구" orientation={orientation}>
        <ToolbarGroup aria-label="서식">
          <ToolbarToggle value="bold" aria-label="굵게">B</ToolbarToggle>
          <ToolbarToggle value="italic" aria-label="기울임">I</ToolbarToggle>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarButton>저장</ToolbarButton>
        <ToolbarButton disabled focusableWhenDisabled>삭제</ToolbarButton>
        <ToolbarSeparator />
        <ToolbarLink href="#help">도움말</ToolbarLink>
        <ToolbarInput aria-label="검색" placeholder="검색" />
      </Toolbar>
    </div>
  );
}


/** Page stub under the app-top bar so the bar reads as part of an app. */
function PageStub() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <p className="m-0 font-yorha-mono text-yorha-xs text-yorha-fg-soft">SEC-07 · 기체 목록</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-yorha-border bg-yorha-panel p-3 text-yorha-sm">2B · 정상</div>
        <div className="border border-yorha-border bg-yorha-panel p-3 text-yorha-sm">9S · 점검 중</div>
      </div>
    </div>
  );
}

const meta = {
  title: "컴포넌트/내비게이션/Toolbar",
  component: EditorToolbar,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[720px] max-w-full border border-yorha-border bg-yorha-bg text-yorha-fg">
        <div className="overflow-x-auto border-b border-yorha-border bg-yorha-panel p-3">
          <Story />
        </div>
        <PageStub />
      </div>
    ),
  ],
} satisfies Meta<typeof EditorToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

const setMotion = (m: string) => {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", m);
  return () => (prev === null ? root.removeAttribute("data-motion") : root.setAttribute("data-motion", prev));
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bar = c.getByRole("toolbar", { name: "편집 도구" });
    await expect(bar).toHaveAttribute("aria-orientation", "horizontal");
    await expect(within(bar).getByRole("group", { name: "서식" })).toBeVisible();
    await expect(within(bar).getAllByRole("separator").length).toBe(2);
    const bold = c.getByRole("button", { name: "굵게" });
    await expect(bold).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(bold);
    await expect(bold).toHaveAttribute("aria-pressed", "true");
  },
};

/** 툴바 전체가 탭 정지점 하나입니다. 화살표로 이동(끝에서 처음으로 순환)하고, 포커스를 둔 항목만 tabindex 0입니다. */
export const RovingTabindex: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const items = [
      c.getByRole("button", { name: "굵게" }),
      c.getByRole("button", { name: "기울임" }),
      c.getByRole("button", { name: "저장" }),
      c.getByRole("button", { name: "삭제" }),
      c.getByRole("link", { name: "도움말" }),
      c.getByRole("textbox", { name: "검색" }),
    ];
    const tabbable = () => items.filter((el) => el.tabIndex === 0);
    await expect(tabbable()).toHaveLength(1);
    await userEvent.tab();
    await expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(items[1]).toHaveFocus();
    await waitFor(() => expect(tabbable()).toEqual([items[1]]));
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    // 비활성 버튼도 focusableWhenDisabled라 순서에서 빠지지 않습니다.
    await expect(items[3]).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(items[2]).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    await expect(items[5]).toHaveFocus();
    // loopFocus wraps from the last item to the first, and back.
    await userEvent.keyboard("{ArrowRight}");
    await expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(items[5]).toHaveFocus();
    // Tab leaves the toolbar instead of walking its items.
    await userEvent.tab();
    await expect(canvasElement.contains(document.activeElement) && items.includes(document.activeElement as HTMLElement)).toBe(false);
    await userEvent.tab({ shift: true });
    await expect(items[5]).toHaveFocus();
  },
};

export const VerticalOrientation: Story = {
  args: { orientation: "vertical" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bar = c.getByRole("toolbar");
    await expect(bar).toHaveAttribute("aria-orientation", "vertical");
    await userEvent.tab();
    const bold = c.getByRole("button", { name: "굵게" });
    await expect(bold).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("button", { name: "기울임" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(bold).toHaveFocus();
  },
};

export const TogglesAndSpace: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight} ");
    await expect(c.getByRole("button", { name: "기울임" })).toHaveAttribute("aria-pressed", "true");
    await expect(c.getByRole("button", { name: "굵게" })).toHaveAttribute("aria-pressed", "false");
  },
};

/** 모션을 줄이면 눌림·호버 채움이 전환 없이 바뀝니다. */
export const ReducedMotionHasNoTransition: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const restore = setMotion("reduced");
    try {
      const c = within(canvasElement);
      for (const el of [c.getByRole("button", { name: "굵게" }), c.getByRole("button", { name: "저장" })]) {
        await waitFor(() =>
          expect(getComputedStyle(el).transitionDuration.split(",").every((d) => parseFloat(d) === 0)).toBe(true),
        );
      }
    } finally {
      restore();
    }
  },
};

function Themed() {
  return (
    <div className="grid gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          <span className="block pb-2 text-yorha-sm">{t}</span>
          <EditorToolbar />
        </div>
      ))}
    </div>
  );
}

export const Themes: Story = {
  render: () => <Themed />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("toolbar")).toHaveLength(3);
  },
};

function CurrentPath() {
  const { pathname } = useLocation();
  return <p data-testid="path" className="mt-4 text-yorha-sm">{pathname}</p>;
}

function RoutedToolbar() {
  return (
    <div lang="ko">
      <Toolbar aria-label="페이지">
        <ToolbarLink render={<NavLink to="/" end />}>홈</ToolbarLink>
        <ToolbarLink render={<NavLink to="/units" />}>유닛</ToolbarLink>
      </Toolbar>
      <Outlet />
    </div>
  );
}

/** `render`로 NavLink를 쓰면 라우터 이동과 `aria-current="page"`가 그대로 동작하고, 화살표 이동에도 참여합니다. */
export const WithRouterLinks: Story = {
  decorators: [withRouter],
  parameters: {
    route: {
      routes: [{ path: "/", element: <RoutedToolbar />, children: [{ index: true, element: <CurrentPath /> }, { path: "units", element: <CurrentPath /> }] }],
      initialEntries: ["/"],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const home = await c.findByRole("link", { name: "홈" });
    const units = c.getByRole("link", { name: "유닛" });
    await expect(home).toHaveAttribute("aria-current", "page");
    await userEvent.tab();
    await expect(home).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{Enter}");
    await waitFor(() => expect(c.getByTestId("path")).toHaveTextContent("/units"));
    await expect(units).toHaveAttribute("aria-current", "page");
    await expect(home).not.toHaveAttribute("aria-current");
  },
};

/** The authentic theme is a fidelity exercise that fails contrast on purpose, so only this story skips a11y. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <EditorToolbar />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("toolbar")).toBeVisible();
  },
};

/** State matrix: default, toggle pressed, focusable-disabled, input, link. Targets >= 24px in both densities. */
export const States: Story = {
  tags: ["!autodocs"],
  render: () => <EditorToolbar />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bold = c.getByRole("button", { name: "굵게" });
    await userEvent.click(bold);
    await expect(bold).toHaveAttribute("aria-pressed", "true");
    await expect(c.getByRole("button", { name: "삭제" })).toHaveAttribute("aria-disabled", "true");
    await expectTargetSize(canvasElement);
  },
};

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Outlet, useLocation } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";
import { NavLink } from "@/components/nav-link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu";

const THEMES = ["light", "dark", "high-contrast"] as const;

function CurrentPath() {
  const { pathname } = useLocation();
  return (
    <div className="mt-4">
      <span className="inline-flex items-stretch border border-yorha-border font-yorha-mono text-yorha-xs">
        <span className="bg-yorha-ink px-2 py-1 text-yorha-on-ink">경로</span>
        <output data-testid="path" className="px-2 py-1 text-yorha-fg">{pathname}</output>
      </span>
    </div>
  );
}

function Panel({ links }: { links: [string, string][] }) {
  return (
    <ul className="m-0 flex min-w-56 list-none flex-col p-0">
      {links.map(([to, label]) => (
        <li key={to}>
          <NavigationMenuLink render={<NavLink to={to} />}>{label}</NavigationMenuLink>
        </li>
      ))}
    </ul>
  );
}

function Demo({ container, label = "주 메뉴" }: { container?: HTMLElement | null; label?: string }) {
  return (
    <div lang="ko">
      <NavigationMenu viewport={{ container, label: `${label} 패널` }} aria-label={label}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>유닛</NavigationMenuTrigger>
            <NavigationMenuContent>
              <Panel links={[["/units", "유닛 목록"], ["/units/2b", "2B"]]} />
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>기록 보관소</NavigationMenuTrigger>
            <NavigationMenuContent>
              <Panel links={[["/logs", "로그"], ["/logs/archive", "보관함"], ["/logs/search", "검색"], ["/logs/export", "내보내기"]]} />
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink render={<NavLink to="/" end />}>홈</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <Outlet />
    </div>
  );
}

const routeFor = (element: React.ReactNode) => [
  {
    path: "/",
    element,
    children: ["units", "units/2b", "logs", "logs/archive", "logs/search", "logs/export"].map((path) => ({ path, element: <CurrentPath /> })).concat([{ path: "", element: <CurrentPath /> }]),
  },
];

const meta = {
  title: "컴포넌트/내비게이션/NavigationMenu",
  component: Demo,
  tags: ["autodocs"],
  decorators: [
    withRouter,
    (Story) => (
      <div className="min-h-80 w-[720px] max-w-full border border-yorha-border bg-yorha-bg text-yorha-fg">
        <div className="border-b border-yorha-border bg-yorha-panel px-3 py-1">
          <Story />
        </div>
        <div className="flex flex-col gap-3 p-6">
          <p className="m-0 font-yorha-mono text-yorha-xs text-yorha-fg-soft">SEC-07 · 기체 목록</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-yorha-border bg-yorha-panel p-3 text-yorha-sm">2B · 정상</div>
            <div className="border border-yorha-border bg-yorha-panel p-3 text-yorha-sm">9S · 점검 중</div>
          </div>
        </div>
      </div>
    ),
  ],
  parameters: { route: { routes: routeFor(<Demo />), initialEntries: ["/units"] } },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

const body = (el: HTMLElement) => within(el.ownerDocument.body);
const setMotion = (m: string) => {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", m);
  return () => (prev === null ? root.removeAttribute("data-motion") : root.setAttribute("data-motion", prev));
};

/** 트리거를 누르면 패널이 열리고, 현재 경로의 링크만 `aria-current="page"`를 가집니다. */
export const Default: Story = {
  // Base UI renders aria-hidden focus guards around an open panel on purpose; the hero stays open so docs show the panel.
  parameters: { a11y: { config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole("button", { name: "유닛" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    const list = await body(canvasElement).findByRole("link", { name: "유닛 목록" });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(list).toHaveAttribute("aria-current", "page");
    await expect(body(canvasElement).getByRole("link", { name: "2B" })).not.toHaveAttribute("aria-current");
    await expect(c.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current");
    // The panel stays open: the docs hero shows the open state. Escape-to-close is covered by KeyboardNavigation.
  },
};

/** 패널 안 링크를 누르면 라우터로 이동하고 패널이 닫힙니다. 활성 표시가 따라갑니다. */
export const NavigatesAndCloses: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "기록 보관소" }));
    await userEvent.click(await body(canvasElement).findByRole("link", { name: "보관함" }));
    await waitFor(() => expect(c.getByTestId("path")).toHaveTextContent("/logs/archive"));
    await waitFor(() => expect(body(canvasElement).queryByRole("link", { name: "보관함" })).toBeNull());
    await userEvent.click(c.getByRole("link", { name: "홈" }));
    await waitFor(() => expect(c.getByTestId("path")).toHaveTextContent(/^\/$/));
    await expect(c.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
  },
};

/** 화살표 키로 트리거 사이를 이동하고, ArrowDown으로 열고, Escape로 닫으면 포커스가 트리거로 돌아옵니다. */
export const KeyboardNavigation: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const units = c.getByRole("button", { name: "유닛" });
    const logs = c.getByRole("button", { name: "기록 보관소" });
    const home = c.getByRole("link", { name: "홈" });
    await userEvent.tab();
    await expect(units).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(logs).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(home).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await expect(units).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await body(canvasElement).findByRole("link", { name: "유닛 목록" });
    await expect(units).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("link", { name: "유닛 목록" })).toBeNull());
    await expect(units).toHaveFocus();
  },
};

/** 다른 트리거로 옮기면 같은 팝업이 새 패널 크기(`--popup-width`, `--popup-height`)를 따르고, 레이아웃 속성은 전환하지 않습니다. */
export const MorphsBetweenPanels: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "유닛" }));
    const first = await body(canvasElement).findByRole("link", { name: "유닛 목록" });
    const popup = first.closest<HTMLElement>('[data-slot="navigation-menu-popup"]')!;
    await waitFor(() => expect(popup.style.getPropertyValue("--popup-height")).not.toBe(""));
    const positioner = popup.parentElement!;
    const sized = popup.style.getPropertyValue("--popup-height");
    await userEvent.hover(c.getByRole("button", { name: "기록 보관소" }));
    const second = await body(canvasElement).findByRole("link", { name: "검색" });
    await expect(second.closest('[data-slot="navigation-menu-popup"]')).toBe(popup);
    await waitFor(() => expect(body(canvasElement).queryByRole("link", { name: "유닛 목록" })).toBeNull());
    await expect(c.getByRole("button", { name: "기록 보관소" })).toHaveAttribute("aria-expanded", "true");
    // Size vars follow the new panel; the popup transitions opacity/scale only, never a layout property.
    await waitFor(() => expect(popup.style.getPropertyValue("--popup-height")).not.toBe(sized));
    await expect(getComputedStyle(popup).transitionProperty).not.toMatch(/width|height|top|left|right|bottom/);
    await expect(getComputedStyle(popup).transitionProperty).toContain("opacity");
    await expect(getComputedStyle(positioner).transitionProperty).not.toMatch(/top|left|right|bottom|width|height/);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body(canvasElement).queryByRole("link", { name: "검색" })).toBeNull());
  },
};

/** 모션을 줄이면 크기·위치·슬라이드 전환이 모두 0ms라 패널이 즉시 바뀝니다. */
export const ReducedMotionHasNoTransition: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const restore = setMotion("reduced");
    try {
      const c = within(canvasElement);
      await userEvent.click(c.getByRole("button", { name: "유닛" }));
      const link = await body(canvasElement).findByRole("link", { name: "유닛 목록" });
      const popup = link.closest<HTMLElement>('[data-slot="navigation-menu-popup"]')!;
      const content = link.closest<HTMLElement>('[data-slot="navigation-menu-content"]')!;
      const zero = (el: Element) => {
        const s = getComputedStyle(el);
        return s.transitionDuration.split(",").every((d) => parseFloat(d) === 0);
      };
      await waitFor(() => {
        // Reduced keeps the popup's short opacity fade (--motion-reduced-fade) but nothing spatial (--motion-spatial 0, so the exit scale is 1).
        const ps = getComputedStyle(popup);
        expect(ps.transitionDuration.split(",").every((d) => parseFloat(d) <= 0.12)).toBe(true);
        expect(parseFloat(ps.getPropertyValue("--motion-spatial"))).toBe(0);
        expect(zero(popup.parentElement!)).toBe(true);
        expect(zero(content)).toBe(true);
        expect(zero(c.getByRole("button", { name: "유닛" }).querySelector('[data-slot="navigation-menu-icon"]')!)).toBe(true);
      });
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(body(canvasElement).queryByRole("link", { name: "유닛 목록" })).toBeNull());
    } finally {
      restore();
    }
  },
};

/** Light, dark and high-contrast only. Each popup mounts inside its own themed box. */
function ThemedMenus() {
  const [hosts, setHosts] = useState<Record<string, HTMLElement | null>>({});
  return (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div
          key={t}
          data-theme={t}
          ref={(el) => {
            if (el && hosts[t] !== el) setHosts((h) => ({ ...h, [t]: el }));
          }}
          className="relative h-72 bg-yorha-panel p-4 text-yorha-fg"
        >
          <span className="text-yorha-sm">{t}</span>
          {hosts[t] ? <Demo container={hosts[t]} label={`주 메뉴 ${t}`} /> : null}
        </div>
      ))}
    </div>
  );
}

export const Themes: Story = {
  parameters: { route: { routes: routeFor(<ThemedMenus />), initialEntries: ["/units"] } },
  play: async ({ canvasElement }) => {
    for (const t of THEMES) {
      const box = canvasElement.querySelector(`[data-theme="${t}"]`) as HTMLElement;
      await waitFor(() => expect(within(box).getByRole("button", { name: "유닛" })).toBeVisible());
      await userEvent.click(within(box).getByRole("button", { name: "유닛" }));
      await within(box).findByRole("link", { name: "유닛 목록" });
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(within(box).queryByRole("link", { name: "유닛 목록" })).toBeNull());
    }
  },
};

/** The authentic theme is a fidelity exercise that fails contrast on purpose, so only this story skips a11y. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" }, route: { routes: routeFor(<div data-theme="authentic" className="bg-yorha-panel p-4"><Demo /></div>), initialEntries: ["/units"] } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "유닛" })).toBeVisible();
  },
};

/** States: closed triggers and an open panel with links. Targets >= 24px at both densities. */
export const States: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    await expectTargetSize(canvasElement);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "기록 보관소" }));
    const link = await body(canvasElement).findByRole("link", { name: "보관함" });
    await waitFor(() => expect(link).toBeVisible());
    await expectTargetSize(link.closest("ul") as HTMLElement);
    await userEvent.keyboard("{Escape}");
    // Let the popup unmount before the a11y pass (Base UI focus guards trip aria-hidden-focus).
    await waitFor(() => expect(body(canvasElement).queryByRole("link", { name: "보관함" })).toBeNull(), { timeout: 3000 });
  },
};

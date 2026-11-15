import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { Link, useLocation, useNavigate } from "react-router";
import { withRouter } from "../../../../.storybook/decorators";
import { SystemMenuLayout, type SystemMenuSection } from "@/components/system-menu-layout";
import { Button } from "@/components/ui/button";
import { Glyph, type GlyphName } from "@/components/ui/glyph";
import { Kbd } from "@/components/ui/kbd";

const THEMES = ["light", "dark", "high-contrast"] as const;

const Count = ({ n }: { n: number }) => <span className="font-yorha-mono tabular-nums">×{n}</span>;
/** Plain text, not a Badge: the row description is dimmed (opacity-80), which would drop a bordered badge below 4.5:1. */
const NewBadge = () => <span className="font-yorha-mono">신규</span>;

/** Detail pane: glyph block, body copy, stat rows with tabular numerals. */
function Detail({ glyph, body, stats }: { glyph: GlyphName; body: string; stats: [string, string][] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center border border-yorha-border bg-yorha-panel">
          <Glyph name={glyph} scale={2} />
        </span>
        <p className="m-0 text-yorha-sm">{body}</p>
      </div>
      <dl className="m-0 grid grid-cols-[1fr_auto] border-t border-yorha-border text-yorha-sm tabular-nums">
        {stats.map(([k, v]) => (
          <div key={k} className="col-span-2 grid grid-cols-subgrid border-b border-yorha-border py-1.5">
            <dt className="text-yorha-fg-muted">{k}</dt>
            <dd className="m-0 font-yorha-mono">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2" lang="ko">
        <Button size="sm" variant="primary">사용</Button>
        <Button size="sm" variant="default">장착</Button>
        <Button size="sm" variant="default">버리기</Button>
      </div>
    </div>
  );
}

const SECTIONS: SystemMenuSection[] = [
  {
    id: "items",
    label: "아이템",
    items: [
      { id: "kit", label: "회복 키트", description: <Count n={3} />, content: <Detail glyph="plus" body="체력을 즉시 회복하는 휴대용 키트입니다. 전투 중에도 사용할 수 있습니다." stats={[["회복량", "+120 HP"], ["사용 대기", "2.0 초"], ["보유", "3 / 9"]]} /> },
      { id: "chip", label: "강화 칩", description: <NewBadge />, content: <Detail glyph="diamond-dot" body="장착 슬롯에 끼워 능력치를 높이는 소형 칩입니다." stats={[["공격력", "+8"], ["슬롯", "1 / 4"], ["보유", "1 / 9"]]} /> },
      { id: "cell", label: "에너지 셀", description: <Count n={12} />, content: <Detail glyph="disc" body="포드와 무기의 에너지를 채우는 소모품입니다." stats={[["충전량", "+40 EN"], ["보유", "12 / 20"]]} /> },
      { id: "scrap", label: "고철", description: <Count n={48} />, content: <Detail glyph="square" body="정비소에서 부품으로 교환할 수 있는 재료입니다." stats={[["교환 비율", "10 : 1"], ["보유", "48 / 99"]]} /> },
      { id: "memo", label: "기록 메모", description: <Count n={5} />, content: <Detail glyph="info" body="작전 중 수집한 기록입니다. 지도 구역마다 한 장씩 있습니다." stats={[["수집", "5 / 12"]]} /> },
      { id: "badge", label: "인식 배지", description: <Count n={1} />, content: <Detail glyph="diamond" body="유닛 식별용 배지입니다. 장비 슬롯에 걸 수 있습니다." stats={[["슬롯", "배지"], ["보유", "1 / 1"]]} /> },
      { id: "part", label: "수리 부품", description: <Count n={7} />, content: <Detail glyph="plus" body="손상된 장비 내구도를 복구하는 부품입니다." stats={[["복구량", "+30%"], ["보유", "7 / 20"]]} /> },
      { id: "key", label: "보안 키", disabled: true, description: "잠김", content: <p>잠긴 구역을 여는 열쇠입니다.</p> },
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

/** A fixed 880 x 480 system-menu screen: hard 1px frame, offset shadow, paper ground, key-hint footer. */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[480px] w-[880px] max-w-full flex-col border border-yorha-border bg-yorha-bg text-yorha-fg shadow-yorha-md">
      <div className="flex-1 p-6">{children}</div>
      <footer className="flex items-center gap-4 border-t border-yorha-border px-6 py-2 text-yorha-xs text-yorha-fg-muted">
        <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> 이동</span>
        <span><Kbd>Enter</Kbd> 선택</span>
        <span><Kbd>Esc</Kbd> 닫기</span>
      </footer>
    </div>
  );
}

const meta = {
  title: "레이아웃/SystemMenuLayout",
  component: SystemMenuLayout,
  tags: ["autodocs"],
  args: { sections: SECTIONS },
  parameters: { docs: { story: { inline: false, iframeHeight: 560 } }, layout: "padded" },
} satisfies Meta<typeof SystemMenuLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 탭(구역) → 목록 → 상세 패널 구조. 라우터 없이 동작한다. */
export const Default: Story = {
  render: (args) => (
    <Screen>
      <SystemMenuLayout {...args} />
    </Screen>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("tablist", { name: "시스템 메뉴" })).toBeInTheDocument();
    await expect(c.getAllByRole("tab")).toHaveLength(3);
    await expect(c.getByRole("tab", { name: "아이템" })).toHaveAttribute("aria-selected", "true");
    await expect(c.getByRole("listbox", { name: "아이템 목록" })).toBeInTheDocument();
    // 7 items + the locked one; the first enabled row is selected and drives the detail pane
    await expect(c.getAllByRole("option")).toHaveLength(8);
    await expect(c.getByRole("option", { name: /회복 키트/ })).toHaveAttribute("aria-selected", "true");
    await expect(c.getByRole("option", { name: /보안 키/ })).toHaveAttribute("aria-disabled", "true");
    await expect(c.getByText("회복량")).toBeVisible();
    await expect(c.getByRole("region", { name: "회복 키트" })).toBeInTheDocument();
    await expect(c.getByText(/체력을 즉시 회복/)).toBeVisible();
  },
};

/** 키보드: 탭 → 목록 → 상세. 화살표로 구역/항목을 바꾸고 Enter로 상세에 들어간다. */
export const KeyboardPath: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("tab", { name: "아이템" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("tab", { name: "지도" })).toHaveFocus();
    await expect(c.getByRole("tab", { name: "지도" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(c.getByRole("listbox", { name: "지도 목록" })).toBeVisible());
    // Let the tab-selection focus effect settle; a Tab pressed in the same frame is swallowed by the tab strip.
    await new Promise((r) => setTimeout(r, 400));
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
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = canvasElement.querySelector<HTMLElement>("[data-slot=system-menu-detail]")!;
    // M08: a row change is a high-frequency keyboard action: the detail swaps with no animation at all.
    await expect(detail).not.toHaveAttribute("data-phase");
    await expect(getComputedStyle(detail).transitionDuration).toBe("0s");
    await userEvent.click(c.getByRole("option", { name: /강화 칩/ }));
    await waitFor(() => expect(c.getByRole("region", { name: "강화 칩" })).toBeVisible());
    await expect(detail).not.toHaveAttribute("data-phase");
    await expect(detail.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSTransition && a.transitionProperty === "background-size"))).toHaveLength(0);
    await expect(parseFloat(getComputedStyle(detail).opacity)).toBe(1);
    await expect(getComputedStyle(detail).translate).toBe("none");
  },
};

/** 좁은 컨테이너에서는 목록 위, 상세 아래로 쌓인다. */
export const NarrowStacks: Story = {
  tags: ["!autodocs"],
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
      <Link to="/map" className="inline-flex min-h-[24px] items-center">지도로 이동</Link>
      <SystemMenuLayout sections={SECTIONS} value={current} onValueChange={(id) => navigate(`/${id}`)} />
    </div>
  );
}

/** 탭 하나가 라우트 하나. 경로가 바뀌면 선택된 탭이 따라간다. */
export const RouteSync: Story = {
  tags: ["!autodocs"],
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
    await waitFor(() => expect(c.getByRole("listbox", { name: "시스템 목록" })).toBeVisible());
  },
};

function themeStory(theme: (typeof THEMES)[number], name: string): Story {
  return {
    name,
    render: (args) => (
      <div data-theme={theme} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
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
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
      <SystemMenuLayout {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("tablist", { name: "시스템 메뉴" })).toBeInTheDocument();
  },
};

/** 기본 선택 탭, 탭 포커스, 목록(listbox) 포커스 상태의 타깃을 측정한다. */
export const States: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const tab = c.getByRole("tab", { name: "아이템" });
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await userEvent.tab();
    await expect(tab).toHaveFocus();
    await userEvent.tab();
    const list = c.getByRole("listbox", { name: "아이템 목록" });
    await expect(list.contains(document.activeElement)).toBe(true);
    await expectTargetSize(canvasElement);
  },
};

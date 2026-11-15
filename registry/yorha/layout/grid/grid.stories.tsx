import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useState, type ReactNode } from "react";
import { Grid } from "./grid";
import { Panel } from "@/components/ui/panel";
import { Meter } from "@/components/ui/meter";
import { Switch } from "@/components/ui/switch";
import { Glyph } from "@/components/ui/glyph";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Cell({ children }: { children: string }) {
  return <span className="block border border-yorha-border bg-yorha-panel px-2 py-1 text-yorha-fg">{children}</span>;
}

/** Test frame: the grid's container width is this width. */
function Frame({ width, children }: { width: string; children: ReactNode }) {
  return (
    <div data-frame className="max-w-full" style={{ width }}>
      {children}
    </div>
  );
}

const SIX = ["가", "나", "다", "라", "마", "바"];

function columnCount(canvasElement: HTMLElement) {
  const grid = canvasElement.querySelector('[data-slot="grid"]') as HTMLElement;
  return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
}

const meta = {
  title: "레이아웃/Grid",
  component: Grid,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } } },
  args: { columns: 3, gap: 2 },
  render: (args) => (
    <Frame width="900px">
      <Grid {...args}>
        {SIX.map((t) => (
          <Cell key={t}>{t}</Cell>
        ))}
      </Grid>
    </Frame>
  ),
} satisfies Meta<typeof Grid>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Realistic hero: a 3-column dashboard of kit Panels at different spans. The switch overlays the real column tracks. */
function ColumnGuides({ columns, gap }: { columns: 1 | 2 | 3 | 4; gap: 1 | 2 | 3 | 4 | 6 | 8 }) {
  const visible = ["", "hidden @md:block", "hidden @xl:block", "hidden @3xl:block"];
  return (
    <div data-slot="column-guides" aria-hidden="true" className="pointer-events-none absolute inset-0 [&>[data-slot=grid-frame]]:h-full [&_[data-slot=grid]]:h-full">
      <Grid columns={columns} gap={gap}>
        {visible.slice(0, columns).map((v, i) => (
          <div key={i} className={`h-full border-x border-dashed border-yorha-border bg-yorha-fg/5 ${v}`} />
        ))}
      </Grid>
    </div>
  );
}

function Dashboard() {
  const [guides, setGuides] = useState(false);
  return (
    <div className="flex w-[960px] max-w-full flex-col gap-4 bg-yorha-bg p-6 text-yorha-fg">
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 font-yorha-bold text-yorha-base">작전 현황</h2>
        <Switch checked={guides} onCheckedChange={setGuides}>
          열 가이드
        </Switch>
      </div>
      <div data-testid="dashboard" className="relative">
        <Grid columns={3} gap={4}>
          <Panel titleLevel={3} title="기체 상태" className="@xl:col-span-2">
            <div className="flex flex-col gap-4">
              <Meter label="내구도" value={82} max={100} />
              <Meter label="에너지" value={64} max={100} />
              <Meter label="통신 감도" value={31} max={100} low={40} critical={20} />
            </div>
          </Panel>
          <Panel titleLevel={3} title="오늘의 작업">
            <ul className="m-0 flex list-none flex-col p-0 text-yorha-sm">
              {["정찰 보고서 검토", "부품 보급 요청 승인", "로그 동기화 확인"].map((t) => (
                <li key={t} className="flex items-center gap-2 border-b border-yorha-border py-1.5 last:border-b-0">
                  <Glyph name="diamond-ring" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel titleLevel={3} title="가동 유닛">
            <p className="m-0 font-yorha-bold text-yorha-xl">11 / 12</p>
            <p className="m-0 text-yorha-xs text-yorha-fg-soft">정상 11 · 점검 1</p>
          </Panel>
          <Panel titleLevel={3} title="보급 요청">
            <p className="m-0 font-yorha-bold text-yorha-xl">3건</p>
            <p className="m-0 text-yorha-xs text-yorha-fg-soft">승인 대기 2 · 처리 중 1</p>
          </Panel>
          <Panel titleLevel={3} title="통신">
            <p className="m-0 font-yorha-bold text-yorha-xl">연결됨</p>
            <p className="m-0 text-yorha-xs text-yorha-fg-soft">지휘 서버 · 지연 24ms</p>
          </Panel>
          <Panel titleLevel={3} title="최근 로그" className="@xl:col-span-3">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-yorha-mono text-yorha-xs">
              <dt className="text-yorha-fg-soft">09:12</dt>
              <dd className="m-0">지휘 서버 연결 확립</dd>
              <dt className="text-yorha-fg-soft">09:40</dt>
              <dd className="m-0">A-2 기체 점검 완료, 이상 없음</dd>
              <dt className="text-yorha-fg-soft">11:05</dt>
              <dd className="m-0">보급 요청 3건 접수</dd>
            </dl>
          </Panel>
        </Grid>
        {guides && <ColumnGuides columns={3} gap={4} />}
      </div>
    </div>
  );
}

/** 12-열이 아니라 컨테이너 폭에 따라 1~3열로 바뀌는 그리드입니다. 패널은 열 개수에 맞춰 span을 달리하고, 스위치로 실제 열 트랙을 겹쳐 볼 수 있습니다. */
export const DashboardLayout: Story = {
  name: "대시보드 배치",
  render: () => <Dashboard />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "기체 상태" })).toBeInTheDocument();
    await expect(c.getByRole("region", { name: "최근 로그" })).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-slot="column-guides"]')).toBeNull();
    await userEvent.click(c.getByRole("switch", { name: "열 가이드" }));
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="column-guides"]')).not.toBeNull());
    await expect(canvasElement.querySelectorAll('[data-slot="column-guides"] > [data-slot="grid-frame"] > [data-slot="grid"] > div')).toHaveLength(3);
  },
};

export const ResponsiveColumns: Story = {
  tags: ["!autodocs"],
  name: "컨테이너 폭에 따른 열 수",
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>("[data-frame]") as HTMLElement;
    frame.style.width = "320px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(1));
    frame.style.width = "480px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(2));
    frame.style.width = "900px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(3));
    const c = within(canvasElement);
    expect(c.getByText("가")).toBeTruthy();
    expect(c.getByText("바")).toBeTruthy();
  },
};

export const MaxTwoColumns: Story = {
  tags: ["!autodocs"],
  name: "최대 2열",
  args: { columns: 2 },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>("[data-frame]") as HTMLElement;
    frame.style.width = "900px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(2));
    frame.style.width = "320px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(1));
  },
};

export const FourThemes: Story = {
  name: "3 테마",
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4">
          <Grid columns={2} gap={2}>
            <Cell>{theme}</Cell>
            <Cell>항목</Cell>
          </Grid>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const bgs = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-theme]")).map((el) =>
      getComputedStyle(el).getPropertyValue("--yorha-bg").trim(),
    );
    expect(bgs.length).toBe(3);
    for (const bg of bgs) expect(bg).not.toBe("");
    expect(bgs[1]).not.toBe(bgs[0]);
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4">
      <Grid columns={2} gap={2}>
        <Cell>authentic</Cell>
        <Cell>항목</Cell>
      </Grid>
    </div>
  ),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('[data-theme="authentic"] [data-slot="grid"]')).not.toBeNull();
  },
};

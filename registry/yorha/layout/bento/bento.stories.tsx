import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import type { CSSProperties, ReactNode } from "react";
import { Bento, BentoTile } from "./bento";
import { Badge } from "@/components/ui/badge";
import { Glyph } from "@/components/ui/glyph";
import { Meter } from "@/components/ui/meter";
import { Progress } from "@/components/ui/progress";

const THEMES = ["light", "dark", "high-contrast"] as const;
const WIDTHS = [1200, 720, 360] as const;

type Preset = "dashboard" | "feature" | "profile";
const PRESETS: Record<Preset, { area: string; label: string; link?: boolean }[]> = {
  dashboard: [
    { area: "hero", label: "개요", link: true },
    { area: "a", label: "가동률" },
    { area: "b", label: "경보" },
    { area: "chart", label: "추이", link: true },
    { area: "list", label: "작업 목록" },
  ],
  feature: [
    { area: "main", label: "주요 기능", link: true },
    { area: "side", label: "보조 기능" },
    { area: "one", label: "하나", link: true },
    { area: "two", label: "둘" },
  ],
  profile: [
    { area: "avatar", label: "프로필", link: true },
    { area: "bio", label: "소개" },
    { area: "stats", label: "통계", link: true },
    { area: "links", label: "링크" },
  ],
};

function PresetBento({ preset, id }: { preset: Preset; id: string }) {
  return (
    <Bento preset={preset} data-bento={id}>
      {PRESETS[preset].map((tile) => (
        <BentoTile key={tile.area} area={tile.area} data-tile={`${id}-${tile.area}`} href={tile.link ? `#${id}-${tile.area}` : undefined} label={tile.link ? tile.label : undefined}>
          {tile.link ? <span>{tile.label} 상세</span> : <p className="font-yorha-bold text-yorha-fg-strong">{tile.label}</p>}
        </BentoTile>
      ))}
    </Bento>
  );
}

/** Test frame: the bento's container is this wide (the wrapper scrolls instead of shrinking it). */
function Frame({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <div data-frame={width} style={{ width }}>
        {children}
      </div>
    </div>
  );
}

const tilesOf = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLElement>('[data-slot="bento-tile"]'));
const visualOrder = (tiles: HTMLElement[]) =>
  [...tiles].sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
const ids = (tiles: HTMLElement[]) => tiles.map((t) => t.dataset.tile);

const meta = {
  title: "레이아웃/Bento",
  parameters: { docs: { story: { inline: false, iframeHeight: 540 } } },
  component: Bento,
  tags: ["autodocs"],
} satisfies Meta<typeof Bento>;
export default meta;
type Story = StoryObj<typeof meta>;

const TASKS: { glyph: "check" | "diamond-ring" | "disc"; text: string; done?: boolean }[] = [
  { glyph: "check", text: "기록 동기화", done: true },
  { glyph: "check", text: "유닛 A2 재접속", done: true },
  { glyph: "diamond-ring", text: "코어 점검 보고" },
  { glyph: "disc", text: "벙커 서버 백업" },
  { glyph: "disc", text: "펌웨어 배포" },
  { glyph: "disc", text: "로그 아카이브" },
];
/** 24h load as a bar strip: integer-wide bars, crisp edges. */
const LOAD = [34, 30, 28, 26, 24, 26, 32, 40, 52, 61, 66, 70, 68, 72, 75, 71, 64, 58, 62, 69, 74, 70, 66, 61];

function Spark() {
  return (
    <svg data-slot="spark" role="img" aria-label="지난 24시간 부하 추이" viewBox={`0 0 ${LOAD.length * 4} 40`} preserveAspectRatio="none" shapeRendering="crispEdges" className="block h-16 w-full text-yorha-fg-strong" fill="currentColor">
      {LOAD.map((v, i) => (
        <rect key={i} x={i * 4} y={40 - Math.round(v / 2)} width={3} height={Math.round(v / 2)} opacity={i === LOAD.length - 1 ? 1 : 0.55} />
      ))}
    </svg>
  );
}

const Delta = ({ up, children }: { up: boolean; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 yorha-tabular text-yorha-sm text-yorha-fg">
    <Glyph name={up ? "triangle-up" : "triangle-down"} />
    {children}
  </span>
);

/** Docs hero: a desktop dashboard. 4 columns, hero 2x2, wide, tall and 1x1 tiles, real kit content. */
export const Default: Story = {
  name: "대시보드",
  render: () => (
    <div className="bg-yorha-bg p-2">
      <div data-frame style={{ width: "100%", maxWidth: 1200 }}>
        <Bento cols={4} rowHeight="sm" data-bento="dashboard">
          <BentoTile data-tile="hero" size="2x2" title="코어 가동률" glyph="diamond" meta="실시간" footer="마지막 동기화 09:10 · 벙커 서버">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="m-0 font-yorha-bold text-yorha-3xl leading-none yorha-tabular text-yorha-fg-strong">
                87.4<span className="text-yorha-lg">%</span>
              </p>
              <Delta up>+2.1</Delta>
            </div>
            <div className="flex flex-col gap-3">
              <Meter label="코어" value={87} />
              <Progress label="동기화" value={64} />
            </div>
            <dl className="m-0 grid grid-cols-3 gap-4 text-yorha-xs text-yorha-fg-soft">
              {[["온도", "41 °C"], ["전압", "12.4 V"], ["가동", "312일"]].map(([k, v]) => (
                <div key={k} className="flex min-w-0 flex-col gap-1">
                  <dt>{k}</dt>
                  <dd className="m-0 font-yorha-bold text-yorha-base yorha-tabular text-yorha-fg-strong">{v}</dd>
                </div>
              ))}
            </dl>
          </BentoTile>
          <BentoTile data-tile="metric" title="출력" glyph="disc" meta="GW" footer="전일 3.6">
            <p className="m-0 font-yorha-bold text-yorha-2xl leading-none yorha-tabular text-yorha-fg-strong">3.2</p>
            <Delta up={false}>0.4</Delta>
          </BentoTile>
          <BentoTile data-tile="status" title="상태" glyph="ring" meta="A2" footer="재접속 대기 중">
            <Badge variant="alert">오프라인</Badge>
            <p className="m-0 text-yorha-sm text-yorha-fg-soft">연결 끊김 08:42</p>
          </BentoTile>
          <BentoTile data-tile="tasks" size="tall" title="작업" glyph="square" meta="2/6" footer="전체 6건">
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-yorha-sm">
              {TASKS.map((t) => (
                <li key={t.text} className="flex items-center gap-2">
                  <Glyph name={t.glyph} className={t.done ? "text-yorha-fg-soft" : "text-yorha-fg-strong"} />
                  <span className={t.done ? "text-yorha-fg-soft line-through" : "text-yorha-fg-strong"}>{t.text}</span>
                </li>
              ))}
            </ul>
          </BentoTile>
          <BentoTile data-tile="action" title="보고서" glyph="copy" href="#report" label="보고서 열기" footer="CSV · 1.2 MB">
            <p className="m-0 text-yorha-sm text-yorha-fg-soft">주간 가동 기록을 내보냅니다</p>
          </BentoTile>
          <BentoTile data-tile="trend" size="wide" title="부하 추이" glyph="clock" meta="24h" href="#trend" footer={<span className="flex justify-between yorha-tabular"><span>00:00</span><span>12:00</span><span>24:00</span></span>}>
            <Spark />
          </BentoTile>
          <BentoTile data-tile="battery" title="배터리" glyph="lock" footer="경고 50 · 위험 20">
            <Meter label="잔량" value={46} low={50} critical={20} />
          </BentoTile>
        </Bento>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector<HTMLElement>('[data-bento="dashboard"]') as HTMLElement;
    expect(tilesOf(grid).length).toBe(7);
    const hero = grid.querySelector<HTMLElement>('[data-tile="hero"]') as HTMLElement;
    const metric = grid.querySelector<HTMLElement>('[data-tile="metric"]') as HTMLElement;
    await waitFor(() => expect(hero.getBoundingClientRect().width).toBeGreaterThan(metric.getBoundingClientRect().width * 1.9));
    expect(ids(visualOrder(tilesOf(grid)))).toEqual(ids(tilesOf(grid)));
  },
};

/** Loading, error and empty tiles in the same anatomy: the box and title row stay, only the body changes. */
export const TileStates: Story = {
  name: "타일 상태: 로딩·오류·비어 있음",
  render: () => (
    <Frame width={1000}>
      <Bento cols={4} rowHeight="sm" data-bento="states-grid">
        <BentoTile data-tile="ready" title="정상" glyph="check" meta="OK">
          <p className="m-0 font-yorha-bold text-yorha-2xl leading-none yorha-tabular text-yorha-fg-strong">128</p>
        </BentoTile>
        <BentoTile data-tile="loading" title="로딩" glyph="clock" state="loading" loadingLabel="가동률 불러오는 중" />
        <BentoTile data-tile="error" title="오류" glyph="alert" state="error" errorText="가동률을 불러오지 못했습니다" />
        <BentoTile data-tile="empty" title="비어 있음" glyph="square">
          <p className="m-0 text-yorha-sm text-yorha-fg-soft">집계된 기록이 없습니다</p>
        </BentoTile>
      </Bento>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const tile = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-tile="${id}"]`) as HTMLElement;
    expect(tile("loading").querySelectorAll('[role="status"]').length).toBe(1);
    expect(tile("error").querySelectorAll('[role="alert"]').length).toBe(1);
    // Same row, same height: a state change never resizes the tile.
    const heights = ["ready", "loading", "error", "empty"].map((id) => Math.round(tile(id).getBoundingClientRect().height));
    expect(new Set(heights).size).toBe(1);
  },
};

export const Presets: Story = {
  name: "3 프리셋 × 3 폭",
  render: () => (
    <div className="flex flex-col gap-8 bg-yorha-bg p-2">
      {(Object.keys(PRESETS) as Preset[]).map((preset) =>
        WIDTHS.map((w) => (
          <section key={`${preset}-${w}`} aria-label={`${preset} ${w}`}>
            <Frame width={w}>
              <PresetBento preset={preset} id={`${preset}-${w}`} />
            </Frame>
          </section>
        )),
      )}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const preset of Object.keys(PRESETS) as Preset[]) {
      // 360px: one column, DOM order equals visual order.
      const narrow = canvasElement.querySelector<HTMLElement>(`[data-bento="${preset}-360"]`) as HTMLElement;
      const narrowTiles = tilesOf(narrow);
      expect(narrowTiles.length).toBe(PRESETS[preset].length);
      expect(ids(visualOrder(narrowTiles))).toEqual(ids(narrowTiles));
      expect(new Set(narrowTiles.map((t) => Math.round(t.getBoundingClientRect().left))).size).toBe(1);
      expect(getComputedStyle(narrow).gridTemplateColumns.split(" ").length).toBe(1);
      // 1200px: areas apply, still row-major in DOM order, never dense.
      const wide = canvasElement.querySelector<HTMLElement>(`[data-bento="${preset}-1200"]`) as HTMLElement;
      expect(getComputedStyle(wide).gridTemplateColumns.split(" ").length).toBe(4);
      expect(ids(visualOrder(tilesOf(wide)))).toEqual(ids(tilesOf(wide)));
      expect(getComputedStyle(wide).gridAutoFlow).not.toContain("dense");
      expect(new Set(tilesOf(wide).map((t) => Math.round(t.getBoundingClientRect().left))).size).toBeGreaterThan(1);
    }
  },
};

export const ColumnCounts: Story = {
  name: "열 수 2/4/6/12",
  render: () => (
    <div className="flex flex-col gap-6 bg-yorha-bg p-2">
      {([2, 4, 6, 12] as const).map((cols) => (
        <Frame key={cols} width={1280}>
          <Bento cols={cols} data-bento={`cols-${cols}`}>
            {["가", "나", "다", "라"].map((t) => (
              <BentoTile key={t} size={t === "가" ? "2x2" : "1x1"}>
                <p>{t}</p>
              </BentoTile>
            ))}
          </Bento>
        </Frame>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const cols of [2, 4, 6, 12]) {
      const el = canvasElement.querySelector<HTMLElement>(`[data-bento="cols-${cols}"]`) as HTMLElement;
      expect(getComputedStyle(el).gridTemplateColumns.split(" ").length).toBe(cols);
    }
    const first = tilesOf(canvasElement.querySelector<HTMLElement>('[data-bento="cols-4"]') as HTMLElement)[0] as HTMLElement;
    const second = tilesOf(canvasElement.querySelector<HTMLElement>('[data-bento="cols-4"]') as HTMLElement)[1] as HTMLElement;
    expect(first.getBoundingClientRect().width).toBeGreaterThan(second.getBoundingClientRect().width * 1.9);
  },
};

export const TabOrder: Story = {
  name: "Tab 순서 = DOM 순서",
  render: () => (
    <Frame width={360}>
      <PresetBento preset="dashboard" id="tab" />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const links = Array.from(canvasElement.querySelectorAll<HTMLAnchorElement>("a"));
    expect(links.length).toBe(2);
    for (const tile of tilesOf(canvasElement)) expect(tile.querySelectorAll("a, button, input, select, textarea, [tabindex]").length).toBeLessThanOrEqual(1);
    const seen: (string | undefined)[] = [];
    for (let i = 0; i < links.length; i++) {
      await userEvent.tab();
      seen.push((document.activeElement as HTMLElement).closest<HTMLElement>('[data-slot="bento-tile"]')?.dataset.tile);
    }
    expect(seen).toEqual(links.map((a) => a.closest<HTMLElement>('[data-slot="bento-tile"]')?.dataset.tile));
  },
};

export const ContainerQuery: Story = {
  name: "컨테이너 쿼리로 타일 내부 전환",
  render: () => (
    <Frame width={360}>
      <Bento cols={4} data-bento="cq">
        <BentoTile size="2x1" data-tile="wide">
          <p>가로 타일</p>
          <p>보조 문장</p>
        </BentoTile>
        <BentoTile data-tile="one">
          <p>하나</p>
        </BentoTile>
      </Bento>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>("[data-frame]") as HTMLElement;
    const body = () => canvasElement.querySelector<HTMLElement>('[data-tile="wide"] [data-slot="bento-tile-body"]') as HTMLElement;
    await waitFor(() => expect(getComputedStyle(body()).flexDirection).toBe("column"));
    frame.style.width = "1280px";
    await waitFor(() => expect(getComputedStyle(body()).flexDirection).toBe("row"));
  },
};

export const Radius: Story = {
  name: "반경: 안쪽 = 바깥 - 패딩",
  render: () => (
    <Frame width={768}>
      <Bento cols={4}>
        <BentoTile data-tile="r">
          <p>반경</p>
        </BentoTile>
      </Bento>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLElement>('[data-tile="r"]') as HTMLElement;
    const body = tile.querySelector<HTMLElement>('[data-slot="bento-tile-body"]') as HTMLElement;
    const outerVar = getComputedStyle(tile).getPropertyValue("--yorha-radius").trim();
    expect(outerVar).not.toBe("");
    expect(tile.style.getPropertyValue("--bento-pad")).toBe("");
    expect(getComputedStyle(tile).getPropertyValue("--bento-pad").trim()).not.toBe("");
    expect(parseFloat(getComputedStyle(body).borderTopLeftRadius)).toBe(Math.max(0, parseFloat(getComputedStyle(tile).borderTopLeftRadius) - parseFloat(getComputedStyle(tile).paddingTop)));
  },
};

const stagger = (el: Element) => {
  const s = getComputedStyle(el);
  const seconds = (v: string) => v.split(",").map((x) => (x.trim().endsWith("ms") ? parseFloat(x) / 1000 : parseFloat(x)));
  return { name: s.animationName, delay: seconds(s.animationDelay)[0] as number, duration: seconds(s.animationDuration)[0] as number };
};

export const Motion: Story = {
  name: "진입 stagger와 감소된 모션",
  render: () => (
    <div className="flex flex-col gap-4">
      {(["full", "reduced"] as const).map((mode) => (
        <div key={mode} data-motion={mode} data-mode={mode}>
          <Frame width={768}>
            <Bento cols={4}>
              {[0, 1, 2, 3].map((i) => (
                <BentoTile key={i} data-tile={`${mode}-${i}`} href={i === 1 ? `#${mode}` : undefined} label={i === 1 ? "열기" : undefined}>
                  <p>{i}</p>
                </BentoTile>
              ))}
            </Bento>
          </Frame>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const tile = (mode: string, i: number) => canvasElement.querySelector(`[data-tile="${mode}-${i}"]`) as HTMLElement;
    expect(stagger(tile("full", 0)).name).toBe("yorha-stagger-in");
    expect(stagger(tile("full", 0)).delay).toBe(0);
    expect(stagger(tile("full", 2)).delay).toBeGreaterThan(0);
    expect(stagger(tile("full", 3)).delay).toBeGreaterThan(stagger(tile("full", 2)).delay);
    for (const i of [0, 2, 3]) {
      expect(stagger(tile("reduced", i)).delay).toBe(0);
      expect(stagger(tile("reduced", i)).duration).toBeLessThanOrEqual(0.12);
    }
    // M07: hover never moves the tile (edge flicker); it only changes colour and an inset frame line (box-shadow), transition on those only.
    const t = tile("full", 1);
    expect(getComputedStyle(t).transitionProperty).toBe("color, background-color, border-color, box-shadow");
    expect(getComputedStyle(t).transitionProperty).not.toMatch(/translate|transform/);
    expect(parseFloat(getComputedStyle(t).transitionDuration)).toBeGreaterThan(0);
    expect(getComputedStyle(tile("reduced", 1)).transitionDuration).toBe("0s");
    // Real :hover is exercised by stability/ (CDP pointer): the tile must not move at all.
    await Promise.all(t.getAnimations().map((a) => a.finished.catch(() => undefined))); // entry stagger done
    expect(getComputedStyle(t).translate).toBe("none");
  },
};

function ThemeBento({ id }: { id: string }) {
  return (
    <Bento preset="feature" data-bento={id}>
      <BentoTile area="main" href={`#${id}-main`} label="주요 기능">
        <span>설명</span>
      </BentoTile>
      <BentoTile area="side">
        <p>보조</p>
      </BentoTile>
      <BentoTile area="one">
        <p className="text-yorha-fg-soft">하나</p>
      </BentoTile>
      <BentoTile area="two">
        <p>둘</p>
      </BentoTile>
    </Bento>
  );
}

export const ThreeThemes: Story = {
  name: "3 테마",
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4" style={{ width: 768 } as CSSProperties}>
          <ThemeBento id={theme} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll('[data-slot="bento-tile"]').length).toBe(12);
    const bgs = THEMES.map((t) => getComputedStyle(canvasElement.querySelector(`[data-theme="${t}"] [data-slot="bento-tile"]`) as HTMLElement).backgroundColor);
    expect(new Set(bgs).size).toBeGreaterThan(1);
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4" style={{ width: 768 }}>
      <ThemeBento id="authentic" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelectorAll('[data-theme="authentic"] [data-slot="bento-tile"]').length).toBe(4);
  },
};

/** 링크 타일: 기본과 키보드 포커스 상태, 360px 폭에서 타깃을 측정한다. 호버 리프트는 CSS 전용이라 재생하지 않는다. */
export const States: Story = {
  render: () => (
    <Frame width={360}>
      <PresetBento preset="dashboard" id="states" />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const first = canvasElement.querySelector<HTMLAnchorElement>("a")!;
    await userEvent.tab();
    await expect(first).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};

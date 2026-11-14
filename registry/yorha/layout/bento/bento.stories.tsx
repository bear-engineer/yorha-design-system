import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import type { CSSProperties, ReactNode } from "react";
import { Bento, BentoTile } from "./bento";

const THEMES = ["light", "dark", "high-contrast"] as const;
const WIDTHS = [360, 768, 1280] as const;

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
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } } },
  component: Bento,
  tags: ["autodocs"],
} satisfies Meta<typeof Bento>;
export default meta;
type Story = StoryObj<typeof meta>;

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
      // 1280px: areas apply, still row-major in DOM order, never dense.
      const wide = canvasElement.querySelector<HTMLElement>(`[data-bento="${preset}-1280"]`) as HTMLElement;
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
    // Hover lift is transform-only (translate), and zero in reduced motion via --motion-spatial.
    expect(getComputedStyle(tile("full", 1)).transitionProperty).toBe("translate");
    expect(getComputedStyle(tile("full", 1)).transitionDuration).not.toBe("0s");
    expect(getComputedStyle(tile("reduced", 1)).transitionDuration).toBe("0s");
    expect(getComputedStyle(tile("reduced", 1)).getPropertyValue("--motion-spatial").trim()).toBe("0");
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

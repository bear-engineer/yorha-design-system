import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Timeline, TimelineGraph } from "./timeline";

const THEMES = ["light", "dark", "high-contrast"] as const;
const d = (day: number, h = 0, m = 0) => new Date(2026, 10, day, h, m);

const range = { start: d(16), end: d(30) };
const now = d(20, 14);

const lanes = [
  { id: "plan", label: "기획" },
  { id: "design", label: "디자인" },
  { id: "dev", label: "개발" },
  { id: "qa", label: "QA" },
  { id: "ship", label: "배포" },
];

const items = [
  { id: "req", lane: "plan", title: "요구사항 정리", start: d(16, 9), end: d(18, 18) },
  { id: "scope", lane: "plan", title: "범위 확정 회의", start: d(18, 15), dependsOn: ["req"] },
  { id: "wire", lane: "design", title: "와이어프레임", start: d(17, 9), end: d(20, 18), dependsOn: ["req"] },
  { id: "api", lane: "dev", title: "결제 API 구현", start: d(19, 10), end: d(25, 19), dependsOn: ["scope"] },
  { id: "pg", lane: "dev", title: "PG사 연동", start: d(23, 9), end: d(27, 12) },
  { id: "it", lane: "qa", title: "통합 테스트", start: d(26, 9), end: d(28, 18), dependsOn: ["api", "pg"] },
  { id: "freeze", lane: "ship", title: "코드 프리즈", start: d(27, 18) },
  { id: "rel", lane: "ship", title: "운영 배포", start: d(29, 10), dependsOn: ["it"] },
];
/** Expected order by start time. */
const TIME_ORDER = ["요구사항 정리", "와이어프레임", "범위 확정 회의", "결제 API 구현", "PG사 연동", "통합 테스트", "코드 프리즈", "운영 배포"];

const meta = {
  title: "컴포넌트/데이터/Timeline",
  component: TimelineGraph,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { label: "결제 모듈 출시 일정", lanes, items, range, now, scale: "day", onItemSelect: fn() },
  decorators: [
    (Story) => (
      <div lang="ko" className="max-w-4xl bg-yorha-panel p-4 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TimelineGraph>;
export default meta;
type Story = StoryObj<typeof meta>;

const canvasOf = (el: HTMLElement) => el.querySelector<SVGSVGElement>("svg[data-part='canvas']")!;
const leftOf = (el: Element, svg: Element) => el.getBoundingClientRect().left - svg.getBoundingClientRect().left;
const centerOf = (el: Element, svg: Element) => {
  const r = el.getBoundingClientRect();
  return r.left + r.width / 2 - svg.getBoundingClientRect().left;
};
const itemEl = (c: HTMLElement, title: string) => c.getByRole("button", { name: new RegExp(title) });

const withMotion = async (mode: string, run: () => Promise<void>) => {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", mode);
  try {
    await run();
  } finally {
    if (prev === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", prev);
  }
};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole("group", { name: "결제 모듈 출시 일정" });
    await expect(group).toHaveAttribute("data-scale", "day");
    // lane, title and start-end are in the accessible name
    const wire = itemEl(c, "와이어프레임");
    await expect(wire.getAttribute("aria-label")).toMatch(/^디자인: 와이어프레임, .*17일.*20일/);
    await expect(c.getByRole("button", { name: /^배포: 운영 배포, / })).toBeInTheDocument();
    await expect(c.getAllByRole("button").filter((b) => b.hasAttribute("data-item-id"))).toHaveLength(items.length);
    // day scale is 96px per day, axis starts at range.start (11/16 00:00)
    const svg = canvasOf(canvasElement);
    const bar = (id: string) => svg.querySelector(`[data-item-id='${id}'] [data-part='shape']`)!;
    await expect(Math.abs(leftOf(bar("wire"), svg) - 132)).toBeLessThanOrEqual(1); // 1d9h
    await expect(Math.abs(bar("wire").getBoundingClientRect().width - 3.375 * 96)).toBeLessThanOrEqual(1);
    await expect(Math.abs(leftOf(bar("req"), svg) - 9 * 4)).toBeLessThanOrEqual(1); // 0d9h
    await expect(Math.abs(leftOf(bar("api"), svg) - (3 + 10 / 24) * 96)).toBeLessThanOrEqual(1);
    // instant marker is a diamond centred on its time
    await expect(Math.abs(centerOf(bar("rel"), svg) - (13 + 10 / 24) * 96)).toBeLessThanOrEqual(1);
    await expect(svg.querySelectorAll("[data-part='dependency']")).toHaveLength(6);
  },
};

export const NowLine: Story = {
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg[data-part='canvas']")!;
    await expect(svg).not.toBeNull();
    const line = svg.querySelector("[data-part='now']")!;
    await expect(line).not.toBeNull();
    await expect(Math.abs(centerOf(line, svg) - (4 + 14 / 24) * 96)).toBeLessThanOrEqual(1); // 11/20 14:00
  },
};

export const NowOutsideRange: Story = {
  args: { now: d(2, 9) },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("svg[data-part='canvas']")).not.toBeNull();
    await expect(canvasElement.querySelector("[data-part='now']")).toBeNull();
  },
};

export const KeyboardOrder: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const first = itemEl(c, TIME_ORDER[0]!);
    first.focus();
    const seen = [first.getAttribute("data-title")];
    for (let i = 1; i < TIME_ORDER.length; i++) {
      await userEvent.keyboard("{ArrowRight}");
      seen.push((document.activeElement as HTMLElement).getAttribute("data-title"));
    }
    await expect(seen).toEqual(TIME_ORDER);
    await userEvent.keyboard("{ArrowRight}"); // clamps at the end
    await expect((document.activeElement as HTMLElement).getAttribute("data-title")).toBe("운영 배포");
    await userEvent.keyboard("{ArrowLeft}");
    await expect((document.activeElement as HTMLElement).getAttribute("data-title")).toBe("코드 프리즈");
    await userEvent.keyboard("{Home}");
    await expect((document.activeElement as HTMLElement).getAttribute("data-title")).toBe("요구사항 정리");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect((document.activeElement as HTMLElement).getAttribute("data-title")).toBe("범위 확정 회의");
    await userEvent.keyboard("{Enter}");
    await expect(args.onItemSelect).toHaveBeenCalledTimes(1);
    await expect(vi_first(args.onItemSelect as ReturnType<typeof fn>)).toMatchObject({ id: "scope", title: "범위 확정 회의" });
  },
};
const vi_first = (f: ReturnType<typeof fn>) => f.mock.calls[0]![0];

export const TableView: Story = {
  args: { view: "table" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "결제 모듈 출시 일정" });
    const rows = within(table).getAllByRole("row");
    await expect(rows).toHaveLength(items.length + 1); // + header
    const titles = rows.slice(1).map((r) => within(r).getAllByRole("cell")[1]!.textContent);
    await expect(titles).toEqual(TIME_ORDER);
    await expect(within(rows[2]!).getAllByRole("cell")[0]).toHaveTextContent("디자인");
    await expect(canvasElement.querySelector("svg[data-part='canvas']")).toBeNull();
    // the view toggle switches to the graph and back with the same items
    await userEvent.click(c.getByRole("button", { name: "그래프" }));
    await waitFor(() => expect(canvasElement.querySelector("svg[data-part='canvas']")).not.toBeNull());
    await expect(c.getAllByRole("button").filter((b) => b.hasAttribute("data-item-id"))).toHaveLength(items.length);
    await userEvent.click(c.getByRole("button", { name: "표" }));
    await expect(c.getAllByRole("row")).toHaveLength(items.length + 1);
  },
};

export const Zoom: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole("group", { name: "결제 모듈 출시 일정" });
    const width = () => canvasOf(canvasElement).getBoundingClientRect().width;
    await expect(Math.abs(width() - 14 * 96)).toBeLessThanOrEqual(1);
    await userEvent.click(c.getByRole("button", { name: "확대" }));
    await waitFor(() => expect(group).toHaveAttribute("data-scale", "hour"));
    await expect(Math.abs(width() - 14 * 24 * 64)).toBeLessThanOrEqual(1);
    const svg = canvasOf(canvasElement);
    await expect(Math.abs(leftOf(svg.querySelector("[data-item-id='wire'] [data-part='shape']")!, svg) - 33 * 64)).toBeLessThanOrEqual(1);
    await userEvent.click(c.getByRole("button", { name: "축소" }));
    await userEvent.click(c.getByRole("button", { name: "축소" }));
    await waitFor(() => expect(group).toHaveAttribute("data-scale", "week"));
    await expect(Math.abs(width() - 2 * 128)).toBeLessThanOrEqual(1);
    // keys: + zooms in, - zooms out
    c.getByRole("button", { name: /^기획: 요구사항 정리/ }).focus();
    await userEvent.keyboard("+");
    await waitFor(() => expect(group).toHaveAttribute("data-scale", "day"));
    await userEvent.keyboard("-");
    await waitFor(() => expect(group).toHaveAttribute("data-scale", "week"));
  },
};

export const EnglishLocale: Story = {
  args: { locale: "en-US", scale: "hour", range: { start: d(16), end: d(17) }, items: [{ id: "a", lane: "plan", title: "Kickoff", start: d(16, 9), end: d(16, 10) }] },
  play: async ({ canvasElement }) => {
    const ticks = Array.from(canvasOf(canvasElement).querySelectorAll("[data-part='tick']")).map((t) => t.textContent);
    await expect(ticks).toHaveLength(25);
    await expect(ticks[9]).toContain("09:00");
    await expect(ticks[0]).toMatch(/Nov/);
  },
};

export const Themes: Story = {
  args: { scale: "week" },
  render: (args) => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <TimelineGraph {...args} label={`출시 일정 ${t}`} />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <TimelineGraph {...args} label="출시 일정 authentic" />
    </div>
  ),
};

/** Item groups use yorha-stagger: delay per lane in full, ≤120ms fade in reduced, none when off. */
export const MotionTokens: Story = {
  play: async ({ canvasElement }) => {
    const wire = canvasElement.querySelector("[data-item-id='wire']")!; // lane index 1
    const dur = () => parseFloat(getComputedStyle(wire).animationDuration);
    await withMotion("full", async () => {
      await expect(dur()).toBeCloseTo(0.4, 2);
      await expect(parseFloat(getComputedStyle(wire).animationDelay)).toBeCloseTo(0.1, 2);
    });
    await withMotion("reduced", async () => {
      await waitFor(() => expect(dur()).toBeLessThanOrEqual(0.12));
      await expect(dur()).toBeGreaterThan(0);
      await expect(parseFloat(getComputedStyle(wire).animationDelay)).toBe(0);
    });
    await withMotion("off", async () => {
      await waitFor(() => expect(dur()).toBe(0));
    });
  },
};

// ---- vertical Timeline ----
const events = [
  { id: "e1", time: d(14, 9, 30), title: "배포 파이프라인 시작", body: "main 브랜치 병합 후 스테이징 배포를 시작했습니다.", status: "info" as const },
  { id: "e2", time: d(14, 9, 41), title: "스테이징 검증 통과", body: "스모크 테스트 128건이 모두 통과했습니다.", status: "success" as const },
  { id: "e3", time: d(14, 10, 5), title: "결제 지연 경고", body: "PG사 응답 시간이 평균 2.4초로 증가했습니다.", status: "warn" as const },
  { id: "e4", time: d(14, 10, 22), title: "운영 배포 실패", body: "헬스체크 3회 연속 실패로 자동 롤백되었습니다.", status: "danger" as const },
  { id: "e5", time: d(14, 11, 0), title: "원인 분석 착수" },
];

export const VerticalTimeline: StoryObj<typeof Timeline> = {
  render: () => (
    <div lang="ko" className="max-w-xl bg-yorha-panel p-4 text-yorha-fg">
      <Timeline label="배포 이력" items={events} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = c.getByRole("list", { name: "배포 이력" });
    const rows = within(list).getAllByRole("listitem");
    await expect(rows).toHaveLength(events.length);
    await expect(rows[3]).toHaveTextContent("운영 배포 실패");
    await expect(rows[3]).toHaveTextContent("위험"); // status is text, not colour only
    await expect(rows[0]!.querySelector("time")).toHaveAttribute("datetime", d(14, 9, 30).toISOString());
    await expect(rows[4]).toHaveTextContent("원인 분석 착수");
    await expect(rows[4]).not.toHaveTextContent("정보");
  },
};

export const VerticalMotion: StoryObj<typeof Timeline> = {
  render: () => (
    <div lang="ko" className="max-w-xl bg-yorha-panel p-4 text-yorha-fg">
      <Timeline label="배포 이력" items={events} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByRole("listitem");
    const row = rows[2]!;
    await withMotion("full", async () => {
      await expect(parseFloat(getComputedStyle(row).animationDuration)).toBeCloseTo(0.4, 2);
      await expect(parseFloat(getComputedStyle(row).animationDelay)).toBeCloseTo(0.2, 2);
    });
    await withMotion("reduced", async () => {
      await waitFor(() => expect(parseFloat(getComputedStyle(row).animationDuration)).toBeLessThanOrEqual(0.12));
      await expect(parseFloat(getComputedStyle(row).animationDelay)).toBe(0);
    });
    await withMotion("off", async () => {
      await waitFor(() => expect(parseFloat(getComputedStyle(row).animationDuration)).toBe(0));
    });
  },
};

export const VerticalThemes: StoryObj<typeof Timeline> = {
  render: () => (
    <div lang="ko" className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <Timeline label={`배포 이력 ${t}`} items={events} />
        </div>
      ))}
    </div>
  ),
};

export const VerticalAuthentic: StoryObj<typeof Timeline> = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div lang="ko" data-theme="authentic" className="max-w-xl bg-yorha-panel p-4 text-yorha-fg">
      <Timeline label="배포 이력 authentic" items={events} />
    </div>
  ),
};

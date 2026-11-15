import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { Timeline, TimelineGraph, type TimelineGraphHandle, type TimelineGraphItem, type TimelineLane } from "./timeline";

const THEMES = ["light", "dark", "high-contrast"] as const;
const d = (day: number, h = 0, m = 0) => new Date(2026, 10, day, h, m);

const range = { start: d(16), end: d(30) };
const now = d(20, 14);

const lanes: TimelineLane[] = [
  { id: "plan", label: "기획" },
  { id: "design", label: "디자인" },
  { id: "dev", label: "개발" },
  { id: "qa", label: "QA" },
  { id: "ship", label: "배포" },
];

const items: TimelineGraphItem[] = [
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
  args: { label: "결제 모듈 출시 일정", lanes, items, range, now, onItemSelect: fn() },
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

const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = (root: ParentNode, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
const itemEl = (c: ReturnType<typeof within>, title: string) => c.getByRole("button", { name: new RegExp(title) });
const px = (root: HTMLElement) => q(root, "[data-slot='timeline-graph']").getAttribute("data-px-per-hour");
const rel = (el: Element, canvas: Element) => el.getBoundingClientRect().left - canvas.getBoundingClientRect().left;

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

/** Day preset = 4 px per hour (96 px per day). Items are HTML buttons over an aria-hidden SVG grid; overlapping items stack in sub-lanes. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole("group", { name: "결제 모듈 출시 일정" });
    await expect(group).toHaveAttribute("data-px-per-hour", "4");
    const wire = itemEl(c, "와이어프레임");
    await expect(wire.getAttribute("aria-label")).toMatch(/^디자인: 와이어프레임, .*17일.*20일/);
    await expect(c.getByRole("button", { name: /^배포: 운영 배포, / })).toBeInTheDocument();
    await expect(qa(canvasElement, "[data-part='item-button']")).toHaveLength(items.length);
    const canvas = q(canvasElement, "[data-part='canvas']");
    const box = (id: string) => q(canvasElement, `[data-item-id='${id}']`);
    await expect(Math.abs(rel(box("wire"), canvas) - 132)).toBeLessThanOrEqual(1); // 1d9h
    await expect(Math.abs(box("wire").getBoundingClientRect().width - 3.375 * 96)).toBeLessThanOrEqual(1);
    await expect(Math.abs(rel(box("req"), canvas) - 9 * 4)).toBeLessThanOrEqual(1);
    await expect(Math.abs(rel(box("rel"), canvas) + 12 - (13 + 10 / 24) * 96)).toBeLessThanOrEqual(1); // milestone box centred on its time
    await expect(canvas.querySelectorAll("[data-part='dependency']")).toHaveLength(6);
    await expect(q(canvasElement, "svg[data-part='grid']")).toHaveAttribute("aria-hidden", "true");
  },
};

export const NowLine: Story = {
  play: async ({ canvasElement }) => {
    const canvas = q(canvasElement, "[data-part='canvas']");
    const line = q(canvasElement, "[data-part='now']");
    await expect(line).toHaveAttribute("aria-hidden", "true");
    await expect(Math.abs(rel(line, canvas) + 1 - (4 * 24 + 14) * 4)).toBeLessThanOrEqual(1); // 11/20 14:00
    await expect(q(canvasElement, "[data-part='now-tag']").textContent).toContain("현재 14:00");
    // the item that contains now carries aria-current
    await expect(qa(canvasElement, "[aria-current='time']")).toHaveLength(2);
  },
};

export const NowOutsideRange: Story = {
  args: { now: d(2, 9) },
  play: async ({ canvasElement }) => {
    await expect(q(canvasElement, "[data-part='canvas']")).not.toBeNull();
    await expect(canvasElement.querySelector("[data-part='now']")).toBeNull();
    await expect(within(canvasElement).getByRole("button", { name: "현재로" })).toBeDisabled();
  },
};

/** `initialScroll="now"` centres the now line; the jump button re-centres it. */
export const InitialScrollNow: Story = {
  args: { initialScroll: "now" },
  play: async ({ canvasElement }) => {
    const sc = q(canvasElement, "[data-part='scroller']");
    await waitFor(() => expect(sc.scrollLeft).toBeGreaterThan(0));
    const now = q(canvasElement, "[data-part='now']").getBoundingClientRect();
    const box = sc.getBoundingClientRect();
    await expect(Math.abs(now.left + 1 - (box.left + box.width / 2))).toBeLessThanOrEqual(8);
    sc.scrollLeft = 0;
    await userEvent.click(within(canvasElement).getByRole("button", { name: "현재로" }));
    await waitFor(() => expect(sc.scrollLeft).toBeGreaterThan(0));
  },
};

const zoomPlay = (name: string) => async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  // two tiers: minor ticks are at least 48 px apart, labels never overlap
  const minors = qa(canvasElement, "[data-part='tick-minor']").map((t) => t.getBoundingClientRect().left);
  for (let i = 1; i < minors.length; i++) await expect(minors[i]! - minors[i - 1]!).toBeGreaterThanOrEqual(47.5);
  await expect(qa(canvasElement, "[data-part='tick-major']").length).toBeGreaterThan(0);
  await expect(q(canvasElement, "[data-slot='timeline-graph']").getAttribute("data-zoom")).toBe(name);
};
export const ZoomHour: Story = { args: { zoom: "hour" }, play: zoomPlay("hour") };
export const ZoomDay: Story = { args: { zoom: "day" }, play: zoomPlay("day") };
export const ZoomWeek: Story = { args: { zoom: "week" }, play: zoomPlay("week") };
export const ZoomFit: Story = {
  args: { zoom: "fit" },
  play: async ({ canvasElement }) => {
    await zoomPlay("fit")({ canvasElement });
    const sc = q(canvasElement, "[data-part='scroller']");
    await expect(q(canvasElement, "[data-part='canvas']").getBoundingClientRect().width).toBeLessThanOrEqual(sc.clientWidth + 0.5);
  },
};

/** Zoom walks the integer ladder 1, 2, 4, 8 ... 64 px/h; the buttons, + / - and Ctrl+wheel use it. */
export const Zoom: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const width = () => q(canvasElement, "[data-part='canvas']").getBoundingClientRect().width;
    await expect(Math.abs(width() - 14 * 96)).toBeLessThanOrEqual(1);
    await userEvent.click(c.getByRole("button", { name: "확대" }));
    await waitFor(() => expect(px(canvasElement)).toBe("8"));
    await expect(Math.abs(width() - 14 * 24 * 8)).toBeLessThanOrEqual(1);
    await userEvent.click(c.getByRole("button", { name: "축소" }));
    await userEvent.click(c.getByRole("button", { name: "축소" }));
    await waitFor(() => expect(px(canvasElement)).toBe("2"));
    itemEl(c, "요구사항 정리").focus();
    await userEvent.keyboard("+");
    await waitFor(() => expect(px(canvasElement)).toBe("4"));
    await userEvent.keyboard("-");
    await waitFor(() => expect(px(canvasElement)).toBe("2"));
    await userEvent.click(c.getByRole("button", { name: "맞춤" }));
    await waitFor(() => expect(q(canvasElement, "[data-slot='timeline-graph']")).toHaveAttribute("data-zoom", "fit"));
  },
};

/** Controlled zoom + imperative handle. */
export const ControlledZoom: Story = {
  render: (args) => {
    const ref = React.useRef<TimelineGraphHandle>(null);
    const [zoom, setZoom] = React.useState<NonNullable<React.ComponentProps<typeof TimelineGraph>["zoom"]>>("week");
    return (
      <div className="grid gap-2">
        <button type="button" className="h-control-sm w-fit border border-yorha-border px-3 text-yorha-sm" onClick={() => ref.current?.zoomTo("hour")}>
          시간 단위로
        </button>
        <TimelineGraph {...args} zoom={zoom} onZoomChange={(z) => setZoom(z)} apiRef={ref} />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    await expect(px(canvasElement)).toBe("1");
    await userEvent.click(within(canvasElement).getByRole("button", { name: "확대" }));
    await waitFor(() => expect(px(canvasElement)).toBe("2"));
    await userEvent.click(within(canvasElement).getByRole("button", { name: "시간 단위로" }));
    await waitFor(() => expect(Number(px(canvasElement))).toBeGreaterThan(50));
  },
};

/** Roving tab stop. Left/Right = lane neighbours, Up/Down = the overlapping item of the next lane, Ctrl+Home/End, t, +/-. */
export const KeyboardOrder: Story = {
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const title = () => (document.activeElement as HTMLElement).getAttribute("data-title");
    itemEl(c, "와이어프레임").focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(title()).toBe("결제 API 구현");
    await userEvent.keyboard("{ArrowUp}");
    await expect(title()).toBe("와이어프레임");
    itemEl(c, "결제 API 구현").focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(title()).toBe("PG사 연동");
    await userEvent.keyboard("{ArrowRight}"); // clamps at the lane end
    await expect(title()).toBe("PG사 연동");
    await userEvent.keyboard("{Home}");
    await expect(title()).toBe("결제 API 구현");
    await userEvent.keyboard("{Control>}{End}{/Control}");
    await expect(title()).toBe("운영 배포");
    await userEvent.keyboard("{Control>}{Home}{/Control}");
    await expect(title()).toBe("요구사항 정리");
    await expect(qa(canvasElement, "[data-part='item-button']").filter((b) => b.tabIndex === 0)).toHaveLength(1);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect(title()).toBe("결제 API 구현");
    await userEvent.keyboard("{Enter}");
    await expect(args.onItemSelect).toHaveBeenCalledTimes(1);
    await expect((args.onItemSelect as ReturnType<typeof fn>).mock.calls[0]![0]).toMatchObject({ id: "api" });
    await expect(itemEl(c, "결제 API 구현")).toHaveAttribute("aria-pressed", "true");
    await expect(TIME_ORDER).toHaveLength(8);
  },
};

/** Hover (fine pointer) and selection change only outline and the readout; the item box never moves. */
export const HoverSelect: Story = {
  play: async ({ canvasElement }) => {
    const wire = q(canvasElement, "[data-item-id='wire'] button");
    const box = () => q(canvasElement, "[data-item-id='wire']").getBoundingClientRect().toJSON();
    const before = box();
    const readout = q(canvasElement, "[data-part='readout']");
    await userEvent.hover(wire);
    await expect(readout.textContent).toContain("와이어프레임");
    await userEvent.click(wire);
    await expect(wire).toHaveAttribute("aria-pressed", "true");
    await userEvent.unhover(wire);
    await expect(readout.textContent).toContain("와이어프레임"); // selected item stays in the strip
    await expect(box()).toEqual(before);
  },
};

export const TableView: Story = {
  args: { view: "table" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "결제 모듈 출시 일정" });
    const rows = within(table).getAllByRole("row");
    await expect(rows).toHaveLength(items.length + 1); // + header
    await expect(rows.slice(1).map((r) => r.children[1]!.textContent)).toEqual(TIME_ORDER);
    await expect(within(rows[2]!).getByRole("rowheader")).toHaveTextContent("디자인");
    await expect(canvasElement.querySelector("[data-part='canvas']")).toBeNull();
    await userEvent.click(c.getByRole("button", { name: "제목, 정렬" }));
    await expect(c.getByRole("columnheader", { name: /제목/ })).toHaveAttribute("aria-sort", "ascending");
    // the view toggle switches to the graph and back with the same items
    await userEvent.click(c.getByRole("button", { name: "그래프" }));
    await waitFor(() => expect(canvasElement.querySelector("[data-part='canvas']")).not.toBeNull());
    await expect(qa(canvasElement, "[data-part='item-button']")).toHaveLength(items.length);
    await userEvent.click(c.getByRole("button", { name: "표" }));
    await expect(c.getAllByRole("row")).toHaveLength(items.length + 1);
  },
};

/** The table region takes a tab stop only while it overflows. */
export const TableNarrow: Story = {
  args: { view: "table" },
  decorators: [(Story) => <div style={{ width: 280 }}><Story /></div>],
  play: async ({ canvasElement }) => {
    const region = q(canvasElement, "[role='region']");
    await waitFor(() => expect(region.getAttribute("tabindex")).toBe("0"));
  },
};

/** Milestones are dot-glyph diamonds on an integer grid. Bars under 40 px put the label outside. */
export const NarrowBars: Story = {
  args: { items: [...items, { id: "blip", lane: "design", title: "짧은 일정", start: d(22, 9), end: d(22, 11) }] },
  play: async ({ canvasElement }) => {
    const blip = q(canvasElement, "[data-item-id='blip']");
    await expect(blip.getBoundingClientRect().width).toBeLessThan(40);
    await expect(q(blip, "[data-part='item-label-out']").textContent).toBe("짧은 일정");
    await expect(blip.querySelector("[data-part='item-label']")).toBeNull();
    for (const g of qa(canvasElement, "[data-instant] svg[data-glyph='diamond']")) await expect(getComputedStyle(g).shapeRendering).toBe("crispedges");
  },
};

/** Under 28 rem the lane column is a 28 px rail (first grapheme, full label in `title`). */
export const Narrow360: Story = {
  args: { zoom: "fit" },
  decorators: [(Story) => <div lang="ko" className="w-[360px] bg-yorha-panel p-0 text-yorha-fg"><Story /></div>],
  play: async ({ canvasElement }) => {
    const labels = q(canvasElement, "[data-part='lane-labels']");
    await expect(labels.getBoundingClientRect().width).toBeLessThanOrEqual(29);
    await expect(q(labels, "[data-lane]")).toHaveAttribute("title", "기획");
    const group = q(canvasElement, "[data-slot='timeline-graph']").getBoundingClientRect().width;
    await expect((group - labels.getBoundingClientRect().width) / group).toBeGreaterThanOrEqual(0.6);
  },
};

const many: TimelineLane[] = Array.from({ length: 40 }, (_, i) => ({ id: `l${i}`, label: `레인 ${i + 1}` }));
/** `maxHeight`: the axis stays at the top and the lane column follows the scroll. */
export const ManyLanes: Story = {
  args: { lanes: many, items: many.map((l, i) => ({ id: `i${i}`, lane: l.id, title: `작업 ${i + 1}`, start: d(16 + (i % 10), 9), end: d(17 + (i % 10), 9) })), maxHeight: 320 },
  play: async ({ canvasElement }) => {
    const sc = q(canvasElement, "[data-part='scroller']");
    sc.scrollTop = 400;
    await waitFor(() => expect(q(canvasElement, "[data-part='lane-labels']").scrollTop).toBeGreaterThan(300));
    await expect(Math.abs(q(canvasElement, "[data-part='axis']").getBoundingClientRect().top - sc.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
  },
};

export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("일정이 없습니다");
  },
};

/** Items outside `range` are not drawn; the counts sit at the end of the readout row. */
export const OutOfRange: Story = {
  args: {
    items: [
      { id: "before", lane: "plan", title: "지난 일정", start: d(10, 9), end: d(12, 9) },
      { id: "in", lane: "plan", title: "진행 일정", start: d(18, 9), end: d(19, 9) },
      { id: "a1", lane: "plan", title: "다음 일정", start: new Date(2026, 11, 2) },
      { id: "a2", lane: "plan", title: "다다음 일정", start: new Date(2026, 11, 5), end: new Date(2026, 11, 6) },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(q(canvasElement, "[data-part='out-before']")).toHaveTextContent("1");
    await expect(q(canvasElement, "[data-part='out-after']")).toHaveTextContent("2");
    await expect(canvasElement.querySelector("[data-item-id='before']")).toBeNull();
    await expect(canvasElement.querySelector("[data-item-id='in']")).not.toBeNull();
  },
};

/** Status is a shape: done = check, warn = triangle, danger = square-x, pending = dither fill. Weekend bands are a diagonal dither. */
export const Statuses: Story = {
  args: {
    bands: true,
    items: [
      { id: "default", lane: "plan", title: "기본", start: d(16, 9), end: d(17, 9) },
      { id: "done", lane: "design", title: "완료", start: d(16, 9), end: d(18, 9), status: "done" },
      { id: "warn", lane: "dev", title: "지연 위험", start: d(16, 9), end: d(19, 9), status: "warn" },
      { id: "danger", lane: "qa", title: "차단됨", start: d(16, 9), end: d(19, 9), status: "danger" },
      { id: "pending", lane: "ship", title: "대기", start: d(16, 9), end: d(20, 9), status: "pending" },
    ],
  },
  play: async ({ canvasElement }) => {
    const glyph = (id: string) => qa(q(canvasElement, `[data-item-id='${id}']`), "svg[data-slot='glyph']").map((g) => g.getAttribute("data-glyph"));
    await expect(glyph("done")).toEqual(["check"]);
    await expect(glyph("warn")).toEqual(["triangle-up"]);
    await expect(glyph("danger")).toEqual(["square-x"]);
    await expect(glyph("default")).toEqual([]);
    await expect(getComputedStyle(q(canvasElement, "[data-item-id='pending'] [data-part='dither']")).maskImage).not.toBe("none");
    await expect(qa(canvasElement, "[data-part='band']")).toHaveLength(4); // Sat/Sun 11/21-22 and 11/28-29
  },
};

export const Compact: Story = {
  args: { density: "compact", items: items.filter((i) => i.id !== "pg") },
  play: async ({ canvasElement }) => {
    await expect(Math.round(q(canvasElement, "[data-part='lane-labels'] [data-lane='design']").getBoundingClientRect().height)).toBe(28);
  },
};

const groupLanes: TimelineLane[] = [
  { id: "plan", label: "기획", group: "제품" },
  { id: "design", label: "디자인", group: "제품" },
  { id: "dev", label: "개발", group: "엔지니어링" },
  { id: "qa", label: "QA", group: "엔지니어링" },
  { id: "ship", label: "배포" },
];
/** Group header rows are real buttons (`aria-expanded`); a collapsed group hides its lanes. */
export const Groups: Story = {
  args: { lanes: groupLanes },
  play: async ({ canvasElement }) => {
    const head = within(canvasElement).getByRole("button", { name: /^제품/ });
    await expect(head).toHaveAttribute("aria-expanded", "true");
    const n = qa(canvasElement, "[data-part='lane-labels'] [data-lane]").length;
    await userEvent.click(head);
    await expect(head).toHaveAttribute("aria-expanded", "false");
    await expect(qa(canvasElement, "[data-part='lane-labels'] [data-lane]")).toHaveLength(n - 2);
    await expect(canvasElement.querySelector("[data-item-id='wire']")).toBeNull();
    await expect(qa(canvasElement, "[data-part='group-span']").length).toBeGreaterThan(0);
  },
};

export const TimeZone: Story = {
  args: { timeZone: "America/New_York", zoom: "hour", range: { start: Date.UTC(2026, 2, 7, 5), end: Date.UTC(2026, 2, 9, 5) }, now: Date.UTC(2026, 2, 8, 12), items: [], locale: "en-US" },
  play: async ({ canvasElement }) => {
    const majors = qa(canvasElement, "[data-part='tick-major']");
    await expect(majors.length).toBeGreaterThanOrEqual(3);
    await expect(majors.map((m) => m.textContent).join("|")).toMatch(/Mar 7.*Mar 8.*Mar 9/);
  },
};

export const EnglishLocale: Story = {
  args: { locale: "en-US", zoom: "hour", range: { start: d(16), end: d(17) }, items: [{ id: "a", lane: "plan", title: "Kickoff", start: d(16, 9), end: d(16, 10) }] },
  play: async ({ canvasElement }) => {
    const minors = qa(canvasElement, "[data-part='tick-minor']").map((t) => t.textContent);
    await expect(minors).toHaveLength(24); // the 24:00 tick is the range end: no room for a label
    await expect(minors[9]).toContain("09:00");
    await expect(q(canvasElement, "[data-part='tick-major']").textContent).toMatch(/Nov 16/);
  },
};

export const Themes: Story = {
  args: { zoom: "week", bands: true },
  render: (args) => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          <TimelineGraph {...args} label={`출시 일정 ${t}`} />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <TimelineGraph {...args} label="출시 일정 authentic" />
    </div>
  ),
};

/** Item entry is `yorha-stream`: stepped, delay per lane (capped) in full, fade in reduced, none when off. */
export const MotionTokens: Story = {
  play: async ({ canvasElement }) => {
    const wire = q(canvasElement, "[data-item-id='wire']"); // lane index 1
    const cs = () => getComputedStyle(wire);
    await withMotion("full", async () => {
      await expect(cs().animationName.split(",")).toHaveLength(2);
      await expect(parseFloat(cs().animationDelay)).toBeGreaterThanOrEqual(0);
    });
    await withMotion("reduced", async () => {
      await waitFor(() => expect(Math.max(...cs().animationDuration.split(",").map(parseFloat))).toBeLessThanOrEqual(0.12));
    });
    await withMotion("off", async () => {
      await waitFor(() => expect(Math.max(...cs().animationDuration.split(",").map(parseFloat))).toBe(0));
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
    await expect(rows[4]).not.toHaveTextContent("정보");
    // markers are dot glyphs: current = target, done = diamond, pending = ring
    await expect(qa(list, "li svg[data-slot='glyph']").map((g) => g.getAttribute("data-glyph"))).toEqual(["diamond-target", "diamond", "triangle-up", "square-x", "diamond-ring"]);
    await expect(getComputedStyle(q(rows[0]!, "[data-part='rail']")).maskImage).not.toBe("none");
  },
};

export const VerticalMotion: StoryObj<typeof Timeline> = {
  render: () => (
    <div lang="ko" className="max-w-xl bg-yorha-panel p-4 text-yorha-fg">
      <Timeline label="배포 이력" items={events} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getAllByRole("listitem")[2]!;
    await withMotion("full", async () => {
      await expect(parseFloat(getComputedStyle(row).animationDuration)).toBeCloseTo(0.24, 2);
      // delay = --motion-stagger x row index (2); the token itself is owned by g-motion
      const stagger = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-stagger")) / 1000;
      await expect(parseFloat(getComputedStyle(row).animationDelay)).toBeCloseTo(stagger * 2, 2);
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
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          <Timeline label={`배포 이력 ${t}`} items={events} />
        </div>
      ))}
    </div>
  ),
};

export const VerticalAuthentic: StoryObj<typeof Timeline> = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div lang="ko" data-theme="authentic" className="max-w-xl bg-yorha-panel p-4 text-yorha-fg">
      <Timeline label="배포 이력 authentic" items={events} />
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div className="grid gap-6">
      <TimelineGraph {...args} />
      <Timeline label="배포 이력" items={events} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(qa(canvasElement, "[data-part='item-button']")).toHaveLength(items.length);
    const first = itemEl(c, "와이어프레임");
    first.focus();
    await expect(first).toHaveFocus();
    await expect(c.getByRole("list", { name: "배포 이력" })).toBeInTheDocument();
    await expectTargetSize(canvasElement);
  },
};

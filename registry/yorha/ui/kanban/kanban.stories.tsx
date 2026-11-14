import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { KanbanBoard, type KanbanColumnData } from "./kanban";

const THEMES = [
  { theme: "light", label: "라이트" },
  { theme: "dark", label: "다크" },
  { theme: "high-contrast", label: "고대비" },
] as const;

const initial: KanbanColumnData[] = [
  {
    id: "todo",
    title: "할 일",
    wipLimit: 5,
    cards: [
      { id: "card-a", title: "유닛 A 점검" },
      { id: "card-b", title: "통신 모듈 교체", meta: "우선순위: 높음" },
    ],
  },
  {
    id: "doing",
    title: "진행 중",
    wipLimit: 2,
    cards: [{ id: "card-c", title: "서버 이관" }],
  },
  { id: "done", title: "완료", cards: [] },
];

const overLimit: KanbanColumnData[] = [
  { id: "todo", title: "할 일", cards: [{ id: "card-a", title: "유닛 A 점검" }] },
  {
    id: "doing",
    title: "진행 중",
    wipLimit: 2,
    cards: [
      { id: "card-c", title: "서버 이관" },
      { id: "card-d", title: "로그 정리" },
      { id: "card-e", title: "백업 검증" },
    ],
  },
];

function Interactive({ onChange, start = initial }: { onChange?: (c: KanbanColumnData[]) => void; start?: KanbanColumnData[] }) {
  const [columns, setColumns] = useState(start);
  return (
    <KanbanBoard
      columns={columns}
      onChange={(next) => {
        setColumns(next);
        onChange?.(next);
      }}
      renderAdd={(column) => (
        <button type="button" className="border border-yorha-border px-2 py-1 text-yorha-sm text-yorha-fg focus-visible:yorha-focus">
          {column.title}에 카드 추가
        </button>
      )}
    />
  );
}

const meta = {
  title: "컴포넌트/YoRHa/Kanban",
  component: KanbanBoard,
  tags: ["autodocs"],
  args: { columns: initial, onChange: fn() },
  decorators: [
    (Story) => (
      <div lang="ko" className="bg-yorha-bg p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KanbanBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

const liveText = () => document.querySelector<HTMLElement>('[id^="DndLiveRegion"]')?.textContent ?? "";
const handleOf = (c: ReturnType<typeof within>, name: string) => c.getByRole("button", { name: `${name} 카드 이동` });
const idsOf = (cols: KanbanColumnData[]) => cols.map((col) => col.cards.map((card) => card.id));

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
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "칸반 보드" })).toBeVisible();
    await expect(c.getAllByRole("button", { name: /카드 이동$/ })).toHaveLength(3);
    await expect(c.getByText("카드가 없습니다")).toBeVisible();
    await expect(c.getByRole("button", { name: "완료에 카드 추가" })).toBeVisible();
  },
};

export const KeyboardMove: Story = {
  render: (args) => <Interactive onChange={args.onChange} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const onChange = args.onChange as ReturnType<typeof fn>;
    onChange.mockClear();
    handleOf(c, "유닛 A 점검").focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(liveText()).toMatch(/유닛 A 점검 카드를 집었습니다/));
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(liveText()).toMatch(/진행 중 열/));
    await userEvent.keyboard(" ");
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const next = onChange.mock.calls[0][0] as KanbanColumnData[];
    await expect(next[1].cards[0].id).toBe("card-a");
    await expect(idsOf(next)).toEqual([["card-b"], ["card-a", "card-c"], []]);
    await waitFor(() => expect(liveText()).toMatch(/에 놓았습니다/));
  },
};

export const EscapeCancels: Story = {
  render: (args) => <Interactive onChange={args.onChange} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const onChange = args.onChange as ReturnType<typeof fn>;
    onChange.mockClear();
    handleOf(c, "유닛 A 점검").focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(c.getByRole("list", { name: "진행 중" }).children.length).toBe(2));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(liveText()).toMatch(/이동을 취소했습니다/));
    await expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(c.getByRole("list", { name: "할 일" }).children.length).toBe(2));
    await expect(c.getByRole("list", { name: "진행 중" }).children.length).toBe(1);
    await expect(within(c.getByRole("list", { name: "할 일" })).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("유닛 A 점검");
  },
};

export const KoreanAnnouncements: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const handle = handleOf(c, "유닛 A 점검");
    const hint = document.getElementById(handle.getAttribute("aria-describedby")!);
    await expect(hint?.textContent).toMatch(/스페이스 또는 엔터 키/);
    await expect(handle).toHaveAttribute("aria-roledescription", "이동 가능한 카드");
    handle.focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(liveText()).toMatch(/[가-힣]/));
    await expect(liveText()).toMatch(/유닛 A 점검 카드를 집었습니다. 현재 할 일 열 2장 중 1번째입니다./);
    await expect(liveText()).not.toMatch(/Draggable|picked up/i);
    await userEvent.keyboard("{Escape}");
  },
};

export const WipLimitWarning: Story = {
  args: { columns: overLimit },
  render: (args) => <KanbanBoard columns={args.columns} onChange={args.onChange} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("status")).toHaveTextContent("WIP 한도 초과: 3/2");
    await expect(c.getAllByRole("status")).toHaveLength(1);
    await expect(c.getByLabelText("카드 3개, 한도 2개")).toBeVisible();
  },
};

export const ReducedMotion: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const item = () => c.getByRole("button", { name: "통신 모듈 교체 카드 이동" }).closest("li")!;
    handleOf(c, "유닛 A 점검").focus();
    await userEvent.keyboard(" ");
    await withMotion("full", async () => {
      await waitFor(() => expect(parseFloat(getComputedStyle(item()).transitionDuration)).toBeCloseTo(0.24, 2));
      await expect(getComputedStyle(item()).transitionTimingFunction).toContain(
        getComputedStyle(document.documentElement).getPropertyValue("--yorha-ease-emphasized").trim(),
      );
    });
    await withMotion("reduced", async () => {
      await waitFor(() => expect(parseFloat(getComputedStyle(item()).transitionDuration)).toBeLessThanOrEqual(0.12));
    });
    await withMotion("off", async () => {
      await waitFor(() => expect(parseFloat(getComputedStyle(item()).transitionDuration)).toBe(0));
    });
    await userEvent.keyboard("{Escape}");
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      {THEMES.map(({ theme, label }) => (
        <div key={theme} data-theme={theme} className="bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{label}</span>
          <KanbanBoard columns={overLimit} onChange={() => {}} label={`칸반 보드 (${label})`} />
        </div>
      ))}
    </div>
  ),
};

export const Authentic: Story = {
  // authentic palette is intentionally low-contrast (decorative mode): only this story skips a11y.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <Interactive />
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import type { ReactNode } from "react";
import { Split } from "./split";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Frame({ width, children }: { width: string; children: ReactNode }) {
  return (
    <div data-frame className="max-w-full" style={{ width }}>
      {children}
    </div>
  );
}

const LIST = (
  <ul className="flex flex-col gap-1">
    {["목록 1", "목록 2", "목록 3"].map((label) => (
      <li key={label}>
        <button
          type="button"
          aria-pressed={label === "목록 1"}
          className="w-full border border-yorha-border bg-yorha-panel px-2 py-1 text-left text-yorha-fg focus-visible:yorha-focus"
        >
          {label}
        </button>
      </li>
    ))}
  </ul>
);

const DETAIL = (
  <div className="flex flex-col gap-2 p-2 text-yorha-fg">
    <h2 className="text-yorha-lg">상세</h2>
    <p>선택한 항목의 내용</p>
    <button type="button" className="self-start border border-yorha-border px-2 py-1 focus-visible:yorha-focus">
      상세 실행
    </button>
  </div>
);

function panes(canvasElement: HTMLElement) {
  return {
    flow: canvasElement.querySelector('[data-slot="split"]') as HTMLElement,
    list: canvasElement.querySelector('[data-slot="split-list"]') as HTMLElement,
    detail: canvasElement.querySelector('[data-slot="split-detail"]') as HTMLElement,
    frame: canvasElement.querySelector("[data-frame]") as HTMLElement,
  };
}

const meta = {
  title: "레이아웃/Split",
  component: Split,
  tags: ["autodocs"],
  args: { list: LIST, detail: DETAIL },
  render: (args) => (
    <Frame width="900px">
      <Split {...args} />
    </Frame>
  ),
} satisfies Meta<typeof Split>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WideSideBySide: Story = {
  name: "넓은 컨테이너 · 나란히",
  play: async ({ canvasElement }) => {
    const { flow, list, detail } = panes(canvasElement);
    expect(getComputedStyle(flow).flexDirection).toBe("row");
    expect(list.getBoundingClientRect().right).toBeLessThanOrEqual(detail.getBoundingClientRect().left + 1);
    expect(Math.abs(list.getBoundingClientRect().top - detail.getBoundingClientRect().top)).toBeLessThan(1);
  },
};

export const NarrowStacks: Story = {
  name: "좁은 컨테이너 · 세로 스택",
  render: () => (
    <Frame width="360px">
      <Split list={LIST} detail={DETAIL} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const { flow, list, detail } = panes(canvasElement);
    expect(getComputedStyle(flow).flexDirection).toBe("column");
    expect(detail.getBoundingClientRect().top).toBeGreaterThanOrEqual(list.getBoundingClientRect().bottom);
  },
};

export const ResizeStacksAndBack: Story = {
  name: "폭 변경 시 스택 전환",
  play: async ({ canvasElement }) => {
    const { flow, frame } = panes(canvasElement);
    frame.style.width = "360px";
    await waitFor(() => expect(getComputedStyle(flow).flexDirection).toBe("column"));
    frame.style.width = "900px";
    await waitFor(() => expect(getComputedStyle(flow).flexDirection).toBe("row"));
  },
};

export const ReadingOrderKeyboard: Story = {
  name: "DOM 순서 = 읽기 순서 · Tab 순서",
  play: async ({ canvasElement }) => {
    const { list, detail, frame } = panes(canvasElement);
    expect(list.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const width of ["900px", "360px"]) {
      frame.style.width = width;
      (document.activeElement as HTMLElement | null)?.blur?.();
      const seen: string[] = [];
      for (let i = 0; i < 4; i++) {
        await userEvent.tab();
        seen.push((document.activeElement as HTMLElement).textContent?.trim() ?? "");
      }
      expect(seen).toEqual(["목록 1", "목록 2", "목록 3", "상세 실행"]);
    }
  },
};

export const FourThemes: Story = {
  name: "3 테마",
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-2">
          <Split list={<span className="text-yorha-fg">{theme}</span>} detail={<span className="text-yorha-fg">상세</span>} />
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
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-2">
      <Split list={<span className="text-yorha-fg">authentic</span>} detail={<span className="text-yorha-fg">상세</span>} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('[data-theme="authentic"] [data-slot="split"]')).not.toBeNull();
  },
};

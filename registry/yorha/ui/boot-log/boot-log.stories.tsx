import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { BootLog, type BootLogLine } from "@/components/ui/boot-log";

const THEMES = ["light", "dark", "high-contrast"] as const;

const LINES: BootLogLine[] = [
  { text: "메모리 점검 완료, 4096 MB 확인", status: "ok" },
  { text: "보조 전원 셀 전압 저하 감지", status: "warn" },
  { text: "냉각 루프 응답 없음, 재시도 중", status: "fail" },
  { text: "냉각 루프 재연결 성공", status: "ok" },
  { text: "네트워크 인터페이스 초기화", status: "info" },
  { text: "정적 데이터 체크섬 일치", status: "ok" },
  { text: "작전 로그 아카이브 마운트", status: "info" },
  { text: "센서 칼리브레이션 0.2초 지연", status: "warn" },
  { text: "사용자 인증 모듈 로드", status: "ok" },
  { text: "부팅 시퀀스 종료, 대기 상태 전환", status: "ok" },
];

const SHORT: BootLogLine[] = LINES.slice(0, 3);

const logOf = (c: HTMLElement) => c.querySelector<HTMLElement>('[role="log"]')!;
// Typed characters only: a fail line is not typed (it goes through Glitch), so it is not counted here.
const typedTotal = (c: HTMLElement) =>
  Array.from(logOf(c).querySelectorAll("[data-yorha-typed]")).reduce((n, el) => n + (el.textContent?.length ?? 0), 0);
// What assistive tech gets for each line in the log: the Typer's full-text node, or the Glitch text of a fail line.
// Unreached lines are not in the log at all, so they appear in neither list.
const fullTexts = (c: HTMLElement) =>
  Array.from(logOf(c).querySelectorAll("[data-slot=boot-log-line]")).map(
    (line) => (line.querySelector(".sr-only") ?? line.querySelector("[data-glitch]"))?.textContent,
  );
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const meta = {
  title: "컴포넌트/YoRHa/BootLog",
  component: BootLog,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { lines: LINES, speed: 25, gap: 200, label: "부팅 로그" },
} satisfies Meta<typeof BootLog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-sm text-yorha-fg">
      <BootLog {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const log = c.getByRole("log", { name: "부팅 로그" });
    await expect(log).toHaveAttribute("aria-live", "polite");
    // Only the reached line is in the log and the live region; the other nine are not in the accessibility tree yet.
    await waitFor(() => expect(fullTexts(canvasElement)[0]).toBe(LINES[0]?.text));
    await expect(fullTexts(canvasElement).length).toBeLessThan(LINES.length);
    await expect(logOf(canvasElement).textContent).not.toContain(LINES[LINES.length - 1]!.text);
    // The ghost reserves the final height, hidden from AT.
    const ghost = canvasElement.querySelector<HTMLElement>("[data-slot=boot-log-ghost]")!;
    await expect(ghost).toHaveAttribute("aria-hidden", "true");
    await expect(ghost.children).toHaveLength(LINES.length);
    await expect(c.getByRole("button", { name: "일시정지" })).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "건너뛰기" })).toBeInTheDocument();
  },
};

export const PauseResume: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-sm text-yorha-fg">
      <BootLog {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(typedTotal(canvasElement)).toBeGreaterThan(0));
    await userEvent.click(c.getByRole("button", { name: "일시정지" }));
    await wait(250);
    const frozen = typedTotal(canvasElement);
    await wait(600);
    await expect(typedTotal(canvasElement)).toBe(frozen);
    await userEvent.click(c.getByRole("button", { name: "재개" }));
    await waitFor(() => expect(typedTotal(canvasElement)).toBeGreaterThan(frozen));
  },
};

export const Skip: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-sm text-yorha-fg">
      <BootLog {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "건너뛰기" }));
    await waitFor(() => expect(fullTexts(canvasElement)).toEqual(LINES.map((l) => l.text)));
    await waitFor(() => expect(typedTotal(canvasElement)).toBe(LINES.filter((l) => l.status !== "fail").reduce((n, l) => n + l.text.length, 0)));
  },
};

/** FTXT-09: a finished run disables the controls with the designed disabled recipe, not opacity alone. */
export const FinishedControls: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-sm text-yorha-fg">
      <BootLog {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "건너뛰기" }));
    const skip = c.getByRole("button", { name: "건너뛰기" });
    await waitFor(() => expect(skip).toBeDisabled());
    await expect(getComputedStyle(skip).opacity).toBe("1");
  },
};

export const ReducedMotion: Story = {
  render: (args) => (
    <div className="w-[36rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-sm text-yorha-fg">
      <BootLog {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const html = document.documentElement;
    const previous = html.dataset.motion;
    try {
      html.dataset.motion = "reduced";
      await waitFor(() => expect(fullTexts(canvasElement)).toEqual(LINES.map((l) => l.text)), { timeout: 500 });
      await expect(c.queryByRole("button", { name: "일시정지" })).toBeNull();
      await expect(c.queryByRole("button", { name: "건너뛰기" })).toBeNull();
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

/** V4-266: status is a glyph plus the text tag, never colour alone; the fail line goes through Glitch and still exposes its text once. */
export const StatusGlyphs: Story = {
  args: { lines: LINES.slice(0, 4), speed: 1, gap: 1 },
  render: (args) => (
    <div className="w-[36rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-sm text-yorha-fg">
      <BootLog {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll("[data-slot=boot-log-line][data-done]")).toHaveLength(4), { timeout: 4000 });
    const tags = { ok: "[OK]", warn: "[WARN]", fail: "[FAIL]", info: "[INFO]" } as const;
    for (const status of ["ok", "warn", "fail"] as const) {
      const line = canvasElement.querySelector<HTMLElement>(`[data-slot=boot-log-line][data-status="${status}"]`)!;
      await expect(line.querySelector("svg[data-glyph]")).not.toBeNull();
      await expect(line.textContent).toContain(tags[status]);
    }
    const fail = canvasElement.querySelector<HTMLElement>('[data-status="fail"]')!;
    await expect(fail.querySelector("[data-glitch]")).toHaveTextContent(LINES[2]!.text);
    await expect(fullTexts(canvasElement)).toEqual(LINES.slice(0, 4).map((l) => l.text));
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 font-yorha-mono text-yorha-xs text-yorha-fg">
          <BootLog lines={SHORT} speed={1} gap={1} label={`부팅 로그 ${t}`} />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="w-[36rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-sm text-yorha-fg">
      <BootLog lines={SHORT} speed={1} gap={1} />
    </div>
  ),
};

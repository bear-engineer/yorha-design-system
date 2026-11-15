import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row, Sheet } from "../../../../src/docs/sheet";
import { expect, waitFor, within } from "storybook/test";
import { Progress } from "@/components/ui/progress";

const THEMES = [
  { theme: "light", label: "light" },
  { theme: "dark", label: "dark" },
  { theme: "high-contrast", label: "high-contrast" },
] as const;

const meta = {
  title: "컴포넌트/피드백/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "전송", value: 40, max: 100 },
  decorators: [
    (Story, { name }) =>
      name === "구성 한눈에" ? (
        <Story />
      ) : (
      <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <Sheet title="Progress">
      <Row label="진행 · 40%"><div className="w-80"><Progress label="전송" value={40} max={100} /></div></Row>
      <Row label="완료 · 100%"><div className="w-80"><Progress label="설치" value={100} max={100} /></div></Row>
      <Row label="일시정지"><div className="w-80"><Progress label="업로드" value={65} max={100} status="paused" /></div></Row>
      <Row label="오류"><div className="w-80"><Progress label="동기화" value={30} max={100} status="error" /></div></Row>
      <Row label="진행 중 (불확정)"><div className="w-80"><Progress label="검색" value={null} /></div></Row>
    </Sheet>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const bar = c.getByRole("progressbar", { name: "전송" });
    await expect(bar).toHaveAttribute("aria-valuenow", "40");
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
    await expect(bar).toHaveAttribute("aria-valuetext", "40%");
  },
};

export const Indeterminate: Story = {
  args: { value: null, label: "처리 중" },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole("progressbar", { name: "처리 중" });
    await expect(bar).not.toHaveAttribute("aria-valuenow");
    await expect(bar).toHaveAttribute("data-indeterminate");
  },
};

/** Indeterminate loops while mounted: a smooth linear sweep (full), an opacity pulse (reduced), static alternate cells (off). */
export const ReducedMotion: Story = {
  args: { value: null, label: "처리 중" },
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const sweep = () => c.getByRole("progressbar", { name: "처리 중" }).querySelector<HTMLElement>("[data-slot=progress-sweep]")!;
    const keys = (a: Animation) => Object.keys((a.effect as KeyframeEffect).getKeyframes()[0]!);
    try {
      html.dataset.motion = "full";
      await waitFor(() => expect(sweep().getAnimations().length).toBe(1));
      await expect(keys(sweep().getAnimations()[0]!)).toContain("transform");
      await expect(String(sweep().getAnimations()[0]!.effect!.getTiming().easing)).toBe("linear");
      html.dataset.motion = "reduced";
      await waitFor(() => {
        expect(sweep().getAnimations().length).toBe(1);
        expect(keys(sweep().getAnimations()[0]!)).toContain("opacity");
      });
      await expect(keys(sweep().getAnimations()[0]!)).not.toContain("transform");
      html.dataset.motion = "off";
      await waitFor(() => expect(sweep().getAnimations().length).toBe(0));
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {THEMES.map(({ theme, label }) => (
        <div key={theme} data-theme={theme} className="flex flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{label}</span>
          <Progress {...args} label="전송" value={62} />
          <Progress {...args} label="처리 중" value={null} />
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
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Progress {...args} />
    </div>
  ),
};

/** Every state at once: active, paused (half-height cells), error (alert frame + fill), complete, indeterminate; same box in all. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Progress label="진행" value={62} />
      <Progress label="일시 정지" value={38} status="paused" formatValue={(v) => `${v}% 정지`} />
      <Progress label="오류" value={38} status="error" formatValue={(v) => `${v}% 실패`} />
      <Progress label="완료" value={100} formatValue={() => "완료"} />
      <Progress label="처리 중" value={null} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const tracks = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=progress-track]")].map((t) => t.getBoundingClientRect().height);
    await expect(new Set(tracks)).toEqual(new Set([14]));
  },
};

/** `sm` (10 px track, 4 px cells on a 6 px pitch) next to `md`, with 25/50/75 notches. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Progress label="MD" value={62} ticks />
      <Progress label="SM" value={62} size="sm" ticks />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const heights = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=progress-track]")].map((t) => t.getBoundingClientRect().height);
    await expect(heights).toEqual([14, 10]);
    await expect(canvasElement.querySelectorAll("[data-slot=progress-tick]").length).toBe(6);
  },
};

/** The fill always rests on a whole cell: the track is a whole number of cells plus the 6 px chrome. */
export const WholeCells: Story = {
  args: { value: 62 },
  play: async ({ canvasElement }) => {
    const track = canvasElement.querySelector<HTMLElement>("[data-slot=progress-track]")!;
    await expect((track.getBoundingClientRect().width - 6) % 8).toBe(0);
    const cells = canvasElement.querySelector<HTMLElement>("[data-slot=progress-cells]")!;
    await expect(cells.getBoundingClientRect().width % 8).toBe(0);
  },
};

/** `formatValue` feeds both the visible value and `aria-valuetext`. */
export const FormatValue: Story = {
  args: { value: 3, max: 8, label: "업로드", formatValue: (v: number | null) => (v === null ? "대기" : `${v}/8 파일`) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("progressbar")).toHaveAttribute("aria-valuetext", "3/8 파일");
  },
};

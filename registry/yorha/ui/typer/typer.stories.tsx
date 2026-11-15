import { useState } from "react";
import { Row, Sheet } from "../../../../src/docs/sheet";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { YorhaProvider } from "@/components/yorha-provider";
import { Typer } from "@/components/ui/typer";

const THEMES = ["light", "dark", "high-contrast"] as const;
const SAMPLE = "시스템 점검을 시작합니다. 전원 상태 정상.";

const typerOf = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="typer"]')!;
const typedOf = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-yorha-typed]")!;
const fullOf = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="typer"] .sr-only')!;

const meta = {
  title: "컴포넌트/YoRHa/Typer",
  component: Typer,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { text: SAMPLE, speed: 20 },
} satisfies Meta<typeof Typer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <div lang="ko" className="w-[36rem] max-w-[calc(100vw-2rem)] border border-yorha-border bg-yorha-panel text-yorha-fg">
      <div className="border-b border-yorha-border px-4 py-2 font-yorha-mono text-yorha-xs text-yorha-fg-muted">통신 단말 · 채널 03</div>
      <div className="p-4 font-yorha-mono text-yorha-base"><Typer text={SAMPLE} speed={20} /></div>
    </div>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
  render: (args) => (
    <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-base text-yorha-fg">
      <Typer {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(typerOf(canvasElement)).toBeTruthy());
    expect(fullOf(canvasElement).textContent).toBe(SAMPLE);
    expect(typedOf(canvasElement).textContent!.length).toBeLessThan(SAMPLE.length);
    await waitFor(() => expect(typedOf(canvasElement).textContent).toBe(SAMPLE), { timeout: 4000 });
    await expect(typerOf(canvasElement)).toHaveAttribute("data-state", "done");
  },
};

function PausableTyper() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 bg-yorha-panel p-6 font-yorha-mono text-yorha-base text-yorha-fg">
      <button type="button" onClick={() => setPaused((p) => !p)} className="self-start border border-yorha-border px-3 py-1">
        {paused ? "재개" : "일시정지"}
      </button>
      <Typer text={SAMPLE} speed={20} paused={paused} />
    </div>
  );
}

/** V4-261: multi-line text at 360 px. The invisible full-text copy reserves the box, so the height never changes while typing. */
export const MultiLine360: Story = {
  args: { text: "Recovered sector log entry: the archive index was rebuilt after the fault and every record now resolves to a stable address in the lower grid.", speed: 4 },
  render: (args) => (
    <div style={{ width: 360 }} className="max-w-full bg-yorha-panel p-0 text-yorha-sm text-yorha-fg">
      <Typer {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const typer = canvasElement.querySelector<HTMLElement>("[data-slot=typer]")!;
    const h0 = typer.getBoundingClientRect().height;
    await expect(h0).toBeGreaterThan(40);
    await waitFor(() => expect(typer.dataset.state).toBe("done"), { timeout: 5000 });
    await expect(Math.abs(typer.getBoundingClientRect().height - h0)).toBeLessThan(0.5);
  },
};

export const PauseResume: Story = {
  render: () => <PausableTyper />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "일시정지" }));
    await new Promise((r) => setTimeout(r, 200));
    const frozen = typedOf(canvasElement).textContent!;
    await new Promise((r) => setTimeout(r, 500));
    await expect(typedOf(canvasElement).textContent).toBe(frozen);
    await userEvent.click(c.getByRole("button", { name: "재개" }));
    await waitFor(() => expect(typedOf(canvasElement).textContent!.length).toBeGreaterThan(frozen.length));
  },
};

function SkippableTyper() {
  const [all, setAll] = useState(false);
  return (
    <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 bg-yorha-panel p-6 font-yorha-mono text-yorha-base text-yorha-fg">
      <button type="button" onClick={() => setAll(true)} className="self-start border border-yorha-border px-3 py-1">
        전부 표시
      </button>
      <Typer text={SAMPLE} speed={60} revealAll={all} />
    </div>
  );
}

export const Skip: Story = {
  render: () => <SkippableTyper />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "전부 표시" }));
    await waitFor(() => expect(typedOf(canvasElement).textContent).toBe(SAMPLE));
    await expect(fullOf(canvasElement).textContent).toBe(SAMPLE);
  },
};

export const ReducedMotion: Story = {
  render: (args) => (
    <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-base text-yorha-fg">
      <Typer {...args} speed={200} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    try {
      html.dataset.motion = "reduced";
      await waitFor(() => expect(typedOf(canvasElement).textContent).toBe(SAMPLE), { timeout: 500 });
      await expect(typerOf(canvasElement)).toHaveAttribute("data-state", "done");
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

export const SoundOffByDefault: Story = {
  render: (args) => (
    <YorhaProvider>
      <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-base text-yorha-fg">
        <Typer {...args} sound />
      </div>
    </YorhaProvider>
  ),
  parameters: { yorha: { manageRoot: false } },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(typedOf(canvasElement).textContent).toBe(SAMPLE), { timeout: 4000 });
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col gap-2 bg-yorha-panel p-4 font-yorha-mono text-yorha-sm text-yorha-fg">
          <span>{t}</span>
          <Typer {...args} speed={1} />
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
    <div data-theme="authentic" className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 font-yorha-mono text-yorha-base text-yorha-fg">
      <Typer {...args} speed={1} />
    </div>
  ),
};

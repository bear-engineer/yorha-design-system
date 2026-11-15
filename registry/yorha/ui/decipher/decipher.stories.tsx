import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";

import { useRef, useState } from "react";
import { userEvent } from "storybook/test";

import { Row, Sheet } from "../../../../src/docs/sheet";
import { Decipher, Glitch, type GlitchHandle } from "@/components/ui/decipher";

const meta = {
  title: "컴포넌트/YoRHa/Decipher",
  component: Decipher,
  tags: ["autodocs"],
  args: { text: "시스템 복호화 완료" },
} satisfies Meta<typeof Decipher>;
export default meta;
type Story = StoryObj<typeof meta>;

function setMotion(mode: string) {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", mode);
  return () => {
    if (prev === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", prev);
  };
}

// glyphs still scrambled (differ from the final text) must come from the expected pool
const scrambledOnly = (layer: HTMLElement, final: string) =>
  Array.from(layer.textContent ?? "").filter((c, i) => c !== Array.from(final)[i] && c.trim() !== "");

const glyphLayer = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-slot="decipher-glyphs"]')!;

function Heading({ text }: { text: string }) {
  return (
    <h2 className="text-yorha-xl font-yorha-medium tracking-yorha-wide">
      <Decipher text={text} />
    </h2>
  );
}

/** Docs hero: a boot-panel headline that deciphers into a finished line, with the three scripts it supports. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: (args) => (
    <Sheet title="Decipher" wide>
      <h2 className="text-yorha-xl font-yorha-medium text-yorha-fg-strong"><Decipher text={args.text} /></h2>
      <Row label="한국어">{<Decipher text="기억 데이터 복구 중" />}</Row>
      <Row label="日本語">{<Decipher text="システム起動シーケンス" />}</Row>
      <Row label="Latin"><Decipher text="MEMORY UNIT 9S ONLINE" /></Row>
    </Sheet>
  ),
  play: async ({ canvasElement }) => {
    // every line settles into its final text and the box does not change width while it runs
    const roots = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-slot="decipher"]'));
    // measure after the webfonts settle: a font swap at mount resizes every line and is not the scramble
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const w0 = roots.map((r) => r.getBoundingClientRect().width);
    await waitFor(() => expect(roots.every((r) => r.dataset.state === "done")).toBe(true), { timeout: 2500 });
    roots.forEach((r, i) => expect(r.getBoundingClientRect().width).toBeCloseTo(w0[i]!, 1));
  },
};

export const Korean: Story = {
  beforeEach: () => setMotion("full"),
  render: (args) => <Heading text={args.text} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // accessible name is the final text while the animation is still running
    const heading = canvas.getByRole("heading", { name: args.text });
    const layer = glyphLayer(heading);
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.textContent).not.toBe(args.text);
    expect(canvas.getByRole("heading", { name: args.text })).toBeTruthy();
    // Korean text scrambles with Hangul glyphs only
    expect(scrambledOnly(layer, args.text).every((c) => /\p{Script=Hangul}/u.test(c))).toBe(true);
    await waitFor(() => expect(layer.textContent).toBe(args.text), { timeout: 2000 });
    expect(canvas.getByRole("heading", { name: args.text })).toBeTruthy();
  },
};

export const Japanese: Story = {
  args: { text: "データ解析を開始" },
  beforeEach: () => setMotion("full"),
  render: (args) => <Heading text={args.text} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole("heading", { name: args.text });
    const layer = glyphLayer(heading);
    expect(layer.textContent).not.toBe(args.text);
    expect(scrambledOnly(layer, args.text).every((c) => /\p{Script=Katakana}/u.test(c))).toBe(true);
    await waitFor(() => expect(layer.textContent).toBe(args.text), { timeout: 2000 });
  },
};

export const English: Story = {
  args: { text: "UNIT 2B ONLINE" },
  beforeEach: () => setMotion("full"),
  render: (args) => <Heading text={args.text} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole("heading", { name: args.text });
    const layer = glyphLayer(heading);
    expect(layer.textContent).not.toBe(args.text);
    expect(layer.textContent?.length).toBe(args.text.length);
    // the scramble never wraps: glyph layer stays inside the reserved box on a single line
    const box = layer.parentElement!;
    const lineHeight = parseFloat(getComputedStyle(box).lineHeight);
    const reserved = box.getBoundingClientRect();
    let samples = 0;
    const sample = () => {
      samples += 1;
      const range = document.createRange();
      range.selectNodeContents(layer);
      expect(range.getBoundingClientRect().height).toBeLessThanOrEqual(reserved.height + 0.5);
      expect(box.getBoundingClientRect().height).toBeLessThanOrEqual(lineHeight + 0.5);
      expect(box.getBoundingClientRect().width).toBeCloseTo(reserved.width, 0);
    };
    sample();
    const timer = window.setInterval(sample, 40);
    try {
      await waitFor(() => expect(layer.textContent).toBe(args.text), { timeout: 2000 });
    } finally {
      window.clearInterval(timer);
    }
    expect(samples).toBeGreaterThan(3);
    expect(box.getBoundingClientRect().width).toBeCloseTo(reserved.width, 0);
  },
};

export const ReducedMotion: Story = {
  tags: ["!autodocs"],
  beforeEach: () => setMotion("reduced"),
  render: (args) => <Heading text={args.text} />,
  play: async ({ canvasElement, args }) => {
    const heading = within(canvasElement).getByRole("heading", { name: args.text });
    // synchronous: no waiting, glyph layer already shows the final text
    expect(glyphLayer(heading).textContent).toBe(args.text);
    expect(glyphLayer(heading).getAttribute("aria-hidden")).toBe("true");
  },
};

/** Stubs matchMedia for the reduced-motion query and clears data-motion (no provider). Returns cleanup. */
function stubOsReducedMotion(reduce: boolean) {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.removeAttribute("data-motion");
  const original = window.matchMedia;
  window.matchMedia = (query: string) =>
    ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  return () => {
    window.matchMedia = original;
    if (prev !== null) root.setAttribute("data-motion", prev);
  };
}

/** FTXT-04: with no provider, the OS reduced-motion preference alone makes the final text show at once. */
export const OsReducedMotion: Story = {
  tags: ["!autodocs"],
  beforeEach: () => stubOsReducedMotion(true),
  render: (args) => <Heading text={args.text} />,
  play: async ({ canvasElement, args }) => {
    const heading = within(canvasElement).getByRole("heading", { name: args.text });
    expect(glyphLayer(heading).textContent).toBe(args.text);
  },
};

export const MotionOff: Story = {
  tags: ["!autodocs"],
  beforeEach: () => setMotion("off"),
  render: (args) => <Heading text={args.text} />,
  play: async ({ canvasElement, args }) => {
    const heading = within(canvasElement).getByRole("heading", { name: args.text });
    expect(glyphLayer(heading).textContent).toBe(args.text);
  },
};

export const Themes: Story = {
  beforeEach: () => setMotion("full"),
  render: () => (
    <div className="grid gap-4">
      {(["light", "dark", "high-contrast"] as const).map((theme) => (
        <div
          key={theme}
          data-theme={theme}
          className="bg-yorha-bg text-yorha-fg-strong p-4"
        >
          <Heading text={`${theme} — 시스템 복호화`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const headings = within(canvasElement).getAllByRole("heading");
    expect(headings).toHaveLength(3);
    for (const h of headings) expect(glyphLayer(h).getAttribute("aria-hidden")).toBe("true");
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  beforeEach: () => setMotion("full"),
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg text-yorha-fg-strong p-4">
      <Heading text="authentic — 시스템 복호화" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const heading = within(canvasElement).getByRole("heading");
    expect(glyphLayer(heading).getAttribute("aria-hidden")).toBe("true");
  },
};

/** V4-265: `trigger="inview"` stays idle off screen, runs once when scrolled into view, and does not run again. */
export const Inview: Story = {
  tags: ["!autodocs"],
  beforeEach: () => setMotion("full"),
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div className="h-[220vh] bg-yorha-panel p-6 text-yorha-fg">
      <div className="mt-[130vh]">
        <Decipher {...args} trigger="inview" />
      </div>
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const el = canvasElement.querySelector<HTMLElement>('[data-slot="decipher"]')!;
    await expect(el.dataset.state).toBe("idle");
    el.scrollIntoView({ block: "center" });
    await waitFor(() => expect(el.dataset.state).toBe("done"), { timeout: 4000 });
    await expect(el.textContent).toContain(args.text);
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
    el.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 200));
    await expect(el.dataset.state).toBe("done");
  },
};

function GlitchReplayDemo() {
  const ref = useRef<GlitchHandle>(null);
  const [result, setResult] = useState("none");
  return (
    <div className="flex flex-col items-start gap-3 bg-yorha-panel p-6 text-yorha-fg">
      <Glitch ref={ref} as="h2" text="링크 끊김, 재연결 실패" className="text-yorha-lg font-yorha-bold" />
      <button
        type="button"
        onClick={() => setResult(ref.current?.replay() ? "played" : "ignored")}
        className="inline-flex h-control-sm items-center border border-yorha-border px-pad-sm text-yorha-sm focus-visible:yorha-focus"
      >
        다시 재생
      </button>
      <output data-testid="replay-result">{result}</output>
    </div>
  );
}

/** V4-263: `replay()` runs one glitch; a second call inside the 1000 ms floor (WCAG 2.3.1) is ignored. The name stays the text. */
export const GlitchReplay: Story = {
  tags: ["!autodocs"],
  beforeEach: () => setMotion("full"),
  render: () => <GlitchReplayDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const heading = c.getByRole("heading", { name: "링크 끊김, 재연결 실패" });
    await expect(heading).toHaveAttribute("data-glitch");
    // the run at mount counts: wait out the floor, then replay
    await new Promise((r) => setTimeout(r, 1100));
    await userEvent.click(c.getByRole("button", { name: "다시 재생" }));
    await expect(c.getByTestId("replay-result")).toHaveTextContent("played");
    await userEvent.click(c.getByRole("button", { name: "다시 재생" }));
    await expect(c.getByTestId("replay-result")).toHaveTextContent("ignored");
    await expect(c.getByRole("heading", { name: "링크 끊김, 재연결 실패" })).toBeTruthy();
  },
};

/** Reduced motion: replay() is refused and the name stays the text. Motion is set inside play so a neighbour story's cleanup cannot race it. */
export const GlitchReducedMotion: Story = {
  tags: ["!autodocs"],
  render: () => <GlitchReplayDemo />,
  play: async ({ canvasElement }) => {
    const restore = setMotion("reduced");
    try {
      const c = within(canvasElement);
      await userEvent.click(c.getByRole("button", { name: "다시 재생" }));
      await expect(c.getByTestId("replay-result")).toHaveTextContent("ignored");
      await expect(c.getByRole("heading", { name: "링크 끊김, 재연결 실패" })).toBeTruthy();
    } finally {
      restore();
    }
  },
};

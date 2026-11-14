import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";

import { Decipher } from "@/components/ui/decipher";

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
  beforeEach: () => setMotion("reduced"),
  render: (args) => <Heading text={args.text} />,
  play: async ({ canvasElement, args }) => {
    const heading = within(canvasElement).getByRole("heading", { name: args.text });
    // synchronous: no waiting, glyph layer already shows the final text
    expect(glyphLayer(heading).textContent).toBe(args.text);
    expect(glyphLayer(heading).getAttribute("aria-hidden")).toBe("true");
  },
};

export const MotionOff: Story = {
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

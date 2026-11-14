import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Stack } from "./stack";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Cell({ children }: { children: string }) {
  return <span className="border border-yorha-border bg-yorha-panel px-2 py-1 text-yorha-fg">{children}</span>;
}

/** Expected px for `multiplier` spacing units: --spacing is 4px in every density (B1). */
function expectedGapPx(scope: Element, multiplier: number) {
  const rem = parseFloat(getComputedStyle(scope).getPropertyValue("--yorha-spacing"));
  return rem * 16 * multiplier;
}

const meta = {
  title: "레이아웃/Stack",
  component: Stack,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 480 } } },
  args: { direction: "column", gap: 2 },
  render: (args) => (
    <Stack {...args}>
      <Cell>첫째</Cell>
      <Cell>둘째</Cell>
      <Cell>셋째</Cell>
    </Stack>
  ),
} satisfies Meta<typeof Stack>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Column: Story = {
  name: "세로 기본",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const stack = c.getByText("첫째").parentElement as HTMLElement;
    const cs = getComputedStyle(stack);
    expect(cs.display).toBe("flex");
    expect(cs.flexDirection).toBe("column");
    expect(parseFloat(cs.rowGap)).toBeCloseTo(expectedGapPx(stack, 2), 1);
    const first = c.getByText("첫째").getBoundingClientRect();
    const second = c.getByText("둘째").getBoundingClientRect();
    expect(second.top).toBeGreaterThanOrEqual(first.bottom);
  },
};

export const RowAsList: Story = {
  name: "가로 · as=ul",
  render: () => (
    <Stack as="ul" direction="row" gap={4}>
      <li>
        <Cell>하나</Cell>
      </li>
      <li>
        <Cell>둘</Cell>
      </li>
      <li>
        <Cell>셋</Cell>
      </li>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector("ul") as HTMLUListElement;
    expect(list).not.toBeNull();
    expect(getComputedStyle(list).flexDirection).toBe("row");
    const items = Array.from(list.querySelectorAll("li")).map((li) => li.getBoundingClientRect());
    expect(items.length).toBe(3);
    const [a, b, d] = items as [DOMRect, DOMRect, DOMRect];
    expect(b.left).toBeGreaterThanOrEqual(a.right);
    expect(d.left).toBeGreaterThanOrEqual(b.right);
    expect(Math.abs(a.top - d.top)).toBeLessThan(1);
  },
};

/** B1: layout gaps sit on a fixed 4px grid; density scales controls, rows and body text, not stack gaps. */
export const DensityScale: Story = {
  name: "밀도와 무관한 고정 간격",
  render: () => (
    <div className="flex gap-8">
      <div data-density="compact">
        <Stack gap={4}>
          <Cell>첫째</Cell>
          <Cell>둘째</Cell>
        </Stack>
      </div>
      <div data-density="comfortable">
        <Stack gap={4}>
          <Cell>첫째</Cell>
          <Cell>둘째</Cell>
        </Stack>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [cEl, fEl] = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-density] > [data-slot="stack"]')) as [HTMLElement, HTMLElement];
    expect(cEl).toBeTruthy();
    const compact = parseFloat(getComputedStyle(cEl).rowGap);
    const comfortable = parseFloat(getComputedStyle(fEl).rowGap);
    expect(compact).toBeCloseTo(expectedGapPx(cEl, 4), 1);
    expect(comfortable).toBeCloseTo(expectedGapPx(fEl, 4), 1);
    expect(compact).toBe(16);
    expect(comfortable).toBe(16);
  },
};

export const FourThemes: Story = {
  name: "3 테마",
  render: () => (
    <Stack gap={4}>
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4">
          <Stack gap={2}>
            <span className="text-yorha-fg">{theme}</span>
            <Cell>항목</Cell>
          </Stack>
        </div>
      ))}
    </Stack>
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
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4">
      <Stack gap={2}>
        <span className="text-yorha-fg">authentic</span>
        <Cell>항목</Cell>
      </Stack>
    </div>
  ),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('[data-theme="authentic"] [data-slot="stack"]')).not.toBeNull();
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import type { ReactNode } from "react";
import { Grid } from "./grid";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Cell({ children }: { children: string }) {
  return <span className="block border border-yorha-border bg-yorha-panel px-2 py-1 text-yorha-fg">{children}</span>;
}

/** Test frame: the grid's container width is this width. */
function Frame({ width, children }: { width: string; children: ReactNode }) {
  return (
    <div data-frame className="max-w-full" style={{ width }}>
      {children}
    </div>
  );
}

const SIX = ["가", "나", "다", "라", "마", "바"];

function columnCount(canvasElement: HTMLElement) {
  const grid = canvasElement.querySelector('[data-slot="grid"]') as HTMLElement;
  return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
}

const meta = {
  title: "레이아웃/Grid",
  component: Grid,
  tags: ["autodocs"],
  args: { columns: 3, gap: 2 },
  render: (args) => (
    <Frame width="900px">
      <Grid {...args}>
        {SIX.map((t) => (
          <Cell key={t}>{t}</Cell>
        ))}
      </Grid>
    </Frame>
  ),
} satisfies Meta<typeof Grid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ResponsiveColumns: Story = {
  name: "컨테이너 폭에 따른 열 수",
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>("[data-frame]") as HTMLElement;
    frame.style.width = "320px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(1));
    frame.style.width = "480px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(2));
    frame.style.width = "900px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(3));
    const c = within(canvasElement);
    expect(c.getByText("가")).toBeTruthy();
    expect(c.getByText("바")).toBeTruthy();
  },
};

export const MaxTwoColumns: Story = {
  name: "최대 2열",
  args: { columns: 2 },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>("[data-frame]") as HTMLElement;
    frame.style.width = "900px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(2));
    frame.style.width = "320px";
    await waitFor(() => expect(columnCount(canvasElement)).toBe(1));
  },
};

export const FourThemes: Story = {
  name: "3 테마",
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4">
          <Grid columns={2} gap={2}>
            <Cell>{theme}</Cell>
            <Cell>항목</Cell>
          </Grid>
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
    <div data-theme="authentic" className="bg-yorha-bg p-4">
      <Grid columns={2} gap={2}>
        <Cell>authentic</Cell>
        <Cell>항목</Cell>
      </Grid>
    </div>
  ),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('[data-theme="authentic"] [data-slot="grid"]')).not.toBeNull();
  },
};

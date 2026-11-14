import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import type { ReactNode } from "react";
import { Container } from "./container";

const THEMES = ["light", "dark", "authentic", "high-contrast"] as const;

function Cell({ children }: { children: string }) {
  return <span className="block border border-yorha-border bg-yorha-panel px-2 py-1 text-yorha-fg">{children}</span>;
}

function Frame({ width, children }: { width: string; children: ReactNode }) {
  return (
    <div data-frame className="max-w-full" style={{ width }}>
      {children}
    </div>
  );
}

/** Expected px for `multiplier` spacing units; --yorha-spacing (rem) is set per density. */
function expectedSpacePx(scope: Element, multiplier: number) {
  return parseFloat(getComputedStyle(scope).getPropertyValue("--yorha-spacing")) * 16 * multiplier;
}

const meta = {
  title: "레이아웃/Container",
  component: Container,
  tags: ["autodocs"],
  args: { size: "md" },
  render: (args) => (
    <Frame width="1200px">
      <Container {...args}>
        <Cell>본문</Cell>
      </Container>
    </Frame>
  ),
} satisfies Meta<typeof Container>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MaxWidth: Story = {
  name: "최대 폭 · 인라인 패딩",
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('[data-slot="container"]') as HTMLElement;
    const cs = getComputedStyle(el);
    expect(cs.maxWidth).toBe("768px");
    expect(cs.containerType).toBe("inline-size");
    expect(parseFloat(cs.paddingLeft)).toBeCloseTo(expectedSpacePx(el, 4), 1);
    expect(cs.paddingLeft).toBe(cs.paddingRight);
  },
};

export const NarrowFrame: Story = {
  name: "좁은 프레임에서는 폭을 채움",
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>("[data-frame]") as HTMLElement;
    const el = canvasElement.querySelector('[data-slot="container"]') as HTMLElement;
    frame.style.width = "320px";
    await waitFor(() => expect(el.getBoundingClientRect().width).toBeCloseTo(320, 0));
  },
};

export const Sizes: Story = {
  name: "크기 단계",
  render: () => (
    <Frame width="1200px">
      <div className="flex flex-col gap-2">
        {(["sm", "md", "lg", "full"] as const).map((size) => (
          <Container key={size} size={size}>
            <Cell>{size}</Cell>
          </Container>
        ))}
      </div>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const els = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-slot="container"]'));
    expect(els.map((el) => getComputedStyle(el).maxWidth)).toEqual(["640px", "768px", "1024px", "none"]);
  },
};

export const FourThemes: Story = {
  name: "4 테마",
  // authentic fails contrast pairs by design (tokens); this story compares the four token sets, so a11y is todo here.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg py-4">
          <Container size="sm">
            <Cell>{theme}</Cell>
          </Container>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const bgs = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-theme]")).map((el) =>
      getComputedStyle(el).getPropertyValue("--yorha-bg").trim(),
    );
    // Every theme wrapper resolves its own token set; authentic shares light's background by design, so only dark is compared.
    expect(bgs.length).toBe(4);
    for (const bg of bgs) expect(bg).not.toBe("");
    expect(bgs[1]).not.toBe(bgs[0]);
  },
};

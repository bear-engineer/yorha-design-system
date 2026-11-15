import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row, Sheet } from "../../../../src/docs/sheet";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { Vignette } from "@/components/ui/vignette";

function Frame({ theme, scanline, children }: { theme?: "light" | "dark" | "high-contrast" | "authentic"; scanline?: boolean; children?: ReactNode }) {
  return (
    <div data-theme={theme} className="relative isolate min-h-56 overflow-hidden bg-yorha-panel p-6 text-yorha-fg">
      <h2 className="relative font-yorha text-yorha-xl font-yorha-bold tracking-yorha-heading text-yorha-fg-strong uppercase">
        {children ?? "모니터 가장자리"}
      </h2>
      <p className="relative mt-4 font-yorha text-yorha-base text-yorha-fg">
        비네트 위에서도 본문은 대비 기준을 지킨다.
      </p>
      <Vignette scanline={scanline} />
    </div>
  );
}

const meta = {
  title: "컴포넌트/YoRHa/Vignette",
  component: Vignette,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Vignette>;
export default meta;
type Story = StoryObj<typeof meta>;

const layer = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>('[data-slot="vignette"]');

/** A decorative layer must be hidden from AT, click-through and unreachable by Tab. */
async function expectDecorative(el: HTMLElement | null) {
  await expect(el).not.toBeNull();
  await expect(el!).toHaveAttribute("aria-hidden", "true");
  await expect(getComputedStyle(el!).pointerEvents).toBe("none");
  await expect(el!.getAttribute("tabindex")).toBeNull();
  await expect(el!.querySelectorAll("a,button,input,select,textarea,[tabindex]")).toHaveLength(0);
}

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <div className="grid w-[48rem] max-w-[calc(100vw-2rem)] grid-cols-2 gap-4">
      <Frame>기본</Frame>
      <Frame scanline>스캔라인</Frame>
    </div>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
  render: () => <Frame />,
  play: async ({ canvasElement }) => {
    const el = layer(canvasElement);
    await expectDecorative(el);
    await expect(getComputedStyle(el!).boxShadow).toContain("inset");
    await expect(el!.dataset.scanline).toBeUndefined();
    // text stays reachable and visible above the vignette
    await expect(within(canvasElement).getByRole("heading", { name: "모니터 가장자리" })).toBeVisible();
  },
};

/** Scanline is static: no animation under any motion setting, so no pause control is needed. */
export const Scanline: Story = {
  render: () => <Frame scanline />,
  play: async ({ canvasElement }) => {
    const el = layer(canvasElement);
    await expectDecorative(el);
    await expect(el!.dataset.scanline).toBe("true");
    await expect(getComputedStyle(el!).animationName).toBe("none");
    await expect(getComputedStyle(el!).backgroundImage).toContain("repeating-linear-gradient");
    // G13: the layer sits behind the text (z -1 in an isolated host); the text is what a point at its centre hits.
    await expect(getComputedStyle(el!).zIndex).toBe("-1");
    for (const text of [within(canvasElement).getByRole("heading"), within(canvasElement).getByText(/본문은/)]) {
      const box = text.getBoundingClientRect();
      await expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(text);
    }
  },
};

/** Multi-theme story: light, dark and high-contrast only. */
export const Themes: Story = {
  render: () => (
    <div className="grid gap-4">
      <Frame theme="light">라이트</Frame>
      <Frame theme="dark">다크</Frame>
      <Frame theme="high-contrast">고대비</Frame>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const layers = canvasElement.querySelectorAll<HTMLElement>('[data-slot="vignette"]');
    await expect(layers).toHaveLength(3);
    for (const el of layers) {
      await expectDecorative(el);
    }
  },
};

/** Authentic theme alone; a11y is "todo" because the authentic palette is decorative-only (see tokens.md). */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => <Frame theme="authentic" scanline>오리지널 팔레트</Frame>,
  play: async ({ canvasElement }) => {
    await expectDecorative(layer(canvasElement));
  },
};

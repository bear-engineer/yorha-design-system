import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { GridBackground } from "@/components/ui/grid-background";

function Frame({ theme, children }: { theme?: "light" | "dark" | "high-contrast" | "authentic"; children?: ReactNode }) {
  return (
    <div data-theme={theme} className="relative isolate min-h-40 overflow-hidden bg-yorha-panel p-6 text-yorha-fg">
      <GridBackground />
      <p className="relative font-yorha text-yorha-base text-yorha-fg">{children ?? "격자 위의 본문 텍스트"}</p>
    </div>
  );
}

const meta = {
  title: "컴포넌트/YoRHa/GridBackground",
  component: GridBackground,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof GridBackground>;
export default meta;
type Story = StoryObj<typeof meta>;

const layer = (canvasElement: HTMLElement) => canvasElement.querySelector<HTMLElement>('[data-slot="grid-background"]');

/** A decorative layer must be hidden from AT, click-through and unreachable by Tab. */
async function expectDecorative(el: HTMLElement | null) {
  await expect(el).not.toBeNull();
  await expect(el!).toHaveAttribute("aria-hidden", "true");
  await expect(getComputedStyle(el!).pointerEvents).toBe("none");
  await expect(el!.getAttribute("tabindex")).toBeNull();
  await expect(el!.querySelectorAll("a,button,input,select,textarea,[tabindex]")).toHaveLength(0);
}

export const Default: Story = {
  render: () => <Frame />,
  play: async ({ canvasElement }) => {
    const el = layer(canvasElement);
    await expectDecorative(el);
    await expect(getComputedStyle(el!).backgroundImage).toContain("linear-gradient");
    await expect(getComputedStyle(el!).backgroundSize).toContain("8px");
    await expect(within(canvasElement).getByText("격자 위의 본문 텍스트")).toBeVisible();
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
    const layers = canvasElement.querySelectorAll<HTMLElement>('[data-slot="grid-background"]');
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
  render: () => <Frame theme="authentic">오리지널 팔레트</Frame>,
  play: async ({ canvasElement }) => {
    await expectDecorative(layer(canvasElement));
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Ornament, Separator } from "./ornament";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/YoRHa/Ornament",
  component: Ornament,
  tags: ["autodocs"],
  args: { variant: "band" },
  argTypes: {
    variant: { control: "inline-radio", options: ["band", "separator"] },
  },
  decorators: [
    (Story) => (
      <div className="w-96 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Ornament>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Band: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const band = canvasElement.querySelector<HTMLElement>('[data-slot="ornament"]');
    await expect(band).not.toBeNull();
    await expect(band!).toHaveAttribute("aria-hidden", "true");
    await expect(getComputedStyle(band!).pointerEvents).toBe("none");
    await expect(c.queryByRole("separator")).toBeNull();
  },
};

export const RuleSeparatorVariant: Story = {
  args: { variant: "separator" },
  play: async ({ canvasElement }) => {
    const deco = canvasElement.querySelector<HTMLElement>('[data-slot="ornament"]');
    await expect(deco).not.toBeNull();
    await expect(deco!).toHaveAttribute("aria-hidden", "true");
    await expect(within(canvasElement).queryByRole("separator")).toBeNull();
  },
};

export const SemanticSeparator: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p>상단 내용</p>
      <Separator orientation="horizontal" />
      <p>하단 내용</p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const sep = within(canvasElement).getByRole("separator");
    await expect(sep).toHaveAttribute("aria-orientation", "horizontal");
    await expect(sep).not.toHaveAttribute("aria-hidden", "true");
  },
};

export const ThemeGallery: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
          <Ornament variant="band" />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const decos = canvasElement.querySelectorAll<HTMLElement>('[data-slot="ornament"]');
    await expect(decos.length).toBe(THEMES.length);
    decos.forEach((d) => expect(d).toHaveAttribute("aria-hidden", "true"));
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-4 text-yorha-fg">
      <Ornament variant="separator" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const deco = canvasElement.querySelector<HTMLElement>('[data-slot="ornament"]');
    await expect(deco).not.toBeNull();
  },
};

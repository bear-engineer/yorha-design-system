import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Glyph, GLYPH_NAMES, type GlyphBox } from "./glyph";
import { nativeBox } from "./glyphs";

const THEMES = ["light", "dark", "high-contrast"] as const;
const BOXES: GlyphBox[] = [12, 16, 20];

const meta = {
  title: "컴포넌트/YoRHa/Glyph",
  component: Glyph,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { name: "check", scale: 1 },
  argTypes: {
    name: { control: "select", options: GLYPH_NAMES },
    box: { control: "inline-radio", options: [undefined, 12, 16, 20] },
    scale: { control: "inline-radio", options: [1, 2] },
  },
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Glyph>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg[data-slot=glyph]")!;
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg).toHaveAttribute("shape-rendering", "crispEdges");
    await expect(svg.getBoundingClientRect().width).toBe(12);
  },
};

export const Scale2: Story = {
  args: { name: "diamond-ring", scale: 2 },
  play: async ({ canvasElement }) => {
    const r = canvasElement.querySelector("svg[data-slot=glyph]")!.getBoundingClientRect();
    await expect([r.width, r.height]).toEqual([24, 24]);
  },
};

/** Every glyph x box x scale x theme. Cells are 1 px (scale 1) or 2 px (scale 2): look for a stair, never a blur. */
export const Gallery: Story = {
  // axe cannot resolve the themed section backgrounds of the below-the-fold rows (contrast false positives on `code`); the glyphs are aria-hidden.
  parameters: { layout: "padded", a11y: { test: "todo" } },
  render: () => (
    <div className="flex max-w-[calc(100vw-2rem)] flex-col gap-4">
      {THEMES.map((t) => (
        <section key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <h3 className="mb-2 text-yorha-sm">{t}</h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-4 gap-y-3">
            {GLYPH_NAMES.map((name) => (
              <li key={name} className="flex flex-col items-start gap-1 text-yorha-xs">
                <span className="flex flex-wrap items-end gap-2">
                  {BOXES.filter((b) => b >= nativeBox(name)).flatMap((b) => [1, 2].map((s) => <Glyph key={`${b}${s}`} name={name} box={b} scale={s as 1 | 2} />))}
                </span>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const svgs = canvasElement.querySelectorAll("svg[data-slot=glyph]");
    await expect(svgs.length).toBeGreaterThan(GLYPH_NAMES.length * 3);
    for (const s of svgs) {
      const r = s.getBoundingClientRect();
      await expect(Number.isInteger(r.width) && Number.isInteger(r.height)).toBe(true);
    }
  },
};

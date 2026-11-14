import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Heading } from "./heading";

const THEMES = ["light", "dark", "high-contrast"] as const;
const LEVELS = [1, 2, 3, 4, 5, 6] as const;

const meta = {
  title: "컴포넌트/YoRHa/Heading",
  component: Heading,
  tags: ["autodocs"],
  args: { level: 2, children: "장비 점검" },
  argTypes: {
    level: { control: "inline-radio", options: [...LEVELS] },
  },
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Heading>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const h = within(canvasElement).getByRole("heading", { level: 2, name: "장비 점검" });
    await expect(h.tagName).toBe("H2");
  },
};

export const Levels: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      {LEVELS.map((level) => (
        <Heading key={level} level={level}>
          {`레벨 ${level}`}
        </Heading>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const level of LEVELS) {
      const h = c.getByRole("heading", { level, name: `레벨 ${level}` });
      await expect(h.tagName).toBe(`H${level}`);
    }
  },
};

export const LatinUppercaseTracked: Story = {
  args: { children: "Unit Status" },
  play: async ({ canvasElement }) => {
    const h = within(canvasElement).getByRole("heading", { name: "Unit Status" });
    const cs = getComputedStyle(h);
    await expect(cs.textTransform).toBe("uppercase");
    await expect(parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)).toBeGreaterThanOrEqual(0.15);
  },
};

export const KoreanNotUppercased: Story = {
  args: { lang: "ko", children: "장비 점검 보고" },
  play: async ({ canvasElement }) => {
    const h = within(canvasElement).getByRole("heading", { name: "장비 점검 보고" });
    const cs = getComputedStyle(h);
    await expect(cs.textTransform).toBe("none");
    await expect(parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)).toBeLessThan(0.08);
  },
};

export const HardOffsetShadow: Story = {
  args: { children: "Shadowed" },
  play: async ({ canvasElement }) => {
    const h = within(canvasElement).getByRole("heading", { name: "Shadowed" });
    await expect(getComputedStyle(h).textShadow).not.toBe("none");
  },
};

export const ThemeGallery: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <Heading level={3}>{`테마 ${t}`}</Heading>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) {
      await expect(c.getByRole("heading", { level: 3, name: `테마 ${t}` })).toBeInTheDocument();
    }
  },
};

export const Authentic: Story = {
  tags: ["!autodocs"],
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <Heading level={2}>권위 테마</Heading>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { level: 2, name: "권위 테마" })).toBeInTheDocument();
  },
};

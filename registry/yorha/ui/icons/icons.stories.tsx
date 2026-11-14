import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as icons from "./icons";

const {
  ChevronIcon, CheckIcon, CrossIcon, PlusIcon, MinusIcon, TriangleIcon, SortIcon, GripIcon, CalendarIcon, ClockIcon, EyeIcon, EyeOffIcon, SearchIcon,
} = icons;

const GALLERY: { name: string; size: number; node: React.ReactNode }[] = [
  { name: "ChevronIcon 12", size: 12, node: <ChevronIcon /> },
  { name: "ChevronIcon 16", size: 16, node: <ChevronIcon size={16} dir="right" /> },
  { name: "CheckIcon", size: 12, node: <CheckIcon /> },
  { name: "CrossIcon", size: 12, node: <CrossIcon /> },
  { name: "PlusIcon", size: 12, node: <PlusIcon /> },
  { name: "MinusIcon", size: 12, node: <MinusIcon /> },
  { name: "TriangleIcon", size: 12, node: <TriangleIcon /> },
  { name: "SortIcon", size: 12, node: <SortIcon /> },
  { name: "GripIcon", size: 12, node: <GripIcon /> },
  { name: "CalendarIcon", size: 16, node: <CalendarIcon /> },
  { name: "ClockIcon", size: 16, node: <ClockIcon /> },
  { name: "EyeIcon", size: 16, node: <EyeIcon /> },
  { name: "EyeOffIcon", size: 16, node: <EyeOffIcon /> },
  { name: "SearchIcon", size: 16, node: <SearchIcon /> },
];

const meta = {
  title: "컴포넌트/표시/Icons",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Every icon in a fixed, centred box. Each svg renders at exactly its viewBox size. */
export const Gallery: Story = {
  render: () => (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-4">
      {GALLERY.map((g) => (
        <li key={g.name} className="flex flex-col items-center gap-2 text-yorha-xs">
          <span data-icon-box className="grid size-10 place-items-center border border-yorha-border">
            {g.node}
          </span>
          {g.name}
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const svgs = [...canvasElement.querySelectorAll("svg")];
    await expect(svgs).toHaveLength(GALLERY.length);
    for (const [i, svg] of svgs.entries()) {
      const size = GALLERY[i].size;
      const r = svg.getBoundingClientRect();
      await expect(svg.getAttribute("viewBox")).toBe(`0 0 ${size} ${size}`);
      await expect([r.width, r.height], GALLERY[i].name).toEqual([size, size]);
      await expect(svg.getAttribute("aria-hidden")).toBe("true");
      // Centred in a 40px box with an even remainder: whole-pixel position, no blur.
      const box = svg.parentElement!.getBoundingClientRect();
      await expect(Math.abs(r.left - box.left - (box.width - r.width) / 2), GALLERY[i].name).toBeLessThan(0.5);
      await expect(Math.abs(r.top - box.top - (box.height - r.height) / 2), GALLERY[i].name).toBeLessThan(0.5);
    }
  },
};

/** Directional variants: chevrons and triangles in all four directions. */
export const Directions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(["up", "down", "left", "right"] as const).map((dir) => (
        <span key={dir} className="grid size-10 place-items-center border border-yorha-border">
          <ChevronIcon dir={dir} />
        </span>
      ))}
      {(["up", "down", "left", "right"] as const).map((dir) => (
        <span key={`t-${dir}`} className="grid size-10 place-items-center border border-yorha-border">
          <TriangleIcon dir={dir} />
        </span>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("svg")).toHaveLength(8);
  },
};

/** Icons inherit currentColor, so they follow every theme. */
export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(["light", "dark", "high-contrast"] as const).map((t) => (
        <div key={t} data-theme={t} className="flex items-center gap-2 bg-yorha-panel p-4 text-yorha-fg">
          {t} <CheckIcon /> <SearchIcon />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const svg of canvasElement.querySelectorAll("svg")) {
      await expect(getComputedStyle(svg).stroke).toBe(getComputedStyle(svg.parentElement!).color);
    }
  },
};

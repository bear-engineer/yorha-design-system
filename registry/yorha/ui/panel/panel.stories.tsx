import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Panel } from "./panel";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/YoRHa/Panel",
  component: Panel,
  tags: ["autodocs"],
  args: { title: "상태 보고", children: "본문 내용" },
  argTypes: {
    as: { control: "inline-radio", options: ["section", "article", "div"] },
    ornaments: { control: "inline-radio", options: ["none", "top", "bottom", "both"] },
    titleLevel: { control: "inline-radio", options: [1, 2, 3, 4, 5, 6] },
  },
  decorators: [
    (Story) => (
      <div className="w-[28rem] bg-yorha-bg p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Panel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TitledSection: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const region = c.getByRole("region", { name: "상태 보고" });
    await expect(region.tagName).toBe("SECTION");
    await expect(c.getByRole("heading", { level: 3, name: "상태 보고" })).toBeInTheDocument();
    await expect(c.getByText("본문 내용")).toBeInTheDocument();
  },
};

export const ArticleVariant: Story = {
  args: { as: "article", title: "작전 기록" },
  play: async ({ canvasElement }) => {
    const article = within(canvasElement).getByRole("article", { name: "작전 기록" });
    await expect(article.tagName).toBe("ARTICLE");
  },
};

export const DivTitledGroup: Story = {
  args: { as: "div", title: "보조 패널" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("group", { name: "보조 패널" }).tagName).toBe("DIV");
    await expect(c.queryByRole("region")).toBeNull();
  },
};

export const UntitledHasNoLandmark: Story = {
  args: { title: undefined, children: "제목 없는 패널" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("region")).toBeNull();
    await expect(c.getByText("제목 없는 패널")).toBeInTheDocument();
  },
};

export const OrnamentsAriaHidden: Story = {
  args: { ornaments: "both" },
  play: async ({ canvasElement }) => {
    const decos = canvasElement.querySelectorAll<HTMLElement>('[data-slot="ornament"]');
    await expect(decos.length).toBe(2);
    decos.forEach((d) => {
      expect(d).toHaveAttribute("aria-hidden", "true");
      expect(getComputedStyle(d).pointerEvents).toBe("none");
    });
  },
};

export const ThemeGallery: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-bg p-4 text-yorha-fg">
          <Panel title={`테마 ${t}`} ornaments="both">
            {`본문 ${t}`}
          </Panel>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const t of THEMES) {
      await expect(c.getByRole("region", { name: `테마 ${t}` })).toBeInTheDocument();
    }
  },
};

export const Authentic: Story = {
  // Authentic fails 11 of 24 token pairs by design (tokens.md); this story is the only one that renders it.
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-bg p-4 text-yorha-fg">
      <Panel title="권위 테마" ornaments="both">
        본문
      </Panel>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("region", { name: "권위 테마" })).toBeInTheDocument();
  },
};

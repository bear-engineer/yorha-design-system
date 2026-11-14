import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardDescription,
  PreviewCardTitle,
  PreviewCardTrigger,
  previewCardStyles,
} from "./preview-card";

const THEMES = ["light", "dark", "high-contrast"] as const;

interface DemoProps {
  delay?: number;
  closeDelay?: number;
  defaultOpen?: boolean;
}

function Demo({ delay = 0, closeDelay = 0, defaultOpen }: DemoProps) {
  return (
    <div lang="ko" className="min-h-64 bg-yorha-panel p-16 text-yorha-fg">
      <p className="text-yorha-sm">
        보고서 작성자는{" "}
        <PreviewCard defaultOpen={defaultOpen}>
          <PreviewCardTrigger href="#unit-2b" delay={delay} closeDelay={closeDelay}>
            2B
          </PreviewCardTrigger>
          <PreviewCardContent arrow>
            <PreviewCardTitle>2B</PreviewCardTitle>
            <PreviewCardDescription>전투 보조 유닛. 현재 위치는 지하 격납고다.</PreviewCardDescription>
          </PreviewCardContent>
        </PreviewCard>
        이다.
      </p>
    </div>
  );
}

function StaticPreview() {
  return (
    <div className={`${previewCardStyles.popup} relative`}>
      <p className={previewCardStyles.title}>2B</p>
      <p className={previewCardStyles.description}>전투 보조 유닛. 현재 위치는 지하 격납고다.</p>
    </div>
  );
}

const body = () => within(document.body);
const link = () => body().getByRole("link", { name: "2B" });
const card = () => document.querySelector("[data-slot='preview-card-content']") as HTMLElement | null;
const openCard = async () => {
  await waitFor(() => expect(card()).not.toBeNull());
  const c = card() as HTMLElement;
  await waitFor(() => expect(c).toBeVisible());
  return c;
};

const meta = {
  title: "컴포넌트/오버레이/PreviewCard",
  component: Demo,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async () => {
    await expect(card()).toBeNull();
    await userEvent.hover(link());
    const c = await openCard();
    await expect(c).toHaveTextContent("전투 보조 유닛");
  },
};

export const OpensOnKeyboardFocus: Story = {
  render: () => <Demo />,
  play: async () => {
    // Tab (not .focus()) so focus-visible applies
    await userEvent.tab();
    await expect(link()).toHaveFocus();
    await openCard();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(card()).toBeNull());
    await expect(link()).toHaveFocus();
  },
};

export const HoverDelay: Story = {
  render: () => <Demo delay={400} closeDelay={150} />,
  play: async () => {
    await userEvent.hover(link());
    // not open before the delay elapses
    await new Promise((r) => setTimeout(r, 150));
    await expect(card()).toBeNull();
    await openCard();
    await userEvent.unhover(link());
    await waitFor(() => expect(card()).toBeNull(), { timeout: 2000 });
  },
};

export const HasArrow: Story = {
  render: () => <Demo defaultOpen />,
  play: async () => {
    const c = await openCard();
    const arrow = c.querySelector("[data-slot='preview-card-arrow']");
    await expect(arrow).not.toBeNull();
    await expect(arrow).toHaveAttribute("aria-hidden", "true");
  },
};

export const ReducedMotion: Story = {
  render: () => <Demo />,
  play: async () => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    root.setAttribute("data-motion", "reduced");
    try {
      await userEvent.tab();
      const c = await openCard();
      const [dur] = getComputedStyle(c).transitionDuration.split(",").map(parseFloat);
      await expect(dur).toBeLessThanOrEqual(0.12);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(card()).toBeNull(), { timeout: 400 });
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Themes: Story = {
  render: () => (
    <div lang="ko" className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="bg-yorha-panel p-4 text-yorha-fg">
          <StaticPreview />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("2B")).toHaveLength(THEMES.length);
  },
};

// authentic theme is intentionally low-contrast (faithful palette), so a11y is todo here
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div lang="ko" data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <StaticPreview />
    </div>
  ),
};

/** States: default link and open card via keyboard focus. Trigger link is in a paragraph, so inline exemption (SC 2.5.8) applies. */
export const States: Story = {
  render: () => <Demo />,
  play: async () => {
    await userEvent.tab();
    await expect(link()).toHaveFocus();
    await openCard();
    // Inline link inside prose is exempt (measureTargets skips inline <a> in <p>); the card has no other targets.
    await expect(card()!.querySelectorAll("a,button").length).toBe(0);
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "./collapsible";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <div className="w-96 bg-yorha-panel p-4 text-yorha-fg">
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger>상세 보기</CollapsibleTrigger>
        <CollapsiblePanel>유닛 상세 사양을 표시한다.</CollapsiblePanel>
      </Collapsible>
    </div>
  );
}

const meta = {
  title: "컴포넌트/구조/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole("button", { name: "상세 보기" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Enter toggles open
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    await waitFor(() => expect(c.getByText("유닛 상세 사양을 표시한다.")).toBeVisible());
    // Space toggles closed
    await userEvent.keyboard(" ");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  },
};

export const DefaultOpen: Story = {
  render: () => <Demo defaultOpen />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "상세 보기" })).toHaveAttribute("aria-expanded", "true");
    await expect(c.getByText("유닛 상세 사양을 표시한다.")).toBeVisible();
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t}>
          <Demo defaultOpen />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic">
      <Demo defaultOpen />
    </div>
  ),
};

const withMotion = async (mode: string, run: () => Promise<void>) => {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", mode);
  try {
    await run();
  } finally {
    if (prev === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", prev);
  }
};

/** Panel height/opacity use the yorha-collapse utility: --motion-collapse in full, ≤120ms reduced, 0 off. */
export const MotionTokens: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole("button", { name: "상세 보기" });
    const panelOf = () => document.getElementById(trigger.getAttribute("aria-controls")!)!;
    await withMotion("full", async () => {
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
      await expect(parseFloat(getComputedStyle(panelOf()).transitionDuration)).toBeCloseTo(0.24, 2);
      const token = getComputedStyle(document.documentElement).getPropertyValue("--yorha-ease-emphasized").trim();
      await expect(getComputedStyle(panelOf()).transitionTimingFunction).toContain(token);
    });
    await withMotion("reduced", async () => {
      await waitFor(() => expect(parseFloat(getComputedStyle(panelOf()).transitionDuration)).toBeLessThanOrEqual(0.12));
      await expect(getComputedStyle(panelOf()).transitionProperty).not.toContain("transform");
    });
    await withMotion("off", async () => {
      await waitFor(() => expect(parseFloat(getComputedStyle(panelOf()).transitionDuration)).toBe(0));
    });
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  },
};

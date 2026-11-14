import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";

const TABS = [
  { value: "status", label: "상태", body: "시스템 상태 요약" },
  { value: "units", label: "유닛", body: "배치된 유닛 목록" },
  { value: "logs", label: "기록", body: "최근 기록 로그" },
];
const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo() {
  return (
    <div className="w-[28rem] bg-yorha-panel p-4 text-yorha-fg">
      <Tabs defaultValue="status">
        <TabsList aria-label="시스템 메뉴">
          {TABS.map((t) => (
            <TabsTab key={t.value} value={t.value}>
              {t.label}
            </TabsTab>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsPanel key={t.value} value={t.value}>
            {t.body}
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  );
}

const meta = {
  title: "컴포넌트/표시/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

const visiblePanel = () => document.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])')!;

const selectedLabel = (c: { getAllByRole: (role: string) => HTMLElement[] }) =>
  c.getAllByRole("tab").find((t: HTMLElement) => t.getAttribute("aria-selected") === "true")?.textContent?.trim();

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = c.getByRole("tablist", { name: "시스템 메뉴" });
    await expect(list).toBeVisible();
    const status = c.getByRole("tab", { name: "상태" });
    const units = c.getByRole("tab", { name: "유닛" });
    const logs = c.getByRole("tab", { name: "기록" });
    await expect(status).toHaveAttribute("aria-selected", "true");

    // selected panel is labelled by its tab
    const panel = visiblePanel();
    await expect(panel).toHaveTextContent("시스템 상태 요약");
    await expect(panel.getAttribute("aria-labelledby")).toBe(status.id);

    // arrow keys move focus and selection
    status.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(units).toHaveAttribute("aria-selected", "true"));
    await expect(status).toHaveAttribute("aria-selected", "false");
    await expect(units).toHaveFocus();
    // panel swap runs through the exit/enter transition; wait for the new panel
    await waitFor(() => expect(visiblePanel()).toHaveTextContent("배치된 유닛 목록"));
    await expect(visiblePanel().getAttribute("aria-labelledby")).toBe(units.id);

    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(logs).toHaveAttribute("aria-selected", "true"));
    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(units).toHaveAttribute("aria-selected", "true"));

    // Home / End jump to the first / last tab
    await userEvent.keyboard("{End}");
    await waitFor(() => expect(logs).toHaveAttribute("aria-selected", "true"));
    await waitFor(() => expect(visiblePanel()).toHaveTextContent("최근 기록 로그"));
    await userEvent.keyboard("{Home}");
    await waitFor(() => expect(status).toHaveAttribute("aria-selected", "true"));
    await expect(selectedLabel(c)).toBe("상태");
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t}>
          <Demo />
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
      <Demo />
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

/** Indicator uses --motion-tab-indicator; panel reports its direction through data-activation-direction. */
export const MotionTokens: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const status = c.getByRole("tab", { name: "상태" });
    const units = c.getByRole("tab", { name: "유닛" });
    const indicator = canvasElement.querySelector<HTMLElement>('[data-slot="tabs-indicator"]')!;
    await withMotion("full", async () => {
      status.focus();
      await userEvent.keyboard("{ArrowRight}");
      await waitFor(() => expect(units).toHaveAttribute("aria-selected", "true"));
      await expect(parseFloat(getComputedStyle(indicator).transitionDuration)).toBeCloseTo(0.24, 2);
      await waitFor(() => expect(visiblePanel().getAttribute("data-activation-direction")).toBe("right"));
    });
    await withMotion("reduced", async () => {
      await expect(parseFloat(getComputedStyle(indicator).transitionDuration)).toBeLessThanOrEqual(0.12);
    });
    await withMotion("off", async () => {
      await expect(parseFloat(getComputedStyle(indicator).transitionDuration)).toBe(0);
    });
    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(status).toHaveAttribute("aria-selected", "true"));
  },
};

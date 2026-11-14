import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "./scroll-area";

const THEMES = ["light", "dark", "high-contrast"] as const;
const LINES = Array.from({ length: 40 }, (_, i) => `로그 ${String(i + 1).padStart(2, "0")} — 임무 기록 항목`);

function Demo({ wide, label = "임무 기록" }: { wide?: boolean; label?: string }) {
  return (
    <div className="bg-yorha-panel p-4 text-yorha-fg">
      <ScrollArea className="h-48 w-80 max-w-full border border-yorha-border">
        <ScrollAreaViewport aria-label={label} className="h-full w-full">
          <ScrollAreaContent>
            <div className={wide ? "w-[60rem] max-w-full p-3" : "p-3"}>
              {LINES.map((l) => (
                <p key={l} className="whitespace-nowrap">
                  {l}
                </p>
              ))}
            </div>
          </ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
        <ScrollAreaScrollbar orientation="horizontal">
          <ScrollAreaThumb />
        </ScrollAreaScrollbar>
        <ScrollAreaCorner />
      </ScrollArea>
    </div>
  );
}

const meta = {
  title: "컴포넌트/구조/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const viewport = c.getByRole("region", { name: "임무 기록" });
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="scroll-area-thumb"]')).not.toBeNull());
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    // keyboard scrolling stays native: the viewport is focusable and does not cancel arrow keys
    viewport.focus();
    await expect(document.activeElement).toBe(viewport);
    const arrow = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    viewport.dispatchEvent(arrow);
    await expect(arrow.defaultPrevented).toBe(false);
    await userEvent.keyboard("{ArrowDown}");
  },
};

export const BothScrollbars: Story = {
  render: () => <Demo wide />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-slot="scroll-area-thumb"]').length).toBe(2));
    await expect(canvasElement.querySelector('[data-slot="scroll-area-corner"]')).not.toBeNull();
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t}>
          <Demo label={`임무 기록 ${t}`} />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic">
      <Demo />
    </div>
  ),
};

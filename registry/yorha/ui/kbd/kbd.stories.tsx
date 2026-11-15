import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Kbd, KbdCombo } from "./kbd";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/폼/Kbd",
  component: Kbd,
  tags: ["autodocs"],
  args: { children: "Enter" },
  decorators: [
    (Story) => (
      <div className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Kbd>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const el = within(canvasElement).getByText("Enter");
    await expect(el.tagName).toBe("KBD");
    await expect(parseFloat(getComputedStyle(el).borderTopWidth)).toBeGreaterThan(0);
  },
};

export const Combo: Story = {
  render: () => (
    <p>
      저장하려면 <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd> 를 누르세요.
    </p>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("kbd")).toHaveLength(2);
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          {t} <Kbd>Esc</Kbd> <Kbd>Space</Kbd>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("kbd")).toHaveLength(THEMES.length * 2);
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      authentic <Kbd>Esc</Kbd> <Kbd>Space</Kbd>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("kbd")).toHaveLength(2);
  },
};

export const ModCombo: Story = {
  name: "KbdCombo (V4-091)",
  render: () => <KbdCombo keys={["mod", "shift", "K"]} />,
  play: async ({ canvasElement }) => {
    const keys = [...canvasElement.querySelectorAll("kbd")].map((k) => k.textContent);
    await expect(keys).toHaveLength(3);
    await expect(keys.at(-1)).toBe("K");
  },
};

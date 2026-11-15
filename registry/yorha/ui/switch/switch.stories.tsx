import { expectTargetSize } from "../../../../.storybook/preview";
import { Row, Sheet } from "../../../../src/docs/sheet";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Switch } from "./switch";

const THEMES = ["light", "dark", "high-contrast"] as const;

// --- motion helpers (reduced: <=120ms; off: 0) ---
async function inMotion(mode: "reduced" | "off", run: () => Promise<void>) {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", mode);
  try {
    await run();
  } finally {
    if (prev === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", prev);
  }
}
function durationsMs(el: Element): number[] {
  return getComputedStyle(el)
    .transitionDuration.split(",")
    .map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000));
}

const BOOL = { control: "inline-radio", options: [false, true] } as const;

const meta = {
  title: "컴포넌트/폼/Switch",
  component: Switch,
  tags: ["autodocs"],
  // Radio instead of the default boolean switch: Storybook greys its inactive "True"/"False" label below 4.5:1 (docs axe).
  argTypes: {
    defaultChecked: BOOL,
    disabled: BOOL,
  },
  decorators: [
    (Story, { name }) =>
      name === "구성 한눈에" ? (
        <Story />
      ) : (
      <div className="flex max-w-[calc(100vw-2rem)] flex-col items-start bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  args: { children: "-" },
  render: () => (
    <Sheet title="Switch">
      <Row label="꺼짐"><Switch>전원</Switch></Row>
      <Row label="켜짐"><Switch defaultChecked>사운드</Switch></Row>
      <Row label="비활성"><Switch disabled>원격 접속</Switch></Row>
      <Row label="비활성 · 켜짐"><Switch disabled defaultChecked>보안 모드</Switch></Row>
    </Sheet>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
  args: { children: "전원", defaultChecked: false },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sw = c.getByRole("switch", { name: "전원" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    sw.focus();
    await userEvent.keyboard(" ");
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard(" ");
    await expect(sw).toHaveAttribute("aria-checked", "false");
  },
};

export const LabelClick: Story = {
  args: { children: "야간 모드", defaultChecked: false },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByText("야간 모드"));
    await expect(c.getByRole("switch", { name: "야간 모드" })).toHaveAttribute("aria-checked", "true");
  },
};

export const Disabled: Story = {
  args: { children: "잠긴 스위치", defaultChecked: false, disabled: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sw = c.getByRole("switch", { name: "잠긴 스위치" });
    await expect(sw).toHaveAttribute("aria-disabled", "true");
    sw.focus();
    await userEvent.keyboard(" ");
    await userEvent.click(c.getByText("잠긴 스위치"));
    await expect(sw).toHaveAttribute("aria-checked", "false");
  },
};

export const FocusVisible: Story = {
  args: { children: "포커스 대상", defaultChecked: false },
  play: async ({ canvasElement }) => {
    const sw = within(canvasElement).getByRole("switch", { name: "포커스 대상" });
    await userEvent.tab();
    await expect(sw).toHaveFocus();
    // The ring is on the drawn track inside the 24px hit area.
    const style = getComputedStyle(sw.querySelector('[data-slot="switch-track"]')!);
    await expect(style.outlineStyle).toBe("solid");
    await expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  },
};

export const States: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Switch defaultChecked={false}>꺼짐</Switch>
      <Switch defaultChecked>켜짐</Switch>
      <Switch disabled>꺼짐 비활성</Switch>
      <Switch defaultChecked disabled>켜짐 비활성</Switch>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("switch", { name: "꺼짐" })).toHaveAttribute("aria-checked", "false");
    await expect(c.getByRole("switch", { name: "켜짐" })).toHaveAttribute("aria-checked", "true");
    await expect(c.getByRole("switch", { name: "꺼짐 비활성" })).toHaveAttribute("aria-disabled", "true");
    await expect(c.getByRole("switch", { name: "켜짐 비활성" })).toHaveAttribute("aria-disabled", "true");
    await expectTargetSize(canvasElement);
  },
};

export const Themes: Story = {
  args: { children: "" },
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          <Switch defaultChecked>{`테마 ${t}`}</Switch>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("switch")).toHaveLength(3);
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  tags: ["!autodocs"],
  args: { children: "오리지널 팔레트", defaultChecked: true },
  render: (args) => (
    <div data-theme="authentic" className="max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <Switch {...args} />
    </div>
  ),
  parameters: { a11y: { test: "todo" } },
  play: async ({ canvasElement }) => {
    const sw = within(canvasElement).getByRole("switch", { name: "오리지널 팔레트" });
    await expect(sw).toHaveAttribute("aria-checked", "true");
  },
};

export const ReducedMotion: Story = {
  args: { children: "전원", defaultChecked: true },
  play: async ({ canvasElement }) => {
    const els = (): Element[] => {
      const c = within(canvasElement);
      return [c.getByRole("switch"), c.getByRole("switch").firstElementChild!];
    };
    await inMotion("reduced", async () => {
      for (const el of els()) {
        expect(getComputedStyle(el).transitionProperty).not.toBe("none");
        expect(Math.max(...durationsMs(el))).toBeLessThanOrEqual(120);
      }
    });
    await inMotion("off", async () => {
      for (const el of els()) expect(Math.max(...durationsMs(el))).toBe(0);
    });
  },
};

/** `pending`: aria-busy, toggling ignored, a 4 px mark pulses on the thumb (two-state); track and thumb never resize. */
export const Pending: Story = {
  args: { children: "동기화", pending: true, defaultChecked: true },
  play: async ({ canvasElement }) => {
    const sw = within(canvasElement).getByRole("switch", { name: "동기화" });
    await expect(sw).toHaveAttribute("aria-busy", "true");
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "true");
  },
};

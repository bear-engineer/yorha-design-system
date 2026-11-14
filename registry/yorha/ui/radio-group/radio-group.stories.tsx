import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Radio, RadioGroup } from "./radio-group";

import { expectTargetSize } from "../../../../.storybook/preview";
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

const meta = {
  title: "컴포넌트/폼/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  // A selected row is a full-width ink bar by design; stories cap the container, the component does not.
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const Options = ({ disabledBravo = false }: { disabledBravo?: boolean }) => (
  <>
    <Radio value="alpha">알파 유닛</Radio>
    <Radio value="bravo" disabled={disabledBravo}>브라보 유닛</Radio>
    <Radio value="charlie">찰리 유닛</Radio>
  </>
);

export const Default: Story = {
  args: { "aria-label": "유닛 선택", defaultValue: "alpha" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = c.getByRole("radiogroup", { name: "유닛 선택" });
    await expect(group).toBeInTheDocument();
    const radios = c.getAllByRole("radio");
    await expect(radios).toHaveLength(3);
    await expect(c.getByRole("radio", { name: "알파 유닛" })).toBeChecked();
    radios[0]?.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("radio", { name: "찰리 유닛" })).toBeChecked();
    await userEvent.keyboard("{ArrowUp}");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

export const DisabledOption: Story = {
  args: { "aria-label": "유닛 선택 (일부 비활성)", defaultValue: "alpha" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options disabledBravo />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toHaveAttribute("aria-disabled", "true");
    c.getByRole("radio", { name: "알파 유닛" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("radio", { name: "찰리 유닛" })).toBeChecked();
  },
};

export const DisabledGroup: Story = {
  args: { "aria-label": "유닛 선택 (비활성)", defaultValue: "bravo", disabled: true },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const r of c.getAllByRole("radio")) await expect(r).toHaveAttribute("aria-disabled", "true");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

export const Horizontal: Story = {
  args: { "aria-label": "방향 선택", defaultValue: "alpha", orientation: "horizontal" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    c.getByRole("radio", { name: "알파 유닛" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

export const ClickSelect: Story = {
  args: { "aria-label": "클릭 선택" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByText("찰리 유닛"));
    await expect(c.getByRole("radio", { name: "찰리 유닛" })).toBeChecked();
  },
};

export const Themes: Story = {
  args: { "aria-label": "테마", defaultValue: "bravo" },
  render: (args) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="max-w-[min(24rem,calc(100vw-2rem))] bg-yorha-panel p-4 text-yorha-fg">
          <RadioGroup {...args} aria-label={`테마 ${t}`}>
            <Options />
          </RadioGroup>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("radiogroup")).toHaveLength(3);
    await expect(c.getAllByRole("radio", { name: "브라보 유닛" })).toHaveLength(3);
  },
};

/** Authentic palette alone (fidelity, decorative-only, not contrast-gated): the only story with a11y todo. */
export const Authentic: Story = {
  tags: ["!autodocs"],
  name: "Authentic (원작 팔레트)",
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="max-w-[min(24rem,calc(100vw-2rem))] bg-yorha-panel p-4 text-yorha-fg">
      <RadioGroup aria-label="테마 authentic" defaultValue="bravo">
        <Options />
      </RadioGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("radiogroup")).toBeInTheDocument();
    await expect(within(canvasElement).getByRole("radio", { name: "브라보 유닛" })).toBeChecked();
  },
};

export const ReducedMotion: Story = {
  args: { "aria-label": "유닛 선택", defaultValue: "alpha" },
  render: (args) => (
    <RadioGroup {...args}>
      <Options />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const els = (): Element[] => {
      const c = within(canvasElement);
      return [c.getByRole("radio", { name: "알파 유닛" }).closest("label")!];
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

export const States: Story = {
  args: { "aria-label": "상태", defaultValue: "alpha" },
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <RadioGroup aria-label="일부 비활성" defaultValue="alpha">
        <Options disabledBravo />
      </RadioGroup>
      <RadioGroup aria-label="전체 비활성" defaultValue="bravo" disabled>
        <Options />
      </RadioGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const radios = c.getAllByRole("radio");
    await expect(radios.some((r) => r.getAttribute("aria-disabled") === "true")).toBe(true);
    await expect(radios.some((r) => r.getAttribute("aria-checked") === "true")).toBe(true);
    await expectTargetSize(canvasElement);
  },
};

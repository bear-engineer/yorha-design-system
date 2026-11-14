import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { OTPFieldInput, OTPFieldRoot, OTPFieldSeparator } from "./otp-field";

const THEMES = ["light", "dark", "high-contrast"] as const;
const THEME_LABEL: Record<(typeof THEMES)[number], string> = {
  light: "라이트",
  dark: "다크",
  "high-contrast": "고대비",
};
const LENGTH = 6;

type DemoProps = React.ComponentProps<typeof OTPFieldRoot> & { label?: string; separatorAt?: number };

/** Label + six slots. Slot 1 carries the label; the rest get "Character n of 6". */
const Demo = ({ label = "인증 코드", separatorAt, id = "otp-demo", ...rootProps }: DemoProps) => {
  const descId = `${id}-desc`;
  return (
    <div className="flex w-full max-w-80 flex-col items-start gap-1">
      <label htmlFor={id} className="font-yorha-medium text-yorha-sm text-yorha-fg-strong">
        {label}
      </label>
      <OTPFieldRoot id={id} length={LENGTH} aria-describedby={descId} className="flex items-center gap-2" {...rootProps}>
        {Array.from({ length: LENGTH }, (_, i) => (
          <React.Fragment key={i}>
            {separatorAt === i ? <OTPFieldSeparator className="mx-1 h-px w-3 bg-yorha-border" /> : null}
            <OTPFieldInput
              aria-label={i === 0 ? undefined : `${i + 1}번째 자리 (총 ${LENGTH})`}
              className="size-10 text-center"
            />
          </React.Fragment>
        ))}
      </OTPFieldRoot>
      <p id={descId} className="m-0 text-yorha-sm text-yorha-fg-soft">
        6자리 코드를 입력하세요
      </p>
    </div>
  );
};

const meta = {
  title: "컴포넌트/폼/OTPField",
  component: OTPFieldRoot,
  tags: ["autodocs"],
  args: { onValueChange: fn(), onValueComplete: fn() },
  decorators: [
    (Story) => (
      <div className="bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OTPFieldRoot>;
export default meta;
type Story = StoryObj<typeof meta>;

const slots = (c: ReturnType<typeof within>) => c.getAllByRole("textbox");

export const Default: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    const first = slots(c)[0];
    await userEvent.click(first);
    await userEvent.keyboard("1");
    await expect(slots(c)[1]).toHaveFocus();
    await userEvent.keyboard("2");
    await expect(slots(c)[2]).toHaveFocus();
    await expect(args.onValueChange).toHaveBeenLastCalledWith("12", expect.anything());
  },
};

export const TypingAcrossSlots: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(slots(c)[0]);
    await userEvent.keyboard("123456");
    for (const [i, ch] of ["1", "2", "3", "4", "5", "6"].entries()) {
      await expect(slots(c)[i]).toHaveValue(ch);
    }
    await expect(args.onValueComplete).toHaveBeenCalledWith("123456", expect.anything());
  },
};

export const BackspaceAcrossSlots: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(slots(c)[0]);
    await userEvent.keyboard("123");
    await expect(slots(c)[3]).toHaveFocus();
    // Backspace on a filled slot clears it and stays.
    await userEvent.keyboard("{Backspace}");
    await expect(slots(c)[2]).toHaveValue("");
    await expect(slots(c)[2]).toHaveFocus();
    // Backspace on an empty slot moves back and clears the previous one.
    await userEvent.keyboard("{Backspace}");
    await expect(slots(c)[1]).toHaveFocus();
    await expect(slots(c)[1]).toHaveValue("");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("1", expect.anything());
  },
};

export const PasteFillsAllSlots: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(slots(c)[0]);
    await userEvent.paste("456789");
    for (const [i, ch] of ["4", "5", "6", "7", "8", "9"].entries()) {
      await expect(slots(c)[i]).toHaveValue(ch);
    }
    await expect(args.onValueComplete).toHaveBeenCalledWith("456789", expect.anything());
  },
};

export const NumericRejectsLetters: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(slots(c)[0]);
    await userEvent.keyboard("a");
    await expect(slots(c)[0]).toHaveValue("");
    await expect(args.onValueChange).not.toHaveBeenCalledWith("a", expect.anything());
  },
};

export const AlphanumericAccepted: Story = {
  render: (args) => <Demo {...args} validationType="alphanumeric" label="복구 코드" />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.click(slots(c)[0]);
    await userEvent.keyboard("a1B");
    await expect(slots(c)[0]).toHaveValue("a");
    await expect(slots(c)[1]).toHaveValue("1");
    await expect(slots(c)[2]).toHaveValue("B");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("a1B", expect.anything());
  },
};

export const WithSeparator: Story = {
  render: (args) => <Demo {...args} separatorAt={3} />,
  play: async ({ canvasElement }) => {
    const sep = canvasElement.querySelector("[data-orientation]");
    await expect(sep).not.toBeNull();
    await expect(slots(within(canvasElement))).toHaveLength(LENGTH);
  },
};

export const Disabled: Story = {
  render: (args) => <Demo {...args} disabled />,
  play: async ({ canvasElement }) => {
    for (const slot of slots(within(canvasElement))) await expect(slot).toBeDisabled();
  },
};

export const LabelFocusesFirstSlot: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByText("인증 코드"));
    await expect(slots(c)[0]).toHaveFocus();
  },
};

export const ReducedMotion: Story = {
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement }) => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    root.setAttribute("data-motion", "reduced");
    try {
      const seconds = parseFloat(getComputedStyle(slots(within(canvasElement))[0]).transitionDuration) || 0;
      await expect(seconds).toBeLessThanOrEqual(0.12);
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Themes: Story = {
  render: () => (
    <div className="grid gap-6">
      {THEMES.map((theme) => (
        <div key={theme} data-theme={theme} className="bg-yorha-bg p-4 text-yorha-fg">
          <Demo id={`otp-${theme}`} label={`인증 코드 (${THEME_LABEL[theme]})`} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (const theme of THEMES) {
      await expect(c.getByLabelText(`인증 코드 (${THEME_LABEL[theme]})`)).toBeInTheDocument();
    }
  },
};

// The authentic theme is a fidelity-first palette that is not contrast-gated.
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => (
    <div data-theme="authentic" className="bg-yorha-panel p-4 text-yorha-fg">
      <Demo id="otp-authentic" label="오리지널 팔레트" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByText("오리지널 팔레트"));
    await expect(slots(c)[0]).toHaveFocus();
  },
};

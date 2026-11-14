import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { YorhaProvider } from "@/components/yorha-provider";
import { resetSoundEngineForTests } from "@/lib/sound";
import { MenuList, MenuListItem } from "./menu-list";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/YoRHa/MenuList",
  component: MenuList,
  tags: ["autodocs"],
  args: { "aria-label": "시스템 메뉴", defaultValue: "status", onActivate: fn(), onValueChange: fn() },
  argTypes: { variant: { control: "inline-radio", options: ["listbox", "navigation"] } },
  decorators: [
    (Story) => (
      <div className="w-80 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MenuList>;
export default meta;
type Story = StoryObj<typeof meta>;

const MAIN = [
  ["status", "상태"],
  ["items", "아이템"],
  ["weapons", "무기"],
  ["system", "시스템"],
] as const;

const Rows = ({ disabled }: { disabled?: string }) => (
  <>
    {MAIN.map(([v, l]) => (
      <MenuListItem key={v} value={v} disabled={v === disabled}>
        {l}
      </MenuListItem>
    ))}
  </>
);

const opt = (c: ReturnType<typeof within>, name: string) => c.getByRole("option", { name });
const setMotion = (m: string) => {
  const root = document.documentElement;
  const prev = root.getAttribute("data-motion");
  root.setAttribute("data-motion", m);
  return () => (prev === null ? root.removeAttribute("data-motion") : root.setAttribute("data-motion", prev));
};

export const Default: Story = {
  render: (args) => (
    <MenuList {...args}>
      <Rows />
    </MenuList>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("listbox", { name: "시스템 메뉴" })).toBeInTheDocument();
    await expect(c.getAllByRole("option")).toHaveLength(4);
    await expect(opt(c, "상태")).toHaveAttribute("aria-selected", "true");
    await expect(opt(c, "아이템")).toHaveAttribute("aria-selected", "false");
    // roving tabindex: exactly one tab stop
    await expect(c.getAllByRole("option").filter((o) => o.tabIndex === 0)).toHaveLength(1);
  },
};

export const ArrowKeys: Story = {
  render: Default.render,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(opt(c, "상태")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(opt(c, "아이템")).toHaveFocus();
    await expect(opt(c, "아이템")).toHaveAttribute("aria-selected", "true");
    await expect(opt(c, "상태")).toHaveAttribute("aria-selected", "false");
    await userEvent.keyboard("{ArrowUp}");
    await expect(opt(c, "상태")).toHaveFocus();
    await expect(args.onValueChange).toHaveBeenCalledWith("items");
  },
};

export const HomeEnd: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("{End}");
    await expect(opt(c, "시스템")).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect(opt(c, "상태")).toHaveFocus();
  },
};

export const Typeahead: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("무");
    await expect(opt(c, "무기")).toHaveFocus();
    // the typeahead buffer resets after 500 ms
    await new Promise((r) => setTimeout(r, 600));
    await userEvent.keyboard("시");
    await expect(opt(c, "시스템")).toHaveFocus();
  },
};

export const TypeaheadLatin: Story = {
  render: (args) => (
    <MenuList {...args} defaultValue="alpha">
      <MenuListItem value="alpha">Alpha</MenuListItem>
      <MenuListItem value="beta">Beta</MenuListItem>
      <MenuListItem value="bravo">Bravo</MenuListItem>
    </MenuList>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("br");
    await expect(opt(c, "Bravo")).toHaveFocus();
  },
};

export const ActivateWithEnterAndSpace: Story = {
  render: Default.render,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(args.onActivate).toHaveBeenLastCalledWith("items");
    await userEvent.keyboard("{ArrowDown} ");
    await expect(args.onActivate).toHaveBeenLastCalledWith("weapons");
    await expect(args.onActivate).toHaveBeenCalledTimes(2);
    await userEvent.click(opt(c, "상태"));
    await expect(args.onActivate).toHaveBeenLastCalledWith("status");
  },
};

export const DisabledItems: Story = {
  render: (args) => (
    <MenuList {...args}>
      <Rows disabled="items" />
    </MenuList>
  ),
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(opt(c, "아이템")).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    await expect(opt(c, "무기")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(opt(c, "상태")).toHaveFocus();
    await userEvent.keyboard("i");
    await expect(opt(c, "상태")).toHaveFocus();
    await userEvent.click(opt(c, "아이템"));
    await expect(args.onActivate).not.toHaveBeenCalled();
  },
};

export const Navigation: Story = {
  args: { variant: "navigation", defaultValue: "a" },
  render: (args) => (
    <MenuList {...args} aria-label="사이트 이동">
      <MenuListItem value="a" current render={<a href="#a" onClick={(e) => e.preventDefault()} />}>
        홈
      </MenuListItem>
      <MenuListItem value="b" render={<a href="#b" onClick={(e) => e.preventDefault()} />}>
        기록
      </MenuListItem>
      <MenuListItem value="c">설정</MenuListItem>
    </MenuList>
  ),
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("listbox")).toBeNull();
    const home = c.getByRole("link", { name: "홈" });
    await expect(home).toHaveAttribute("aria-current", "page");
    await expect(c.getByRole("link", { name: "기록" })).not.toHaveAttribute("aria-current");
    await expect(c.getByRole("button", { name: "설정" })).toBeInTheDocument();
    await userEvent.tab();
    await expect(home).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(c.getByRole("link", { name: "기록" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onActivate).toHaveBeenLastCalledWith("b");
    await userEvent.keyboard("{End} ");
    await expect(args.onActivate).toHaveBeenLastCalledWith("c");
  },
};

export const SelectedRowStyle: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sel = opt(c, "상태");
    const other = opt(c, "아이템");
    await expect(getComputedStyle(sel).backgroundSize).toBe("100% 100%");
    await expect(getComputedStyle(other).backgroundSize).toBe("0% 100%");
    await expect(parseFloat(getComputedStyle(sel).borderTopWidth)).toBe(1);
    await expect(sel.querySelector("[data-menu-bullet]")).not.toBeNull();
    await expect(sel.querySelector("[data-menu-arrow]")).not.toBeNull();
  },
};

export const RuleToken: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const root = document.documentElement;
    root.style.setProperty("--menu-rule", "0px");
    try {
      await waitFor(() => expect(parseFloat(getComputedStyle(opt(c, "상태")).borderTopWidth)).toBe(0));
    } finally {
      root.style.removeProperty("--menu-rule");
    }
  },
};

export const StaggerEntersOnce: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const delays = () => c.getAllByRole("option").map((o) => getComputedStyle(o).transitionDelay);
    await waitFor(() => expect(delays()[2]).toContain("0.08s"));
    await expect(delays()[0]).not.toContain("0.04s");
    await expect(delays()[1]).toContain("0.04s");
    await waitFor(() => expect(getComputedStyle(opt(c, "시스템")).opacity).toBe("1"));
  },
};

export const ReducedMotionHasNoTransition: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const restore = setMotion("reduced");
    try {
      const c = within(canvasElement);
      await waitFor(() => {
        for (const o of c.getAllByRole("option")) {
          const s = getComputedStyle(o);
          expect(s.transitionDuration.split(",").every((d) => parseFloat(d) === 0)).toBe(true);
          expect(s.transitionDelay.split(",").every((d) => parseFloat(d) === 0)).toBe(true);
          expect(s.opacity).toBe("1");
        }
      });
    } finally {
      restore();
    }
  },
};

/** Test-only AudioContext counter: any construction means a cue actually played. */
const withFakeAudio = async (run: (constructed: () => number) => Promise<void>) => {
  const w = window as unknown as { AudioContext: unknown };
  const prev = w.AudioContext;
  let count = 0;
  const chain: unknown = new Proxy(function () {}, {
    get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : p === "state" ? "running" : p === "then" ? undefined : chain),
    apply: () => chain,
  });
  w.AudioContext = function FakeAudioContext() {
    count += 1;
    return chain;
  };
  resetSoundEngineForTests();
  try {
    await run(() => count);
  } finally {
    w.AudioContext = prev;
    resetSoundEngineForTests();
  }
};

export const SilentByDefault: Story = {
  render: (args) => (
    <YorhaProvider>
      <MenuList {...args} sound>
        <Rows />
      </MenuList>
    </YorhaProvider>
  ),
  parameters: { yorha: { manageRoot: false } },
  play: async ({ canvasElement }) => {
    await withFakeAudio(async (constructed) => {
      await userEvent.tab();
      await userEvent.keyboard("{ArrowDown}{Enter}");
      await expect(constructed()).toBe(0);
    });
  },
};

export const SoundCuesWhenEnabled: Story = {
  render: (args) => (
    <YorhaProvider sound={{ enabled: true }}>
      <MenuList {...args} sound>
        <Rows />
      </MenuList>
    </YorhaProvider>
  ),
  parameters: { yorha: { manageRoot: false } },
  play: async () => {
    await withFakeAudio(async (constructed) => {
      await userEvent.tab();
      await userEvent.keyboard("{ArrowDown}");
      await waitFor(() => expect(constructed()).toBe(1));
    });
  },
};

export const LongList: Story = {
  render: (args) => (
    // p-1 (>= ring width + offset): the focus ring is drawn outside the row, so a scroll container needs this room.
    <div className="max-h-64 overflow-y-auto p-1">
      <MenuList {...args} defaultValue="row-1">
        {Array.from({ length: 40 }, (_, i) => (
          <MenuListItem key={i} value={`row-${i + 1}`}>
            항목 {i + 1}
          </MenuListItem>
        ))}
      </MenuList>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("{End}");
    await expect(opt(c, "항목 40")).toHaveFocus();
    await expect(c.getAllByRole("option")).toHaveLength(40);
  },
};

const DETAILS: Record<string, string> = {
  status: "유닛의 체력과 상태 이상을 확인합니다.",
  items: "보유한 소모품과 재료를 확인합니다.",
  weapons: "장비한 무기와 강화 단계를 확인합니다.",
  system: "저장, 불러오기, 환경 설정을 엽니다.",
};

export const WithDescriptionPane: Story = {
  decorators: [
    (Story) => (
      <div className="w-[34rem] max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
        <Story />
      </div>
    ),
  ],
  render: (args) => {
    const [value, setValue] = React.useState("status");
    return (
      <div className="grid grid-cols-2 gap-6">
        <MenuList {...args} value={value} onValueChange={setValue}>
          <Rows />
        </MenuList>
        <p role="status" aria-label="설명" className="border-l border-yorha-border pl-4 text-yorha-sm">
          {DETAILS[value]}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("status")).toHaveTextContent("상태 이상");
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect(c.getByRole("status")).toHaveTextContent("무기");
  },
};

export const Themes: Story = {
  decorators: [],
  render: (args) => (
    <div className="flex flex-wrap gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="w-64 max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
          <MenuList {...args} aria-label={`시스템 메뉴 (${t})`}>
            <Rows disabled="weapons" />
          </MenuList>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("listbox")).toHaveLength(3);
  },
};

// The authentic theme fails the contrast gate by design (faithful low-contrast palette).
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  decorators: [],
  render: (args) => (
    <div data-theme="authentic" className="w-64 max-w-[calc(100vw-2rem)] bg-yorha-panel p-4 text-yorha-fg">
      <MenuList {...args}>
        <Rows />
      </MenuList>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("listbox")).toBeInTheDocument();
  },
};

/** Row transitions use the --yorha-ease-out token, not the raw `ease-out` keyword. */
export const RowEasingToken: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const restore = setMotion("full");
    try {
      const c = within(canvasElement);
      await waitFor(() => {
        const timing = getComputedStyle(opt(c, "아이템")).transitionTimingFunction;
        const token = getComputedStyle(document.documentElement).getPropertyValue("--yorha-ease-out").trim();
        expect(timing).toContain(token);
        expect(timing).not.toContain("ease-out");
      });
    } finally {
      restore();
    }
  },
};

/** States: default, selected (defaultValue), disabled row. Targets >= 24px at both densities. */
export const States: Story = {
  render: (args) => (
    <MenuList {...args}>
      <Rows disabled="weapons" />
    </MenuList>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(opt(c, "상태")).toHaveAttribute("aria-selected", "true");
    await expect(opt(c, "무기")).toHaveAttribute("aria-disabled", "true");
    await expectTargetSize(canvasElement);
  },
};

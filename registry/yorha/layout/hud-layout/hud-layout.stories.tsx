import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { expectTargetSize } from "../../../../.storybook/preview";
import { withRouter } from "../../../../.storybook/decorators";
import { HudLayout, HudRegion } from "@/components/hud-layout";
import { Meter } from "@/components/ui/meter";
import { Glyph } from "@/components/ui/glyph";
import { GridBackground } from "@/components/ui/grid-background";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Hud({ hidden = false, onClose }: { hidden?: boolean; onClose?: () => void }) {
  return (
    <HudLayout label="전투 HUD" hidden={hidden} position="absolute">
      <HudRegion corner="top-start" label="상태">
        <p className="m-0 flex items-center gap-2 bg-yorha-ink px-2 py-1 font-yorha-bold text-yorha-sm text-yorha-on-ink">
          <Glyph name="diamond-target" />
          2B · LV 12
        </p>
      </HudRegion>
      <HudRegion corner="top-end" label="위치">
        <p className="m-0 flex items-center gap-2 border border-yorha-border bg-yorha-panel px-2 py-1 font-yorha-mono text-yorha-xs text-yorha-fg">
          <Glyph name="diamond-dot" />
          폐허 도시 · 구역 3
        </p>
      </HudRegion>
      <HudRegion corner="bottom-start" label="체력과 에너지">
        <Meter label="체력" value={78} style={{ width: 280 }} />
        <Meter label="에너지" value={45} style={{ width: 280 }} />
      </HudRegion>
      <HudRegion corner="bottom-end" label="메시지">
        <p role="status" className="m-0 flex items-center gap-2 border border-yorha-border bg-yorha-panel px-2 py-1 text-yorha-sm text-yorha-fg">
          <Glyph name="triangle-right" />
          포드: 적 반응 감지, 주의하세요.
        </p>
        <button type="button" className="min-h-[24px] min-w-[24px] border border-yorha-border bg-yorha-panel px-2 text-yorha-sm text-yorha-fg" onClick={onClose}>메시지 닫기</button>
      </HudRegion>
    </HudLayout>
  );
}

const meta = {
  title: "레이아웃/HudLayout",
  component: HudLayout,
  tags: ["autodocs"],
  decorators: [withRouter],
  parameters: { docs: { story: { inline: false, iframeHeight: 620 } }, layout: "padded" },
} satisfies Meta<typeof HudLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

const BRACKETS = [
  "start-1 top-1 border-s-2 border-t-2",
  "end-1 top-1 border-e-2 border-t-2",
  "bottom-1 start-1 border-b-2 border-s-2",
  "bottom-1 end-1 border-b-2 border-e-2",
];

/** A 960 x 540 game viewport: grid ground, scanlines and corner brackets under the HUD. */
const frame = (children: React.ReactNode, theme?: string) => (
  <div data-theme={theme} className="relative h-[540px] w-[960px] max-w-full overflow-hidden border border-yorha-border bg-yorha-bg text-yorha-fg">
    <GridBackground />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-20"
      style={{ backgroundImage: "repeating-linear-gradient(to bottom, currentColor 0 1px, transparent 1px 4px)" }}
    />
    {BRACKETS.map((b) => (
      <span key={b} aria-hidden="true" className={`pointer-events-none absolute size-3 border-yorha-border ${b}`} />
    ))}
    <span className="sr-only">게임 화면 영역</span>
    {/* centre reticle and objective marker: reads as a game view rather than an empty field */}
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-yorha-fg-soft">
      <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current" />
      <span className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-current" />
      <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
      <span className="absolute right-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><Glyph name="diamond" /></span>
    </div>
    <p aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[calc(50%+2.75rem)] m-0 -translate-x-1/2 border border-yorha-border bg-yorha-panel px-2 py-0.5 font-yorha-mono text-yorha-xs tabular-nums text-yorha-fg">
      목표 · 지하 격납고 · 240m
    </p>
    {children}
  </div>
);

/** 네 모서리 영역은 각각 이름이 붙은 region이다. */
export const Default: Story = {
  render: () => frame(<Hud />),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("group", { name: "전투 HUD" })).toBeInTheDocument();
    for (const name of ["상태", "위치", "체력과 에너지", "메시지"]) {
      await expect(c.getByRole("region", { name })).toBeInTheDocument();
    }
    await expect(c.getAllByRole("meter")).toHaveLength(2);
  },
};

/** 오버레이와 영역은 포인터를 통과시키고, 버튼만 포인터를 받는다. */
export const PointerEvents: Story = {
  tags: ["!autodocs"],
  render: () => frame(<Hud />),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(getComputedStyle(c.getByRole("group", { name: "전투 HUD" })).pointerEvents).toBe("none");
    await expect(getComputedStyle(c.getByRole("region", { name: "상태" })).pointerEvents).toBe("none");
    await expect(getComputedStyle(c.getByRole("button", { name: "메시지 닫기" })).pointerEvents).not.toBe("none");
    await userEvent.tab();
    await expect(c.getByRole("button", { name: "메시지 닫기" })).toHaveFocus();
  },
};

function Toggle() {
  const [hidden, setHidden] = useState(false);
  return (
    <div>
      <button type="button" className="min-h-[24px] min-w-[24px]" aria-pressed={hidden} onClick={() => setHidden((h) => !h)}>HUD 숨기기</button>
      {frame(<Hud hidden={hidden} />)}
    </div>
  );
}

/** hidden이면 접근성 트리와 화면에서 모두 사라진다. */
export const Hidden: Story = {
  tags: ["!autodocs"],
  render: () => <Toggle />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "상태" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "HUD 숨기기" }));
    await expect(c.queryByRole("region", { name: "상태" })).toBeNull();
    await expect(c.queryByRole("group", { name: "전투 HUD" })).toBeNull();
    await userEvent.click(c.getByRole("button", { name: "HUD 숨기기" }));
    await expect(c.getByRole("region", { name: "상태" })).toBeInTheDocument();
  },
};

function themeStory(theme: (typeof THEMES)[number], name: string): Story {
  return {
    name,
    render: () => frame(<Hud />, theme),
    play: async ({ canvasElement }) => {
      await expect(canvasElement.querySelector("[data-theme]")).toHaveAttribute("data-theme", theme);
      await expect(within(canvasElement).getByRole("region", { name: "메시지" })).toBeInTheDocument();
    },
  };
}
export const LightTheme = themeStory("light", "라이트 테마");
export const DarkTheme = themeStory("dark", "다크 테마");
export const HighContrastTheme = themeStory("high-contrast", "고대비 테마");

/** Authentic palette alone. a11y is "todo": the authentic palette is decorative-only (tokens.md). */
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => frame(<Hud />, "authentic"),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("region", { name: "상태" })).toBeInTheDocument();
  },
};

/** 표시 상태: 영역 안의 버튼 포커스와 타깃 측정. 숨김 상태는 Hidden 스토리에서 확인한다. */
export const States: Story = {
  tags: ["!autodocs"],
  render: () => frame(<Hud />),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("button", { name: "메시지 닫기" })).toHaveFocus();
    await expectTargetSize(canvasElement);
  },
};

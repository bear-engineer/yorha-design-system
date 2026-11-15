import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row, Sheet } from "../../../../src/docs/sheet";
import { expect, waitFor, within } from "storybook/test";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

const THEMES = ["light", "dark", "high-contrast"] as const;

const meta = {
  title: "컴포넌트/피드백/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "불러오는 중", className: "h-4 w-full max-w-64" },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

const shimmerOf = (el: HTMLElement) => el.querySelector<HTMLElement>("[data-yorha-shimmer]");

/** Docs hero: labelled variants at a readable scale. */
export const Overview: Story = {
  name: "구성 한눈에",
  render: () => (
    <Sheet title="Skeleton">
      <SkeletonGroup label="유닛 카드 로딩 중" className="flex gap-4 border border-yorha-border p-4">
        <Skeleton className="size-16 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </SkeletonGroup>
      <SkeletonGroup label="목록 로딩 중" className="flex flex-col gap-2 border border-yorha-border p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </SkeletonGroup>
    </Sheet>
  ),
};

export const Default: Story = {
  tags: ["!autodocs"],
  render: (args) => (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const status = c.getByRole("status", { name: "불러오는 중" });
    await expect(status).toHaveAttribute("aria-busy", "true");
    const shimmer = shimmerOf(status);
    await expect(shimmer).not.toBeNull();
    await expect(shimmer!).toHaveAttribute("aria-hidden", "true");
    await expect(shimmer!).toHaveStyle({ pointerEvents: "none" });
  },
};

/** Flat fill with an optional 1 px inset frame. */
export const Framed: Story = {
  render: (args) => (
    <div className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} label={undefined} />
      <Skeleton {...args} label={undefined} framed className="h-10 w-full" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const framed = canvasElement.querySelector<HTMLElement>("[data-framed]");
    await expect(framed).not.toBeNull();
    await expect(getComputedStyle(framed!).boxShadow).not.toBe("none");
  },
};

/** Loops while mounted: still scanning after 6 s (full); reduced = one opacity animation; off = none. */
export const ReducedMotion: Story = {
  render: (args) => (
    <div className="w-80 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    const c = within(canvasElement);
    const shimmer = shimmerOf(c.getByRole("status"));
    await expect(shimmer).not.toBeNull();
    const keys = (a: Animation) => Object.keys((a.effect as KeyframeEffect).getKeyframes()[0]!);
    try {
      html.dataset.motion = "full";
      await waitFor(() => expect(shimmer!.getAnimations().length).toBe(1));
      await new Promise((r) => setTimeout(r, 6200));
      await expect(shimmer!.getAnimations()[0]!.playState).toBe("running");
      html.dataset.motion = "reduced";
      await waitFor(() => expect(shimmer!.getAnimations().length).toBe(1));
      await expect(keys(shimmer!.getAnimations()[0]!)).toContain("opacity");
      await expect(keys(shimmer!.getAnimations()[0]!)).not.toContain("transform");
      html.dataset.motion = "off";
      await waitFor(() => expect(shimmer!.getAnimations().length).toBe(0));
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

export const Themes: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <div key={t} data-theme={t} className="flex flex-col gap-3 bg-yorha-panel p-4 text-yorha-fg">
          <span className="text-yorha-sm">{t}</span>
          <Skeleton {...args} className="h-4 w-full" />
          <Skeleton {...args} className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  ),
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: (args) => (
    <div data-theme="authentic" className="w-80 max-w-[calc(100vw-2rem)] bg-yorha-panel p-6 text-yorha-fg">
      <Skeleton {...args} />
    </div>
  ),
};

/** Many skeletons, one announcement: the group is the only status; the blocks are presentation. */
export const Group: Story = {
  render: () => (
    <SkeletonGroup label="대시보드 로딩 중" className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 bg-yorha-panel p-6">
      <Skeleton label="무시됨" className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-16 w-full" />
    </SkeletonGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("status").length).toBe(1);
    await expect(c.getByRole("status", { name: "대시보드 로딩 중" })).toHaveAttribute("aria-busy", "true");
    for (const s of canvasElement.querySelectorAll("[data-slot=skeleton]")) await expect(s).toHaveAttribute("role", "presentation");
  },
};

/** Full motion is a smooth linear translateX shimmer, never stepped. */
export const LinearShimmer: Story = {
  render: (args) => <Skeleton {...args} />,
  play: async ({ canvasElement }) => {
    const html = document.documentElement;
    const previous = html.dataset.motion;
    try {
      html.dataset.motion = "full";
      const shimmer = shimmerOf(within(canvasElement).getByRole("status"))!;
      await waitFor(() => expect(shimmer.getAnimations().length).toBe(1));
      await expect((shimmer.getAnimations()[0]!.effect as KeyframeEffect).getTiming().easing).toBe("linear");
    } finally {
      html.dataset.motion = previous ?? "full";
    }
  },
};

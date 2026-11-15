import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useDirection } from "@base-ui/react/direction-provider";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import {
  MAX_FLASH_HZ,
  YorhaProvider,
  useDensity,
  useMotion,
  useSoundPreference,
  useTheme,
  type Density,
  type Motion,
  type Theme,
} from "./yorha-provider";

const THEMES: Theme[] = ["light", "dark", "authentic", "high-contrast"];

/** Styled HUD readout: mono label + value in a 1px frame (replaces raw debug text). */
function Readout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-stretch border border-yorha-border font-yorha-mono text-yorha-xs">
      <span className="bg-yorha-ink px-2 py-1 text-yorha-on-ink">{label}</span>
      <span className="px-2 py-1 text-yorha-fg">{children}</span>
    </span>
  );
}

function Panel() {
  const { theme, setTheme } = useTheme();
  const { motion, setMotion } = useMotion();
  const { density } = useDensity();
  const sound = useSoundPreference();
  return (
    <div className="flex flex-col gap-4 bg-yorha-panel p-4 text-yorha-fg">
      <div className="flex flex-wrap gap-2">
        <Readout label="테마"><output data-testid="theme">{theme}</output></Readout>
        <Readout label="모션"><output data-testid="motion">{motion}</output></Readout>
        <Readout label="밀도"><output data-testid="density">{density}</output></Readout>
      </div>
      <div className="flex flex-wrap gap-2">
        <Readout label="사운드"><output data-testid="sound-enabled">{String(sound.enabled)}</output></Readout>
        <Readout label="볼륨"><output data-testid="sound-volume">{sound.volume}</output></Readout>
        <Readout label="최대 점멸"><output data-testid="flash">{MAX_FLASH_HZ}</output>Hz</Readout>
      </div>
      <div className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button key={t} type="button" className="border border-yorha-border px-3 py-1" onClick={() => setTheme(t)}>
            {t}
          </button>
        ))}
        <button type="button" className="border border-yorha-border px-3 py-1" onClick={() => setMotion("off")}>
          모션 끄기
        </button>
      </div>
    </div>
  );
}

/** Patches matchMedia so `prefers-reduced-motion: reduce` matches, and clears the persisted choice. */
function emulateReducedPreference(Story: () => React.ReactElement) {
  window.localStorage.removeItem("yorha:motion");
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => {
    const real = original.call(window, query);
    if (!query.includes("prefers-reduced-motion")) return real;
    return {
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
  return <Story />;
}

const root = () => document.documentElement;

const meta = {
  title: "프로바이더/YorhaProvider",
  component: YorhaProvider,
  tags: ["autodocs"],
  // The provider owns <html data-*> in these stories; the toolbar decorator must stay out.
  parameters: { yorha: { manageRoot: false } },
  decorators: [
    (Story) => {
      window.localStorage.removeItem("yorha:motion");
      return <Story />;
    },
  ],
  render: (args) => (
    <YorhaProvider {...args}>
      <Panel />
    </YorhaProvider>
  ),
} satisfies Meta<typeof YorhaProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

const THEME_LABEL: Record<Theme, string> = { light: "라이트", dark: "다크", authentic: "오센틱", "high-contrast": "고대비" };
const MOTION_OPTIONS: { id: Motion; label: string }[] = [
  { id: "full", label: "전체" },
  { id: "reduced", label: "줄임" },
  { id: "off", label: "끔" },
];
const DENSITY_OPTIONS: { id: Density; label: string }[] = [
  { id: "compact", label: "촘촘" },
  { id: "default", label: "기본" },
  { id: "comfortable", label: "여유" },
];

/** One labelled segmented row: 1px frame, ink fill on the active segment, fixed cell widths (no shift). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-yorha-sm text-yorha-fg-muted">{label}</span>
      <div role="group" aria-label={label} className="inline-flex border border-yorha-border">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className="min-w-16 border-r border-yorha-border px-3 py-1 text-yorha-sm last:border-r-0 aria-pressed:bg-yorha-ink aria-pressed:text-yorha-on-ink"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Hero: the provider's controls wired to one provider, with a sample card that reacts to theme, density and motion. */
function ProviderOverview() {
  const { theme, setTheme } = useTheme();
  const { motion, setMotion } = useMotion();
  const { density, setDensity } = useDensity();
  const pad = density === "compact" ? "p-2" : density === "comfortable" ? "p-6" : "p-4";
  return (
    <div className="grid w-[720px] max-w-full grid-cols-[1fr_260px] border border-yorha-border bg-yorha-bg text-yorha-fg">
      <section aria-label="설정" className="flex flex-col gap-4 border-r border-yorha-border p-5">
        <h3 className="m-0 text-yorha-base font-medium">표시 설정</h3>
        <Segmented
          label="테마"
          value={theme}
          options={THEMES.map((t) => ({ id: t, label: THEME_LABEL[t] }))}
          onChange={setTheme}
        />
        <Segmented label="모션" value={motion} options={MOTION_OPTIONS} onChange={setMotion} />
        <Segmented label="밀도" value={density} options={DENSITY_OPTIONS} onChange={setDensity} />
        <p className="m-0 border-t border-yorha-border pt-3 text-yorha-xs text-yorha-fg-muted">
          선택은 <code className="font-yorha-mono">html[data-theme · data-motion · data-density]</code>로 반영되고 저장됩니다. 사운드는 기본으로 꺼져 있습니다.
        </p>
      </section>
      <section aria-label="미리보기" className="flex items-start bg-yorha-panel p-5">
        <article data-testid="sample-card" className={`flex w-full flex-col gap-2 border border-yorha-border bg-yorha-bg ${pad}`}>
          <span className="font-yorha-mono text-yorha-xs text-yorha-fg-muted">UNIT 2B · 정비 기록</span>
          <strong className="text-yorha-base font-medium">회복 모듈 점검 완료</strong>
          <span className="text-yorha-sm">수리 3건, 대기 1건. 다음 점검은 06:00입니다.</span>
          <div className="mt-1 flex gap-2">
            <Readout label="테마"><output data-testid="theme">{theme}</output></Readout>
            <Readout label="밀도"><output data-testid="density">{density}</output></Readout>
          </div>
        </article>
      </section>
    </div>
  );
}

export const Overview: Story = {
  name: "개요",
  render: (args) => (
    <YorhaProvider {...args}>
      <ProviderOverview />
    </YorhaProvider>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "다크" }));
    await waitFor(() => expect(root().dataset.theme).toBe("dark"));
    await userEvent.click(c.getByRole("button", { name: "촘촘" }));
    await waitFor(() => expect(root().dataset.density).toBe("compact"));
    expect(c.getByTestId("sample-card")).toBeTruthy();
  },
};

export const ThemeSwitch: Story = {
  tags: ["!autodocs"],
  name: "테마 전환",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await waitFor(() => expect(root().dataset.theme).toBe("light"));
    await userEvent.click(c.getByRole("button", { name: "dark" }));
    await waitFor(() => expect(root().dataset.theme).toBe("dark"));
    expect(c.getByTestId("theme")).toHaveTextContent("dark");
    await userEvent.click(c.getByRole("button", { name: "high-contrast" }));
    await waitFor(() => expect(root().dataset.theme).toBe("high-contrast"));
  },
};

export const InitialProps: Story = {
  tags: ["!autodocs"],
  name: "초기값 props",
  args: { theme: "dark", density: "compact", motion: "off" },
  play: async () => {
    await waitFor(() => expect(root().dataset.theme).toBe("dark"));
    expect(root().dataset.density).toBe("compact");
    expect(root().dataset.motion).toBe("off");
  },
};

export const ReducedPreference: Story = {
  tags: ["!autodocs"],
  name: "시스템 감소 모션 선호",
  decorators: [emulateReducedPreference],
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(root().dataset.motion).toBe("reduced"));
    expect(within(canvasElement).getByTestId("motion")).toHaveTextContent("reduced");
  },
};

export const MotionPersisted: Story = {
  tags: ["!autodocs"],
  name: "모션 설정 저장",
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "모션 끄기" }));
    await waitFor(() => expect(root().dataset.motion).toBe("off"));
    expect(window.localStorage.getItem("yorha:motion")).toBe("off");
  },
};

export const SoundDisabledByDefault: Story = {
  tags: ["!autodocs"],
  name: "사운드 기본 꺼짐",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    expect(c.getByTestId("sound-enabled")).toHaveTextContent("false");
    const volume = Number(c.getByTestId("sound-volume").textContent);
    expect(volume).toBeGreaterThanOrEqual(0);
    expect(volume).toBeLessThanOrEqual(1);
    expect(c.getByTestId("flash")).toHaveTextContent("3");
  },
};

function DirectionProbe() {
  const dir = useDirection();
  return <output data-testid="direction">{dir}</output>;
}

export const DirectionDefault: Story = {
  tags: ["!autodocs"],
  name: "방향 기본 ltr",
  render: (args) => (
    <YorhaProvider {...args}>
      <DirectionProbe />
    </YorhaProvider>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("direction")).toHaveTextContent("ltr");
  },
};

export const DirectionRtl: Story = {
  tags: ["!autodocs"],
  name: "방향 rtl",
  args: { direction: "rtl" },
  render: (args) => (
    <YorhaProvider {...args}>
      <DirectionProbe />
    </YorhaProvider>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId("direction")).toHaveTextContent("rtl");
  },
};

const NONCE = "yorha-test-nonce";

/** CSPProvider: Base UI ScrollArea emits its inline `<style>` with the nonce. */
export const CspNonce: Story = {
  tags: ["!autodocs"],
  name: "CSP nonce",
  args: { nonce: NONCE },
  render: (args) => (
    <YorhaProvider {...args}>
      <ScrollAreaPrimitive.Root className="h-16 w-40">
        <ScrollAreaPrimitive.Viewport className="h-full w-full">
          <div className="h-64">긴 내용</div>
        </ScrollAreaPrimitive.Viewport>
      </ScrollAreaPrimitive.Root>
    </YorhaProvider>
  ),
  play: async () => {
    await waitFor(() => expect(document.querySelector(`style[nonce="${NONCE}"]`)).not.toBeNull());
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  MAX_FLASH_HZ,
  YorhaProvider,
  useDensity,
  useMotion,
  useSoundPreference,
  useTheme,
  type Theme,
} from "./yorha-provider";

const THEMES: Theme[] = ["light", "dark", "authentic", "high-contrast"];

function Panel() {
  const { theme, setTheme } = useTheme();
  const { motion, setMotion } = useMotion();
  const { density } = useDensity();
  const sound = useSoundPreference();
  return (
    <div className="flex flex-col gap-4 bg-yorha-panel p-4 text-yorha-fg">
      <p>
        테마 <output data-testid="theme">{theme}</output> · 모션 <output data-testid="motion">{motion}</output> · 밀도{" "}
        <output data-testid="density">{density}</output>
      </p>
      <p>
        사운드 <output data-testid="sound-enabled">{String(sound.enabled)}</output> · 볼륨{" "}
        <output data-testid="sound-volume">{sound.volume}</output> · 최대 점멸 <output data-testid="flash">{MAX_FLASH_HZ}</output>Hz
      </p>
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

export const ThemeSwitch: Story = {
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
  name: "초기값 props",
  args: { theme: "authentic", density: "compact", motion: "off" },
  parameters: { a11y: { test: "todo" } }, // authentic theme fails contrast pairs by design
  play: async () => {
    await waitFor(() => expect(root().dataset.theme).toBe("authentic"));
    expect(root().dataset.density).toBe("compact");
    expect(root().dataset.motion).toBe("off");
  },
};

export const ReducedPreference: Story = {
  name: "시스템 감소 모션 선호",
  decorators: [emulateReducedPreference],
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(root().dataset.motion).toBe("reduced"));
    expect(within(canvasElement).getByTestId("motion")).toHaveTextContent("reduced");
  },
};

export const MotionPersisted: Story = {
  name: "모션 설정 저장",
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "모션 끄기" }));
    await waitFor(() => expect(root().dataset.motion).toBe("off"));
    expect(window.localStorage.getItem("yorha:motion")).toBe("off");
  },
};

export const SoundDisabledByDefault: Story = {
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

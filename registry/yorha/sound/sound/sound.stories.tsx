import { Slider } from "@/components/ui/slider";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within, userEvent } from "storybook/test";
import { YorhaProvider, useSoundPreference, type YorhaProviderProps } from "@/components/yorha-provider";
import { SOUND_CUES, resetSoundEngineForTests, useSound, type SoundCue } from "./sound";

const CUE_LABELS: Record<SoundCue, string> = {
  "cursor-move": "커서 이동",
  select: "선택",
  confirm: "확인",
  cancel: "취소",
  open: "열기",
  close: "닫기",
  error: "오류",
  "typing-tick": "타자 틱",
};

/** Test-only fake of the WebAudio graph: counts constructions and records gains and oscillators. */
interface FakeParam {
  value: number;
  setValueAtTime(v: number): FakeParam;
  linearRampToValueAtTime(v: number): FakeParam;
  exponentialRampToValueAtTime(v: number): FakeParam;
}
interface SoundMock {
  constructed: number;
  gains: { gain: FakeParam }[];
  oscillators: number;
  noise: number;
}

const mockState = (): SoundMock => (window as unknown as { __soundMock: SoundMock }).__soundMock;

function param(value = 0): FakeParam {
  const p: FakeParam = {
    value,
    setValueAtTime(v) {
      p.value = v;
      return p;
    },
    linearRampToValueAtTime(v) {
      p.value = v;
      return p;
    },
    exponentialRampToValueAtTime(v) {
      p.value = v;
      return p;
    },
  };
  return p;
}

class FakeNode {
  connect() {
    return this;
  }
  disconnect() {}
}

class FakeAudioContext {
  state: "running" | "suspended" = "running";
  currentTime = 0;
  sampleRate = 48000;
  destination = new FakeNode();

  constructor() {
    mockState().constructed += 1;
  }
  createGain() {
    const node = Object.assign(new FakeNode(), { gain: param(1) });
    mockState().gains.push(node);
    return node;
  }
  createOscillator() {
    mockState().oscillators += 1;
    return Object.assign(new FakeNode(), {
      type: "sine",
      frequency: param(440),
      start() {},
      stop() {},
    });
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    mockState().noise += 1;
    return Object.assign(new FakeNode(), { buffer: null, start() {}, stop() {} });
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
}

/** Installs the fake AudioContext and resets the engine so each story starts from zero. */
function withMockAudio(Story: () => React.ReactElement) {
  (window as unknown as { __soundMock: SoundMock }).__soundMock = { constructed: 0, gains: [], oscillators: 0, noise: 0 };
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  resetSoundEngineForTests();
  return <Story />;
}

function SoundPanel() {
  const { play } = useSound();
  const { enabled, setEnabled, volume, setVolume } = useSoundPreference();
  return (
    <div className="flex flex-col gap-4 bg-yorha-panel p-4 text-yorha-fg">
      <p>
        사운드 <output data-testid="sound-enabled">{String(enabled)}</output>
      </p>
      <div className="flex flex-wrap gap-2">
        {SOUND_CUES.map((cue) => (
          <button key={cue} type="button" className="border border-yorha-border px-3 py-1" onClick={() => play(cue)}>
            {CUE_LABELS[cue]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Slider
          label="볼륨"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onValueChange={(v) => setVolume(Array.isArray(v) ? (v[0] ?? 0) : v)}
          className="max-w-xs"
        />
        <output data-testid="sound-volume" aria-live="off">{volume}</output>
      </div>
      <button type="button" aria-pressed={!enabled} className="border border-yorha-border px-3 py-1" onClick={() => setEnabled(!enabled)}>
        음소거
      </button>
    </div>
  );
}

const meta = {
  title: "사운드/Sound",
  tags: ["autodocs"],
  // The provider owns <html data-*> in these stories; the toolbar decorator must stay out.
  parameters: { yorha: { manageRoot: false } },
  decorators: [withMockAudio],
  render: (args: YorhaProviderProps) => (
    <YorhaProvider {...args}>
      <SoundPanel />
    </YorhaProvider>
  ),
} satisfies Meta<YorhaProviderProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DisabledByDefault: Story = {
  name: "기본 꺼짐: 첫 렌더에서 AudioContext 없음",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    expect(c.getByTestId("sound-enabled")).toHaveTextContent("false");
    expect(mockState().constructed).toBe(0);
    await userEvent.click(c.getByRole("button", { name: "선택" }));
    expect(mockState().constructed).toBe(0);
    expect(mockState().oscillators).toBe(0);
  },
};

export const PlaysOneSharedContext: Story = {
  name: "활성화 시 공유 컨텍스트 하나 재사용",
  args: { sound: { enabled: true } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "선택" }));
    await waitFor(() => expect(mockState().oscillators).toBeGreaterThan(0));
    expect(mockState().constructed).toBe(1);
    const before = mockState().oscillators;
    await userEvent.click(c.getByRole("button", { name: "확인" }));
    await userEvent.click(c.getByRole("button", { name: "타자 틱" }));
    expect(mockState().oscillators).toBeGreaterThan(before);
    expect(mockState().noise).toBeGreaterThan(0);
    expect(mockState().constructed).toBe(1);
  },
};

export const MutesOnWindowBlur: Story = {
  name: "창 포커스 해제 시 음소거",
  args: { sound: { enabled: true, volume: 0.5 } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "선택" }));
    const master = mockState().gains[0];
    expect(master?.gain.value).toBeCloseTo(0.5);
    window.dispatchEvent(new Event("blur"));
    await userEvent.click(c.getByRole("button", { name: "확인" }));
    expect(mockState().gains[0]?.gain.value).toBe(0);
    window.dispatchEvent(new Event("focus"));
    await userEvent.click(c.getByRole("button", { name: "확인" }));
    expect(mockState().gains[0]?.gain.value).toBeCloseTo(0.5);
  },
};

export const MuteToggleAndVolume: Story = {
  name: "음소거 토글과 마스터 볼륨",
  args: { sound: { enabled: true } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const slider = c.getByRole("slider") as HTMLInputElement;
    // Native setter: React tracks the value, so a plain assignment would not fire onChange.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setValue?.call(slider, "0.8");
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(() => expect(c.getByTestId("sound-volume")).toHaveTextContent("0.8"));
    await userEvent.click(c.getByRole("button", { name: "선택" }));
    expect(mockState().gains[0]?.gain.value).toBeCloseTo(0.8);

    const mute = c.getByRole("button", { name: "음소거" });
    await userEvent.click(mute);
    expect(c.getByTestId("sound-enabled")).toHaveTextContent("false");
    expect(mute).toHaveAttribute("aria-pressed", "true");
    const before = mockState().oscillators;
    await userEvent.click(c.getByRole("button", { name: "오류" }));
    expect(mockState().oscillators).toBe(before);
  },
};

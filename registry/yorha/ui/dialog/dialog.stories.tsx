import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YorhaProvider } from "@/components/yorha-provider";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  createDialogHandle,
  dialogStyles,
} from "@/components/ui/dialog";

// --- motion helpers (reduced: opacity-only, <=120ms; off: 0) ---
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
// v4: the popup unfolds with a CSS animation (yorha-unfold), the scrim fades with a transition; read both.
function durationsMs(el: Element): number[] {
  const cs = getComputedStyle(el);
  return [...cs.transitionDuration.split(","), ...(cs.animationName === "none" ? [] : cs.animationDuration.split(","))].map((v) =>
    v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000,
  );
}
/** Reduced: a fade of at most 120ms and no spatial travel (--motion-spatial is 0). */
async function expectReduced(el: Element) {
  // Base UI sets an inline `transition: none` for the first frame of some popups.
  await waitFor(() => expect(getComputedStyle(el).transitionProperty).not.toBe("none"));
  const max = Math.max(...durationsMs(el));
  expect(max).toBeGreaterThan(0);
  expect(max).toBeLessThanOrEqual(120);
  const cs = getComputedStyle(el);
  expect(cs.transitionProperty.includes("opacity") || cs.animationName.includes("unfold")).toBe(true);
  expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-spatial").trim()).toBe("0");
}
async function expectOff(el: Element) {
  expect(Math.max(...durationsMs(el))).toBe(0);
}

const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo({ sound = false }: { sound?: boolean }) {
  return (
    <Dialog sound={sound}>
      <DialogTrigger render={<Button />}>유닛 정보 열기</DialogTrigger>
      <DialogContent>
        <DialogTitle>유닛 정보</DialogTitle>
        <DialogBody>
          <DialogDescription>이 유닛의 식별 이름을 변경한다.</DialogDescription>
          <Input aria-label="유닛 이름" defaultValue="2B" className="mt-4" />
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>취소</DialogClose>
          <DialogClose render={<Button variant="primary" />}>저장</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const meta = {
  title: "컴포넌트/오버레이/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "유닛 정보 열기" });
    await expect(screen.queryByRole("dialog")).toBeNull();

    // opens on trigger
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");

    // title and description are wired
    const titleId = dialog.getAttribute("aria-labelledby");
    const descId = dialog.getAttribute("aria-describedby");
    await expect(titleId).toBeTruthy();
    await expect(descId).toBeTruthy();
    await expect(document.getElementById(titleId!)).toHaveTextContent("유닛 정보");
    await expect(document.getElementById(descId!)).toHaveTextContent("식별 이름");
    await expect(dialog).toHaveAccessibleName("유닛 정보");

    // focus moves inside
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // G11: the scrim reads the modal-backdrop tokens and the popup unfolds; the title strip has no text-shadow (B4)
    const scrim = dialog.parentElement!.previousElementSibling as HTMLElement;
    await expect(getComputedStyle(scrim).getPropertyValue("--motion-panel").trim()).toBe(getComputedStyle(document.documentElement).getPropertyValue("--motion-modal-backdrop").trim());
    await expect(getComputedStyle(dialog).animationName).toContain("yorha-unfold-clip-in");
    await expect(getComputedStyle(document.getElementById(titleId!)!).textShadow).toBe("none");

    // Tab is trapped (both directions)
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      // focus guards hand focus back to the popup asynchronously
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    }
    for (let i = 0; i < 4; i++) {
      await userEvent.tab({ shift: true });
      // focus guards hand focus back to the popup asynchronously
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    }

    // Escape closes, focus returns to trigger
    await userEvent.keyboard("{Escape}");
    // The fading backdrop and popup must not keep eating clicks: 50ms after Esc the trigger is the hit target again.
    await new Promise((r) => setTimeout(r, 50));
    const box = trigger.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    await expect(hit === trigger || trigger.contains(hit)).toBe(true);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const CloseButton: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "유닛 정보 열기" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    // FOVL-12: the header strip carries a close button (touch has no Esc); it is a >= 24px target at the strip's right end
    const close = within(dialog).getByRole("button", { name: "닫기" });
    const strip = within(dialog).getByRole("heading", { name: "유닛 정보" }).getBoundingClientRect();
    await expect(close.getBoundingClientRect().right).toBeCloseTo(strip.right, 0);
    await expect(close.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
    await userEvent.click(close);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** FOVL-03: long content scrolls inside the body; the title strip and the footer stay in view. */
export const LongContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>긴 기록 열기</DialogTrigger>
      <DialogContent>
        <DialogTitle>작전 기록</DialogTitle>
        <DialogBody>
          <DialogDescription>
            {Array.from({ length: 40 }, (_, i) => (
              <span key={i} className="block">기록 {i + 1}: 유닛 상태를 점검한다.</span>
            ))}
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>닫기</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "긴 기록 열기" }));
    const dialog = await screen.findByRole("dialog");
    await new Promise((r) => setTimeout(r, 450));
    const body = dialog.querySelector<HTMLElement>("[data-slot=dialog-body]")!;
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    const title = within(dialog).getByRole("heading", { name: "작전 기록" });
    const top = title.getBoundingClientRect().top;
    body.scrollTop = 300;
    await expect(title.getBoundingClientRect().top).toBe(top);
    const footer = dialog.querySelector("[data-slot=dialog-footer]")!.getBoundingClientRect();
    await expect(footer.bottom).toBeLessThanOrEqual(dialog.getBoundingClientRect().bottom);
    await expect(dialog.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight - 32);
    await expect(Number.isInteger(dialog.getBoundingClientRect().top)).toBe(true);
  },
};

export const ReducedMotion: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const open = within(canvasElement).getByRole("button", { name: "유닛 정보 열기" });
    await inMotion("reduced", async () => {
      await userEvent.click(open);
      const dialog = await screen.findByRole("dialog");
      await expectReduced(dialog);
      await expectReduced(document.querySelector(".yorha-fade")!);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 400 });
    });
    await inMotion("off", async () => {
      await userEvent.click(open);
      const dialog = await screen.findByRole("dialog");
      await expectOff(dialog);
      await expectOff(document.querySelector(".yorha-fade")!);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 200 });
    });
  },
};

const detached = createDialogHandle();

/** Trigger outside `<Dialog>`, linked by a handle. DialogContent renders Backdrop and Viewport. */
export const DetachedTrigger: Story = {
  render: () => (
    <div>
      <DialogTrigger handle={detached} render={<Button />}>
        분리된 트리거
      </DialogTrigger>
      <Dialog handle={detached}>
        <DialogContent>
          <DialogTitle>분리된 다이얼로그</DialogTitle>
          <DialogBody>
            <DialogDescription>트리거가 Dialog 밖에 있어도 handle로 연결된다.</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>닫기</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "분리된 트리거" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "분리된 다이얼로그" });
    // Viewport and Backdrop are real parts around the popup
    await expect(dialog.parentElement).toHaveClass("fixed");
    await expect(document.querySelector(".yorha-fade")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const Motion: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "유닛 정보 열기" }));
    const dialog = await screen.findByRole("dialog");
    const enter = Math.max(...durationsMs(dialog));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(enter).toBeGreaterThan(0);
  },
};

export const WithSound: Story = {
  // sound is opt-in and silent by default: the provider keeps it disabled, so no AudioContext is created.
  parameters: { yorha: { manageRoot: false } },
  render: () => (
    <YorhaProvider>
      <Demo sound />
    </YorhaProvider>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "유닛 정보 열기" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

function Preview({ theme }: { theme?: string }) {
  return (
    <div data-theme={theme} className="max-w-[calc(100vw-2rem)] bg-yorha-bg p-6 text-yorha-fg">
      <div className={`${dialogStyles.popup} w-80`}>
        <div className={dialogStyles.title}>유닛 정보</div>
        <div className={dialogStyles.body}>
          <p className={dialogStyles.description}>이 유닛의 식별 이름을 변경한다.</p>
        </div>
        <div className={dialogStyles.footer}>
          <Button variant="ghost">취소</Button>
          <Button variant="primary">저장</Button>
        </div>
      </div>
    </div>
  );
}

export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {THEMES.map((t) => (
        <Preview key={t} theme={t} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("유닛 정보")).toHaveLength(3);
  },
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  tags: ["!autodocs"],
  parameters: { a11y: { test: "todo" } },
  render: () => <Preview theme="authentic" />,
};

/** States: closed trigger, open popup (focus inside, Tab trapped), disabled-free actions. Targets >= 24px at both densities. */
export const States: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "유닛 정보 열기" });
    await expectTargetSize(canvasElement);
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await expectTargetSize(dialog);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

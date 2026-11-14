import type { Meta, StoryObj } from "@storybook/react-vite";
import { expectTargetSize } from "../../../../.storybook/preview";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  createAlertDialogHandle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { dialogStyles } from "@/components/ui/dialog";
import { YorhaProvider } from "@/components/yorha-provider";

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
function durationsMs(el: Element): number[] {
  return getComputedStyle(el)
    .transitionDuration.split(",")
    .map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000));
}
/** Reduced: a fade of at most 120ms and no spatial travel (--motion-spatial is 0). */
async function expectReduced(el: Element) {
  // Base UI sets an inline `transition: none` for the first frame of some popups.
  await waitFor(() => expect(getComputedStyle(el).transitionProperty).not.toBe("none"));
  const max = Math.max(...durationsMs(el));
  expect(max).toBeGreaterThan(0);
  expect(max).toBeLessThanOrEqual(120);
  expect(getComputedStyle(el).transitionProperty).toContain("opacity");
  expect(getComputedStyle(document.documentElement).getPropertyValue("--motion-spatial").trim()).toBe("0");
}
async function expectOff(el: Element) {
  expect(Math.max(...durationsMs(el))).toBe(0);
}

const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo({ sound = false, onConfirm }: { sound?: boolean; onConfirm?: () => void }) {
  return (
    <AlertDialog sound={sound}>
      <AlertDialogTrigger render={<Button variant="danger" />}>기록 삭제</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>기록을 삭제할까?</AlertDialogTitle>
        <AlertDialogDescription>삭제한 기록은 복구할 수 없다.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="ghost" />}>취소</AlertDialogCancel>
          <AlertDialogAction render={<Button variant="danger" />} onClick={onConfirm}>
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const meta = {
  title: "컴포넌트/오버레이/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof AlertDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "기록 삭제" });
    await expect(screen.queryByRole("alertdialog")).toBeNull();

    // opens on trigger
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("alertdialog");

    // title and description are wired
    const titleId = dialog.getAttribute("aria-labelledby");
    const descId = dialog.getAttribute("aria-describedby");
    await expect(titleId).toBeTruthy();
    await expect(descId).toBeTruthy();
    await expect(document.getElementById(titleId!)).toHaveTextContent("기록을 삭제할까?");
    await expect(document.getElementById(descId!)).toHaveTextContent("복구할 수 없다");
    await expect(dialog).toHaveAccessibleName("기록을 삭제할까?");

    // focus moves inside, Tab trapped
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    for (let i = 0; i < 5; i++) {
      await userEvent.tab();
      // focus guards hand focus back to the popup asynchronously
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    }
    for (let i = 0; i < 3; i++) {
      await userEvent.tab({ shift: true });
      // focus guards hand focus back to the popup asynchronously
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    }

    // Escape cancels, focus returns to trigger
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const ExplicitAction: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "기록 삭제" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("alertdialog");

    // outside press does not dismiss: an explicit action is required
    await userEvent.click(document.body);
    await new Promise((r) => setTimeout(r, 400));
    await expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // the action closes it and focus returns to the trigger
    await userEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const ReducedMotion: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const open = within(canvasElement).getByRole("button", { name: "기록 삭제" });
    await inMotion("reduced", async () => {
      await userEvent.click(open);
      const dialog = await screen.findByRole("alertdialog");
      await expectReduced(dialog);
      await expectReduced(document.querySelector(".yorha-fade")!);
      await userEvent.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull(), { timeout: 400 });
    });
    await inMotion("off", async () => {
      await userEvent.click(open);
      const dialog = await screen.findByRole("alertdialog");
      await expectOff(dialog);
      await expectOff(document.querySelector(".yorha-fade")!);
      await userEvent.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull(), { timeout: 200 });
    });
  },
};

const detached = createAlertDialogHandle();

/** Trigger outside <AlertDialog>, linked by a handle. AlertDialogContent renders Backdrop and Viewport. */
export const DetachedTrigger: Story = {
  render: () => (
    <div>
      <AlertDialogTrigger handle={detached} render={<Button variant="danger" />}>
        분리된 삭제
      </AlertDialogTrigger>
      <AlertDialog handle={detached}>
        <AlertDialogContent>
          <AlertDialogTitle>분리된 경고</AlertDialogTitle>
          <AlertDialogDescription>트리거가 AlertDialog 밖에 있어도 handle로 연결된다.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="ghost" />}>취소</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "분리된 삭제" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("alertdialog", { name: "분리된 경고" });
    await expect(dialog.parentElement).toHaveClass("fixed");
    await userEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const WithSound: Story = {
  // sound is opt-in and silent by default: the provider keeps it disabled.
  parameters: { yorha: { manageRoot: false } },
  render: () => (
    <YorhaProvider>
      <Demo sound />
    </YorhaProvider>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "기록 삭제" });
    await userEvent.click(trigger);
    await screen.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

function Preview({ theme }: { theme?: string }) {
  return (
    <div data-theme={theme} className="bg-yorha-bg p-6 text-yorha-fg">
      <div className={`${dialogStyles.popup} w-80 border-yorha-alert-ui`}>
        <div className={dialogStyles.title}>기록을 삭제할까?</div>
        <div className={dialogStyles.body}>
          <p className={dialogStyles.description}>삭제한 기록은 복구할 수 없다.</p>
        </div>
        <div className={dialogStyles.footer}>
          <Button variant="ghost">취소</Button>
          <Button variant="danger">삭제</Button>
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
    await expect(within(canvasElement).getAllByText("기록을 삭제할까?")).toHaveLength(3);
  },
};

// authentic palette is intentionally low-contrast (decorative mode), so only this story skips a11y.
export const Authentic: Story = {
  parameters: { a11y: { test: "todo" } },
  render: () => <Preview theme="authentic" />,
};

/** States: closed trigger and open popup with cancel/destructive actions. Targets >= 24px at both densities. */
export const States: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    await expectTargetSize(canvasElement);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "기록 삭제" }));
    const dialog = await screen.findByRole("alertdialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await expectTargetSize(dialog);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  },
};

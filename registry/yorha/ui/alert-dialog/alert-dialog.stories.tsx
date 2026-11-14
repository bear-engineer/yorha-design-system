import type { Meta, StoryObj } from "@storybook/react-vite";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { dialogStyles } from "@/components/ui/dialog";
import { YorhaProvider } from "@/components/yorha-provider";

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
      await expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 3; i++) {
      await userEvent.tab({ shift: true });
      await expect(dialog.contains(document.activeElement)).toBe(true);
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
    const root = document.documentElement;
    const prev = root.getAttribute("data-motion");
    root.setAttribute("data-motion", "reduced");
    try {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "기록 삭제" }));
      const dialog = await screen.findByRole("alertdialog");
      await expect(getComputedStyle(dialog).transitionDuration).toBe("0s");
      await userEvent.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull(), { timeout: 200 });
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "@/components/ui/button";
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
  dialogStyles,
} from "@/components/ui/dialog";

const THEMES = ["light", "dark", "high-contrast"] as const;

function Demo({ sound = false }: { sound?: boolean }) {
  return (
    <Dialog sound={sound}>
      <DialogTrigger render={<Button />}>유닛 정보 열기</DialogTrigger>
      <DialogContent>
        <DialogTitle>유닛 정보</DialogTitle>
        <DialogBody>
          <DialogDescription>이 유닛의 식별 이름을 변경한다.</DialogDescription>
          <input
            aria-label="유닛 이름"
            defaultValue="2B"
            className="mt-4 h-10 w-full border border-yorha-border bg-yorha-bg px-3 text-yorha-fg focus-visible:yorha-focus"
          />
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

    // Tab is trapped (both directions)
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      await expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 4; i++) {
      await userEvent.tab({ shift: true });
      await expect(dialog.contains(document.activeElement)).toBe(true);
    }

    // Escape closes, focus returns to trigger
    await userEvent.keyboard("{Escape}");
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
    await userEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
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
      await userEvent.click(within(canvasElement).getByRole("button", { name: "유닛 정보 열기" }));
      const dialog = await screen.findByRole("dialog");
      await expect(getComputedStyle(dialog).transitionDuration).toBe("0s");
      await userEvent.keyboard("{Escape}");
      // exit is immediate when motion is reduced
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 200 });
    } finally {
      if (prev === null) root.removeAttribute("data-motion");
      else root.setAttribute("data-motion", prev);
    }
  },
};

export const Motion: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "유닛 정보 열기" }));
    const dialog = await screen.findByRole("dialog");
    const enter = parseFloat(getComputedStyle(dialog).transitionDuration);
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
    <div data-theme={theme} className="bg-yorha-bg p-6 text-yorha-fg">
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
  parameters: { a11y: { test: "todo" } },
  render: () => <Preview theme="authentic" />,
};

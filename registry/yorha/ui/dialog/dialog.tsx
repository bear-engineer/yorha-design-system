import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps, ReactNode } from "react";
import { cn, cnState } from "@/lib/utils";
import { useSound } from "@/lib/sound";

/**
 * Class strings shared by Dialog, AlertDialog and static previews (one definition).
 * Motion: enter uses --motion-panel, exit uses the faster --motion-panel-exit; both are 0ms
 * under data-motion reduced/off, so the final state is immediate.
 */
export const dialogStyles = {
  backdrop:
    "fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim " +
    "transition-opacity duration-(--motion-panel) ease-yorha-out " +
    "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 " +
    "data-[ending-style]:duration-(--motion-panel-exit) data-[ending-style]:ease-yorha-in",
  viewport: "pointer-events-none fixed inset-0 z-(--yorha-z-modal) grid place-items-center p-4",
  popup:
    "pointer-events-auto relative flex max-h-full w-full max-w-md flex-col overflow-auto " +
    "rounded-yorha border border-yorha-border bg-yorha-panel text-yorha-fg shadow-yorha-lg " +
    "transition-[opacity,translate] duration-(--motion-panel) ease-yorha-out " +
    "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 " +
    "data-[ending-style]:translate-y-1 data-[ending-style]:opacity-0 " +
    "data-[ending-style]:duration-(--motion-panel-exit) data-[ending-style]:ease-yorha-in",
  // dark header strip; the dot and trailing rule are decorative pseudo elements
  title:
    "flex items-center gap-3 bg-yorha-ink px-4 py-2 font-yorha font-yorha-bold text-yorha-sm uppercase " +
    "tracking-yorha-heading text-yorha-on-ink text-shadow-yorha " +
    "before:size-2 before:shrink-0 before:bg-current before:content-[''] " +
    "after:h-px after:flex-1 after:bg-yorha-on-ink-soft after:content-['']",
  body: "px-6 py-5",
  description: "text-yorha-base leading-yorha-body text-yorha-fg-strong",
  footer:
    "flex flex-wrap justify-end gap-3 border-t border-dotted border-yorha-separator px-6 py-4",
};

type RootProps = ComponentProps<typeof BaseDialog.Root>;
export interface DialogProps extends RootProps {
  /** Play the `open` / `close` sound cues. Silent unless the sound preference is enabled. Needs YorhaProvider. */
  sound?: boolean;
}

function SoundRoot({ onOpenChange, ...props }: RootProps) {
  const { play } = useSound();
  return (
    <BaseDialog.Root
      {...props}
      onOpenChange={(open, details) => {
        play(open ? "open" : "close");
        onOpenChange?.(open, details);
      }}
    />
  );
}

export function Dialog({ sound = false, ...props }: DialogProps) {
  return sound ? <SoundRoot {...props} /> : <BaseDialog.Root {...props} />;
}

export function DialogTrigger(props: ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger {...props} />;
}

export function DialogClose(props: ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close {...props} />;
}

export interface DialogContentProps extends ComponentProps<typeof BaseDialog.Popup> {
  children?: ReactNode;
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={dialogStyles.backdrop} />
      <div className={dialogStyles.viewport}>
        <BaseDialog.Popup className={cnState(dialogStyles.popup, className)} {...props}>
          {children}
        </BaseDialog.Popup>
      </div>
    </BaseDialog.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title className={cnState(dialogStyles.title, className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description className={cnState(dialogStyles.description, className)} {...props} />
  );
}

export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(dialogStyles.body, className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(dialogStyles.footer, className)} {...props} />;
}

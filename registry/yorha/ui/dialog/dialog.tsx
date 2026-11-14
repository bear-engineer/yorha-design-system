import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useCallback, useState, type ComponentProps, type ReactNode, type Ref } from "react";
import { CrossIcon } from "@/components/ui/icons";
import { cn, cnState } from "@/lib/utils";
import { useSound } from "@/lib/sound";

/**
 * Class strings shared by Dialog, AlertDialog and static previews (one definition).
 * Motion: backdrop = `yorha-fade`, popup = `yorha-panel` (T3 utilities; enter/exit tokens, opacity-only
 * and <=120ms under data-motion reduced, 0 under off). Both set `--motion-panel*` to the modal tokens
 * (280ms in, 200ms out) so a dialog and an alert dialog are slower than a small panel.
 */
export const dialogStyles = {
  backdrop:
    "yorha-fade [--motion-panel:var(--motion-modal)] [--motion-panel-exit:var(--motion-modal-exit)] fixed inset-0 z-(--yorha-z-overlay) bg-yorha-scrim data-[ending-style]:pointer-events-none",
  // Top-anchored: the popup's top edge is a whole number whatever its height (centring put it on a third of a pixel).
  viewport:
    "pointer-events-none fixed inset-0 z-(--yorha-z-modal) grid items-start justify-items-center px-4 pb-4 pt-4 " +
    "[--dialog-top:1rem] [@media(min-height:40rem)]:[--dialog-top:6rem] [@media(min-height:40rem)]:pt-24",
  // The popup never scrolls: header and footer are pinned, the body (DialogBody / AlertDialogDescription) scrolls.
  popup:
    "yorha-panel [--motion-panel:var(--motion-modal)] [--motion-panel-exit:var(--motion-modal-exit)] pointer-events-auto data-[ending-style]:pointer-events-none group/dialog relative flex max-h-[calc(100dvh-var(--dialog-top)-1rem)] w-full max-w-md flex-col overflow-hidden " +
    "rounded-yorha border border-yorha-border bg-yorha-panel text-yorha-fg shadow-yorha-lg",
  // ink header strip (control height); the dot and trailing rule are decorative pseudo elements
  title:
    "flex h-control-sm shrink-0 items-center gap-3 bg-yorha-ink px-4 font-yorha font-yorha-bold text-yorha-sm uppercase sm:px-6 " +
    "tracking-yorha-heading text-yorha-on-ink group-has-[[data-slot=dialog-close-button]]/dialog:pr-control-sm " +
    "before:size-2 before:shrink-0 before:bg-current before:content-[''] " +
    "after:h-px after:flex-1 after:bg-yorha-on-ink-soft after:content-['']",
  // one inline inset for title, body and footer: 16px, 24px from 640px
  body: "yorha-scroll min-h-0 flex-1 px-4 py-5 sm:px-6",
  description: "text-yorha-base leading-yorha-body text-yorha-fg-strong",
  footer:
    "flex shrink-0 flex-wrap justify-end gap-3 border-t border-dotted border-yorha-separator px-4 py-4 sm:px-6",
  close:
    "absolute top-0 right-0 z-1 grid size-control-sm cursor-pointer place-items-center text-yorha-on-ink " +
    "hover:bg-[color-mix(in_oklab,var(--yorha-on-ink)_16%,transparent)] active:bg-[color-mix(in_oklab,var(--yorha-on-ink)_28%,transparent)] " +
    "focus-visible:yorha-focus-inset",
};

/**
 * Keyboard access for a scrolling region: returns a ref callback and `tabIndex` (0 only while the content overflows,
 * so a short body is not an extra tab stop). Shared by DialogBody and AlertDialogDescription.
 */
export function useScrollableFocus<T extends HTMLElement>(forwarded?: Ref<T>) {
  const [scrollable, setScrollable] = useState(false);
  const ref = useCallback(
    (node: T | null) => {
      if (typeof forwarded === "function") forwarded(node);
      else if (forwarded) forwarded.current = node;
      if (!node) return;
      const check = () => setScrollable(node.scrollHeight > node.clientHeight + 1);
      check();
      const ro = new ResizeObserver(check);
      ro.observe(node);
      return () => ro.disconnect();
    },
    [forwarded],
  );
  return { ref, tabIndex: scrollable ? 0 : undefined } as const;
}

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

/** Handle for a trigger placed outside `<Dialog>`: pass the same handle to `DialogTrigger` and `Dialog`. */
export const createDialogHandle = BaseDialog.createHandle;
export type DialogHandle<Payload = unknown> = BaseDialog.Handle<Payload>;

export function DialogTrigger(props: ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger {...props} />;
}

export function DialogClose(props: ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close {...props} />;
}

export interface DialogContentProps extends ComponentProps<typeof BaseDialog.Popup> {
  children?: ReactNode;
  /** Close button at the right end of the title strip (touch users have no Esc). Default true. */
  closeButton?: boolean;
}

export function DialogContent({ className, children, closeButton = true, ...props }: DialogContentProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={dialogStyles.backdrop} />
      <BaseDialog.Viewport className={dialogStyles.viewport}>
        <BaseDialog.Popup className={cnState(dialogStyles.popup, className)} {...props}>
          {children}
          {closeButton ? (
            <BaseDialog.Close data-slot="dialog-close-button" aria-label="닫기" className={dialogStyles.close}>
              <CrossIcon />
            </BaseDialog.Close>
          ) : null}
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title data-slot="dialog-title" className={cnState(dialogStyles.title, className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description data-slot="dialog-description" className={cnState(dialogStyles.description, className)} {...props} />
  );
}

export function DialogBody({ className, ref, ...props }: ComponentProps<"div">) {
  const scroll = useScrollableFocus<HTMLDivElement>(ref);
  return <div data-slot="dialog-body" className={cn(dialogStyles.body, "focus-visible:yorha-focus-inset", className)} {...scroll} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn(dialogStyles.footer, className)} {...props} />;
}

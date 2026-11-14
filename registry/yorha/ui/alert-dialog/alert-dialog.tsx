import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import type { ComponentProps, Ref } from "react";
import { buttonVariants, type ButtonVariant } from "@/components/ui/button";
import { dialogStyles, useScrollableFocus } from "@/components/ui/dialog";
import { cn, cnState } from "@/lib/utils";
import { useSound } from "@/lib/sound";

type RootProps = ComponentProps<typeof BaseAlertDialog.Root>;
export interface AlertDialogProps extends RootProps {
  /** Play the `open` / `close` sound cues. Silent unless the sound preference is enabled. Needs YorhaProvider. */
  sound?: boolean;
}

function SoundRoot({ onOpenChange, ...props }: RootProps) {
  const { play } = useSound();
  return (
    <BaseAlertDialog.Root
      {...props}
      onOpenChange={(open, details) => {
        play(open ? "open" : "close");
        onOpenChange?.(open, details);
      }}
    />
  );
}

export function AlertDialog({ sound = false, ...props }: AlertDialogProps) {
  return sound ? <SoundRoot {...props} /> : <BaseAlertDialog.Root {...props} />;
}

/** Handle for a trigger placed outside `<AlertDialog>`: pass the same handle to the trigger and the root. */
export const createAlertDialogHandle = BaseAlertDialog.createHandle;
export type AlertDialogHandle<Payload = unknown> = BaseAlertDialog.Handle<Payload>;

export function AlertDialogTrigger(props: ComponentProps<typeof BaseAlertDialog.Trigger>) {
  return <BaseAlertDialog.Trigger {...props} />;
}

type ActionProps = ComponentProps<typeof BaseAlertDialog.Close> & {
  /** Button look when no `render` is given. Cancel defaults to ghost, Action to primary; `danger` marks a destructive confirm. */
  variant?: ButtonVariant;
};

/** Dismisses without confirming. Put it first so it takes initial focus (least destructive action). A ghost Button unless `render` is given. */
export function AlertDialogCancel({ variant = "ghost", className, render, ...props }: ActionProps) {
  return (
    <BaseAlertDialog.Close
      data-variant={render ? undefined : variant}
      className={cnState(render ? undefined : buttonVariants({ variant }), className)}
      render={render}
      {...props}
    />
  );
}

/**
 * Confirms the action and closes. A primary Button unless `render` is given; `variant="danger"` for destructive actions.
 *
 * Migration (v3): AlertDialogAction/AlertDialogCancel accept `variant` (Button variants; Action defaults to primary, Cancel to ghost). Destructive confirms: `variant="danger"`. Same flex-column/scroll and inset rules as Dialog.
 */
export function AlertDialogAction({ variant = "primary", className, render, ...props }: ActionProps) {
  return (
    <BaseAlertDialog.Close
      data-variant={render ? undefined : variant}
      className={cnState(render ? undefined : buttonVariants({ variant }), className)}
      render={render}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Popup>) {
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className={dialogStyles.backdrop} />
      <BaseAlertDialog.Viewport className={dialogStyles.viewport}>
        <BaseAlertDialog.Popup
          className={cnState(cn(dialogStyles.popup, "border-yorha-alert-ui"), className)}
          {...props}
        >
          {children}
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Viewport>
    </BaseAlertDialog.Portal>
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Title>) {
  return <BaseAlertDialog.Title data-slot="alert-dialog-title" className={cnState(dialogStyles.title, className)} {...props} />;
}

export function AlertDialogDescription({
  className,
  ref,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Description>) {
  const scroll = useScrollableFocus<HTMLParagraphElement>(ref as Ref<HTMLParagraphElement> | undefined);
  return (
    <BaseAlertDialog.Description
      data-slot="alert-dialog-description"
      className={cnState(cn(dialogStyles.body, dialogStyles.description, "focus-visible:yorha-focus-inset"), className)}
      {...scroll}
      {...props}
    />
  );
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cn(dialogStyles.footer, className)} {...props} />;
}

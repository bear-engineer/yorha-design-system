import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import type { ComponentProps } from "react";
import { dialogStyles } from "@/components/ui/dialog";
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

/** Dismisses without confirming. Put it first so it takes initial focus (least destructive action). */
export function AlertDialogCancel(props: ComponentProps<typeof BaseAlertDialog.Close>) {
  return <BaseAlertDialog.Close {...props} />;
}

/** Confirms the action and closes. */
export function AlertDialogAction(props: ComponentProps<typeof BaseAlertDialog.Close>) {
  return <BaseAlertDialog.Close {...props} />;
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
  return <BaseAlertDialog.Title className={cnState(dialogStyles.title, className)} {...props} />;
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Description>) {
  return (
    <BaseAlertDialog.Description
      className={cnState(cn(dialogStyles.body, dialogStyles.description), className)}
      {...props}
    />
  );
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn(dialogStyles.footer, className)} {...props} />;
}

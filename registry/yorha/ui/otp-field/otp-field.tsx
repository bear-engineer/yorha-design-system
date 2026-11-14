import * as React from "react";
import { OTPField as BaseOTPField } from "@base-ui/react/otp-field";
import { cn } from "@/lib/utils";

export interface OTPFieldRootProps extends Omit<React.ComponentProps<typeof BaseOTPField.Root>, "className"> {
  className?: string;
}

/**
 * One-time code entry. Root owns value, length, paste and completion; render one OTPFieldInput per slot.
 * Typing advances focus, Backspace on an empty slot moves back, and a pasted code fills every slot.
 * Give the Root an `id` and label it with a native <label htmlFor>; add aria-label to slots 2..n.
 */
export const OTPFieldRoot = React.forwardRef<HTMLDivElement, OTPFieldRootProps>(function OTPFieldRoot(
  { className, ...props },
  ref,
) {
  return <BaseOTPField.Root ref={ref} className={cn("inline-flex max-w-full items-center gap-2 font-yorha [&>input]:min-w-0", className)} {...props} />;
});

export interface OTPFieldInputProps extends Omit<React.ComponentProps<typeof BaseOTPField.Input>, "className"> {
  className?: string;
}

/** One character slot. Square, bordered, and invalid-state aware through data-invalid. */
export const OTPFieldInput = React.forwardRef<HTMLInputElement, OTPFieldInputProps>(function OTPFieldInput(
  { className, ...props },
  ref,
) {
  return (
    <BaseOTPField.Input
      ref={ref}
      className={cn(
        "m-0 size-10 min-w-0 rounded-yorha border border-yorha-border bg-yorha-bg p-0 text-center",
        "font-yorha text-yorha-base text-yorha-fg-strong",
        "transition-[color,background-color,border-color] duration-(--motion-press) ease-yorha",
        "focus-visible:yorha-focus disabled:cursor-not-allowed disabled:opacity-60",
        "data-[invalid]:border-(length:--yorha-border-width-strong) data-[invalid]:border-yorha-alert-ui",
        className,
      )}
      {...props}
    />
  );
});

export interface OTPFieldSeparatorProps extends Omit<React.ComponentProps<typeof BaseOTPField.Separator>, "className"> {
  className?: string;
}

/** Visual break between slot groups, e.g. 3 + 3. Decorative: it is not announced. */
export const OTPFieldSeparator = React.forwardRef<HTMLDivElement, OTPFieldSeparatorProps>(function OTPFieldSeparator(
  { className, ...props },
  ref,
) {
  return <BaseOTPField.Separator ref={ref} className={cn("block h-0.5 w-3 bg-yorha-fg-soft", className)} {...props} />;
});

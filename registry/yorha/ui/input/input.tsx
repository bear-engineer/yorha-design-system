import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.ComponentProps<typeof BaseInput>, "className"> {
  /** Extra classes, merged after the YoRHa control surface. */
  className?: string;
}

/**
 * Bare single-line input on Base UI Input: every native input prop passes through, the ref reaches
 * the `<input>`, and it picks up Field wiring (invalid, disabled, dirty) when placed inside Field.Root.
 * Labels and descriptions come from the caller or from Field; see text-field for the composed form.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <BaseInput
      ref={ref}
      className={cn(
        "w-full min-w-0 rounded-yorha border border-yorha-border bg-yorha-bg px-3 py-2",
        "font-yorha text-yorha-base text-yorha-fg-strong placeholder:text-yorha-fg-soft",
        "transition-[color,background-color,border-color] duration-(--motion-press) ease-yorha",
        "focus-visible:yorha-focus disabled:cursor-not-allowed disabled:opacity-60",
        // The strong invalid edge is an inset ring, not a wider border, so invalid never resizes the input.
        "aria-invalid:border-yorha-alert-ui aria-invalid:shadow-[inset_0_0_0_calc(var(--yorha-border-width-strong)-1px)_var(--yorha-alert-ui)]",
        "data-[invalid]:border-yorha-alert-ui data-[invalid]:shadow-[inset_0_0_0_calc(var(--yorha-border-width-strong)-1px)_var(--yorha-alert-ui)]",
        className,
      )}
      {...props}
    />
  );
});

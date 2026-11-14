import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { fieldControlClass } from "@/components/ui/field";
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
      className={cn(fieldControlClass, className)}
      {...props}
    />
  );
});

import * as React from "react";
import { Form as BaseForm } from "@base-ui/react/form";
import { cn } from "@/lib/utils";

export interface FormProps extends Omit<React.ComponentProps<typeof BaseForm>, "className"> {
  className?: string;
}

/**
 * Native form with consolidated errors. Put Field.Root (name=...) around each control:
 * - `errors` (e.g. from a server response, keyed by Field name) shows under that Field and sets aria-invalid.
 *   Clearing it is the caller's job: pass a new `errors` object after the next submit.
 * - Submitting with invalid fields keeps onFormSubmit from running and focuses the first invalid control.
 * - onFormSubmit receives the form values; call event.preventDefault() yourself if you submit elsewhere.
 */
export const Form = React.forwardRef<HTMLFormElement, FormProps>(function Form({ className, ...props }, ref) {
  return (
    <BaseForm
      ref={ref}
      className={cn("flex flex-col gap-6 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
    />
  );
});

export interface FormSubmitProps extends React.ComponentProps<"button"> {}

/** Primary submit button in the YoRHa ink style. Disabled state keeps the focus ring reachable. */
export const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>(function FormSubmit(
  { className, type = "submit", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-yorha border border-current bg-yorha-ink px-4",
        "font-yorha-bold text-yorha-base text-yorha-on-ink",
        "transition-colors duration-(--motion-press) ease-yorha",
        "focus-visible:yorha-focus disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});

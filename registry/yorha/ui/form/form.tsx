import * as React from "react";
import { Form as BaseForm } from "@base-ui/react/form";
import { Button, type ButtonProps } from "@/components/ui/button";
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

export type FormSubmitProps = Omit<ButtonProps, "variant" | "type" | "className"> & { className?: string };

/** Primary submit button: the shared Button (control scale, press, busy), `type="submit"`. */
export const FormSubmit = React.forwardRef<HTMLButtonElement, FormSubmitProps>(function FormSubmit({ className, ...props }, ref) {
  return <Button ref={ref} type="submit" variant="primary" className={cn("h-control-md", className)} {...props} />;
});

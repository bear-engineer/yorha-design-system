import type { ComponentProps, ReactNode } from "react";
import { FieldControl, type FieldControlProps, FieldFrame } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface TextareaProps extends Omit<ComponentProps<"textarea">, "className"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Defaults to true when `error` is set. */
  invalid?: boolean;
  /**
   * Grow with content (CSS field-sizing). No JS, no keydown handling, so IME composition is untouched.
   * Browsers without field-sizing keep the `rows` height.
   */
  autoSize?: boolean;
  /** Restore the native vertical resize grip (off by default: the browser grip is a UA square). */
  resize?: boolean;
  /** Class for the wrapper (layout). */
  className?: string;
}

/** Multi-line text input composed with Field. */
export function Textarea({
  label,
  description,
  error,
  invalid,
  autoSize = false,
  resize = false,
  className,
  rows = 3,
  ...props
}: TextareaProps) {
  return (
    <FieldFrame
      label={label}
      description={description}
      error={error}
      invalid={invalid}
      disabled={props.disabled}
      name={props.name}
      className={cn("w-full", className)}
    >
      <FieldControl
        render={<textarea rows={rows} />}
        className={cn(
          // Auto height (the control token is a single-line height); rows set the floor, max-h keeps it scrollable.
          "h-auto max-h-64 min-h-24 resize-none py-2 yorha-scroll",
          autoSize && "[field-sizing:content]",
          resize && "resize-y",
        )}
        {...(props as FieldControlProps)}
      />
    </FieldFrame>
  );
}

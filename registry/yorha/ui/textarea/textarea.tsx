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
        className={cn("min-h-24 resize-y", autoSize && "resize-none [field-sizing:content]")}
        {...(props as FieldControlProps)}
      />
    </FieldFrame>
  );
}

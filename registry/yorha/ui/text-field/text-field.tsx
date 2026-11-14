import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps, ReactNode } from "react";
import { FieldFrame, fieldControlClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface TextFieldProps extends Omit<ComponentProps<typeof BaseInput>, "className"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Defaults to true when `error` is set. */
  invalid?: boolean;
  /** Class for the wrapper (layout). */
  className?: string;
}

/** Single-line text input with label, description and error wired through Field. Korean IME: no key handling. */
export function TextField({ label, description, error, invalid, className, ...inputProps }: TextFieldProps) {
  return (
    <FieldFrame
      label={label}
      description={description}
      error={error}
      invalid={invalid}
      disabled={inputProps.disabled}
      name={inputProps.name}
      className={cn("w-full", className)}
    >
      <BaseInput className={fieldControlClass} {...inputProps} />
    </FieldFrame>
  );
}

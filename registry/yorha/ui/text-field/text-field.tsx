// RED stub: compiles, deliberately wrong (no label/description/error wiring).
import type { ComponentProps, ReactNode } from "react";

export interface TextFieldProps extends ComponentProps<"input"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
}

export function TextField({ label, description, error, invalid: _invalid, ...props }: TextFieldProps) {
  return (
    <div>
      {label}
      <input {...props} />
      {description}
      {error}
    </div>
  );
}

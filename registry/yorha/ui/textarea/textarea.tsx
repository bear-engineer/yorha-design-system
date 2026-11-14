// RED stub: compiles, deliberately wrong (no label/description/error wiring, no auto-size).
import type { ComponentProps, ReactNode } from "react";

export interface TextareaProps extends ComponentProps<"textarea"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  autoSize?: boolean;
}

export function Textarea({ label, description, error, invalid: _invalid, autoSize: _autoSize, ...props }: TextareaProps) {
  return (
    <div>
      {label}
      <textarea {...props} />
      {description}
      {error}
    </div>
  );
}

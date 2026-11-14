import * as React from "react";

// RED stub: compiles with the final API but renders the wrong thing.
export interface CheckboxProps {
  children: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  rowClassName?: string;
  [key: string]: unknown;
}

export function Checkbox({ children }: CheckboxProps) {
  return <span>{children}</span>;
}

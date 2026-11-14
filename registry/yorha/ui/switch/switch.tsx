import * as React from "react";

// RED stub: compiles with the final API but renders the wrong thing.
export interface SwitchProps {
  children: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  rowClassName?: string;
  [key: string]: unknown;
}

export function Switch({ children }: SwitchProps) {
  return <span>{children}</span>;
}

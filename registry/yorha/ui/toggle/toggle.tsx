import * as React from "react";

// RED stub: compiles with the final API but renders the wrong thing.
export interface ToggleProps {
  children: React.ReactNode;
  pressed?: boolean;
  defaultPressed?: boolean;
  disabled?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  className?: string;
}

export function Toggle({ children }: ToggleProps) {
  return <span>{children}</span>;
}

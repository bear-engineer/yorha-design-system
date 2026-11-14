import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface IconButtonProps extends Omit<ButtonProps, "aria-label" | "aria-labelledby" | "children" | "square"> {
  /** Required: an icon-only control has no visible text, so it needs an accessible name. */
  "aria-label": string;
  children: ReactNode;
}

export function IconButton({ children, ...props }: IconButtonProps) {
  return (
    <Button {...props} square>
      {children}
    </Button>
  );
}

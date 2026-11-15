import type { ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";

export interface IconButtonProps extends Omit<ButtonProps, "aria-label" | "aria-labelledby" | "children" | "square"> {
  /** Required: an icon-only control has no visible text, so it needs an accessible name. */
  "aria-label": string;
  children: ReactNode;
  /**
   * Show the `aria-label` in the kit Tooltip on hover (fine pointer) and keyboard focus. Default true. The tooltip repeats the name,
   * so it is not wired as the description (no double announcement). Touch gets no tooltip (no long press).
   */
  tooltip?: boolean;
  /** Shortcut hint appended to the tooltip as a Kbd, e.g. "C". */
  shortcut?: string;
}

export function IconButton({ children, tooltip = true, shortcut, ...props }: IconButtonProps) {
  if (!tooltip) {
    return (
      <Button {...props} square>
        {children}
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipPrimitive.Trigger
        data-slot="tooltip-trigger"
        render={
          <Button {...props} square>
            {children}
          </Button>
        }
      />
      <TooltipContent className="flex items-center gap-2">
        {props["aria-label"]}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

import * as React from "react";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cn, cnState } from "@/lib/utils";
import { controlSize, type ButtonSize } from "@/components/ui/button";

export interface ToggleProps extends Omit<React.ComponentProps<typeof BaseToggle>, "children"> {
  /** Visible label; the whole button is the click target. */
  children: React.ReactNode;
  /** Control scale step; matches a Button of the same size in a row. Default md. */
  size?: ButtonSize;
}

// Indicator: always mounted in a fixed cell; fades in opacity in place (V4-088: no scale; a plain fade in reduced, instant in off). Reduced keeps a short opacity fade.
const INDICATOR_BASE =
  "opacity-0 transition-opacity [transition-duration:max(var(--motion-select),var(--motion-reduced-fade))] ease-yorha-out";

/**
 * Two-state button (aria-pressed). Pressed fills with ink and the square bullet
 * turns solid; unpressed shows a hollow square, so state is not carried by colour alone.
 * Migration (C2-106): pressing no longer scales the toggle (colour/fill only).
 * Migration (B9): `size` (sm/md/lg) sets a fixed control height; the default height 48 is now `md`, pass `size="sm"`
 * for the old toolbar size. Chip is `h-control-sm`, Badge 24px, Kbd 20px.
 */
export function Toggle({ children, className, size = "md", ...props }: ToggleProps) {
  return (
    <BaseToggle
      className={cnState(
        cn(
          "group inline-flex items-center justify-center gap-2 align-middle whitespace-nowrap rounded-yorha border border-yorha-border bg-transparent",
          controlSize[size],
          "font-yorha text-yorha-fg cursor-pointer",
          // Standalone control: hover tints the idle fill; pressed is ink (colour only, the size never changes: C2-106).
          "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha enabled:not-data-[pressed]:hover:bg-yorha-hover",
          "data-[pressed]:border-yorha-ink data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          "focus-visible:yorha-focus yorha-disabled",
        ),
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="grid size-3 shrink-0 place-items-center border border-current">
        <span className={cn(INDICATOR_BASE, "size-1.5 bg-current group-data-[pressed]:opacity-100")} />
      </span>
      {children}
    </BaseToggle>
  );
}

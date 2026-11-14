import * as React from "react";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cn, cnState } from "@/lib/utils";

export interface ToggleProps extends Omit<React.ComponentProps<typeof BaseToggle>, "children"> {
  /** Visible label; the whole button is the click target. */
  children: React.ReactNode;
}

// Indicator: always mounted in a fixed cell; fades (and scales unless reduced/off) in place. Reduced keeps a short opacity fade.
const INDICATOR_BASE =
  "opacity-0 [scale:calc(1_-_(1_-_var(--motion-scale-pop))_*_var(--motion-spatial))] transition-[opacity,scale] [transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),var(--motion-select)] ease-yorha";

/**
 * Two-state button (aria-pressed). Pressed fills with ink and the square bullet
 * turns solid; unpressed shows a hollow square, so state is not carried by colour alone.
 */
export function Toggle({ children, className, ...props }: ToggleProps) {
  return (
    <BaseToggle
      className={cnState(
        cn(
          "group inline-flex items-center gap-3 align-middle rounded-yorha border border-yorha-border bg-transparent px-3 py-2",
          "font-yorha text-yorha-base text-yorha-fg cursor-pointer",
          "yorha-press",
          "data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          "focus-visible:yorha-focus",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        ),
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="grid size-3 shrink-0 place-items-center border border-current">
        <span className={cn(INDICATOR_BASE, "size-1.5 bg-current group-data-[pressed]:scale-100 group-data-[pressed]:opacity-100")} />
      </span>
      {children}
    </BaseToggle>
  );
}

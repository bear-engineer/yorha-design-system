import type { ComponentProps } from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn, cnState } from "@/lib/utils";

// Indicator: always mounted in the fixed bullet cell; fades (and scales unless reduced/off) in place.
const INDICATOR_BASE =
  "opacity-0 [scale:calc(1_-_(1_-_var(--motion-scale-pop))_*_var(--motion-spatial))] transition-[opacity,scale] [transition-duration:max(var(--motion-select),var(--motion-reduced-fade)),var(--motion-select)] ease-yorha";

type GroupProps = ComponentProps<typeof ToggleGroupPrimitive>;

/**
 * Row (or column) of toggle buttons sharing one pressed state. Base UI owns roving focus
 * (arrow keys follow `orientation`, `loopFocus` defaults to true), `multiple` and `value: string[]`.
 * Name the group with `aria-label` or `aria-labelledby`.
 */
function ToggleGroup({ className, ...props }: GroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cnState(
        [
          "group/tg inline-flex rounded-yorha border border-yorha-border bg-yorha-panel font-yorha",
          "data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
        ],
        className,
      )}
      {...props}
    />
  );
}

type ItemProps = ComponentProps<typeof TogglePrimitive>;

/**
 * Segment. Pressed fills with ink and the square bullet turns solid; unpressed shows a hollow
 * square, so state is never colour alone. Dividers are drawn between neighbours along the group axis.
 */
function ToggleGroupItem({ className, children, ...props }: ItemProps) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cnState(
        [
          "group/item yorha-press inline-flex min-h-8 items-center gap-2 bg-transparent px-3 py-1.5 text-yorha-sm tracking-yorha-body text-yorha-fg cursor-pointer select-none",
          "border-yorha-border group-data-[orientation=horizontal]/tg:not-first:border-l group-data-[orientation=vertical]/tg:not-first:border-t",
          "data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          "focus-visible:yorha-focus focus-visible:relative focus-visible:z-10",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-yorha-bullet=""
        className="grid size-2.5 shrink-0 place-items-center border border-current"
      >
        <span className={cn(INDICATOR_BASE, "size-1 bg-current group-data-[pressed]/item:scale-100 group-data-[pressed]/item:opacity-100")} />
      </span>
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };

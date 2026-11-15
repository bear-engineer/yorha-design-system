import { useState, type ComponentProps } from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn, cnState } from "@/lib/utils";
import type { ButtonSize } from "@/components/ui/button";

// Indicator: always mounted in the fixed bullet cell; fades in opacity in place (V4-088: no scale; a plain fade in reduced, instant in off).
const INDICATOR_BASE =
  "opacity-0 transition-opacity [transition-duration:max(var(--motion-select),var(--motion-reduced-fade))] ease-yorha-out";

type GroupProps = ComponentProps<typeof ToggleGroupPrimitive> & {
  /** Control scale step; the group is exactly as tall as a Button of this size. Default sm. */
  size?: ButtonSize;
  /**
   * Single-select only (default true): clicking the pressed item cannot leave the group empty; the empty next value is ignored.
   * Pass `required={false}` for the v3 filter behaviour. Ignored with `multiple`.
   * Migration (V4-089): a single group used to un-press on a second click; set `required={false}` to keep that.
   */
  required?: boolean;
};

const GROUP_SIZE: Record<ButtonSize, string> = {
  sm: "[--tg-h:var(--yorha-control-sm)]",
  md: "[--tg-h:var(--yorha-control-md)]",
  lg: "[--tg-h:var(--yorha-control-lg)]",
};

/**
 * Row (or column) of toggle buttons sharing one pressed state. Base UI owns roving focus
 * (arrow keys follow `orientation`, `loopFocus` defaults to true), `multiple` and `value: string[]`.
 * Name the group with `aria-label` or `aria-labelledby`.
 */
function ToggleGroup({ className, size = "sm", required, multiple, value, defaultValue, onValueChange, ...props }: GroupProps) {
  const keep = !multiple && (required ?? true);
  const [own, setOwn] = useState<readonly string[] | undefined>(defaultValue);
  // Uncontrolled and required: the group owns the value so an ignored (empty) change is not applied by Base UI.
  const owned = keep && value === undefined;
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-size={size}
      multiple={multiple}
      {...(owned ? { value: own } : { value, defaultValue })}
      onValueChange={(next, details) => {
        if (keep && next.length === 0) return;
        if (owned) setOwn(next);
        onValueChange?.(next, details);
      }}
      className={cnState(
        [
          "group/tg relative inline-flex rounded-yorha bg-yorha-panel font-yorha",
          // The frame is an overlay, so it takes no room: the group is exactly one control height and items keep the full 24px target.
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-yorha after:border after:border-yorha-border after:content-['']",
          GROUP_SIZE[size],
          // Horizontal: the group is control-tall and items stretch. Vertical: every item is control-tall.
          "data-[orientation=horizontal]:h-(--tg-h) data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
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
          // Grouped item: tint (no scale, so dividers never shift); the focus ring is inset like every flush item.
          "group/item relative z-10 inline-flex items-center gap-2 bg-transparent whitespace-nowrap tracking-yorha-body text-yorha-fg cursor-pointer select-none",
          "group-data-[size=sm]/tg:px-pad-sm group-data-[size=sm]/tg:text-yorha-sm group-data-[size=md]/tg:px-pad-md group-data-[size=md]/tg:text-yorha-base group-data-[size=lg]/tg:px-pad-lg group-data-[size=lg]/tg:text-yorha-lg",
          "group-data-[orientation=vertical]/tg:h-(--tg-h)",
          "transition-[color,background-color] duration-(--motion-select) ease-yorha yorha-tint",
          "border-yorha-border group-data-[orientation=horizontal]/tg:not-first:border-l group-data-[orientation=vertical]/tg:not-first:border-t",
          "data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          "focus-visible:yorha-focus-inset yorha-disabled",
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
        <span className={cn(INDICATOR_BASE, "size-1 bg-current group-data-[pressed]/item:opacity-100")} />
      </span>
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };

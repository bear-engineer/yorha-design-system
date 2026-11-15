import * as React from "react";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { cn } from "@/lib/utils";

export interface CheckboxGroupProps extends Omit<React.ComponentProps<typeof BaseCheckboxGroup>, "className"> {
  className?: string;
}

/**
 * Shared value for a set of Checkbox items (value/defaultValue/onValueChange, allValues for a parent box).
 * Give it an accessible name with aria-label or aria-labelledby. Children are Checkbox items.
 * Shift+click toggles every enabled item between the previously clicked one and this one, to the state of this one.
 */
export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(function CheckboxGroup(
  { className, value, defaultValue, onValueChange, onClickCapture, onMouseDown, ...props },
  ref,
) {
  const [inner, setInner] = React.useState<string[]>(defaultValue ? [...defaultValue] : []);
  const current = value ?? inner;
  const anchor = React.useRef<number | null>(null);
  const range = React.useRef<{ values: string[]; clicked: string } | null>(null);
  const items = (group: HTMLElement) => [...group.querySelectorAll<HTMLElement>("[role=checkbox]")];
  return (
    <BaseCheckboxGroup
      ref={ref}
      value={current}
      onValueChange={(next, details) => {
        const r = range.current;
        range.current = null;
        let out = next;
        if (r) {
          const on = next.includes(r.clicked);
          out = on ? [...new Set([...next, ...r.values])] : next.filter((v) => !r.values.includes(v));
        }
        setInner(out);
        onValueChange?.(out, details);
      }}
      onMouseDown={(event) => {
        if (event.shiftKey) event.preventDefault(); // no text selection between the two items
        onMouseDown?.(event);
      }}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        const target = event.target as HTMLElement;
        const box = target.closest<HTMLElement>("[role=checkbox]") ?? target.closest("label")?.querySelector<HTMLElement>("[role=checkbox]");
        const group = event.currentTarget;
        if (!box || !group.contains(box)) return;
        const list = items(group);
        const index = list.indexOf(box);
        if (event.shiftKey && anchor.current !== null && anchor.current !== index && box.dataset.yorhaValue !== undefined) {
          const [a, b] = [Math.min(anchor.current, index), Math.max(anchor.current, index)];
          const values = list
            .slice(a, b + 1)
            .filter((el) => !el.hasAttribute("data-disabled") && el.dataset.yorhaValue !== undefined)
            .map((el) => el.dataset.yorhaValue as string);
          range.current = { values, clicked: box.dataset.yorhaValue };
          setTimeout(() => (range.current = null), 0);
        }
        anchor.current = index;
      }}
      className={cn("flex flex-col gap-2 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
    />
  );
});

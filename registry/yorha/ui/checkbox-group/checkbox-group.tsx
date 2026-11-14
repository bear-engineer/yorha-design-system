import * as React from "react";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { cn } from "@/lib/utils";

export interface CheckboxGroupProps extends Omit<React.ComponentProps<typeof BaseCheckboxGroup>, "className"> {
  className?: string;
}

/**
 * Shared value for a set of Checkbox items (value/defaultValue/onValueChange, allValues for a parent box).
 * Give it an accessible name with aria-label or aria-labelledby. Children are Checkbox items.
 */
export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(function CheckboxGroup(
  { className, ...props },
  ref,
) {
  return (
    <BaseCheckboxGroup
      ref={ref}
      className={cn("flex flex-col gap-2 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
    />
  );
});

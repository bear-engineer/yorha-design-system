import * as React from "react";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { cn } from "@/lib/utils";

export interface FieldsetProps extends Omit<React.ComponentProps<typeof BaseFieldset.Root>, "className"> {
  className?: string;
}

/**
 * Groups related Fields under one legend. `disabled` disables every Field inside, through Base UI context.
 * Standalone: use with or without @yorha/field; it has no dependency on the Field item's styles.
 */
export const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(function Fieldset(
  { className, ...props },
  ref,
) {
  return (
    <BaseFieldset.Root
      ref={ref}
      className={cn("m-0 flex min-w-0 flex-col gap-6 border-0 p-0 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
    />
  );
});

export interface FieldsetLegendProps extends Omit<React.ComponentProps<typeof BaseFieldset.Legend>, "className"> {
  className?: string;
}

/** The group's name. Screen readers announce it as the group label. */
export const FieldsetLegend = React.forwardRef<HTMLLegendElement, FieldsetLegendProps>(function FieldsetLegend(
  { className, ...props },
  ref,
) {
  return (
    <BaseFieldset.Legend
      ref={ref}
      className={cn(
        "mb-2 font-yorha-bold text-yorha-lg uppercase tracking-yorha-heading text-yorha-fg-strong",
        className,
      )}
      {...props}
    />
  );
});

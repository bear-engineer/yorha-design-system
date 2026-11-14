import * as React from "react";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { cn, cnState } from "@/lib/utils";

type RootProps = React.ComponentProps<typeof BaseNumberField.Root>;

export interface NumberFieldProps extends Omit<RootProps, "children"> {
  /** Visible label and accessible name of the input. */
  label: string;
  incrementLabel?: string;
  decrementLabel?: string;
}

const STEP_BUTTON = cn(
  "grid size-9 shrink-0 place-items-center border border-yorha-border bg-yorha-control text-yorha-on-control",
  "cursor-pointer select-none transition-colors duration-(--motion-select) ease-yorha",
  "hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
);

/** Numeric input with decrement/increment buttons; ArrowUp/ArrowDown step the value. */
export function NumberField({
  label,
  incrementLabel = "증가",
  decrementLabel = "감소",
  className,
  ...props
}: NumberFieldProps) {
  const generatedId = React.useId();
  const id = props.id ?? generatedId;
  return (
    <BaseNumberField.Root
      className={cnState("flex flex-col gap-2 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
      id={id}
    >
      <BaseNumberField.ScrubArea direction="horizontal" className="cursor-ew-resize select-none self-start">
        <label htmlFor={id} className="font-yorha-medium tracking-yorha-wide uppercase">
          {label}
        </label>
        <BaseNumberField.ScrubAreaCursor
          className={cn(
            "pointer-events-none grid size-6 place-items-center border border-yorha-ink bg-yorha-bg text-yorha-fg-strong",
            "opacity-0 transition-opacity duration-(--motion-select) ease-yorha data-[scrubbing]:opacity-100",
          )}
        >
          <span aria-hidden="true" className="size-1.5 bg-yorha-ink" />
        </BaseNumberField.ScrubAreaCursor>
      </BaseNumberField.ScrubArea>
      <BaseNumberField.Group className="flex w-fit">
        <BaseNumberField.Decrement aria-label={decrementLabel} className={STEP_BUTTON}>
          <span aria-hidden="true">−</span>
        </BaseNumberField.Decrement>
        <BaseNumberField.Input
          className={cn(
            "h-9 w-24 border-y border-yorha-border bg-yorha-bg px-3 text-center text-yorha-fg-strong tabular-nums",
            "focus-visible:yorha-focus data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          )}
        />
        <BaseNumberField.Increment aria-label={incrementLabel} className={STEP_BUTTON}>
          <span aria-hidden="true">+</span>
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}

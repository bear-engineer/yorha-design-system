import * as React from "react";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { InputGroup, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type RootProps = React.ComponentProps<typeof BaseNumberField.Root>;

export interface NumberFieldProps extends Omit<RootProps, "children" | "className"> {
  /** Class for the Field wrapper. */
  className?: string;
  /** Visible label and accessible name of the input. */
  label: string;
  description?: React.ReactNode;
  /** External error text; marks the field invalid. */
  error?: React.ReactNode;
  incrementLabel?: string;
  decrementLabel?: string;
}

/**
 * Numeric input with decrement/increment buttons; ArrowUp/ArrowDown step the value. Built on Field (label,
 * description, error, invalid) and InputGroup (one frame, one focus ring). Read-only and disabled turn the
 * steppers off with the shared disabled recipe.
 */
export function NumberField({
  label,
  description,
  error,
  incrementLabel = "증가",
  decrementLabel = "감소",
  className,
  disabled,
  readOnly,
  ...props
}: NumberFieldProps) {
  const generatedId = React.useId();
  const id = props.id ?? generatedId;
  const stepper = readOnly ? "aria-disabled:cursor-default" : "";
  return (
    <Field invalid={Boolean(error)} disabled={disabled} className={cn("w-fit max-w-full", className)}>
      <BaseNumberField.Root {...props} id={id} disabled={disabled} readOnly={readOnly}>
        <BaseNumberField.ScrubArea direction="horizontal" className="cursor-ew-resize select-none self-start">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <BaseNumberField.ScrubAreaCursor
            className={cn(
              "pointer-events-none grid size-6 place-items-center border border-yorha-ink bg-yorha-bg text-yorha-fg-strong",
              "opacity-0 transition-opacity duration-(--motion-select) ease-yorha data-[scrubbing]:opacity-100",
            )}
          >
            <span aria-hidden="true" className="size-2 bg-yorha-ink" />
          </BaseNumberField.ScrubAreaCursor>
        </BaseNumberField.ScrubArea>
        <BaseNumberField.Group render={<InputGroup readOnly={readOnly} className="mt-2 w-fit" />}>
          <BaseNumberField.Decrement
            aria-label={decrementLabel}
            render={<InputGroupButton aria-label={decrementLabel} align="start" className={stepper} />}
          >
            <MinusIcon />
          </BaseNumberField.Decrement>
          <BaseNumberField.Input render={<InputGroupInput className="w-24 flex-none px-0 text-center yorha-tabular" />} />
          <BaseNumberField.Increment
            aria-label={incrementLabel}
            render={<InputGroupButton aria-label={incrementLabel} align="end" className={stepper} />}
          >
            <PlusIcon />
          </BaseNumberField.Increment>
        </BaseNumberField.Group>
      </BaseNumberField.Root>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

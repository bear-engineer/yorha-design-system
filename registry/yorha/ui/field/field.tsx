import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentProps, ReactNode } from "react";
import { cn, cnState } from "@/lib/utils";

/** Control surface shared by TextField, Textarea and FieldControl (one definition). */
export const fieldControlClass = cn(
  "w-full rounded-yorha border border-yorha-border bg-yorha-bg px-3 py-2",
  "font-yorha text-yorha-base text-yorha-fg-strong placeholder:text-yorha-fg-soft",
  "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
  "focus-visible:yorha-focus disabled:cursor-not-allowed disabled:opacity-60",
  // Strong invalid edge = inset ring, not a wider border: invalid never resizes the control.
  "data-[invalid]:border-yorha-alert-ui data-[invalid]:shadow-[inset_0_0_0_calc(var(--yorha-border-width-strong)-1px)_var(--yorha-alert-ui)]",
);

const ERROR_ICON = cn(
  "mt-px grid size-5 shrink-0 place-items-center border-(length:--yorha-border-width-strong) border-yorha-alert-ui",
  "font-yorha-bold text-yorha-xs leading-none",
);

export type FieldProps = ComponentProps<typeof BaseField.Root>;
/** Root wrapper: owns invalid/disabled/name for every part below (Base UI Field context). */
export function Field({ className, ...props }: FieldProps) {
  return (
    <BaseField.Root
      className={cnState("flex flex-col gap-2 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
    />
  );
}

export type FieldLabelProps = ComponentProps<typeof BaseField.Label>;
export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <BaseField.Label
      className={cnState(
        cn(
          "cursor-pointer select-none font-yorha-medium text-yorha-sm tracking-yorha-wide text-yorha-fg-strong",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
        ),
        className,
      )}
      {...props}
    />
  );
}

export type FieldDescriptionProps = ComponentProps<typeof BaseField.Description>;
export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <BaseField.Description
      className={cnState("text-yorha-sm text-yorha-fg-soft", className)}
      {...props}
    />
  );
}

export type FieldErrorProps = ComponentProps<typeof BaseField.Error>;
/**
 * Error message: a square icon plus alert text, so invalid is not conveyed by colour alone.
 * `match` defaults to true: render it only when there is an error to show.
 */
export function FieldError({ className, children, match = true, ...props }: FieldErrorProps) {
  return (
    <BaseField.Error
      match={match}
      role="alert"
      className={cnState(
        "flex items-start gap-2 font-yorha-medium text-yorha-sm text-yorha-alert",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={ERROR_ICON}>
        !
      </span>
      <span>{children}</span>
    </BaseField.Error>
  );
}

export type FieldControlProps = ComponentProps<typeof BaseField.Control>;
/** The input (default) or any element passed via `render`. Wired to label/description/error by Field. */
export function FieldControl({ className, ...props }: FieldControlProps) {
  return <BaseField.Control className={cnState(fieldControlClass, className)} {...props} />;
}

export type FieldItemProps = ComponentProps<typeof BaseField.Item>;
/** One option inside a checkbox or radio group, grouped with its own label and description. */
export function FieldItem({ className, ...props }: FieldItemProps) {
  return <BaseField.Item className={cnState("flex flex-col gap-1", className)} {...props} />;
}

export type FieldValidityProps = ComponentProps<typeof BaseField.Validity>;
/** Custom validation message. `children` receives the validity state and returns the text (or null to hide). */
export function FieldValidity({ children, ...props }: FieldValidityProps) {
  return (
    <BaseField.Validity {...props}>
      {(state) => {
        const content = typeof children === "function" ? children(state) : children;
        return content ? (
          <span role="alert" className="flex items-start gap-2 font-yorha-medium text-yorha-sm text-yorha-alert">
            <span aria-hidden="true" className={ERROR_ICON}>
              !
            </span>
            <span>{content}</span>
          </span>
        ) : null;
      }}
    </BaseField.Validity>
  );
}

// Fieldset and FieldsetLegend are owned by the fieldset item (single definition); re-exported for existing imports.
export { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
export type { FieldsetProps, FieldsetLegendProps } from "@/components/ui/fieldset";

export interface FieldFrameProps {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Defaults to true when `error` is set. */
  invalid?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
  /** The control, e.g. FieldControl. */
  children?: ReactNode;
}

/** Label, control, description and error in the standard order, wired by one Field root. */
export function FieldFrame({ label, description, error, invalid, disabled, name, className, children }: FieldFrameProps) {
  return (
    <Field invalid={invalid ?? Boolean(error)} disabled={disabled} name={name} className={className}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

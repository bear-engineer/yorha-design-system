import { Field as BaseField } from "@base-ui/react/field";
import * as React from "react";
import type { ComponentProps, ReactNode } from "react";
import { runFx } from "@/lib/fx";
import { InputGroupInput } from "@/components/ui/input-group";
import { cn, cnState } from "@/lib/utils";

/**
 * Control surface shared by Input, TextField, Textarea and FieldControl (one definition, one colour duration).
 * Height is the control token (no padding-derived height); hover only recolours the border and never while the
 * control is focused, invalid, disabled or read-only. Disabled / read-only / invalid are the shared state recipes.
 */
export const fieldControlClass = cn(
  "h-control-md w-full min-w-0 rounded-yorha border border-yorha-border bg-yorha-bg px-pad-md",
  "font-yorha text-yorha-base text-yorha-fg-strong placeholder:text-yorha-fg-soft",
  "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
  "hover:enabled:not-read-only:not-focus:not-data-[invalid]:not-aria-invalid:border-yorha-fg",
  "focus-visible:yorha-focus yorha-invalid yorha-disabled yorha-readonly",
  // V4-126: a number input never shows the UA spin buttons (use NumberField for steppers); the wheel does not change it either.
  "[&[type=number]]:[appearance:textfield] [&[type=number]::-webkit-inner-spin-button]:appearance-none [&[type=number]::-webkit-outer-spin-button]:appearance-none",
);

const ERROR_ICON = cn(
  "yorha-flicker grid size-5 shrink-0 place-items-center border-(length:--yorha-border-width-strong) border-yorha-alert-ui",
  "font-yorha-bold text-yorha-xs leading-none",
);

/** Icon box and text on one 20px line (icon = line height), so the icon centres on the first line of wrapped text. */
const lastFlicker = new WeakMap<Element, number>();

/**
 * V4-124: the icon box flickers once when the error appears (the text is there at once). The lockout lives on the Field root, not on the
 * icon, because the icon remounts with each new error: turning invalid again within 1 s plays nothing.
 */
function ErrorMessage({ children }: { children: ReactNode }) {
  const icon = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = icon.current;
    if (!el) return;
    const owner = el.closest("[data-slot=field]") ?? el;
    const now = performance.now();
    const last = lastFlicker.get(owner);
    if (last !== undefined && now - last < 1000) return;
    lastFlicker.set(owner, now);
    runFx(el);
  }, []);
  return (
    <>
      <span ref={icon} aria-hidden="true" data-slot="field-error-icon" className={ERROR_ICON}>
        !
      </span>
      <span className="min-w-0 text-pretty">{children}</span>
    </>
  );
}

const ERROR_ROW = "-mt-1 flex items-start gap-2 font-yorha-medium text-yorha-sm text-yorha-alert";

export type FieldProps = ComponentProps<typeof BaseField.Root>;
/** Root wrapper: owns invalid/disabled/name for every part below (Base UI Field context). */
export function Field({ className, ...props }: FieldProps) {
  return (
    <BaseField.Root
      data-slot="field"
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
          "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
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
      data-slot="field-description"
      className={cnState("-mt-1 text-yorha-sm text-yorha-fg-soft", className)}
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
      className={cnState(ERROR_ROW, className)}
      // `children` wins; without it the message is the one Base UI resolved (a `Form errors` entry for this field's name).
      render={(rendered) => {
        const content = children ?? rendered.children;
        return content ? (
          <div {...rendered}>
            <ErrorMessage>{content}</ErrorMessage>
          </div>
        ) : (
          <></>
        );
      }}
      {...props}
    />
  );
}

/**
 * Optional one-line reservation for the error row (`reserveError`): the slot holds the 20px line whether or not an error shows, so the
 * fields below never move when validation fails. Without it the row exists only while there is an error.
 */
export function FieldErrorSlot({ reserve = false, children }: { reserve?: boolean; children?: ReactNode }) {
  if (!reserve) return <>{children}</>;
  return (
    <div data-slot="field-error-slot" className="-mt-1 min-h-5">
      {children}
    </div>
  );
}

export interface FieldCounterProps extends Omit<ComponentProps<"span">, "children"> {
  /** Current text; its length is counted. */
  value: string;
  max: number;
}

const COUNTER_MARKS = (max: number): [number, number] => [Math.ceil(max * 0.9), max];

/**
 * `n/max` for the description row: tabular, width fixed in `ch` for the widest value, so typing never moves the row. Turns alert-coloured
 * at 90 % and 100 % and announces once at each of those two thresholds (polite, never per keystroke).
 */
export function FieldCounter({ value, max, className, ...props }: FieldCounterProps) {
  const n = value.length;
  const [m90, m100] = COUNTER_MARKS(max);
  const level = n >= m100 ? 2 : n >= m90 ? 1 : 0;
  const [spoken, setSpoken] = React.useState("");
  const prev = React.useRef(0);
  React.useEffect(() => {
    if (level > prev.current) setSpoken(level === 2 ? `최대 ${max}자에 도달했습니다` : `${max}자 중 ${n}자 입력했습니다`);
    else if (level === 0) setSpoken("");
    prev.current = level;
  }, [level, max, n]);
  const width = `${String(max).length * 2 + 1}ch`;
  return (
    <>
      <span
        data-slot="field-counter"
        data-alert={level > 0 ? "" : undefined}
        style={{ width }}
        className={cn("yorha-tabular inline-block text-left", level > 0 ? "text-yorha-alert" : "text-yorha-fg-soft", className)}
        {...props}
      >
        {n}/{max}
      </span>
      <span data-slot="field-counter-status" role="status" className="sr-only">
        {spoken}
      </span>
    </>
  );
}

export type FieldControlProps = ComponentProps<typeof BaseField.Control>;
/** The input (default) or any element passed via `render`. Wired to label/description/error by Field. */
export function FieldControl({ className, ...props }: FieldControlProps) {
  return <BaseField.Control className={cnState(fieldControlClass, className)} {...props} />;
}

/**
 * FieldControl for a control inside an InputGroup (`InputGroupInput` wired to Field: label, description, invalid).
 * The group frame owns the border, ring and state recipes, so none of `fieldControlClass` applies here.
 */
export function FieldGroupControl({ className, ...props }: FieldControlProps) {
  return <BaseField.Control render={<InputGroupInput />} className={cnState("", className)} {...props} />;
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
          <span role="alert" className={ERROR_ROW}>
            <ErrorMessage>{content}</ErrorMessage>
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
  /** Keep one error line reserved so an error appearing never moves the fields below. */
  reserveError?: boolean;
  /** The control, e.g. FieldControl. */
  children?: ReactNode;
}

/** Label, control, description and error in the standard order, wired by one Field root. */
export function FieldFrame({ label, description, error, invalid, disabled, name, className, reserveError, children }: FieldFrameProps) {
  return (
    <Field invalid={invalid ?? Boolean(error)} disabled={disabled} name={name} className={className}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldErrorSlot reserve={reserveError}>
        <FieldError match={error ? true : undefined} className={reserveError ? "mt-0" : undefined}>
          {error}
        </FieldError>
      </FieldErrorSlot>
    </Field>
  );
}

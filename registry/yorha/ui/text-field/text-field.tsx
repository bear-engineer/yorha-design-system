import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps, ReactNode } from "react";
import { FieldFrame, FieldGroupControl, fieldControlClass } from "@/components/ui/field";
import { CrossIcon } from "@/components/ui/icons";
import { InputGroup, InputGroupButton } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export interface TextFieldProps extends Omit<ComponentProps<typeof BaseInput>, "className"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Defaults to true when `error` is set. */
  invalid?: boolean;
  /**
   * Adds a clear button in the same frame. It stays mounted (invisible and out of the Tab order while empty) so the field never resizes;
   * clearing returns focus to the input and fires a normal input event (controlled and uncontrolled both work).
   */
  clearable?: boolean;
  clearLabel?: string;
  /** Keep one error line reserved so an error appearing never moves the fields below. */
  reserveError?: boolean;
  /** Class for the wrapper (layout). */
  className?: string;
}

/** Single-line text input with label, description and error wired through Field. Korean IME: no key handling. */
export function TextField({
  label,
  description,
  error,
  invalid,
  clearable = false,
  clearLabel = "지우기",
  reserveError,
  className,
  ...inputProps
}: TextFieldProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [hasText, setHasText] = React.useState(() => String(inputProps.value ?? inputProps.defaultValue ?? "") !== "");
  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    const ref = (inputProps as { ref?: React.Ref<HTMLInputElement> }).ref;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
  };
  const text = clearable && inputProps.value !== undefined ? String(inputProps.value) !== "" : hasText;
  const clear = () => {
    const el = inputRef.current;
    if (!el) return;
    // The native setter plus a bubbling input event keeps React-controlled and uncontrolled inputs in sync.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  };
  return (
    <FieldFrame
      label={label}
      description={description}
      error={error}
      invalid={invalid}
      disabled={inputProps.disabled}
      name={inputProps.name}
      reserveError={reserveError}
      className={cn("w-full", className)}
    >
      {clearable ? (
        <InputGroup>
          <FieldGroupControl
            {...inputProps}
            ref={setRefs}
            onChange={(e) => {
              setHasText(e.currentTarget.value !== "");
              inputProps.onChange?.(e);
            }}
          />
          {inputProps.disabled || inputProps.readOnly ? null : (
            <InputGroupButton aria-label={clearLabel} onClick={clear} tabIndex={text ? undefined : -1} className={text ? undefined : "invisible"}>
              <CrossIcon />
            </InputGroupButton>
          )}
        </InputGroup>
      ) : (
        <BaseInput className={fieldControlClass} {...inputProps} />
      )}
    </FieldFrame>
  );
}

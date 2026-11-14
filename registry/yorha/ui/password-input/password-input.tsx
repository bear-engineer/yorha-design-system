import * as React from "react";
import { Field, FieldDescription, FieldError, FieldGroupControl, FieldLabel, type FieldControlProps } from "@/components/ui/field";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { InputGroup, InputGroupButton } from "@/components/ui/input-group";

export interface PasswordInputProps extends Omit<FieldControlProps, "type" | "children" | "className"> {
  /** Visible label and accessible name of the input. */
  label: React.ReactNode;
  description?: React.ReactNode;
  /** External error text; marks the field invalid. */
  error?: React.ReactNode;
  /** Name of the reveal button. It stays the same in both states; aria-pressed carries the state. */
  revealLabel?: string;
  /** Shown while Caps Lock is on and the input has focus. */
  capsLockMessage?: string;
  /** Class for the Field wrapper. */
  className?: string;
}

/**
 * Password input with a reveal toggle (a button with aria-pressed and a stable accessible name) and a
 * Caps Lock hint read through getModifierState. Default autoComplete is current-password; use
 * new-password for sign-up forms.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  {
    label,
    description,
    error,
    revealLabel = "비밀번호 표시",
    capsLockMessage = "Caps Lock이 켜져 있습니다",
    className,
    disabled,
    autoComplete = "current-password",
    onKeyDown,
    onKeyUp,
    onBlur,
    ...props
  },
  ref,
) {
  const [revealed, setRevealed] = React.useState(false);
  const [caps, setCaps] = React.useState(false);
  const readCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState("CapsLock"));
  return (
    <Field invalid={Boolean(error)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <FieldGroupControl
          ref={ref}
          type={revealed ? "text" : "password"}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
          onKeyDown={(e) => {
            readCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            readCaps(e);
            onKeyUp?.(e);
          }}
          onBlur={(e) => {
            setCaps(false);
            onBlur?.(e);
          }}
          {...props}
        />
        <InputGroupButton
          aria-label={revealLabel}
          aria-pressed={revealed}
          disabled={disabled}
          onClick={() => setRevealed((v) => !v)}
          className={revealed ? "bg-yorha-ink text-yorha-on-ink" : undefined}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroup>
      <div role="status" className="empty:hidden">
        {caps ? <FieldDescription>{capsLockMessage}</FieldDescription> : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
});

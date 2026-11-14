import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel, type FieldControlProps } from "@/components/ui/field";

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

function EyeGlyph({ off }: { off: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M3 3l18 18" /> : null}
    </svg>
  );
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
      <div className="flex items-stretch gap-2">
        <FieldControl
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
        <Button
          variant={revealed ? "primary" : "default"}
          square
          aria-label={revealLabel}
          aria-pressed={revealed}
          disabled={disabled}
          onClick={() => setRevealed((v) => !v)}
        >
          <EyeGlyph off={revealed} />
        </Button>
      </div>
      <div role="status" className="empty:hidden">
        {caps ? <FieldDescription>{capsLockMessage}</FieldDescription> : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
});

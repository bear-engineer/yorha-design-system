import * as React from "react";
import { Field, FieldDescription, FieldError, FieldErrorSlot, FieldGroupControl, FieldLabel, type FieldControlProps } from "@/components/ui/field";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { InputGroup, InputGroupButton } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

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
  /**
   * Back to hidden (`type=password`, no remount, selection kept) when focus leaves the group, when the owning form submits and when the
   * tab is hidden. `false` keeps it revealed until toggled. Default true.
   */
  autoHide?: boolean;
  /**
   * 0-4 strength of the current value, computed by the host (no rules are baked in). Renders four fixed segments and a text label; the
   * change is announced politely after 600 ms without further changes. Omit for no meter.
   */
  strength?: 0 | 1 | 2 | 3 | 4;
  /** Five labels for strength 0-4. */
  strengthLabels?: [string, string, string, string, string];
  /** Keep one error line reserved so an error appearing never moves the fields below. */
  reserveError?: boolean;
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
    autoHide = true,
    strength,
    strengthLabels = ["입력 없음", "매우 약함", "약함", "보통", "강함"],
    reserveError,
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
  const [announce, setAnnounce] = React.useState("");
  const [strengthSpoken, setStrengthSpoken] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const selection = React.useRef<[number, number] | null>(null);
  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  const hide = React.useCallback(() => {
    const el = inputRef.current;
    if (el && el.selectionStart !== null && el.selectionEnd !== null) selection.current = [el.selectionStart, el.selectionEnd];
    setRevealed((was) => {
      if (was) setAnnounce("숨김");
      return false;
    });
  }, []);
  // Changing `type` can reset the caret in some engines: put the selection back after the swap.
  React.useLayoutEffect(() => {
    const el = inputRef.current;
    const sel = selection.current;
    if (el && sel && document.activeElement === el) el.setSelectionRange(sel[0], sel[1]);
    selection.current = null;
  }, [revealed]);
  React.useEffect(() => {
    if (!autoHide || !revealed) return;
    const el = inputRef.current;
    const form = el?.form;
    const onVisibility = () => document.visibilityState === "hidden" && hide();
    form?.addEventListener("submit", hide);
    form?.addEventListener("reset", hide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      form?.removeEventListener("submit", hide);
      form?.removeEventListener("reset", hide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoHide, revealed, hide]);
  React.useEffect(() => {
    if (strength === undefined) return;
    const id = window.setTimeout(() => setStrengthSpoken(`비밀번호 강도: ${strengthLabels[strength]}`), 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strength]);
  const readCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState("CapsLock"));
  return (
    <Field invalid={Boolean(error)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup
        onBlur={(e) => {
          if (autoHide && !e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
        }}
      >
        <FieldGroupControl
          ref={setRefs}
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
          onClick={() => {
            const el = inputRef.current;
            if (el && el.selectionStart !== null && el.selectionEnd !== null) selection.current = [el.selectionStart, el.selectionEnd];
            setAnnounce(revealed ? "숨김" : "표시됨");
            setRevealed((v) => !v);
          }}
          className={revealed ? "bg-yorha-ink text-yorha-on-ink" : undefined}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroup>
      {/* One status region: caps hint (visible, in flow) and the reveal state (sr-only). Without the hint the region is sr-only, so it never adds a flex gap. */}
      <div role="status" className={caps ? undefined : "sr-only"}>
        {caps ? <FieldDescription>{capsLockMessage}</FieldDescription> : null}
        <span className="sr-only">{announce}</span>
      </div>
      {strength !== undefined ? (
        <div data-slot="password-strength" className="flex h-5 items-center gap-2 text-yorha-sm text-yorha-fg-soft">
          <span aria-hidden="true" className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                data-segment=""
                data-on={i < strength ? "" : undefined}
                className={cn("h-1 w-6 border border-yorha-border", i < strength && "border-yorha-ink bg-yorha-ink")}
              />
            ))}
          </span>
          <span aria-hidden="true" className="min-w-0 truncate">
            {strengthLabels[strength]}
          </span>
          <span data-slot="password-strength-status" role="status" className="sr-only">
            {strengthSpoken}
          </span>
        </div>
      ) : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldErrorSlot reserve={reserveError}>
        <FieldError match={error ? true : undefined} className={reserveError ? "mt-0" : undefined}>
          {error}
        </FieldError>
      </FieldErrorSlot>
    </Field>
  );
});

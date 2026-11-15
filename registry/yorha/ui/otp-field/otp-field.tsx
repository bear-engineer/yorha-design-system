import * as React from "react";
import { OTPField as BaseOTPField } from "@base-ui/react/otp-field";
import { Glyph } from "@/components/ui/glyph";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type OTPStatus = "idle" | "verifying" | "success" | "error";
const StatusContext = React.createContext<OTPStatus | undefined>(undefined);

export interface OTPFieldRootProps extends Omit<React.ComponentProps<typeof BaseOTPField.Root>, "className"> {
  className?: string;
  /**
   * Verification state. Giving it (even "idle") reserves one trailing cell so no status change moves a slot:
   * verifying = aria-busy + Spinner, success = filled slots + check glyph, error = aria-invalid and slot 1 selected for overtype.
   */
  status?: OTPStatus;
}

/**
 * One-time code entry. Root owns value, length, paste and completion; render one OTPFieldInput per slot.
 * Typing advances focus, Backspace on an empty slot moves back, and a pasted code fills every slot.
 * Migration (v4): `status` prop and a status cell; slot 1 defaults to autoComplete="one-time-code", every slot to inputMode="numeric";
 * the empty active slot draws a block caret (`yorha-caret`, hidden when motion is off) instead of the native caret.
 * Give the Root an `id` and label it with a native <label htmlFor>; add aria-label to slots 2..n.
 */
export const OTPFieldRoot = React.forwardRef<HTMLDivElement, OTPFieldRootProps>(function OTPFieldRoot(
  { className, status, children, ...props },
  ref,
) {
  const own = React.useRef<HTMLDivElement | null>(null);
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      own.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  // Error: put the caret in the first slot with its character selected, so typing again replaces the code.
  React.useEffect(() => {
    if (status !== "error") return;
    const first = own.current?.querySelector<HTMLInputElement>("input");
    first?.focus();
    first?.select();
  }, [status]);
  return (
    <StatusContext.Provider value={status}>
      <BaseOTPField.Root
        ref={setRef}
        data-status={status}
        aria-busy={status === "verifying" ? true : undefined}
        className={cn("inline-flex max-w-full items-center gap-2 font-yorha", className)}
        {...props}
      >
        {children}
        {status ? (
          <span data-slot="otp-status" className="grid size-3 shrink-0 place-items-center text-yorha-fg-strong">
            {status === "verifying" ? <Spinner label="확인 중" /> : null}
            {status === "success" ? <Glyph name="check" box={12} /> : null}
            {status === "error" ? <span role="status" className="sr-only">코드가 올바르지 않습니다</span> : null}
            {status === "success" ? <span role="status" className="sr-only">인증되었습니다</span> : null}
          </span>
        ) : null}
      </BaseOTPField.Root>
    </StatusContext.Provider>
  );
});

export interface OTPFieldInputProps extends Omit<React.ComponentProps<typeof BaseOTPField.Input>, "className"> {
  className?: string;
}

/** One character slot. Square, bordered, and invalid-state aware through data-invalid. */
export const OTPFieldInput = React.forwardRef<HTMLInputElement, OTPFieldInputProps>(function OTPFieldInput(
  { className, ...props },
  ref,
) {
  const status = React.useContext(StatusContext);
  return (
    <BaseOTPField.Input
      ref={ref}
      render={(own, state) => (
        // The wrapper owns the square; the input fills it and the caret sits in the same grid cell, so nothing moves on focus.
        <span className="group/slot grid aspect-square h-auto w-control-md min-w-0 shrink">
          <input
            {...own}
            inputMode="numeric"
            autoComplete={state.index === 0 ? "one-time-code" : "off"}
            aria-invalid={status === "error" ? true : undefined}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            className={cn(
              "col-start-1 row-start-1 m-0 size-full min-w-0 rounded-yorha border border-yorha-border bg-yorha-bg p-0 text-center caret-transparent",
              "font-yorha-mono text-yorha-xl text-yorha-fg-strong yorha-tabular",
              "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
              "data-[filled]:border-yorha-fg-strong hover:enabled:not-focus:not-data-[filled]:not-data-[invalid]:border-yorha-fg",
              "focus-visible:yorha-focus yorha-invalid yorha-disabled",
              "in-data-[status=success]:border-yorha-ink in-data-[status=success]:bg-yorha-ink in-data-[status=success]:text-yorha-on-ink",
              className,
            )}
          />
          <span
            aria-hidden="true"
            data-slot="otp-caret"
            data-blink=""
            className="yorha-caret invisible col-start-1 row-start-1 place-self-center text-yorha-fg-strong group-has-[input:focus:not([data-filled])]/slot:visible in-data-[motion=off]:hidden!"
          />
        </span>
      )}
    />
  );
});

export interface OTPFieldSeparatorProps extends Omit<React.ComponentProps<typeof BaseOTPField.Separator>, "className"> {
  className?: string;
}

/** Visual break between slot groups, e.g. 3 + 3. Decorative: it is not announced. */
export const OTPFieldSeparator = React.forwardRef<HTMLDivElement, OTPFieldSeparatorProps>(function OTPFieldSeparator(
  { className, ...props },
  ref,
) {
  return <BaseOTPField.Separator ref={ref} className={cn("block h-0.5 w-3 shrink-0 bg-yorha-fg", className)} {...props} />;
});

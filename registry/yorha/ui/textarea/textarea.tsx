import type * as React from "react";
import type { ComponentProps, ReactNode } from "react";
import { FieldControl, type FieldControlProps, FieldFrame } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface TextareaProps extends Omit<ComponentProps<"textarea">, "className"> {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** Defaults to true when `error` is set. */
  invalid?: boolean;
  /**
   * Grow with content (CSS field-sizing). No JS, no keydown handling, so IME composition is untouched.
   * Browsers without field-sizing keep the `rows` height (and the `max-h-64` clamp still scrolls); the scroll cue marks clamped content.
   */
  autoSize?: boolean;
  /**
   * Ctrl/Cmd+Enter submits the owning form (`form.requestSubmit()`, so validation and `submit` listeners run once). Ignored while an IME is
   * composing; plain Enter always inserts a newline. Sets `aria-keyshortcuts`.
   */
  submitOnModEnter?: boolean;
  /** Keep one error line reserved so an error appearing never moves the fields below. */
  reserveError?: boolean;
  /** Restore the native vertical resize grip (off by default: the browser grip is a UA square). */
  resize?: boolean;
  /** Class for the wrapper (layout). */
  className?: string;
}

/** Multi-line text input composed with Field. */
export function Textarea({
  label,
  description,
  error,
  invalid,
  autoSize = false,
  resize = false,
  submitOnModEnter = false,
  reserveError,
  className,
  rows = 3,
  onKeyDown,
  ...props
}: TextareaProps) {
  return (
    <FieldFrame
      label={label}
      description={description}
      error={error}
      invalid={invalid}
      disabled={props.disabled}
      name={props.name}
      reserveError={reserveError}
      className={cn("w-full", className)}
    >
      <FieldControl
        render={<textarea rows={rows} />}
        className={cn(
          // Auto height (the control token is a single-line height); rows set the floor, max-h keeps it scrollable.
          "h-auto max-h-64 min-h-24 resize-none py-2 yorha-scroll yorha-scroll-cue-y",
          autoSize && "[field-sizing:content]",
          resize && "resize-y",
        )}
        aria-keyshortcuts={submitOnModEnter ? "Control+Enter Meta+Enter" : undefined}
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          onKeyDown?.(e as React.KeyboardEvent<HTMLTextAreaElement>);
          if (!submitOnModEnter || e.defaultPrevented || e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          const form = (e.currentTarget as HTMLTextAreaElement).form;
          if (!form) return;
          e.preventDefault();
          form.requestSubmit();
        }}
        {...(props as FieldControlProps)}
      />
    </FieldFrame>
  );
}

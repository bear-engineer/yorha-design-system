import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One frame for a text control with adornments (G9). Children sit on the control scale: the frame is
 * `h-control-*`, the input and every addon/button fill the inner height (squares for addon and button), so
 * heights are equal by construction and nothing lands on a half pixel. The frame owns hover, the focus ring,
 * invalid, disabled and read-only; the inner control is `outline-none`.
 */
export type InputGroupSize = "sm" | "md" | "lg";

const FRAME_SIZE: Record<InputGroupSize, string> = {
  sm: "h-control-sm text-yorha-sm",
  md: "h-control-md text-yorha-base",
  lg: "h-control-lg text-yorha-lg",
};
const WRAP_SIZE: Record<InputGroupSize, string> = {
  sm: "min-h-control-sm text-yorha-sm",
  md: "min-h-control-md text-yorha-base",
  lg: "min-h-control-lg text-yorha-lg",
};
const INPUT_PAD: Record<InputGroupSize, string> = { sm: "px-pad-sm", md: "px-pad-md", lg: "px-pad-lg" };

const InputGroupContext = React.createContext<{ size: InputGroupSize }>({ size: "md" });

const CONTROL = "[data-slot=input-group-control]";

export interface InputGroupProps extends Omit<React.ComponentProps<"div">, "role"> {
  size?: InputGroupSize;
  /** `wrap` grows with its content (chips) instead of holding one control height. */
  variant?: "default" | "wrap";
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export function InputGroup({ size = "md", variant = "default", invalid, disabled, readOnly, className, ...props }: InputGroupProps) {
  const ctx = React.useMemo(() => ({ size }), [size]);
  return (
    <InputGroupContext.Provider value={ctx}>
      <div
        role="group"
        data-slot="input-group"
        data-invalid={invalid ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-readonly={readOnly ? "" : undefined}
        className={cn(
          "flex w-full items-stretch rounded-yorha border border-yorha-border bg-yorha-bg font-yorha text-yorha-fg-strong",
          variant === "wrap" ? cn("h-auto flex-wrap", WRAP_SIZE[size]) : FRAME_SIZE[size],
          "transition-[border-color] duration-(--motion-select) ease-yorha",
          // Hover darkens the border unless focus, invalid, disabled or read-only already own it.
          `[&:hover:not(:focus-within,[data-invalid],[data-disabled],[data-readonly],:has(:disabled,[aria-invalid=true],${CONTROL}:read-only))]:border-yorha-fg`,
          // One ring on the frame (G6 b); the control and the addons never draw their own.
          `has-[${CONTROL}:focus-visible]:yorha-focus`,
          "yorha-invalid has-[[aria-invalid=true]]:border-yorha-alert-ui has-[[aria-invalid=true]]:shadow-[inset_0_0_0_calc(var(--yorha-border-width-strong)-var(--yorha-border-width))_var(--yorha-alert-ui)]",
          "yorha-disabled has-[:disabled]:cursor-not-allowed has-[:disabled]:border-yorha-disabled has-[:disabled]:text-yorha-disabled",
          `yorha-readonly has-[${CONTROL}:read-only:not(:disabled)]:border-transparent has-[${CONTROL}:read-only:not(:disabled)]:border-b-yorha-border has-[${CONTROL}:read-only:not(:disabled)]:bg-transparent`,
          className,
        )}
        {...props}
      />
    </InputGroupContext.Provider>
  );
}

export type InputGroupInputProps = React.ComponentProps<"input">;

/** The text control. Next to a start addon it drops its left padding so the addon square is the gutter. */
export function InputGroupInput({ className, type = "text", ...props }: InputGroupInputProps) {
  const { size } = React.useContext(InputGroupContext);
  return (
    <input
      type={type}
      data-slot="input-group-control"
      className={cn(
        "min-w-0 flex-1 rounded-none border-0 bg-transparent py-0 font-yorha text-[length:inherit] text-yorha-fg-strong outline-none",
        "placeholder:text-yorha-fg-soft disabled:cursor-not-allowed disabled:text-yorha-disabled read-only:cursor-default",
        "[[data-slot=input-group-addon][data-align=start]+&]:pl-0",
        INPUT_PAD[size],
        className,
      )}
      {...props}
    />
  );
}

export interface InputGroupAddonProps extends React.ComponentProps<"span"> {
  align?: "start" | "end";
}

/** Decorative square on the inner height (icon, prefix). Takes no pointer events. */
export function InputGroupAddon({ align = "start", className, ...props }: InputGroupAddonProps) {
  return (
    <span
      data-slot="input-group-addon"
      data-align={align}
      className={cn("pointer-events-none grid aspect-square h-full shrink-0 place-items-center text-yorha-fg-soft", className)}
      {...props}
    />
  );
}

export interface InputGroupButtonProps extends Omit<React.ComponentProps<"button">, "aria-label"> {
  /** Required: the button shows an icon only. */
  "aria-label": string;
  align?: "start" | "end";
}

/** Square button on the inner height. A button that can disappear (clear) stays mounted and toggles `invisible`. */
export function InputGroupButton({ align = "end", type = "button", className, ...props }: InputGroupButtonProps) {
  return (
    <button
      type={type}
      data-slot="input-group-button"
      data-align={align}
      className={cn(
        "grid aspect-square h-full shrink-0 cursor-pointer place-items-center border-yorha-border bg-transparent text-yorha-fg-strong",
        align === "end" ? "border-l" : "border-r",
        "transition-[color,background-color] duration-(--motion-select) ease-yorha",
        "yorha-tint outline-none focus-visible:yorha-focus-inset yorha-disabled",
        className,
      )}
      {...props}
    />
  );
}

/** Separator or unit text (`원`, `@example.com`). */
export function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="input-group-text" className={cn("grid shrink-0 place-items-center px-2 text-yorha-fg-soft", className)} {...props} />;
}

import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn, cnState } from "@/lib/utils";

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Equal width and height (used by IconButton). */
  square?: boolean;
}

// Selection wipe: a background-size transition on an ink layer, left to right.
// Duration comes from --motion-select, so data-motion reduced/off collapses it to 0.
const WIPE =
  "bg-no-repeat bg-[position:left_center] bg-[length:0%_100%] " +
  "transition-[background-size,color,border-color] duration-(--motion-select) ease-yorha-out " +
  "enabled:hover:bg-[length:100%_100%] enabled:active:bg-[length:100%_100%]";

const BASE =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 border " +
  "rounded-yorha font-yorha font-yorha-medium tracking-yorha-wide whitespace-nowrap cursor-pointer " +
  "focus-visible:yorha-focus disabled:cursor-not-allowed disabled:opacity-60 " +
  "data-[loading]:cursor-progress " + WIPE;

const VARIANT: Record<ButtonVariant, string> = {
  default:
    "border-yorha-border bg-yorha-control text-yorha-on-control " +
    "bg-linear-to-r from-yorha-ink to-yorha-ink enabled:hover:text-yorha-on-ink enabled:active:text-yorha-on-ink",
  primary:
    "border-yorha-ink bg-yorha-ink text-yorha-on-ink " +
    "bg-linear-to-r from-yorha-control to-yorha-control enabled:hover:text-yorha-on-control enabled:active:text-yorha-on-control",
  ghost:
    "border-transparent bg-transparent text-yorha-fg " +
    "bg-linear-to-r from-yorha-ink to-yorha-ink enabled:hover:text-yorha-on-ink enabled:active:text-yorha-on-ink",
  danger:
    "border-yorha-alert-ui bg-yorha-panel text-yorha-alert " +
    "bg-linear-to-r from-yorha-ink to-yorha-ink enabled:hover:text-yorha-alert-on-ink enabled:active:text-yorha-alert-on-ink",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-yorha-sm",
  md: "h-10 px-4 text-yorha-base",
  lg: "h-12 px-6 text-yorha-lg",
};

const SQUARE: Record<ButtonSize, string> = {
  sm: "size-8 text-yorha-sm",
  md: "size-10 text-yorha-base",
  lg: "size-12 text-yorha-lg",
};

/** Class string shared by Button, IconButton and anything button-shaped (Dialog/Toast actions). */
export function buttonVariants({ variant = "default", size = "md", square = false }: ButtonVariantOptions = {}): string {
  return cn(BASE, VARIANT[variant], square ? cn(SQUARE[size], "p-0") : SIZE[size]);
}

export interface ButtonProps extends ComponentProps<typeof BaseButton>, Omit<ButtonVariantOptions, "square"> {
  /** Shows a busy indicator, keeps the label, blocks activation. */
  loading?: boolean;
  /** @internal used by IconButton */
  square?: boolean;
}

export function Button({
  variant = "default",
  size = "md",
  square = false,
  loading = false,
  className,
  children,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      type={type}
      className={cnState(buttonVariants({ variant, size, square }), className)}
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="inline-block size-2 shrink-0 bg-current" />
      ) : null}
      {children}
    </BaseButton>
  );
}

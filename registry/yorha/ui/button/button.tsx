import { Button as BaseButton } from "@base-ui/react/button";
import { useEffect, useRef, type ComponentProps, type RefObject } from "react";
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
// yorha-press owns the transition list (press scale + delayed colour + wipe at --motion-select).
// A loading button is blocked, so it gets neither the wipe nor the press scale (`not-data-[loading]`).
const WIPE =
  "bg-no-repeat bg-[position:left_center] bg-[length:0%_100%] yorha-press " +
  "enabled:not-data-[loading]:hover:bg-[length:100%_100%] enabled:not-data-[loading]:active:bg-[length:100%_100%]";

const BASE =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 border " +
  "rounded-yorha font-yorha font-yorha-medium tracking-yorha-wide whitespace-nowrap cursor-pointer " +
  "focus-visible:yorha-focus yorha-disabled " +
  "data-[loading]:cursor-progress " + WIPE;

const VARIANT: Record<ButtonVariant, string> = {
  default:
    "border-yorha-border bg-yorha-control text-yorha-on-control " +
    "bg-linear-to-r from-yorha-ink to-yorha-ink enabled:not-data-[loading]:hover:text-yorha-on-ink enabled:not-data-[loading]:active:text-yorha-on-ink",
  primary:
    "border-yorha-ink bg-yorha-ink text-yorha-on-ink " +
    "bg-linear-to-r from-yorha-control to-yorha-control enabled:not-data-[loading]:hover:text-yorha-on-control enabled:not-data-[loading]:active:text-yorha-on-control",
  ghost:
    "border-transparent bg-transparent text-yorha-fg " +
    "bg-linear-to-r from-yorha-ink to-yorha-ink enabled:not-data-[loading]:hover:text-yorha-on-ink enabled:not-data-[loading]:active:text-yorha-on-ink",
  danger:
    "border-yorha-alert-ui bg-yorha-panel text-yorha-alert " +
    "bg-linear-to-r from-yorha-ink to-yorha-ink enabled:not-data-[loading]:hover:text-yorha-alert-on-ink enabled:not-data-[loading]:active:text-yorha-alert-on-ink",
};

/**
 * One size map for every control of the family (Button, IconButton, Toggle, ToggleGroup, triggers, FormSubmit).
 * Heights come from the density-aware control scale (never from padding + line height); content is centred.
 */
export const controlSize: Record<ButtonSize, string> = {
  sm: "h-control-sm min-w-control-sm px-pad-sm text-yorha-sm",
  md: "h-control-md min-w-control-md px-pad-md text-yorha-base",
  lg: "h-control-lg min-w-control-lg px-pad-lg text-yorha-lg",
};

export const controlSquare: Record<ButtonSize, string> = {
  sm: "size-control-sm text-yorha-sm",
  md: "size-control-md text-yorha-base",
  lg: "size-control-lg text-yorha-lg",
};

/** Class string shared by Button, IconButton and anything button-shaped (Dialog/Toast actions). */
export function buttonVariants({ variant = "default", size = "md", square = false }: ButtonVariantOptions = {}): string {
  return cn(BASE, VARIANT[variant], square ? cn(controlSquare[size], "p-0") : controlSize[size]);
}

const LOOP_FALLBACK_MS = 1200; // used when the --motion-loop token is absent

/**
 * Busy indicator pulse (opacity only, so the indicator never changes the button's box). full = --motion-loop,
 * reduced (data-motion or prefers-reduced-motion) = the slower reduced token value, off = static and fully opaque.
 */
function usePulse(ref: RefObject<HTMLSpanElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const html = document.documentElement;
    const motionOf = () =>
      html.dataset.motion ?? (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full");
    let anim: Animation | undefined;
    const sync = () => {
      anim?.cancel();
      anim = undefined;
      const mode = motionOf();
      if (mode === "off" || typeof el.animate !== "function") return;
      const duration = parseFloat(getComputedStyle(html).getPropertyValue("--motion-loop")) || LOOP_FALLBACK_MS; // the token is 1200ms full / 2400ms reduced
      anim = el.animate([{ opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }], {
        duration,
        iterations: Infinity,
        easing: "linear",
      });
    };
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    sync();
    return () => {
      observer.disconnect();
      anim?.cancel();
    };
  }, [ref, active]);
}

export interface ButtonProps extends ComponentProps<typeof BaseButton>, Omit<ButtonVariantOptions, "square"> {
  /** Shows a pulsing 2px busy bar on the bottom inner edge (the size never changes), keeps the label, blocks activation, no wipe or press scale. */
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
  const indicatorRef = useRef<HTMLSpanElement>(null);
  usePulse(indicatorRef, loading);
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
        // A 2px bar on the bottom inner edge, the same for every size and variant: it never resizes the control.
        <span
          ref={indicatorRef}
          aria-hidden="true"
          data-slot="button-busy"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-current"
        />
      ) : null}
      {children}
    </BaseButton>
  );
}

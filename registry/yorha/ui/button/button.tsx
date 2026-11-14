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
// yorha-press owns the transition list (press scale + wipe/colour at --motion-select).
const WIPE =
  "bg-no-repeat bg-[position:left_center] bg-[length:0%_100%] yorha-press " +
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
  /** Shows a pulsing busy indicator overlaid on the button (its size never changes), keeps the label, blocks activation. */
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
        // Overlaid in the padding (or the corner of a square button) so toggling loading never resizes the control.
        <span
          ref={indicatorRef}
          aria-hidden="true"
          data-yorha-busy=""
          className={cn(
            "pointer-events-none absolute size-2 bg-current",
            square ? "top-1 right-1" : "top-1/2 left-0.5 -translate-y-1/2",
          )}
        />
      ) : null}
      {children}
    </BaseButton>
  );
}

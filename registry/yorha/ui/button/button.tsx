import { Button as BaseButton } from "@base-ui/react/button";
import { useCallback, useEffect, useRef, useState, type ComponentProps, type MouseEvent, type RefObject } from "react";
import { cn, cnState } from "@/lib/utils";
import { runFx } from "@/lib/fx";
import { Glyph } from "@/components/ui/glyph";

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
// yorha-wipe owns the transition (ink wipe at --motion-select, delayed colour flip). Pressed shows the wipe and colour only: the size
// never changes (C2-106: yorha-press scaled the control on :active; Button and Toggle no longer use it).
// A loading button is blocked, so it gets no wipe (`not-data-[loading]`).
const WIPE =
  "bg-no-repeat bg-[position:left_center] bg-[length:0%_100%] yorha-wipe " +
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

// One type step per size, derived from the body token (--yorha-text-base: 16px, 17px at the default density) so it follows density:
// sm = base - 2, md = base (the same size as Input and Select), lg = base + 2. The old 14/17/18 had a +3 then +1 step (md and lg read alike).
const TYPE: Record<ButtonSize, string> = {
  sm: "text-[length:calc(var(--yorha-text-base)-2px)] leading-none",
  md: "text-yorha-base leading-none",
  lg: "text-[length:calc(var(--yorha-text-base)+2px)] leading-none",
};

/**
 * One size map for every control of the family (Button, IconButton, Toggle, ToggleGroup, triggers, FormSubmit).
 * Heights come from the density-aware control scale (never from padding + line height); content is centred.
 * Migration (B8): the busy indicator is a 2px bar on the bottom inner edge (all sizes and variants), not the 8px square;
 * a loading button neither wipes nor scales. Tests that looked for the square use `[data-slot=button-busy]`.
 * Migration (C2-106): pressing no longer scales the control (the yorha-press `scale` on :active is gone); pressed is the ink wipe / colour only.
 * Migration (C2-304): the label size ramp is base-2 / base / base+2 (14/16/18, or 15/17/19 where --yorha-text-base is 17px); was a fixed 14 / base / 18, which gave md and lg nearly the same size at 17px.
 */
export const controlSize: Record<ButtonSize, string> = {
  sm: `h-control-sm min-w-control-sm px-pad-sm ${TYPE.sm}`,
  md: `h-control-md min-w-control-md px-pad-md ${TYPE.md}`,
  lg: `h-control-lg min-w-control-lg px-pad-lg ${TYPE.lg}`,
};

export const controlSquare: Record<ButtonSize, string> = {
  sm: `size-control-sm ${TYPE.sm}`,
  md: `size-control-md ${TYPE.md}`,
  lg: `size-control-lg ${TYPE.lg}`,
};

/** Class string shared by Button, IconButton and anything button-shaped (Dialog/Toast actions). */
export function buttonVariants({ variant = "default", size = "md", square = false }: ButtonVariantOptions = {}): string {
  return cn(BASE, VARIANT[variant], square ? cn(controlSquare[size], "p-0") : controlSize[size]);
}

const LOOP_FALLBACK_MS = 1200; // used when the --motion-loop token is absent
const RESULT_MS = 1200; // how long an internal result mark stays

/**
 * Busy indicator pulse (opacity only, so the indicator never changes the button's box). Two states, one hop each half cycle:
 * the keyframe easing is `--yorha-step-flip` (steps(1, end) in full; the token is `linear` in reduced, so reduced is the slow soft pulse).
 * Duration is --motion-loop (1200ms full, 2400ms reduced). off = static and fully opaque.
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
      const style = getComputedStyle(html);
      const duration = parseFloat(style.getPropertyValue("--motion-loop")) || LOOP_FALLBACK_MS;
      const easing = style.getPropertyValue("--yorha-step-flip").trim() || "linear";
      anim = el.animate(
        [
          { opacity: 1, offset: 0, easing },
          { opacity: 0.15, offset: 0.5, easing },
          { opacity: 1, offset: 1 },
        ],
        { duration, iterations: Infinity, easing: "linear" },
      );
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

export type ButtonResult = "success" | "error";

export interface ButtonProps extends Omit<ComponentProps<typeof BaseButton>, "onClick">, Omit<ButtonVariantOptions, "square"> {
  /**
   * May return a Promise: the button then blocks re-entry while it is pending (busy bar, aria-busy), shows a `check` (resolved) or
   * `alert` (rejected) glyph in a trailing cell for 1200ms and announces "완료" / "실패" politely. The size never changes.
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  /** Controlled result mark (same cell and announcement as the Promise path). `loading` still wins. */
  result?: ButtonResult | null;
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
  result: resultProp,
  className,
  children,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const resultRef = useRef<HTMLSpanElement>(null);
  const pendingRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  const [own, setOwn] = useState<ButtonResult | null>(null);
  const [live, setLive] = useState<{ on: boolean; text: string }>({ on: resultProp !== undefined, text: "" });
  const busy = loading || pending;
  const result = busy ? null : resultProp !== undefined ? resultProp : own;
  usePulse(indicatorRef, busy);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    setLive({ on: true, text: result === "success" ? "완료" : "실패" });
    if (result === "error") runFx(resultRef.current);
  }, [result]);

  const settle = useCallback((next: ButtonResult) => {
    if (!mounted.current) return;
    pendingRef.current = false;
    setPending(false);
    setOwn(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => mounted.current && setOwn(null), RESULT_MS);
  }, []);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy || pendingRef.current) {
      e.preventDefault();
      return;
    }
    const out = onClick?.(e);
    if (out && typeof (out as Promise<unknown>).then === "function") {
      pendingRef.current = true;
      clearTimeout(timer.current);
      setOwn(null);
      setPending(true);
      setLive((l) => (l.on ? { ...l, text: "" } : { on: true, text: "" }));
      (out as Promise<unknown>).then(
        () => settle("success"),
        () => settle("error"),
      );
    }
  };

  return (
    <>
      <BaseButton
        type={type}
        className={cnState(buttonVariants({ variant, size, square }), className)}
        aria-busy={busy || undefined}
        data-loading={busy ? "" : undefined}
        data-result={result ?? undefined}
        onClick={handleClick as ComponentProps<typeof BaseButton>["onClick"]}
        {...props}
      >
        {busy ? (
          // A 2px bar on the bottom inner edge, the same for every size and variant: it never resizes the control.
          <span
            ref={indicatorRef}
            aria-hidden="true"
            data-slot="button-busy"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-current"
          />
        ) : null}
        {result ? (
          // Trailing 12px cell, absolutely positioned: the result mark never changes the control's box.
          <span
            ref={resultRef}
            aria-hidden="true"
            data-slot="button-result"
            className="yorha-flicker pointer-events-none absolute inset-y-0 right-1 my-auto grid size-3 place-items-center"
          >
            <Glyph name={result === "success" ? "check" : "alert"} />
          </span>
        ) : null}
        {children}
      </BaseButton>
      {live.on ? (
        <span aria-live="polite" className="sr-only">
          {live.text}
        </span>
      ) : null}
    </>
  );
}

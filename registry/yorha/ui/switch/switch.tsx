import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn, cnState } from "@/lib/utils";

export interface SwitchProps extends Omit<React.ComponentProps<typeof BaseSwitch.Root>, "children"> {
  /** Visible label; clicking it toggles the switch. */
  children: React.ReactNode;
  /** Class for the row (label) element. */
  rowClassName?: string;
  /**
   * The change is being applied elsewhere (a request): sets `aria-busy` and `data-pending`, ignores toggling (click, Space,
   * label) and pulses a 4 px mark inside the thumb (smooth ease-in-out pulse). Track and thumb never change size.
   */
  pending?: boolean;
}

/** Two-state pulse of the pending mark as a Web Animation (no keyframes in kit CSS); off = a steady mark, reduced = slow opacity fade. */
function usePendingPulse(ref: React.RefObject<HTMLSpanElement | null>, pending: boolean) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !pending || typeof el.animate !== "function") return;
    const html = document.documentElement;
    let anim: Animation | undefined;
    const sync = () => {
      anim?.cancel();
      anim = undefined;
      el.style.opacity = "1";
      const mode = html.dataset.motion ?? (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full");
      const css = getComputedStyle(html);
      const loop = parseFloat(css.getPropertyValue("--motion-loop")) || 0;
      if (mode === "off" || loop <= 0) return;
      if (mode === "reduced") {
        anim = el.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], { duration: loop, iterations: Infinity, easing: css.getPropertyValue("--yorha-ease-emphasized").trim() || "linear" });
        return;
      }
      const flip = "ease-in-out";
      anim = el.animate([{ opacity: 1, easing: flip }, { opacity: 0, easing: flip, offset: 0.5 }, { opacity: 1 }], { duration: loop / 2, iterations: Infinity });
    };
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    sync();
    return () => {
      observer.disconnect();
      anim?.cancel();
      el.style.opacity = "";
    };
  }, [ref, pending]);
}

/**
 * Square track with a square thumb. On fills the track with ink and the thumb slides
 * right, so the state reads from position and fill as well as colour.
 * The Base UI root is a 24px hit area holding the drawn 20px track (40 x 20, 12px thumb at a 3px inset), so the
 * track keeps its size when checked and sits on the label's first line centre.
 * Migration (v4): new `pending` prop (see SwitchProps). The plain square thumb is confirmed (no thumb mark, no notch, no dither).
 */
export function Switch({ children, className, rowClassName, pending = false, onCheckedChange, readOnly, ...props }: SwitchProps) {
  const mark = React.useRef<HTMLSpanElement>(null);
  usePendingPulse(mark, pending);
  return (
    <label
      className={cn(
        "group/row inline-flex cursor-pointer items-start gap-2 align-middle font-yorha text-yorha-base text-yorha-fg",
        "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:text-yorha-disabled",
        rowClassName,
      )}
    >
      <span className="grid h-[round(up,1lh,4px)] shrink-0 place-items-center">
        <BaseSwitch.Root
          className={cnState(
            "group/box relative grid h-6 w-10 shrink-0 place-items-center rounded-yorha border-0 bg-transparent p-0 text-yorha-fg outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
            className,
          )}
          {...props}
          readOnly={readOnly || pending}
          aria-busy={pending || undefined}
          data-pending={pending ? "" : undefined}
          onCheckedChange={(next, details) => {
            if (!pending) onCheckedChange?.(next, details);
          }}
        >
          <span
            data-slot="switch-track"
            className={cn(
              "flex h-indicator w-10 items-center rounded-yorha border border-current bg-transparent px-[2px]",
              "transition-[color,background-color,border-color] duration-(--motion-select) ease-yorha",
              "group-data-[checked]/box:border-yorha-ink group-data-[checked]/box:bg-yorha-ink group-data-[checked]/box:text-yorha-on-ink",
              "group-focus-visible/box:yorha-focus",
              "not-group-data-[checked]/box:not-group-data-[disabled]/box:group-hover/row:bg-yorha-hover",
              "not-group-data-[checked]/box:not-group-data-[disabled]/box:group-active/row:bg-yorha-pressed group-active/row:duration-0",
              "group-data-[checked]/box:group-active/row:bg-[color-mix(in_srgb,var(--yorha-ink)_80%,var(--yorha-bg))]",
              "group-data-[disabled]/box:border-yorha-disabled group-data-[disabled]/box:group-data-[checked]/box:bg-yorha-disabled group-data-[disabled]/box:group-data-[checked]/box:text-yorha-bg",
            )}
          >
            <BaseSwitch.Thumb
              data-slot="switch-thumb"
              className={cn(
                "block size-3 rounded-yorha bg-current",
                "transition-transform duration-(--motion-select) ease-yorha",
                "data-[checked]:translate-x-[22px]",
              )}
            >
              <span
                ref={mark}
                data-slot="switch-pending-mark"
                aria-hidden="true"
                className="m-1 block size-1 bg-yorha-bg opacity-0 group-data-[checked]/box:bg-yorha-ink"
              />
            </BaseSwitch.Thumb>
          </span>
        </BaseSwitch.Root>
      </span>
      <span>{children}</span>
    </label>
  );
}

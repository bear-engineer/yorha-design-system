import * as React from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn, cnState } from "@/lib/utils";

type RootProps = React.ComponentProps<typeof BaseSlider.Root>;

export interface SliderProps extends Omit<RootProps, "children" | "aria-label"> {
  /** Visible label and accessible name of the thumb(s). */
  label: string;
  /** Show the current value as a live readout next to the label. */
  showValue?: boolean;
}

const SEGMENT = "6px";
const PITCH = "8px";

/**
 * Gauge-bar slider: segmented track, ink-filled segments up to the value and a
 * square thumb. Arrow keys step, Home/End jump to the bounds.
 */
export function Slider({ label, showValue = false, className, ...props }: SliderProps) {
  const initial = props.value ?? props.defaultValue;
  const thumbs = Array.isArray(initial) ? initial.length : 1;
  return (
    <BaseSlider.Root
      className={cnState("flex w-full flex-col gap-2 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4">
        <BaseSlider.Label className="font-yorha-medium tracking-yorha-wide uppercase">{label}</BaseSlider.Label>
        {showValue ? <BaseSlider.Value className="tabular-nums" /> : null}
      </div>
      <BaseSlider.Control className="flex h-6 w-full touch-none items-center select-none data-[disabled]:opacity-50">
        <BaseSlider.Track
          className={cn(
            "relative h-3 w-full border border-yorha-border",
            "bg-[repeating-linear-gradient(90deg,var(--yorha-border)_0_2px,transparent_2px_8px)]",
          )}
        >
          <BaseSlider.Indicator
            className="h-full"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, var(--yorha-ink) 0 ${SEGMENT}, transparent ${SEGMENT} ${PITCH})`,
            }}
          />
          {Array.from({ length: thumbs }, (_, i) => (
            <BaseSlider.Thumb
              key={i}
              index={thumbs > 1 ? i : undefined}
              aria-label={thumbs > 1 ? `${label} ${i + 1}` : label}
              className={cn(
                // 24px hit area (SC 2.5.8); the square drawn is the ::before.
                "grid size-6 min-h-[24px] min-w-[24px] place-items-center rounded-yorha",
                "before:size-4 before:rounded-yorha before:border-2 before:border-yorha-bg before:bg-yorha-ink",
                "before:outline before:outline-1 before:outline-yorha-ink before:content-['']",
                "has-[:focus-visible]:yorha-focus data-[disabled]:cursor-not-allowed",
              )}
            />
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

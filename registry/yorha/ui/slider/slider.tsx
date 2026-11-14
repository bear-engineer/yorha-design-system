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

const PITCH = 8; // px, equals --yorha-seg-pitch (yorha-segments)

/** Snaps a percentage of the track to whole segments (a fill never ends mid-segment). */
const snap = (pct: number) => `round(down, ${pct}%, var(--yorha-seg-pitch, ${PITCH}px))`;

/**
 * Gauge-bar slider: one segment grid (`yorha-segments`) for the track and the fill, so their phases match;
 * the fill snaps to whole segments. Square thumb in a 24px hit area, grab cursor. Arrow keys step, Home/End jump.
 */
export function Slider({ label, showValue = false, className, onValueChange, ...props }: SliderProps) {
  const initial = props.value ?? props.defaultValue;
  const thumbs = Array.isArray(initial) ? initial.length : 1;
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  // The fill is clamped to whole segments, so the component tracks the value itself (works controlled and uncontrolled).
  const [inner, setInner] = React.useState<number | readonly number[] | undefined>(props.defaultValue);
  const value = props.value ?? inner ?? min;
  const list = Array.isArray(value) ? (value as readonly number[]) : [value as number];
  const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
  const start = thumbs > 1 ? pct(Math.min(...list)) : 0;
  const end = pct(Math.max(...list));
  return (
    <BaseSlider.Root
      className={cnState("flex w-full flex-col gap-2 font-yorha text-yorha-base text-yorha-fg", className)}
      onValueChange={(next, details) => {
        setInner(next);
        onValueChange?.(next, details);
      }}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4">
        <BaseSlider.Label className="font-yorha-medium tracking-yorha-wide uppercase">{label}</BaseSlider.Label>
        {showValue ? <BaseSlider.Value className="yorha-tabular" /> : null}
      </div>
      <BaseSlider.Control
        data-slot="slider-control"
        className="flex h-6 w-full cursor-pointer touch-none items-center select-none data-[disabled]:cursor-not-allowed"
      >
        <BaseSlider.Track
          data-slot="slider-track"
          className="yorha-segments relative h-3 shrink-0 text-yorha-control [width:round(down,100%,var(--yorha-seg-pitch))]"
        >
          <BaseSlider.Indicator
            data-slot="slider-fill"
            className="yorha-segments h-full text-yorha-ink data-[disabled]:text-yorha-disabled"
            style={thumbs > 1 ? { insetInlineStart: snap(start), width: `round(down, ${end - start}%, ${PITCH}px)` } : { width: snap(end) }}
          />
          {Array.from({ length: thumbs }, (_, i) => (
            <BaseSlider.Thumb
              key={i}
              data-slot="slider-thumb"
              index={thumbs > 1 ? i : undefined}
              aria-label={thumbs > 1 ? `${label} ${i + 1}` : label}
              className={cn(
                // 24px hit area (SC 2.5.8); the square drawn is the ::before and carries the focus ring.
                "grid size-6 cursor-grab place-items-center rounded-yorha outline-none active:cursor-grabbing",
                "before:size-4 before:rounded-yorha before:border-2 before:border-yorha-bg before:bg-yorha-ink before:content-['']",
                "before:transition-colors before:duration-(--motion-select) hover:before:border-yorha-control active:before:border-yorha-ink",
                "has-[:focus-visible]:before:yorha-focus",
                "data-[disabled]:cursor-not-allowed data-[disabled]:before:border-yorha-bg data-[disabled]:before:bg-yorha-disabled",
              )}
            />
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

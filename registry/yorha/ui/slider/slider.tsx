import * as React from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn, cnState } from "@/lib/utils";

type RootProps = React.ComponentProps<typeof BaseSlider.Root>;

export interface SliderMark {
  value: number;
  /** Optional text under the tick (decorative: the thumb's `aria-valuetext` carries the value). */
  label?: string;
}

export interface SliderProps extends Omit<RootProps, "children" | "aria-label"> {
  /** Visible label and accessible name of the thumb(s). */
  label: string;
  /** Show the current value as a live readout next to the label. */
  showValue?: boolean;
  /** Text for a value (unit, percent...). Feeds `aria-valuetext`, the readout and the bubble. */
  formatValue?: (value: number) => string;
  /** Ticks (and optional labels) under the track, at their value on the track axis. */
  marks?: readonly SliderMark[];
}

const PITCH = 8; // px, equals --yorha-seg-pitch (yorha-segments)

/**
 * Gauge-bar slider: one segment grid (`yorha-segments`) for the track and the fill, so their phases match.
 * The fill ends at the thumb centre (a partial last segment hides under the thumb); with two thumbs the fill starts on a
 * segment boundary under the first thumb. Square thumb in a 24px hit area, grab cursor. Arrow keys step, Home/End jump.
 * A value bubble shows above the thumb while dragging and on keyboard focus (absolute overlay: nothing moves).
 * Form: `name` / `form` go to the hidden range input of each thumb (FormData); a form reset restores `defaultValue`.
 * Migration (v4): the fill no longer snaps to whole segments (it follows the thumb); new `formatValue`, `marks`.
 */
export function Slider({ label, showValue = false, formatValue, marks, className, ...props }: SliderProps) {
  const initial = props.value ?? props.defaultValue;
  const thumbs = Array.isArray(initial) ? initial.length : 1;
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
  const text = (v: number, formatted?: string) => (formatValue ? formatValue(v) : (formatted ?? String(v)));
  // Reset: Base UI keeps the value in React state, so a native form reset has to be mirrored (uncontrolled sliders only).
  const [key, setKey] = React.useState(0);
  const controlled = props.value !== undefined;
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form || controlled) return;
    const onReset = () => setKey((k) => k + 1);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [controlled]);
  return (
    <BaseSlider.Root
      key={key}
      ref={rootRef}
      className={cnState("flex w-full flex-col gap-2 font-yorha text-yorha-base text-yorha-fg", className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-4">
        <BaseSlider.Label className="font-yorha-medium tracking-yorha-wide uppercase">{label}</BaseSlider.Label>
        {showValue ? (
          <BaseSlider.Value data-slot="slider-readout" className="yorha-tabular">
            {(formatted, values) => values.map((v, i) => text(v, formatted[i])).join(" – ")}
          </BaseSlider.Value>
        ) : null}
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
          />
          {Array.from({ length: thumbs }, (_, i) => (
            <BaseSlider.Thumb
              key={i}
              data-slot="slider-thumb"
              index={thumbs > 1 ? i : undefined}
              aria-label={thumbs > 1 ? `${label} ${i + 1}` : label}
              getAriaValueText={formatValue ? (_formatted, value) => formatValue(value) : undefined}
              className={cn(
                // 24px hit area (SC 2.5.8); the square drawn is the ::before and carries the focus ring.
                "group/thumb relative grid size-6 [&_input]:appearance-none cursor-grab place-items-center rounded-yorha outline-none active:cursor-grabbing",
                "before:size-4 before:rounded-yorha before:border-2 before:border-yorha-bg before:bg-yorha-ink before:content-['']",
                "before:transition-colors before:duration-(--motion-select) hover:before:border-yorha-control active:before:border-yorha-ink",
                "has-[:focus-visible]:before:yorha-focus",
                "data-[disabled]:cursor-not-allowed data-[disabled]:before:border-yorha-bg data-[disabled]:before:bg-yorha-disabled",
              )}
            >
              <BaseSlider.Value
                data-slot="slider-bubble"
                aria-hidden="true"
                className={cn(
                  "yorha-tabular pointer-events-none absolute bottom-full left-0 mb-1 flex w-full justify-center opacity-0",
                  "transition-opacity [transition-duration:max(var(--motion-select),var(--motion-reduced-fade))] ease-yorha-out",
                  "group-data-[dragging]/thumb:opacity-100 group-has-[:focus-visible]/thumb:opacity-100",
                )}
              >
                {(formatted, values) => (
                  <span className="border border-yorha-ink bg-yorha-ink px-1 text-yorha-sm leading-5 whitespace-nowrap text-yorha-on-ink">
                    {text(values[i] ?? values[0] ?? min, formatted[i] ?? formatted[0])}
                  </span>
                )}
              </BaseSlider.Value>
            </BaseSlider.Thumb>
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
      {marks?.length ? (
        <div aria-hidden="true" className="relative -mt-1 h-6 [width:round(down,100%,var(--yorha-seg-pitch))]">
          {marks.map((m) => (
            <span
              key={m.value}
              data-slot="slider-mark"
              className="absolute top-0 flex w-0 flex-col items-center text-yorha-sm text-yorha-fg-soft"
              style={{ left: `${pct(m.value)}%` }}
            >
              <span className="block h-1 w-px bg-yorha-border" />
              {m.label ? <span className="yorha-tabular mt-px leading-4">{m.label}</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </BaseSlider.Root>
  );
}

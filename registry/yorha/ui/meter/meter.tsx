import * as React from "react";
import { Meter as BaseMeter } from "@base-ui/react/meter";
import { cn, cnState } from "@/lib/utils";

export interface MeterProps extends Omit<React.ComponentProps<typeof BaseMeter.Root>, "children" | "value"> {
  /** Current value within min..max. */
  value: number;
  /** Visible and accessible name, e.g. "HP". */
  label: string;
  /** Value at or below which the bar reads as low: hatched fill and an alert rule on the track (not only colour). */
  low?: number;
  /** Value at or below which the bar reads as critical: like `low`, in the alert colour. */
  critical?: number;
  /** `bar` (default): hatched when low. `dots`: three rows of dots in whole columns; low = every 2nd column, critical = every 3rd (alert colour). */
  variant?: "bar" | "dots";
}

/** HP-style bar on Base UI Meter: label and "value/max" text, square fill, no animation. Same height as Progress; `low`/`critical` thresholds mark the track. */
export function Meter({ value, min = 0, max = 100, label, low, critical, variant = "bar", className, ...props }: MeterProps) {
  const text = `${value}/${max}`;
  const isCritical = critical !== undefined && value <= critical;
  const isLow = isCritical || (low !== undefined && value <= low);
  const dots = variant === "dots";
  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  const pitch = isCritical ? 12 : isLow ? 8 : 4;
  // Sparse columns: the 4 px dot tile intersected with a column mask of one 2 px column per `pitch`.
  const sparse =
    pitch === 4
      ? undefined
      : {
          maskImage: `var(--yorha-dots), repeating-linear-gradient(to right, #000 0 2px, transparent 2px ${pitch}px)`,
          WebkitMaskImage: `var(--yorha-dots), repeating-linear-gradient(to right, #000 0 2px, transparent 2px ${pitch}px)`,
          maskSize: "4px 4px, auto",
          WebkitMaskSize: "4px 4px, auto",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        };
  return (
    <BaseMeter.Root
      value={value}
      min={min}
      max={max}
      getAriaValueText={() => text}
      className={cnState(cn("flex w-full flex-col gap-1 font-yorha text-yorha-fg"), className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-3">
        <BaseMeter.Label title={label} className="min-w-0 truncate text-yorha-sm uppercase tracking-yorha-wide text-yorha-fg-soft">
          {label}
        </BaseMeter.Label>
        <BaseMeter.Value className="yorha-tabular shrink-0 whitespace-nowrap text-yorha-sm text-yorha-fg">{() => text}</BaseMeter.Value>
      </div>
      <BaseMeter.Track
        data-slot="meter-track"
        data-low={isLow ? "" : undefined}
        data-critical={isCritical ? "" : undefined}
        className="group/track relative h-4 overflow-hidden rounded-yorha border border-yorha-border bg-yorha-bg data-[low]:border-yorha-alert-ui"
      >
        <BaseMeter.Indicator
          className={cn(
            dots ? "h-full bg-transparent" : "h-full bg-yorha-ink",
            !dots && "group-data-[low]/track:bg-transparent group-data-[low]/track:[background-image:repeating-linear-gradient(135deg,var(--yorha-ink)_0_4px,transparent_4px_8px)]",
            !dots && "group-data-[critical]/track:[background-image:repeating-linear-gradient(135deg,var(--yorha-alert-ui)_0_4px,transparent_4px_8px)]",
          )}
        />
        {dots ? (
          <>
            <span aria-hidden="true" data-slot="dots-ghost" className="yorha-dots absolute top-[2px] left-0 h-[10px] w-[round(down,100%,4px)] text-yorha-border" />
            <span
              aria-hidden="true"
              data-slot="dots-fill"
              data-pitch={pitch}
              className={cn("yorha-dots absolute top-[2px] left-0 h-[10px]", isCritical ? "text-yorha-alert-ui" : "text-yorha-ink")}
              style={{ width: `round(down, ${pct}%, ${pitch}px)`, ...sparse }}
            />
          </>
        ) : null}
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}

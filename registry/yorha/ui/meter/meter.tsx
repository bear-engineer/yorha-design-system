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
}

/** HP-style bar on Base UI Meter: label and "value/max" text, square fill, no animation. Same height as Progress; `low`/`critical` thresholds mark the track. */
export function Meter({ value, min = 0, max = 100, label, low, critical, className, ...props }: MeterProps) {
  const text = `${value}/${max}`;
  const isCritical = critical !== undefined && value <= critical;
  const isLow = isCritical || (low !== undefined && value <= low);
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
            "h-full bg-yorha-ink",
            "group-data-[low]/track:bg-transparent group-data-[low]/track:[background-image:repeating-linear-gradient(135deg,var(--yorha-ink)_0_4px,transparent_4px_8px)]",
            "group-data-[critical]/track:[background-image:repeating-linear-gradient(135deg,var(--yorha-alert-ui)_0_4px,transparent_4px_8px)]",
          )}
        />
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}

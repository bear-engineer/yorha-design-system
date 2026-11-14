import * as React from "react";
import { Meter as BaseMeter } from "@base-ui/react/meter";
import { cn, cnState } from "@/lib/utils";

export interface MeterProps extends Omit<React.ComponentProps<typeof BaseMeter.Root>, "children" | "value"> {
  /** Current value within min..max. */
  value: number;
  /** Visible and accessible name, e.g. "HP". */
  label: string;
}

/** HP-style bar on Base UI Meter: label and "value/max" text, square fill, no animation. */
export function Meter({ value, min = 0, max = 100, label, className, ...props }: MeterProps) {
  const text = `${value}/${max}`;
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
        <BaseMeter.Label className="text-yorha-sm uppercase tracking-yorha-wide text-yorha-fg-soft">
          {label}
        </BaseMeter.Label>
        <BaseMeter.Value className="text-yorha-sm tabular-nums text-yorha-fg">{() => text}</BaseMeter.Value>
      </div>
      <BaseMeter.Track className="relative h-3 overflow-hidden rounded-yorha border border-yorha-border bg-yorha-bg">
        <BaseMeter.Indicator className="h-full bg-yorha-ink" />
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}

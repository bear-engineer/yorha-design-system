import * as React from "react";
import { Meter as BaseMeter } from "@base-ui/react/meter";
import { cn, cnState } from "@/lib/utils";
import { Gauge, gaugeLabel, gaugeRoot, gaugeRow, gaugeValue, gaugeWidth, type GaugeSize } from "@/components/ui/progress";

export interface MeterProps extends Omit<React.ComponentProps<typeof BaseMeter.Root>, "children" | "value"> {
  /** Current value within min..max. */
  value: number;
  /** Visible and accessible name, e.g. "HP". */
  label: string;
  /** Value at or below which the track reads as low: alert frame and an tick at the threshold (not only colour). */
  low?: number;
  /** Value at or below which the track reads as critical: like `low`, plus an alert-coloured fill. */
  critical?: number;
  /** Same cell geometry as Progress. */
  size?: GaugeSize;
}

/**
 * HP-style gauge on Base UI Meter: label and "value/max", the Progress cell geometry (solid cells over hairline ticks), the
 * fill rests on a whole cell and grows with a smooth clip. `low`/`critical` mark the track with threshold ticks: 2 px marks in the cell gap at
 * the threshold, crossing the bottom frame (ink for `low`, alert for `critical`).
 */
export function Meter({ value, min = 0, max = 100, label, low, critical, size = "md", className, style, ...props }: MeterProps) {
  const text = `${value}/${max}`;
  const isCritical = critical !== undefined && value <= critical;
  const isLow = isCritical || (low !== undefined && value <= low);
  const span = max > min ? max - min : 1;
  const at = (t: number) => Math.min(100, Math.max(0, ((t - min) / span) * 100));
  const pct = max > min ? at(value) : 0;
  const notches: Array<{ at: number; tone: "ink" | "alert" }> = [];
  if (low !== undefined) notches.push({ at: at(low), tone: "ink" });
  if (critical !== undefined) notches.push({ at: at(critical), tone: "alert" });
  return (
    <BaseMeter.Root
      value={value}
      min={min}
      max={max}
      getAriaValueText={() => text}
      className={cnState(cn(gaugeRoot), className)}
      style={{ ...gaugeWidth(size), ...(style as React.CSSProperties) }}
      {...props}
    >
      <div data-slot="meter-row" className={gaugeRow}>
        <BaseMeter.Label data-slot="meter-label" title={label} className={gaugeLabel}>
          {label}
        </BaseMeter.Label>
        <BaseMeter.Value data-slot="meter-value" className={gaugeValue}>
          {() => text}
        </BaseMeter.Value>
      </div>
      <Gauge
        Track={BaseMeter.Track}
        slot="meter"
        size={size}
        pct={pct}
        tone={isCritical ? "alert" : "ink"}
        notches={notches}
        trackProps={{ "data-low": isLow ? "" : undefined, "data-critical": isCritical ? "" : undefined }}
      />
    </BaseMeter.Root>
  );
}

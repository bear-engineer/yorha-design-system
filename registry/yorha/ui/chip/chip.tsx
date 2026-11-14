import { Toggle } from "@base-ui/react/toggle";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ChipProps {
  label: string;
  /** Fill ratio 0..1 shown by the striped bar. */
  capacity?: number;
  /** Number of bar segments. Default 5. */
  segments?: number;
  /** Size text shown after the label, e.g. "64 KB". */
  sizeLabel?: string;
  /** Renders a remove button; accessible name is `<label> <removeLabel>`. */
  onRemove?: () => void;
  /** Default "제거". */
  removeLabel?: string;
  /** Turns the whole chip into a toggle button (aria-pressed). Excludes remove. */
  selectable?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  className?: string;
}

const CHIP_BASE =
  "inline-flex items-stretch gap-0 rounded-yorha border border-yorha-border bg-yorha-bg font-yorha text-yorha-sm text-yorha-fg";

function Bar({ capacity, segments, decorative }: { capacity: number; segments: number; decorative: boolean }) {
  const ratio = Math.min(1, Math.max(0, capacity));
  const filled = Math.round(ratio * segments);
  const bar = (
    <span className="flex h-full min-h-4 w-16 items-stretch border-x border-yorha-border" data-slot="bar">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("flex-1 border-r border-yorha-border last:border-r-0", i < filled ? "bg-yorha-ink" : "bg-yorha-grid")}
        />
      ))}
    </span>
  );
  if (decorative) return <span aria-hidden="true" className="flex">{bar}</span>;
  return (
    <span role="img" aria-label={`용량 ${Math.round(ratio * 100)}%`} className="flex">
      {bar}
    </span>
  );
}

function Body({ label, sizeLabel, bar }: { label: string; sizeLabel?: string; bar: ReactNode }) {
  return (
    <>
      <span className="flex items-center px-2 py-1 font-yorha-medium">
        <span>{label}</span>
        {sizeLabel ? (
          <span className="ml-2 text-yorha-fg-soft">{sizeLabel}</span>
        ) : null}
      </span>
      {bar}
    </>
  );
}

/**
 * Plugin chip: label, optional size text and a striped segment bar showing capacity.
 * Plain chips are static with an optional remove button. `selectable` turns the whole chip into a
 * Base UI toggle. Its accessible name is the visible text (label + size), per WCAG 2.5.3.
 */
export function Chip({
  label,
  capacity = 0,
  segments = 5,
  sizeLabel,
  onRemove,
  removeLabel = "제거",
  selectable = false,
  pressed,
  defaultPressed,
  onPressedChange,
  className,
}: ChipProps) {
  if (selectable) {
    return (
      <Toggle
        pressed={pressed}
        defaultPressed={defaultPressed}
        onPressedChange={(next) => onPressedChange?.(next)}
        className={cn(
          CHIP_BASE,
          "cursor-pointer focus-visible:yorha-focus data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          className,
        )}
      >
        <Body
          label={label}
          sizeLabel={sizeLabel}
          bar={<Bar capacity={capacity} segments={segments} decorative />}
        />
      </Toggle>
    );
  }

  return (
    <span className={cn(CHIP_BASE, className)} data-slot="chip">
      <Body label={label} sizeLabel={sizeLabel} bar={<Bar capacity={capacity} segments={segments} decorative={false} />} />
      {onRemove ? (
        <button
          type="button"
          aria-label={`${label} ${removeLabel}`}
          onClick={onRemove}
          className="inline-flex w-8 items-center justify-center border-l border-yorha-border text-yorha-fg focus-visible:yorha-focus"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </span>
  );
}

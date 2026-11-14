import { Toggle } from "@base-ui/react/toggle";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CrossIcon } from "@/components/ui/icons";

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
  "inline-flex h-control-sm max-w-full items-stretch gap-0 rounded-yorha border border-yorha-border bg-yorha-bg font-yorha text-yorha-sm text-yorha-fg";

function Bar({ capacity, segments, decorative }: { capacity: number; segments: number; decorative: boolean }) {
  const ratio = Math.min(1, Math.max(0, capacity));
  const filled = Math.round(ratio * segments);
  const bar = (
    <span className="flex h-full w-16 shrink-0 items-stretch border-l border-yorha-border" data-slot="bar">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("flex-1 border-r border-yorha-border last:border-r-0", i < filled ? "bg-yorha-ink" : "bg-yorha-grid")}
        />
      ))}
    </span>
  );
  if (decorative) return <span aria-hidden="true" className="flex shrink-0">{bar}</span>;
  return (
    <span role="img" aria-label={`용량 ${Math.round(ratio * 100)}%`} className="flex shrink-0">
      {bar}
    </span>
  );
}

function Body({ label, sizeLabel, bar }: { label: string; sizeLabel?: string; bar: ReactNode }) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2 px-2 font-yorha-medium">
        <span data-slot="chip-label" title={label} className="min-w-0 truncate whitespace-nowrap">{label}</span>
        {sizeLabel ? <span className="shrink-0 whitespace-nowrap text-yorha-fg-soft">{sizeLabel}</span> : null}
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
        data-slot="chip"
        className={cn(
          CHIP_BASE,
          "cursor-pointer transition-[color,background-color] duration-(--motion-select) ease-yorha yorha-tint focus-visible:yorha-focus",
          "data-[pressed]:border-yorha-ink data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
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
          className="-my-px grid w-8 shrink-0 place-items-center border-l border-yorha-border text-yorha-fg yorha-tint focus-visible:yorha-focus-inset"
        >
          <CrossIcon />
        </button>
      ) : null}
    </span>
  );
}

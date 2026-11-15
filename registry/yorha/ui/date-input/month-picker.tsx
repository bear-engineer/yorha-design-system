import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { ChevronIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { PickerFooter } from "./time-picker";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
/** `2026-11` to an absolute month index (year * 12 + month), or null. */
export function parseMonth(text: string | undefined): number | null {
  const m = /^(\d{4,})-(\d{2})$/.exec(text ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}
export const formatMonth = (index: number) => `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;

export interface MonthPickerProps {
  /** `YYYY-MM`, or empty. */
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  /** "This month" for the marker and the footer. Defaults to the current date. */
  today?: Date;
  /** Footer `이번 달`: called with the current month (`YYYY-MM`) when it is enabled. Default: shows its year. */
  onToday?: (value: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
  labels?: { previousYear: string; nextYear: string; today: string; clear: string };
  className?: string;
}

const MONTH_BUTTON = cn(
  "yorha-tint yorha-tabular relative isolate block size-full cursor-pointer select-none rounded-none p-0 font-yorha text-yorha-sm text-yorha-fg",
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:origin-left before:bg-yorha-ink before:opacity-0",
  "before:scale-x-[calc(1-var(--motion-spatial))]",
  "before:transition-[scale,opacity] before:duration-[max(var(--motion-select),var(--motion-reduced-fade))] before:ease-yorha-out",
  "data-[selected]:text-yorha-on-ink data-[selected]:before:scale-x-100 data-[selected]:before:opacity-100",
  "data-[today]:font-yorha-bold data-[today]:text-yorha-fg-strong data-[today]:data-[selected]:text-yorha-on-ink",
  "data-[today]:after:pointer-events-none data-[today]:after:absolute data-[today]:after:bottom-[8px] data-[today]:after:left-1/2 data-[today]:after:h-0.5 data-[today]:after:w-3 data-[today]:after:-translate-x-1/2 data-[today]:after:bg-current",
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled data-[disabled]:line-through",
  "focus-visible:yorha-focus focus-visible:z-10",
  "forced-colors:data-[selected]:before:bg-[Highlight] forced-colors:data-[selected]:text-[HighlightText] forced-colors:data-[selected]:[forced-color-adjust:none]",
  "forced-colors:data-[today]:after:bg-[CanvasText] forced-colors:data-[disabled]:text-[GrayText]",
);

/**
 * Year header with previous/next year buttons and a 3 x 4 grid of months (1월..12월), same vocabulary as the Calendar:
 * ink block selection, 12 x 2 today bar. Roving focus: Arrow = month / row, Home/End = row ends, PageUp/PageDown =
 * year. Months outside min/max are disabled; the year buttons stop at the last year that has an enabled month.
 */
export function MonthPicker({ value, onValueChange, min, max, today, onToday, onClear, autoFocus, labels, className }: MonthPickerProps) {
  const text = { previousYear: "이전 해", nextYear: "다음 해", today: "이번 달", clear: "지우기", ...labels };
  const now = today ?? new Date();
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const selected = parseMonth(value);
  const lo = parseMonth(min);
  const hi = parseMonth(max);
  const [year, setYear] = React.useState(Math.floor((selected ?? nowIndex) / 12));
  const [focusIdx, setFocusIdx] = React.useState<number>(selected ?? nowIndex);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const pendingFocus = React.useRef(false);
  const disabledAt = (i: number) => (lo !== null && i < lo) || (hi !== null && i > hi);

  // the roving month: the focus target if it is in the shown year, else the selected / current / first enabled one
  const inYear = (i: number | null) => (i !== null && Math.floor(i / 12) === year && !disabledAt(i) ? i : null);
  const roving =
    inYear(focusIdx) ??
    inYear(selected) ??
    inYear(nowIndex) ??
    Array.from({ length: 12 }, (_, m) => year * 12 + m).find((i) => !disabledAt(i)) ??
    year * 12;

  React.useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[data-month="${formatMonth(roving)}"]`)?.focus();
  });
  React.useEffect(() => {
    if (autoFocus) rootRef.current?.querySelector<HTMLElement>("[data-slot=month-picker-month][tabindex='0']")?.focus();
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveTo = (target: number) => {
    if (disabledAt(target)) return;
    setYear(Math.floor(target / 12));
    setFocusIdx(target);
    pendingFocus.current = true;
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const here = parseMonth((event.target as HTMLElement).closest<HTMLElement>("[data-month]")?.dataset.month);
    if (here === null) return;
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 };
    let target: number | undefined = delta[event.key] === undefined ? undefined : here + delta[event.key]!;
    if (event.key === "Home") target = here - (here % 3);
    if (event.key === "End") target = here - (here % 3) + 2;
    if (target === undefined) return;
    event.preventDefault();
    moveTo(target);
  };

  const canPrev = lo === null || Math.floor(lo / 12) < year;
  const canNext = hi === null || Math.floor(hi / 12) > year;
  const go = (n: number) => {
    setYear(year + n);
    setFocusIdx(roving + n * 12);
  };

  return (
    <div
      ref={rootRef}
      data-slot="month-picker"
      lang="ko"
      className={cn("block w-[calc(7*var(--yorha-control-sm)+16px)] max-w-full bg-yorha-panel p-2 font-yorha text-yorha-fg", className)}
    >
      <div className="grid h-control-sm grid-cols-[1fr_auto_auto] items-center">
        <div data-slot="month-picker-year" aria-live="polite" className="truncate font-yorha-bold text-yorha-base yorha-tabular text-yorha-fg-strong">
          {year}
        </div>
        <button
          type="button"
          aria-label={text.previousYear}
          disabled={!canPrev}
          onClick={() => go(-1)}
          className={buttonVariants({ variant: "ghost", size: "sm", square: true })}
        >
          <ChevronIcon dir="left" size={16} />
        </button>
        <button
          type="button"
          aria-label={text.nextYear}
          disabled={!canNext}
          onClick={() => go(1)}
          className={buttonVariants({ variant: "ghost", size: "sm", square: true })}
        >
          <ChevronIcon dir="right" size={16} />
        </button>
      </div>
      <div role="grid" aria-label={`${year}년`} onKeyDown={onKeyDown} className="mt-1 border-t border-yorha-separator pt-1">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} role="row" className="grid grid-cols-3">
            {[0, 1, 2].map((col) => {
              const m = row * 3 + col;
              const index = year * 12 + m;
              const isSelected = index === selected;
              const disabled = disabledAt(index);
              return (
                <div key={m} role="gridcell" aria-selected={isSelected} className="h-[calc(var(--yorha-control-sm)*1.5)] p-0">
                  <button
                    type="button"
                    data-slot="month-picker-month"
                    data-month={formatMonth(index)}
                    aria-disabled={disabled || undefined}
                    data-disabled={disabled ? "" : undefined}
                    data-selected={isSelected ? "" : undefined}
                    data-today={index === nowIndex ? "" : undefined}
                    aria-current={index === nowIndex ? "date" : undefined}
                    tabIndex={index === roving ? 0 : -1}
                    onFocus={() => {
                      if (!disabled) setFocusIdx(index);
                    }}
                    onClick={() => {
                      if (disabled) return;
                      setFocusIdx(index);
                      onValueChange(formatMonth(index));
                    }}
                    className={MONTH_BUTTON}
                  >
                    {m + 1}월
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <PickerFooter
        now={{
          label: text.today,
          onClick: () => {
            if (onToday && !disabledAt(nowIndex)) onToday(formatMonth(nowIndex));
            else if (!onToday) moveTo(nowIndex);
          },
        }}
        clear={onClear ? { label: text.clear, onClick: onClear } : undefined}
      />
    </div>
  );
}

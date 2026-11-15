import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

export interface TimeParts {
  h: number;
  m: number;
  s: number;
}
/** `HH:MM` or `HH:MM:SS` to parts, or null. */
export function parseTime(text: string | undefined): TimeParts | null {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/.exec(text ?? "");
  if (!m) return null;
  const parts = { h: Number(m[1]), m: Number(m[2]), s: Number(m[3] ?? 0) };
  return parts.h < 24 && parts.m < 60 && parts.s < 60 ? parts : null;
}
/** Parts to the native value format: `HH:MM`, or `HH:MM:SS` when seconds are shown. */
export function formatTime({ h, m, s }: TimeParts, seconds: boolean): string {
  return `${pad(h)}:${pad(m)}${seconds ? `:${pad(s)}` : ""}`;
}
const toSeconds = (t: TimeParts | null) => (t ? t.h * 3600 + t.m * 60 + t.s : null);

/** Step (native, seconds) to the options of each column. Step 60 (default) is every minute, below 60 adds seconds. */
export function timeSteps(step: number | undefined) {
  const seconds = step !== undefined && step < 60;
  const stepS = seconds ? Math.max(1, Math.round(step)) : 1;
  const stepM = !seconds && step !== undefined && step >= 60 ? Math.max(1, Math.round(step / 60)) : 1;
  const stepH = !seconds && step !== undefined && step >= 3600 ? Math.max(1, Math.round(step / 3600)) : 1;
  const range = (n: number, by: number) => Array.from({ length: Math.ceil(n / by) }, (_, i) => i * by);
  return { seconds, hours: range(24, stepH), minutes: range(60, stepM), secs: range(60, stepS) };
}

export interface PickerFooterProps {
  /** Left action, e.g. `지금`, `이번 달`. */
  now?: { label: string; onClick: () => void };
  clear?: { label?: string; onClick: () => void };
  confirm?: { label?: string; onClick: () => void };
}
/** Footer of the date-input pickers: the same row as the Calendar footer. */
export function PickerFooter({ now, clear, confirm }: PickerFooterProps) {
  return (
    <div
      data-slot="picker-footer"
      className="flex h-[calc(var(--yorha-control-sm)+1px)] items-center justify-between border-t border-yorha-separator bg-yorha-panel"
    >
      {now ? (
        <button type="button" onClick={now.onClick} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {now.label}
        </button>
      ) : (
        <span />
      )}
      <span className="flex items-center">
        {clear ? (
          <button type="button" onClick={clear.onClick} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {clear.label ?? "지우기"}
          </button>
        ) : null}
        {confirm ? (
          <button type="button" onClick={confirm.onClick} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {confirm.label ?? "확인"}
          </button>
        ) : null}
      </span>
    </div>
  );
}

export interface TimePickerProps {
  /** `HH:MM` or `HH:MM:SS`; empty selects nothing. Controlled draft: the parent commits it. */
  value: string;
  /** Called on every pick or arrow move with the new draft value. */
  onValueChange: (value: string) => void;
  /** Enter inside a column. */
  onCommit?: () => void;
  /** Native step in seconds: 60 (default) = every minute, < 60 adds a seconds column. */
  step?: number;
  min?: string;
  max?: string;
  /** Focus the roving option of the hour column on mount (popups). */
  autoFocus?: boolean;
  labels?: { hour: string; minute: string; second: string };
  className?: string;
  /** Extra classes of the listboxes, e.g. a shorter height when stacked under a calendar. */
  listClassName?: string;
}

type Column = { key: "h" | "m" | "s"; label: string; options: number[]; current: number | undefined; disabled: (n: number) => boolean };

const OPTION = cn(
  "yorha-tint yorha-tabular relative isolate block h-[var(--yorha-control-sm)] w-full shrink-0 cursor-pointer select-none rounded-none p-0 text-center font-yorha text-yorha-sm leading-[var(--yorha-control-sm)] text-yorha-fg",
  "data-[selected]:bg-yorha-ink data-[selected]:text-yorha-on-ink",
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled data-[disabled]:line-through",
  "focus-visible:yorha-focus-inset focus-visible:z-10 outline-none",
  "forced-colors:data-[selected]:bg-[Highlight] forced-colors:data-[selected]:text-[HighlightText] forced-colors:data-[selected]:[forced-color-adjust:none] forced-colors:data-[disabled]:text-[GrayText]",
);

/**
 * Hour / minute (/ second) listbox columns of fixed height with inner scroll. Roving focus: one tab stop per column
 * (the selected option), ArrowUp/Down move and select inside a column, ArrowLeft/Right jump between columns, Home/End
 * go to the ends, Enter commits. The selected option is centred by setting the column's own scrollTop, so neither the
 * popup nor the page ever moves. Disabled options (min/max) are skipped and cannot be picked.
 */
export function TimePicker({ value, onValueChange, onCommit, step, min, max, autoFocus, labels, className, listClassName }: TimePickerProps) {
  const text = { hour: "시", minute: "분", second: "초", ...labels };
  const { seconds, hours, minutes, secs } = timeSteps(step);
  const parts = parseTime(value);
  const minS = toSeconds(parseTime(min));
  const maxS = toSeconds(parseTime(max));
  const bounded = minS !== null && maxS !== null ? minS <= maxS : true;
  const lo = bounded ? minS : null;
  const hi = bounded ? maxS : null;
  const rootRef = React.useRef<HTMLDivElement>(null);

  const hourDisabled = (h: number) => (hi !== null && h * 3600 > hi) || (lo !== null && h * 3600 + 3599 < lo);
  const minuteDisabled = (m: number) => {
    const base = (parts?.h ?? 0) * 3600 + m * 60;
    return (hi !== null && base > hi) || (lo !== null && base + 59 < lo);
  };
  const secondDisabled = (s: number) => {
    const t = (parts?.h ?? 0) * 3600 + (parts?.m ?? 0) * 60 + s;
    return (hi !== null && t > hi) || (lo !== null && t < lo);
  };

  const columns: Column[] = [
    { key: "h", label: text.hour, options: hours, current: parts?.h, disabled: hourDisabled },
    { key: "m", label: text.minute, options: minutes, current: parts?.m, disabled: minuteDisabled },
    ...(seconds ? [{ key: "s" as const, label: text.second, options: secs, current: parts?.s, disabled: secondDisabled }] : []),
  ];

  const pick = (key: "h" | "m" | "s", n: number) => {
    const next: TimeParts = { h: parts?.h ?? 0, m: parts?.m ?? 0, s: parts?.s ?? 0, [key]: n };
    onValueChange(formatTime(next, seconds));
  };

  // centre the selected option inside its own column (never scrollIntoView: it would move the popup and the page)
  const centre = (list: HTMLElement, option: HTMLElement | null) => {
    if (!option) return;
    list.scrollTop = option.offsetTop - (list.clientHeight - option.offsetHeight) / 2;
  };
  React.useLayoutEffect(() => {
    for (const list of rootRef.current?.querySelectorAll<HTMLElement>("[role=listbox]") ?? []) {
      centre(list, list.querySelector<HTMLElement>("[aria-selected=true]"));
    }
  }, [value]);
  React.useEffect(() => {
    if (autoFocus) rootRef.current?.querySelector<HTMLElement>("[role=option][tabindex='0']")?.focus({ preventScroll: true });
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusOption = (list: HTMLElement | null, option: HTMLElement | null) => {
    if (!list || !option) return;
    option.focus({ preventScroll: true });
    const top = option.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + option.offsetHeight - list.clientHeight;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, ci: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const list = event.currentTarget;
    const col = columns[ci]!;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[role=option]");
    if (!target) return;
    const here = Number(target.dataset.value);
    const enabled = col.options.filter((n) => !col.disabled(n));
    let next: number | undefined;
    switch (event.key) {
      case "ArrowDown":
        next = enabled.find((n) => n > here);
        break;
      case "ArrowUp":
        next = [...enabled].reverse().find((n) => n < here);
        break;
      case "Home":
        next = enabled[0];
        break;
      case "End":
        next = enabled[enabled.length - 1];
        break;
      case "ArrowLeft":
      case "ArrowRight": {
        event.preventDefault();
        const other = rootRef.current?.querySelectorAll<HTMLElement>("[role=listbox]")[ci + (event.key === "ArrowRight" ? 1 : -1)];
        focusOption(other ?? null, other?.querySelector<HTMLElement>("[role=option][tabindex='0']") ?? null);
        return;
      }
      case "Enter":
        event.preventDefault();
        if (!col.disabled(here)) pick(col.key, here);
        onCommit?.();
        return;
      case " ":
        event.preventDefault();
        if (!col.disabled(here)) pick(col.key, here);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next === undefined) return;
    pick(col.key, next);
    focusOption(list, list.querySelector<HTMLElement>(`[data-value="${next}"]`));
  };

  return (
    <div ref={rootRef} data-slot="time-picker" lang="ko" className={cn("flex w-full flex-col bg-yorha-panel p-2 font-yorha text-yorha-fg", className)}>
      <div className="flex">
        {columns.map((c, ci) => (
          <div key={c.key} className={cn("flex min-w-13 flex-1 flex-col", ci > 0 && "ml-1 border-l border-yorha-separator pl-1")}>
            <div className="grid h-control-sm place-items-center font-yorha-bold text-yorha-sm text-yorha-fg-strong">{c.label}</div>
            <div
              role="listbox"
              aria-label={c.label}
              onKeyDown={(e) => onKeyDown(e, ci)}
              className={cn("relative h-[calc(var(--yorha-control-sm)*6+24px)] overflow-y-auto overscroll-contain border-t border-yorha-separator [scrollbar-gutter:stable] [scrollbar-width:thin]", listClassName)}
            >
              {c.options.map((n) => {
                const selected = c.current === n;
                const disabled = c.disabled(n);
                const rovingTarget = c.current !== undefined && c.options.includes(c.current) ? selected : n === c.options.find((o) => !c.disabled(o));
                return (
                  <div
                    key={n}
                    role="option"
                    data-slot="time-picker-option"
                    data-value={n}
                    aria-selected={selected}
                    aria-disabled={disabled || undefined}
                    data-selected={selected ? "" : undefined}
                    data-disabled={disabled ? "" : undefined}
                    tabIndex={rovingTarget ? 0 : -1}
                    onClick={(e) => {
                      if (disabled) return;
                      pick(c.key, n);
                      e.currentTarget.focus({ preventScroll: true });
                    }}
                    className={OPTION}
                  >
                    {pad(n)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------- date helpers (local time, Date + Intl only) ---------- */

/** Local midnight of the given date. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
/** Same day-of-month in the target month, clamped to that month's last day. */
export function addMonths(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), last));
}
export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** `YYYY-MM-DD` in local time. Also used as the `data-date` attribute. */
export function toDateKey(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}
function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** First weekday of the locale as a JS weekday (0 = Sunday ... 6 = Saturday). Falls back to Monday. */
export function getWeekStart(locale: string): number {
  try {
    const l = new Intl.Locale(locale) as unknown as {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = l.getWeekInfo?.() ?? l.weekInfo;
    if (info && typeof info.firstDay === "number") return info.firstDay % 7;
  } catch {
    /* unknown locale: use the fallback */
  }
  return 1;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface CalendarDayState {
  selected: boolean;
  today: boolean;
  disabled: boolean;
  inRange: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
}

export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
}
const DEFAULT_LABELS: CalendarLabels = { previousMonth: "이전 달", nextMonth: "다음 달" };

interface CalendarCommonProps {
  /** Visible (first) month, controlled. */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  /** Return true to make a day unselectable. Arrow keys skip such days. */
  isDateDisabled?: (date: Date) => boolean;
  /** Consecutive months shown side by side. Default 1. */
  numberOfMonths?: number;
  /** BCP 47 locale for month/weekday names and week start. Default `ko-KR`. */
  locale?: string;
  /** Override the locale week start (0 = Sunday ... 6 = Saturday). */
  weekStartsOn?: number;
  /** Slot rendered under the day number, e.g. event dots. */
  renderDay?: (date: Date, state: CalendarDayState) => React.ReactNode;
  /** Visually hidden text appended to a day's accessible name, e.g. `일정 2건`. */
  getDayLabelSuffix?: (date: Date) => string | undefined;
  /** "Today" for the outline and the first focus. Defaults to the current date. */
  today?: Date;
  /** Move focus to the roving day on mount (used by popups). */
  autoFocus?: boolean;
  labels?: Partial<CalendarLabels>;
  className?: string;
  "aria-label"?: string;
}
export interface CalendarSingleProps extends CalendarCommonProps {
  mode?: "single";
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (value: Date | null) => void;
}
export interface CalendarRangeProps extends CalendarCommonProps {
  mode: "range";
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange) => void;
}
export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : inner;
  const set = React.useCallback(
    (next: T) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

const EMPTY_RANGE: DateRange = { from: null, to: null };

const NAV_BUTTON = cn(
  "yorha-press grid size-8 shrink-0 cursor-pointer place-items-center rounded-yorha border border-yorha-border bg-yorha-panel text-yorha-fg",
  "focus-visible:yorha-focus disabled:cursor-not-allowed disabled:opacity-40",
);

const DAY_CELL = cn(
  "yorha-tabular relative isolate grid size-10 cursor-pointer select-none place-items-center font-yorha text-yorha-sm text-yorha-fg",
  "transition-colors duration-(--motion-press) ease-yorha",
  // dark wipe: a pseudo element that scales in from the left (opacity-only when motion is reduced)
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:origin-left before:bg-yorha-control before:opacity-0",
  "before:scale-x-[calc(1-var(--motion-spatial))]",
  "before:transition-[scale,opacity] before:duration-[max(var(--motion-tab-indicator),var(--motion-reduced-fade))] before:ease-yorha-emphasized",
  "data-[selected]:text-yorha-on-control data-[selected]:before:scale-x-100 data-[selected]:before:opacity-100",
  // today: square outline inset from the edge
  "data-[today]:after:pointer-events-none data-[today]:after:absolute data-[today]:after:inset-1 data-[today]:after:border data-[today]:after:border-yorha-fg-strong",
  "data-[today]:data-[selected]:after:border-yorha-on-control",
  "data-[in-range]:bg-yorha-ink/10",
  "not-data-[disabled]:not-data-[selected]:hover:bg-yorha-ink/10",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
  "focus-visible:yorha-focus",
);

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={dir === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
    </svg>
  );
}

/** Slides the month body in from the travel direction; reduced = opacity fade, off = instant. */
function MonthSlide({ monthKey, dir, children }: { monthKey: number; dir: number; children: React.ReactNode }) {
  const [entering, setEntering] = React.useState(false);
  const prev = React.useRef(monthKey);
  React.useLayoutEffect(() => {
    if (prev.current === monthKey) return;
    prev.current = monthKey;
    if (dir === 0) return;
    setEntering(true);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntering(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [monthKey, dir]);
  return (
    <div
      data-slot="calendar-month-body"
      data-entering={entering ? "" : undefined}
      style={{ "--yorha-cal-dir": dir } as React.CSSProperties}
      className={cn(
        "flex flex-wrap gap-6",
        "transition-[translate,opacity] duration-[max(var(--motion-route),var(--motion-reduced-fade))] ease-yorha-decelerate",
        "data-[entering]:translate-x-[calc(var(--yorha-cal-dir)*var(--motion-spatial)*var(--motion-shift)*3)] data-[entering]:opacity-0 data-[entering]:transition-none",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Month grid following the WAI-ARIA date grid pattern. No dependencies: Date + Intl only.
 * Keys: Arrow = day/week, PageUp/PageDown = month, Shift+PageUp/PageDown = year, Home/End = week start/end,
 * Enter/Space = select. Single and range selection, controlled or uncontrolled.
 */
export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(function Calendar(props, ref) {
  const {
    month: monthProp,
    defaultMonth,
    onMonthChange,
    minDate,
    maxDate,
    isDateDisabled,
    numberOfMonths = 1,
    locale = "ko-KR",
    weekStartsOn,
    renderDay,
    getDayLabelSuffix,
    autoFocus,
    className,
  } = props;
  const isRange = props.mode === "range";
  const labels = { ...DEFAULT_LABELS, ...props.labels };
  const today = React.useMemo(() => startOfDay(props.today ?? new Date()), [props.today]);
  const min = minDate ? startOfDay(minDate) : undefined;
  const max = maxDate ? startOfDay(maxDate) : undefined;
  const count = Math.max(1, Math.floor(numberOfMonths));
  const weekStart = weekStartsOn ?? getWeekStart(locale);
  const baseId = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const setRefs = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // selection (single or range share one controllable slot)
  const [selection, setSelection] = useControllable<Date | null | DateRange>(
    props.value as Date | null | DateRange | undefined,
    (props.defaultValue ?? (isRange ? EMPTY_RANGE : null)) as Date | null | DateRange,
    props.onValueChange as ((v: Date | null | DateRange) => void) | undefined,
  );
  const range: DateRange = isRange ? ((selection as DateRange | null) ?? EMPTY_RANGE) : EMPTY_RANGE;
  const single = isRange ? null : (selection as Date | null);

  const disabledAt = React.useCallback(
    (d: Date) => (min && d < min) || (max && d > max) || !!isDateDisabled?.(d),
    [min, max, isDateDisabled],
  );

  // visible month
  const initialMonth = startOfMonth(defaultMonth ?? single ?? range.from ?? today);
  const [month, setMonthValue] = useControllable<Date>(
    monthProp ? startOfMonth(monthProp) : undefined,
    initialMonth,
    onMonthChange,
  );
  const [dir, setDir] = React.useState(0);
  const setMonth = (next: Date) => {
    const n = startOfMonth(next);
    const delta = monthIndex(n) - monthIndex(month);
    if (delta === 0) return;
    setDir(Math.sign(delta));
    setMonthValue(n);
  };
  const firstIdx = monthIndex(month);
  const lastIdx = firstIdx + count - 1;
  const visible = (d: Date) => monthIndex(d) >= firstIdx && monthIndex(d) <= lastIdx;

  // roving focus target
  const [focusedState, setFocusedState] = React.useState<Date>(() => single ?? range.from ?? today);
  const findEnabled = (from: Date, step: (d: Date) => Date): Date | null => {
    let d = from;
    for (let i = 0; i < 400; i++) {
      d = step(d);
      if ((min && d < min && step(d) < d) || (max && d > max && step(d) > d)) return null;
      if (!disabledAt(d)) return d;
    }
    return null;
  };
  const roving = React.useMemo(() => {
    if (visible(focusedState) && !disabledAt(focusedState)) return focusedState;
    const first = startOfMonth(month);
    if (!disabledAt(first)) return first;
    // nearest enabled day inside the visible months
    const end = new Date(month.getFullYear(), month.getMonth() + count, 0);
    for (let d = first; d <= end; d = addDays(d, 1)) if (!disabledAt(d)) return d;
    return first;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedState, month, count, disabledAt]);

  const pendingFocus = React.useRef(false);
  React.useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[data-date="${toDateKey(roving)}"]`)?.focus();
  });
  React.useEffect(() => {
    if (autoFocus) rootRef.current?.querySelector<HTMLElement>("[data-slot=calendar-day][tabindex='0']")?.focus();
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveTo = (target: Date) => {
    if (!visible(target)) {
      setMonth(monthIndex(target) < firstIdx ? target : new Date(target.getFullYear(), target.getMonth() - (count - 1), 1));
    }
    setFocusedState(target);
    pendingFocus.current = true;
  };

  const select = (d: Date) => {
    if (disabledAt(d)) return;
    if (!isRange) {
      setSelection(d);
      return;
    }
    const { from, to } = range;
    if (!from || to) setSelection({ from: d, to: null });
    else if (d < from) setSelection({ from: d, to: from });
    else setSelection({ from, to: d });
  };

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-date]");
    if (!cell || event.altKey || event.ctrlKey || event.metaKey) return;
    const current = fromDateKey(cell.dataset.date as string);
    let target: Date | null | undefined;
    const days = (n: number) => findEnabled(current, (d) => addDays(d, n));
    const months = (n: number) => {
      const t = addMonths(current, n);
      return disabledAt(t) ? findEnabled(t, (d) => addDays(d, Math.sign(n))) : t;
    };
    const rel = (weekday: number) => {
      const offset = (current.getDay() - weekStart + 7) % 7;
      const edge = addDays(current, weekday === 0 ? -offset : 6 - offset);
      if (!disabledAt(edge)) return edge;
      return findEnabled(edge, (d) => addDays(d, weekday === 0 ? 1 : -1));
    };
    switch (event.key) {
      case "ArrowLeft":
        target = days(-1);
        break;
      case "ArrowRight":
        target = days(1);
        break;
      case "ArrowUp":
        target = days(-7);
        break;
      case "ArrowDown":
        target = days(7);
        break;
      case "PageUp":
        target = months(event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        target = months(event.shiftKey ? 12 : 1);
        break;
      case "Home":
        target = rel(0);
        break;
      case "End":
        target = rel(6);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        select(current);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (target) moveTo(target);
  };

  const monthNames = React.useMemo(() => new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }), [locale]);
  const weekdayShort = React.useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);
  const weekdayLong = React.useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "long" }), [locale]);
  // 2023-01-01 is a Sunday
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2023, 0, 1 + ((weekStart + i) % 7));
    return { short: weekdayShort.format(date), long: weekdayLong.format(date) };
  });

  const canPrev = !min || monthIndex(min) < firstIdx;
  const canNext = !max || monthIndex(max) > lastIdx;
  const shift = (n: number) => {
    setFocusedState(addMonths(roving, n));
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  };

  const renderMonth = (offset: number) => {
    const first = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() - weekStart + 7) % 7;
    const cells: (Date | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
    ];
    while (cells.length % 7) cells.push(null);
    const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
    const titleId = `${baseId}-title-${offset}`;
    return (
      <div key={offset} data-slot="calendar-month" className="flex flex-col gap-2">
        <div className="flex h-8 items-center justify-between gap-2">
          {offset === 0 ? (
            <button
              type="button"
              data-slot="calendar-prev"
              aria-label={labels.previousMonth}
              disabled={!canPrev}
              onClick={() => shift(-1)}
              className={NAV_BUTTON}
            >
              <Chevron dir="left" />
            </button>
          ) : (
            <span className="size-8" aria-hidden="true" />
          )}
          <div
            id={titleId}
            aria-live="polite"
            className="font-yorha-bold text-yorha-sm tracking-yorha-heading text-yorha-fg-strong uppercase"
          >
            {monthNames.format(first)}
          </div>
          {offset === count - 1 ? (
            <button
              type="button"
              data-slot="calendar-next"
              aria-label={labels.nextMonth}
              disabled={!canNext}
              onClick={() => shift(1)}
              className={NAV_BUTTON}
            >
              <Chevron dir="right" />
            </button>
          ) : (
            <span className="size-8" aria-hidden="true" />
          )}
        </div>
        <table role="grid" aria-labelledby={titleId} onKeyDown={onGridKeyDown} className="border-separate border-spacing-0">
          <thead>
            <tr>
              {weekdays.map((w) => (
                <th
                  key={w.long}
                  scope="col"
                  abbr={w.long}
                  className="size-10 font-yorha-medium text-yorha-xs tracking-yorha-wide text-yorha-fg-soft"
                >
                  {w.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((date, di) => {
                  if (!date) return <td key={di} role="presentation" className="size-10 p-0" />;
                  const disabled = !!disabledAt(date);
                  const isStart = isRange ? isSameDay(date, range.from) : false;
                  const isEnd = isRange ? isSameDay(date, range.to) : false;
                  const inRange = isRange && !!range.from && !!range.to && date > range.from && date < range.to;
                  const selected = isRange ? isStart || isEnd || inRange : isSameDay(date, single);
                  const isToday = isSameDay(date, today);
                  const state: CalendarDayState = {
                    selected,
                    today: isToday,
                    disabled,
                    inRange,
                    rangeStart: isStart,
                    rangeEnd: isEnd,
                  };
                  const suffix = getDayLabelSuffix?.(date);
                  const isRoving = isSameDay(date, roving);
                  return (
                    <td
                      key={di}
                      role="gridcell"
                      data-slot="calendar-day"
                      data-date={toDateKey(date)}
                      aria-selected={selected}
                      aria-current={isToday ? "date" : undefined}
                      aria-disabled={disabled || undefined}
                      tabIndex={isRoving ? 0 : -1}
                      data-selected={selected && !inRange ? "" : undefined}
                      data-in-range={inRange ? "" : undefined}
                      data-range-start={isStart ? "" : undefined}
                      data-range-end={isEnd ? "" : undefined}
                      data-today={isToday ? "" : undefined}
                      data-disabled={disabled ? "" : undefined}
                      onClick={() => {
                        if (disabled) return;
                        setFocusedState(date);
                        select(date);
                      }}
                      onFocus={() => {
                        if (!disabled) setFocusedState(date);
                      }}
                      className={cn(DAY_CELL, "p-0")}
                    >
                      <span>{date.getDate()}</span>
                      {suffix ? <span className="sr-only">{`, ${suffix}`}</span> : null}
                      {renderDay ? (
                        <span aria-hidden="true" className="absolute inset-x-0 bottom-1 flex justify-center gap-px">
                          {renderDay(date, state)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      ref={setRefs}
      data-slot="calendar"
      data-mode={isRange ? "range" : "single"}
      lang={locale}
      aria-label={props["aria-label"]}
      className={cn("inline-block bg-yorha-panel p-2 text-yorha-fg", className)}
    >
      <MonthSlide monthKey={firstIdx} dir={dir}>
        {Array.from({ length: count }, (_, i) => renderMonth(i))}
      </MonthSlide>
    </div>
  );
});

import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import { ChevronIcon } from "@/components/ui/icons";
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

/** Monday of the ISO week that contains the date. */
export function startOfIsoWeek(date: Date): Date {
  return addDays(startOfDay(date), -((date.getDay() + 6) % 7));
}
/** ISO 8601 week-year and week number (weeks start on Monday, week 1 holds the first Thursday). */
export function getIsoWeek(date: Date): { year: number; week: number } {
  const thursday = addDays(startOfIsoWeek(date), 3);
  const jan1 = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - jan1.getTime()) / 86400000 / 7) + 1;
  return { year: thursday.getFullYear(), week };
}
/** `2026-W46`, the value format of `<input type="week">`. */
export function toIsoWeekKey(date: Date): string {
  const { year, week } = getIsoWeek(date);
  return `${String(year).padStart(4, "0")}-W${String(week).padStart(2, "0")}`;
}
/** Monday of a `2026-W46` week, or null. */
export function fromIsoWeekKey(key: string | undefined): Date | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(key ?? "");
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  // 4 January is always in week 1
  const monday = startOfIsoWeek(new Date(year, 0, 4));
  const date = addDays(monday, (week - 1) * 7);
  return week >= 1 && getIsoWeek(date).year === year && getIsoWeek(date).week === week ? date : null;
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
  /** Between a pending range start and the hovered or focused day. */
  preview: boolean;
}

export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
  today: string;
  pendingRange: string;
  /** Week-number column header (week mode). */
  week: string;
  /** Footer clear button (shown when `onClear` is set). */
  clear: string;
}
const DEFAULT_LABELS: CalendarLabels = {
  previousMonth: "이전 달",
  nextMonth: "다음 달",
  today: "오늘",
  pendingRange: "종료일 선택",
  week: "주",
  clear: "지우기",
};

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
  /** Slot rendered under the day number, e.g. event dots. Not called for outside days. */
  renderDay?: (date: Date, state: CalendarDayState) => React.ReactNode;
  /** Text appended to a day's accessible name, e.g. `일정 2건`. */
  getDayLabelSuffix?: (date: Date) => string | undefined;
  /** "Today" for the bar and the first focus. Defaults to the current date. */
  today?: Date;
  /** Move focus to the roving day on mount (used by popups). */
  autoFocus?: boolean;
  /** Dim, inactive days of the adjacent months. Default true for one month, always false for several. */
  showOutsideDays?: boolean;
  /** Always render 6 week rows so the height never changes between months. Default true. */
  fixedWeeks?: boolean;
  /** Footer with a button that shows and focuses today's month (and the pending range hint). Default false. */
  showToday?: boolean;
  /** 1px frame. Default true; turn it off inside a surface that already has one. */
  bordered?: boolean;
  /**
   * Week mode (single only, default off): ISO 8601 weeks starting on Monday with a week-number column. Hover and the
   * selection mark the whole row as one band; clicking or pressing Enter on any day selects its week and reports the
   * Monday of that week. Days of the neighbouring months stay selectable. `value` may be any day of the week.
   */
  weekMode?: boolean;
  /** Footer "today" action. Called instead of only showing today's month (the picker commits it). Needs `showToday`. */
  onToday?: (today: Date) => void;
  /** Adds a clear button to the footer (needs `showToday`). */
  onClear?: () => void;
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

/** Week-row width: 7 cells of the container-derived cell edge. */
const GRID_WIDTH = "w-[calc(var(--yorha-cal-cell)*7)]";
const GRID_WIDTH_WEEK = "w-[calc(var(--yorha-cal-cell)*8)]";

/**
 * Cell edge, from the calendar's own container (not the viewport): the wrapper is an inline-size container, the cell is
 * the compact control step (40 / 32 / 24 px by density) shrunk in whole pixels until the months, their 25px dividers and
 * the 18px frame (16 padding + 2 border) fit the container. Never below the 24px target. `--n` is the number of months
 * laid out side by side (1 when stacked on a narrow viewport). Custom properties resolve `cqi` where they are used,
 * i.e. on the cells inside the wrapper. The 0.01px absorbs float error so an exact fit does not lose a pixel.
 */
const CELL_VAR =
  "[--yorha-cal-cell:clamp(1.5rem,round(down,calc((100cqi_-_18px_-_(var(--n)_-_1)_*_25px_+_0.01px)_/_(7_*_var(--n))),1px),var(--yorha-control-sm))]";
/** The wrapper keeps the natural width and yields to its container. */
const CELL_VAR_WEEK =
  "[--yorha-cal-cell:clamp(1.5rem,round(down,calc((100cqi_-_18px_+_0.01px)_/_8),1px),var(--yorha-control-sm))]";
const WRAP_WIDTH_WEEK = "w-[calc(8_*_var(--yorha-control-sm)_+_18px)] max-w-full";
const WRAP_WIDTH = "w-[calc(var(--n)_*_7_*_var(--yorha-control-sm)_+_(var(--n)_-_1)_*_25px_+_18px)] max-w-full";

/** One numeral box for in-month and outside days, so the digits never move between kinds. */
const NUMBER = "grid size-full place-items-center pb-1 text-yorha-sm yorha-tabular";

/**
 * Day button (the td stays a plain table cell and the button fills it). Hover/press come from yorha-tint,
 * selection is an ink wipe on ::before, today is a 12 x 2 bar, the ring lifts above neighbours with z-10.
 */
const DAY_BUTTON = cn(
  "yorha-tint yorha-tabular relative isolate block size-[var(--yorha-cal-cell)] cursor-pointer select-none rounded-none p-0 font-yorha text-yorha-fg",
  // dark wipe: a pseudo element that scales in from the left (opacity-only when motion is reduced)
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:origin-left before:bg-yorha-ink before:opacity-0",
  "before:scale-x-[calc(1-var(--motion-spatial))]",
  "before:transition-[scale,opacity] before:duration-[max(var(--motion-select),var(--motion-reduced-fade))] before:ease-yorha-out",
  "data-[selected]:text-yorha-on-ink data-[selected]:before:scale-x-100 data-[selected]:before:opacity-100",
  // today bar
  "data-[today]:font-yorha-bold data-[today]:text-yorha-fg-strong data-[today]:data-[selected]:text-yorha-on-ink",
  "data-[today]:after:pointer-events-none data-[today]:after:absolute data-[today]:after:bottom-[6px] data-[today]:after:left-1/2 data-[today]:after:h-0.5 data-[today]:after:w-3 data-[today]:after:-translate-x-1/2 data-[today]:after:bg-current",
  // the end of a preview: 1px inset ink outline
  "data-[preview-end]:outline data-[preview-end]:outline-1 data-[preview-end]:-outline-offset-1 data-[preview-end]:outline-yorha-ink",
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-yorha-disabled",
  // week mode: days of the neighbouring months
  "data-[outside]:text-yorha-fg-soft data-[outside]:data-[selected]:text-yorha-on-ink data-[outside]:data-[disabled]:text-yorha-disabled",
  "focus-visible:yorha-focus focus-visible:z-10",
  "forced-colors:data-[selected]:before:bg-[Highlight] forced-colors:data-[selected]:text-[HighlightText] forced-colors:data-[selected]:[forced-color-adjust:none]",
  "forced-colors:data-[today]:after:bg-[CanvasText] forced-colors:data-[disabled]:text-[GrayText]",
);

/** Week mode: the row band replaces the per-cell hover tint. */
const WEEK_DAY_BUTTON = DAY_BUTTON.replace("yorha-tint ", "");

/** Week mode: the row is one band; hover and keyboard focus tint every cell of the row, the selection is ink. */
const WEEK_CELL = "size-[var(--yorha-cal-cell)] p-0 group-hover/row:bg-yorha-hover group-focus-within/row:bg-yorha-hover";

/** Band cell: range fill and the dashed preview lines never touch the cell box. */
const BAND_CELL = cn(
  "size-[var(--yorha-cal-cell)] p-0",
  "data-[in-range]:bg-yorha-range",
  "data-[preview]:[background-image:repeating-linear-gradient(90deg,var(--yorha-border)_0_4px,transparent_4px_8px),repeating-linear-gradient(90deg,var(--yorha-border)_0_4px,transparent_4px_8px)]",
  "data-[preview]:[background-position:0_0,0_100%] data-[preview]:[background-size:100%_1px,100%_1px] data-[preview]:bg-no-repeat",
  "forced-colors:data-[preview]:[background-image:repeating-linear-gradient(90deg,CanvasText_0_4px,transparent_4px_8px),repeating-linear-gradient(90deg,CanvasText_0_4px,transparent_4px_8px)]",
  "forced-colors:data-[in-range]:underline",
);

/**
 * Pointer month change: the month title and grid ease from 60% opacity (the grid also travels at most --motion-shift)
 * over --motion-select, never from 0, so rapid clicks cannot blank the grid. A second change within 150ms is
 * opacity only. reduced = opacity only, off = instant. Keyboard month changes run no animation. The nav buttons never move.
 */
const FADE_ITEM = cn(
  "transition-opacity duration-[max(var(--motion-select),var(--motion-reduced-fade))] ease-yorha-out",
  "group-data-[entering]/slide:opacity-60 group-data-[entering]/slide:transition-none",
);
const SLIDE_ITEM = cn(
  "transition-[translate,opacity] duration-[max(var(--motion-select),var(--motion-reduced-fade))] ease-yorha-out",
  "group-data-[entering]/slide:translate-x-[calc(var(--yorha-cal-dir)*var(--motion-spatial)*var(--motion-shift))] group-data-[entering]/slide:opacity-60 group-data-[entering]/slide:transition-none",
);

/** Carries the travel direction and the entering flag for the FADE_ITEM / SLIDE_ITEM descendants. */
function MonthSlide({ monthKey, animate, travel, children }: { monthKey: number; animate: boolean; travel: number; children: React.ReactNode }) {
  const [entering, setEntering] = React.useState(false);
  const prev = React.useRef(monthKey);
  React.useLayoutEffect(() => {
    if (prev.current === monthKey) return;
    prev.current = monthKey;
    if (!animate) return;
    setEntering(true);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntering(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [monthKey, animate]);
  return (
    <div
      data-slot="calendar-months"
      data-entering={entering ? "" : undefined}
      style={{ "--yorha-cal-dir": travel } as React.CSSProperties}
      className="group/slide flex flex-col sm:flex-row"
    >
      {children}
    </div>
  );
}

/**
 * Month grid following the WAI-ARIA date grid pattern. No dependencies: Date + Intl only.
 * Keys: Arrow = day/week, PageUp/PageDown = month, Shift+PageUp/PageDown = year, Home/End = week start/end,
 * Enter/Space = select, Escape = drop a pending range start. Single and range selection, controlled or uncontrolled.
 * Geometry: a month is 7 x 6 cells of `--yorha-control-sm`; the height never changes between months.
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
    fixedWeeks = true,
    showToday = false,
    bordered = true,
    className,
  } = props;
  const isRange = props.mode === "range";
  const weekMode = !isRange && !!props.weekMode;
  const labels = { ...DEFAULT_LABELS, ...props.labels };
  const today = React.useMemo(() => startOfDay(props.today ?? new Date()), [props.today]);
  const min = minDate ? startOfDay(minDate) : undefined;
  const max = maxDate ? startOfDay(maxDate) : undefined;
  const count = Math.max(1, Math.floor(numberOfMonths));
  const showOutside = count === 1 && (props.showOutsideDays ?? true);
  const weekStart = weekMode ? 1 : (weekStartsOn ?? getWeekStart(locale));
  const gridWidth = weekMode ? GRID_WIDTH_WEEK : GRID_WIDTH;
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
  const pendingStart = isRange && range.from && !range.to ? range.from : null;

  // range preview: one state, set by fine pointers entering a day and by focus, cleared on grid leave and blur
  const [previewDate, setPreviewDate] = React.useState<Date | null>(null);
  const inPreview = (d: Date) => {
    if (!pendingStart || !previewDate) return false;
    if (previewDate > pendingStart) return d > pendingStart && d <= previewDate;
    return previewDate < pendingStart && d >= previewDate && d < pendingStart;
  };

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
  const [travel, setTravel] = React.useState(0);
  const lastPointerChange = React.useRef(0);
  /** `animate` is true only for pointer-driven month changes; keyboard paths pass nothing and run no animation. */
  const setMonth = (next: Date, animate = false) => {
    const n = startOfMonth(next);
    const delta = monthIndex(n) - monthIndex(month);
    if (delta === 0) return;
    const now = performance.now();
    const quick = animate && now - lastPointerChange.current < 150;
    if (animate) lastPointerChange.current = now;
    setDir(animate ? Math.sign(delta) : 0);
    setTravel(animate && !quick ? Math.sign(delta) : 0);
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
      setSelection(weekMode ? startOfIsoWeek(d) : d);
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
      case "t":
      case "T":
        // today (nearest enabled day when today is disabled); modifiers were filtered above
        target = disabledAt(today) ? findEnabled(today, (d) => addDays(d, 1)) : today;
        break;
      case "Escape":
        if (!pendingStart) return;
        setSelection({ from: null, to: null });
        return;
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

  const dayLabel = React.useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "full" }), [locale]);
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
  const shift = (n: number, pointer: boolean) => {
    setFocusedState(addMonths(roving, n));
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1), pointer);
  };
  const goToday = () => {
    if (props.onToday) {
      props.onToday(today);
      return;
    }
    setFocusedState(today);
    setMonth(today, true);
    pendingFocus.current = true;
  };

  const renderMonth = (offset: number) => {
    const first = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() - weekStart + 7) % 7;
    const rowCount = fixedWeeks ? 6 : Math.ceil((lead + daysInMonth) / 7);
    const gridStart = addDays(first, -lead);
    const cells = Array.from({ length: rowCount * 7 }, (_, i) => addDays(gridStart, i));
    const weeks = Array.from({ length: rowCount }, (_, w) => cells.slice(w * 7, w * 7 + 7));
    const titleId = `${baseId}-title-${offset}`;
    const isLast = offset === count - 1;
    return (
      <div
        key={offset}
        data-slot="calendar-month"
        className={cn(
          "flex flex-col",
          gridWidth,
          offset > 0 && "max-sm:mt-3 max-sm:border-t max-sm:border-yorha-separator max-sm:pt-3 sm:ml-3 sm:border-l sm:border-yorha-separator sm:pl-3 sm:box-content",
        )}
      >
        <div data-slot="calendar-header" className={cn("grid h-control-sm grid-cols-[1fr_auto_auto] items-center", gridWidth)}>
          <div id={titleId} aria-live="polite" className={cn("truncate font-yorha-bold text-yorha-base yorha-tabular text-yorha-fg-strong", FADE_ITEM)}>
            {monthNames.format(first)}
          </div>
          {isLast ? (
            <>
              <button
                type="button"
                data-slot="calendar-prev"
                aria-label={labels.previousMonth}
                disabled={!canPrev}
                onClick={(e) => shift(-1, e.detail > 0)}
                className={buttonVariants({ variant: "ghost", size: "sm", square: true })}
              >
                <ChevronIcon dir="left" size={16} />
              </button>
              <button
                type="button"
                data-slot="calendar-next"
                aria-label={labels.nextMonth}
                disabled={!canNext}
                onClick={(e) => shift(1, e.detail > 0)}
                className={buttonVariants({ variant: "ghost", size: "sm", square: true })}
              >
                <ChevronIcon dir="right" size={16} />
              </button>
            </>
          ) : null}
        </div>
        <table
          role="grid"
          aria-labelledby={titleId}
          onKeyDown={onGridKeyDown}
          onPointerLeave={() => setPreviewDate(null)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPreviewDate(null);
          }}
          className={cn("table-fixed border-separate border-spacing-0", gridWidth, SLIDE_ITEM)}
        >
          <thead>
            <tr>
              {weekMode ? (
                <th scope="col" abbr="ISO 주 번호" className="h-6 border-b border-yorha-separator p-0 font-yorha-medium text-yorha-xs text-yorha-fg-soft">
                  {labels.week}
                </th>
              ) : null}
              {weekdays.map((w) => (
                <th
                  key={w.long}
                  scope="col"
                  abbr={w.long}
                  className="h-6 border-b border-yorha-separator p-0 font-yorha-medium text-yorha-xs text-yorha-fg-soft"
                >
                  {w.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi} className={weekMode ? "group/row" : undefined}>
                {weekMode ? (
                  <th
                    scope="row"
                    data-slot="calendar-week-number"
                    className={cn(WEEK_CELL, "yorha-tabular pb-1 text-center align-middle font-yorha-medium text-yorha-xs text-yorha-fg-soft")}
                  >
                    {getIsoWeek(week[0] as Date).week}
                  </th>
                ) : null}
                {week.map((date, di) => {
                  const inMonth = date.getMonth() === first.getMonth();
                  if (!inMonth && !weekMode) {
                    if (!showOutside) return <td key={di} role="presentation" className="size-[var(--yorha-cal-cell)] p-0" />;
                    return (
                      <td key={di} role="gridcell" aria-disabled="true" data-outside="" className="size-[var(--yorha-cal-cell)] cursor-default p-0">
                        <span data-slot="calendar-day-number" className={cn(NUMBER, "font-yorha text-yorha-disabled")}>
                          {date.getDate()}
                        </span>
                      </td>
                    );
                  }
                  const disabled = !!disabledAt(date);
                  const isStart = isRange ? isSameDay(date, range.from) : false;
                  const isEnd = isRange ? isSameDay(date, range.to) : false;
                  const inRange = isRange && !!range.from && !!range.to && date > range.from && date < range.to;
                  const selected = isRange
                    ? isStart || isEnd || inRange
                    : weekMode
                      ? !!single && isSameDay(startOfIsoWeek(date), startOfIsoWeek(single))
                      : isSameDay(date, single);
                  const isToday = isSameDay(date, today);
                  const preview = inPreview(date);
                  const state: CalendarDayState = {
                    selected,
                    today: isToday,
                    disabled,
                    inRange,
                    rangeStart: isStart,
                    rangeEnd: isEnd,
                    preview,
                  };
                  const suffix = getDayLabelSuffix?.(date);
                  const isRoving = isSameDay(date, roving);
                  // axe label-content-name-mismatch needs the visible numeral as its own word in the name ("14일" does not count)
                  const name = [String(date.getDate()), dayLabel.format(date), isToday ? labels.today : null, suffix].filter(Boolean).join(", ");
                  return (
                    <td
                      key={di}
                      role="gridcell"
                      aria-selected={selected}
                      aria-current={isToday ? "date" : undefined}
                      data-in-range={inRange ? "" : undefined}
                      data-preview={preview ? "" : undefined}
                      className={weekMode ? WEEK_CELL : BAND_CELL}
                    >
                      <button
                        type="button"
                        data-slot="calendar-day"
                        data-date={toDateKey(date)}
                        aria-label={name}
                        aria-disabled={disabled || undefined}
                        tabIndex={isRoving ? 0 : -1}
                        data-selected={selected && !inRange ? "" : undefined}
                        data-range-start={isStart ? "" : undefined}
                        data-range-end={isEnd ? "" : undefined}
                        data-today={isToday ? "" : undefined}
                        data-outside={weekMode && !inMonth ? "" : undefined}
                        data-disabled={disabled ? "" : undefined}
                        data-preview-end={pendingStart && previewDate && isSameDay(previewDate, date) && !isSameDay(date, pendingStart) ? "" : undefined}
                        onClick={() => {
                          if (disabled) return;
                          setFocusedState(date);
                          select(date);
                        }}
                        onPointerEnter={(e) => {
                          if (e.pointerType !== "touch") setPreviewDate(date);
                        }}
                        onFocus={() => {
                          if (!disabled) setFocusedState(date);
                          setPreviewDate(date);
                        }}
                        className={weekMode ? WEEK_DAY_BUTTON : DAY_BUTTON}
                      >
                        <span data-slot="calendar-day-number" className={cn(NUMBER, disabled && "line-through")}>
                          {date.getDate()}
                        </span>
                        {renderDay ? (
                          <span data-slot="calendar-day-extra" aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-1 items-end justify-center gap-[2px]">
                            {renderDay(date, state)}
                          </span>
                        ) : null}
                      </button>
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
      data-slot="calendar-container"
      style={{ "--n": count } as React.CSSProperties}
      className={cn("inline-block align-top [container-type:inline-size] max-sm:[--n:1]", weekMode ? WRAP_WIDTH_WEEK : WRAP_WIDTH, weekMode ? CELL_VAR_WEEK : CELL_VAR)}
    >
    <div
      ref={setRefs}
      data-slot="calendar"
      data-mode={isRange ? "range" : weekMode ? "week" : "single"}
      lang={locale}
      aria-label={props["aria-label"]}
      className={cn("block bg-yorha-panel p-2 font-yorha text-yorha-fg", bordered && "border border-yorha-border", className)}
    >
      <MonthSlide monthKey={firstIdx} animate={dir !== 0} travel={travel}>
        {Array.from({ length: count }, (_, i) => renderMonth(i))}
      </MonthSlide>
      {showToday ? (
        <div data-slot="calendar-footer" className="sticky bottom-0 z-20 flex h-[calc(var(--yorha-control-sm)+1px)] items-center justify-between border-t border-yorha-separator bg-yorha-panel">
          <button type="button" onClick={goToday} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {labels.today}
          </button>
          {props.onClear ? (
            <button type="button" onClick={props.onClear} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {labels.clear}
            </button>
          ) : (
            <span aria-live="polite" className="truncate text-yorha-xs text-yorha-fg-soft">
              {pendingStart ? labels.pendingRange : null}
            </span>
          )}
        </div>
      ) : null}
    </div>
    </div>
  );
});

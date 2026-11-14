import * as React from "react";
import { Calendar, type CalendarProps, type DateRange, isSameDay, startOfDay } from "@/components/ui/calendar";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* ---------- locale format and parse (Intl only) ---------- */

function partsOf(locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(2000, 10, 22),
  );
}

/** Date as text in the locale's numeric format, e.g. `2026. 11. 14.` for ko-KR. */
export function formatDate(date: Date, locale = "ko-KR"): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Locale order of year/month/day, e.g. year, month, day for ko-KR and month, day, year for en-US. */
function fieldOrder(locale: string): ("year" | "month" | "day")[] {
  return partsOf(locale)
    .map((p) => p.type)
    .filter((t): t is "year" | "month" | "day" => t === "year" || t === "month" || t === "day");
}

/**
 * Parse typed text into a local date, or null. Accepts the locale order with any separators
 * (`2026. 11. 14.`, `2026/11/14`), ISO `2026-11-14`, and compact `20261114`. Impossible dates are null.
 */
export function parseDate(text: string, locale = "ko-KR"): Date | null {
  const raw = text.trim();
  if (!raw || /[^\d\s./\-,년월일]/.test(raw)) return null;
  let nums = raw.match(/\d+/g) ?? [];
  let order = fieldOrder(locale);
  if (nums.length === 1 && /^\d{8}$/.test(nums[0]!)) {
    const n = nums[0]!;
    nums = [n.slice(0, 4), n.slice(4, 6), n.slice(6, 8)];
    order = ["year", "month", "day"];
  } else if (nums.length === 3 && nums[0]!.length === 4) {
    order = ["year", "month", "day"];
  }
  if (nums.length !== 3) return null;
  const v: Record<string, number> = {};
  order.forEach((k, i) => {
    v[k] = Number(nums[i]);
  });
  let year = v.year!;
  if (nums[order.indexOf("year")]!.length <= 2) year += 2000;
  const date = new Date(year, v.month! - 1, v.day!);
  if (date.getFullYear() !== year || date.getMonth() !== v.month! - 1 || date.getDate() !== v.day!) return null;
  return date;
}

function placeholderOf(locale: string): string {
  return partsOf(locale)
    .map((p) => (p.type === "year" ? "yyyy" : p.type === "month" ? "mm" : p.type === "day" ? "dd" : p.value))
    .join("");
}

const RANGE_SEPARATOR = " – ";
const RANGE_SPLIT = /\s*[–—~]\s*|\s+-\s+/;

function isoOf(date: Date | null): string {
  if (!date) return "";
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ---------- shared picker ---------- */

type CalendarPassThrough = Pick<
  CalendarProps,
  "minDate" | "maxDate" | "isDateDisabled" | "numberOfMonths" | "weekStartsOn" | "renderDay" | "getDayLabelSuffix" | "today" | "labels"
>;

interface PickerCommonProps extends CalendarPassThrough {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** External error message (e.g. from a server). Typed-text errors show when this is empty. */
  error?: React.ReactNode;
  /** Submitted as ISO `YYYY-MM-DD` through hidden inputs (`name`, or `name-from` and `name-to` for a range). */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** BCP 47 locale for format, parse and month names. Default `ko-KR`. */
  locale?: string;
  placeholder?: string;
  /** Message for text that is not a date. */
  invalidMessage?: string;
  /** Message for a date that is disabled or outside minDate/maxDate. */
  outOfRangeMessage?: string;
  /** Accessible name of the trigger button. */
  triggerLabel?: string;
  className?: string;
  id?: string;
}

export interface DatePickerProps extends PickerCommonProps {
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (value: Date | null) => void;
}
export interface DateRangePickerProps extends PickerCommonProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange) => void;
}

const EMPTY_RANGE: DateRange = { from: null, to: null };

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" />
    </svg>
  );
}

interface PickerImplProps extends PickerCommonProps {
  mode: "single" | "range";
  value?: Date | null | DateRange;
  defaultValue?: Date | null | DateRange;
  onValueChange?: (value: Date | null | DateRange) => void;
}

function PickerImpl(props: PickerImplProps) {
  const {
    mode,
    label,
    description,
    error,
    name,
    disabled,
    required,
    locale = "ko-KR",
    placeholder,
    invalidMessage = "날짜 형식이 올바르지 않다. 예: 2026. 11. 14.",
    outOfRangeMessage = "선택할 수 없는 날짜다.",
    triggerLabel = "달력 열기",
    className,
    id,
    minDate,
    maxDate,
    isDateDisabled,
    numberOfMonths,
    weekStartsOn,
    renderDay,
    getDayLabelSuffix,
    today,
    labels,
  } = props;
  const isRange = mode === "range";

  const [inner, setInner] = React.useState<Date | null | DateRange>(props.defaultValue ?? (isRange ? EMPTY_RANGE : null));
  const controlled = props.value !== undefined;
  const value = controlled ? (props.value as Date | null | DateRange) : inner;
  const commit = (next: Date | null | DateRange) => {
    if (!controlled) setInner(next);
    props.onValueChange?.(next);
  };

  const format = React.useCallback(
    (v: Date | null | DateRange): string => {
      if (!isRange) return v ? formatDate(v as Date, locale) : "";
      const r = (v as DateRange | null) ?? EMPTY_RANGE;
      if (!r.from) return "";
      return r.to ? `${formatDate(r.from, locale)}${RANGE_SEPARATOR}${formatDate(r.to, locale)}` : formatDate(r.from, locale);
    },
    [isRange, locale],
  );
  const formatted = format(value);
  const [text, setText] = React.useState(formatted);
  const [typedError, setTypedError] = React.useState<string | null>(null);
  React.useEffect(() => {
    setText(formatted);
    setTypedError(null);
  }, [formatted]);

  const min = minDate ? startOfDay(minDate) : undefined;
  const max = maxDate ? startOfDay(maxDate) : undefined;
  const unavailable = (d: Date) => (min && d < min) || (max && d > max) || !!isDateDisabled?.(d);

  const commitText = () => {
    const raw = text.trim();
    if (!raw) {
      setTypedError(null);
      if (formatted) commit(isRange ? EMPTY_RANGE : null);
      return;
    }
    if (!isRange) {
      const d = parseDate(raw, locale);
      if (!d) return setTypedError(invalidMessage);
      if (unavailable(d)) return setTypedError(outOfRangeMessage);
      setTypedError(null);
      setText(formatDate(d, locale));
      if (!isSameDay(d, value as Date | null)) commit(d);
      return;
    }
    const pieces = raw.split(RANGE_SPLIT).filter(Boolean);
    const a = pieces.length === 2 ? parseDate(pieces[0]!, locale) : null;
    const b = pieces.length === 2 ? parseDate(pieces[1]!, locale) : null;
    if (!a || !b) return setTypedError(invalidMessage);
    const [from, to] = a <= b ? [a, b] : [b, a];
    if (unavailable(from) || unavailable(to)) return setTypedError(outOfRangeMessage);
    setTypedError(null);
    const next = { from, to };
    setText(format(next));
    const cur = value as DateRange;
    if (!isSameDay(cur.from, from) || !isSameDay(cur.to, to)) commit(next);
  };

  const [open, setOpen] = React.useState(false);
  const calendarRef = React.useRef<HTMLDivElement | null>(null);
  const shownError = error || typedError;
  const iso = isRange ? [isoOf((value as DateRange).from), isoOf((value as DateRange).to)] : [isoOf(value as Date | null)];

  const calendarProps = {
    minDate,
    maxDate,
    isDateDisabled,
    numberOfMonths,
    weekStartsOn,
    renderDay,
    getDayLabelSuffix,
    today,
    labels,
    locale,
    autoFocus: true,
    className: "p-0!",
  };

  return (
    <Field invalid={Boolean(shownError)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-stretch gap-2">
        <FieldControl
          id={id}
          type="text"
          autoComplete="off"
          required={required}
          lang={locale}
          value={text}
          placeholder={placeholder ?? (isRange ? `${placeholderOf(locale)}${RANGE_SEPARATOR}${placeholderOf(locale)}` : placeholderOf(locale))}
          onChange={(e) => setText(e.currentTarget.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText();
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger aria-label={triggerLabel} disabled={disabled} className="grid size-10 shrink-0 place-items-center p-0">
            <CalendarGlyph />
          </PopoverTrigger>
          <PopoverContent
            aria-label={typeof label === "string" ? label : triggerLabel}
            className={cn((numberOfMonths ?? 1) > 1 && "max-w-none!")}
            initialFocus={() => calendarRef.current?.querySelector<HTMLElement>("[data-slot=calendar-day][tabindex='0']") ?? true}
          >
            {isRange ? (
              <Calendar
                ref={calendarRef}
                mode="range"
                value={value as DateRange}
                onValueChange={(next) => {
                  commit(next);
                  if (next.from && next.to) setOpen(false);
                }}
                {...calendarProps}
              />
            ) : (
              <Calendar
                ref={calendarRef}
                value={value as Date | null}
                onValueChange={(next) => {
                  commit(next);
                  setOpen(false);
                }}
                {...calendarProps}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {shownError ? <FieldError>{shownError}</FieldError> : null}
      {name
        ? iso.map((v, i) => (
            <input key={i} type="hidden" name={isRange ? `${name}-${i === 0 ? "from" : "to"}` : name} value={v} />
          ))
        : null}
    </Field>
  );
}

/**
 * Date input plus a calendar popup. Type a date in the locale format (parsed on blur or Enter) or pick one;
 * label, description and error come from the yorha Field. Escape or a pick closes the popup and focus returns
 * to the trigger button.
 */
export function DatePicker(props: DatePickerProps) {
  return <PickerImpl {...(props as PickerImplProps)} mode="single" />;
}

/** Same as DatePicker for a start–end range. Typed text accepts `a ~ b`, `a – b` or `a - b`, in either order. */
export function DateRangePicker(props: DateRangePickerProps) {
  return <PickerImpl {...(props as PickerImplProps)} mode="range" />;
}

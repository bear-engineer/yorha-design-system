import * as React from "react";
import { Calendar, type CalendarProps, type DateRange, isSameDay, startOfDay } from "@/components/ui/calendar";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CalendarIcon } from "@/components/ui/icons";
import { Field, FieldDescription, FieldError, FieldGroupControl, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupButton, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* ---------- locale format and parse (Intl only) ---------- */

function partsOf(locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(2000, 10, 22),
  );
}

/** Date as text in the locale's numeric format, e.g. `2026. 11. 14.` for ko-KR. */
/** Field popups flip above/below only; never fall back to the side of the field (short viewports). */
const FIELD_POPUP_COLLISION = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const;

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

/** Placeholder from the locale's own parts: ko reads `연도. 월. 일.`, other locales `YYYY. MM. DD.` in their order. */
function placeholderOf(locale: string): string {
  const names = locale.toLowerCase().startsWith("ko")
    ? { year: "연도", month: "월", day: "일" }
    : { year: "YYYY", month: "MM", day: "DD" };
  return partsOf(locale)
    .map((p) => (p.type === "year" || p.type === "month" || p.type === "day" ? names[p.type] : p.value))
    .join("");
}

/** Soft mask for pure digits typed in year-month-day order: `20261114` becomes `2026. 11. 14.` as it is typed. */
function maskDigits(raw: string, locale: string): string {
  if (!/^\d{1,8}$/.test(raw)) return raw;
  const order = fieldOrder(locale);
  if (order[0] !== "year" || order[1] !== "month" || order[2] !== "day") return raw;
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  if (raw.length <= 4) return y;
  if (raw.length <= 6) return `${y}. ${m}`;
  return raw.length === 8 ? `${y}. ${m}. ${d}.` : `${y}. ${m}. ${d}`;
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
  /** Single picker only: the range picker builds a placeholder per input. */
  placeholder?: string;
  /** Message for text that is not a date. */
  invalidMessage?: string;
  /** Message for a date that is disabled or outside minDate/maxDate. */
  outOfRangeMessage?: string;
  /** Range only: message when the end is before the start. */
  rangeOrderMessage?: string;
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

interface PickerImplProps extends PickerCommonProps {
  mode: "single" | "range";
  value?: Date | null | DateRange;
  defaultValue?: Date | null | DateRange;
  onValueChange?: (value: Date | null | DateRange) => void;
}

type Side = "from" | "to";

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
    invalidMessage = "날짜 형식이 올바르지 않다 (예:\u00a02026.\u00a011.\u00a014.)",
    outOfRangeMessage = "선택할 수 없는 날짜다.",
    rangeOrderMessage = "종료일이 시작일보다 빠릅니다",
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

  const range = isRange ? ((value as DateRange | null) ?? EMPTY_RANGE) : EMPTY_RANGE;
  const fromFormatted = isRange ? (range.from ? formatDate(range.from, locale) : "") : value ? formatDate(value as Date, locale) : "";
  const toFormatted = isRange && range.to ? formatDate(range.to, locale) : "";
  const [text, setText] = React.useState({ from: fromFormatted, to: toFormatted });
  const [typedError, setTypedError] = React.useState<{ side: Side; message: string } | null>(null);
  React.useEffect(() => {
    setText({ from: fromFormatted, to: toFormatted });
    setTypedError(null);
  }, [fromFormatted, toFormatted]);

  const min = minDate ? startOfDay(minDate) : undefined;
  const max = maxDate ? startOfDay(maxDate) : undefined;
  const unavailable = (d: Date) => (min && d < min) || (max && d > max) || !!isDateDisabled?.(d);

  /** Parse one typed value. Typed text commits on blur and Enter; an error keeps the text so it can be fixed. */
  const commitText = (side: Side) => {
    const raw = text[side].trim();
    const fail = (message: string) => setTypedError({ side, message });
    if (!raw) {
      setTypedError(null);
      if (!isRange) {
        if (fromFormatted) commit(null);
      } else if (range[side]) commit({ ...range, [side]: null });
      return;
    }
    const d = parseDate(raw, locale);
    if (!d) return fail(invalidMessage);
    if (unavailable(d)) return fail(outOfRangeMessage);
    if (!isRange) {
      setTypedError(null);
      setText({ from: formatDate(d, locale), to: "" });
      if (!isSameDay(d, value as Date | null)) commit(d);
      return;
    }
    const other = side === "from" ? range.to : range.from;
    if (other && (side === "from" ? d > other : d < other)) return fail(rangeOrderMessage);
    setTypedError(null);
    setText((t) => ({ ...t, [side]: formatDate(d, locale) }));
    if (!isSameDay(range[side], d)) commit({ ...range, [side]: d });
  };
  const onTextChange = (side: Side, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value;
    const prev = text[side];
    // mask only digits typed onto an empty, pure-digit or already masked text, so hand-typed `2026. 1. 5.` is left alone
    const masked =
      raw.length > prev.length && /^[\d. ]*\d$/.test(raw) && (prev === "" || prev === maskDigits(prev.replace(/\D/g, ""), locale))
        ? maskDigits(raw.replace(/\D/g, ""), locale)
        : raw;
    setTypedError(null);
    setText((t) => ({ ...t, [side]: masked }));
  };
  const onTextKeyDown = (side: Side, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitText(side);
  };

  const [open, setOpenState] = React.useState(false);
  /** Range: the start picked in the popup stays a draft until the end is chosen; Escape restores the committed range. */
  const [draft, setDraft] = React.useState<DateRange | null>(null);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    if (!next) setDraft(null);
  };
  const calendarRef = React.useRef<HTMLDivElement | null>(null);
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const shownError = error || typedError?.message;
  const iso = isRange ? [isoOf(range.from), isoOf(range.to)] : [isoOf(value as Date | null)];
  const fieldPlaceholder = placeholder ?? placeholderOf(locale);
  const invalidSide = typedError?.side ?? null;

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
    showToday: true,
    bordered: false,
  };

  // The narrow range frame stacks two control rows (94px), so its parts are not measured against one control height.
  const trigger = (
    <PopoverPrimitive.Trigger
      render={
        <InputGroupButton
          data-size-exempt={isRange ? "" : undefined}
          aria-label={triggerLabel}
          disabled={disabled}
          className={cn(
            "data-[popup-open]:bg-yorha-ink data-[popup-open]:text-yorha-on-ink",
            // a wrap frame has no definite height for `h-full`: use the inner control height
            isRange && "h-[calc(var(--yorha-control-md)-2px)]",
          )}
        />
      }
    >
      <CalendarIcon />
    </PopoverPrimitive.Trigger>
  );
  const fieldId = id;

  return (
    <Field invalid={Boolean(shownError)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <InputGroup
          ref={frameRef}
          data-date-field=""
          variant={isRange ? "wrap" : "default"}
          className={isRange ? "@container" : undefined}
          invalid={Boolean(shownError)}
          disabled={disabled}
          aria-label={typeof label === "string" ? label : triggerLabel}
        >
          {isRange ? (
            <>
              {/* plain inputs: Field would name the start by the group label and drop 시작일 */}
              <InputGroupInput
                id={fieldId}
                data-date-input=""
                data-size-exempt=""
                aria-label="시작일"
                aria-invalid={invalidSide === "from" || (!typedError && Boolean(error)) ? true : undefined}
                disabled={disabled}
                autoComplete="off"
                inputMode="numeric"
                required={required}
                lang={locale}
                value={text.from}
                placeholder={placeholderOf(locale)}
                onChange={(e) => onTextChange("from", e)}
                onBlur={() => commitText("from")}
                onKeyDown={(e) => onTextKeyDown("from", e)}
                className={cn("yorha-tabular h-[calc(var(--yorha-control-md)-2px)] flex-[0_0_100%] border-b border-yorha-border @[24rem]:flex-1 @[24rem]:border-b-0")}
              />
              <InputGroupText aria-hidden className="hidden h-[calc(var(--yorha-control-md)-2px)] @[24rem]:grid">–</InputGroupText>
              <InputGroupInput
                data-date-input=""
                data-size-exempt=""
                aria-label="종료일"
                aria-invalid={invalidSide === "to" ? true : undefined}
                disabled={disabled}
                autoComplete="off"
                inputMode="numeric"
                lang={locale}
                value={text.to}
                placeholder={placeholderOf(locale)}
                onChange={(e) => onTextChange("to", e)}
                onBlur={() => commitText("to")}
                onKeyDown={(e) => onTextKeyDown("to", e)}
                className="yorha-tabular h-[calc(var(--yorha-control-md)-2px)] flex-1"
              />
              {trigger}
            </>
          ) : (
            <>
              <FieldGroupControl
                id={fieldId}
                data-date-input=""
                autoComplete="off"
                inputMode="numeric"
                required={required}
                lang={locale}
                value={text.from}
                placeholder={fieldPlaceholder}
                onChange={(e) => onTextChange("from", e)}
                onBlur={() => commitText("from")}
                onKeyDown={(e) => onTextKeyDown("from", e)}
                className="yorha-tabular"
              />
              {trigger}
            </>
          )}
        </InputGroup>
        <PopoverContent
          anchor={frameRef}
          collisionAvoidance={FIELD_POPUP_COLLISION}
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={8}
          aria-label={typeof label === "string" ? label : triggerLabel}
          className="w-auto max-w-none! min-w-0! p-0!"
          initialFocus={() => calendarRef.current?.querySelector<HTMLElement>("[data-slot=calendar-day][tabindex='0']") ?? true}
        >
          {isRange ? (
            <Calendar
              ref={calendarRef}
              mode="range"
              value={draft ?? range}
              onValueChange={(next) => {
                if (next.from && next.to) {
                  commit(next);
                  setOpen(false);
                } else setDraft(next);
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
 * Date field plus a calendar popup in one InputGroup frame. Type a date in the locale format (digits get their
 * separators as you type; parsed on blur or Enter) or pick one; label, description and error come from the yorha
 * Field. The popup opens under the whole field. Escape or a pick closes it and focus returns to the calendar button.
 */
export function DatePicker(props: DatePickerProps) {
  return <PickerImpl {...(props as PickerImplProps)} mode="single" />;
}

/**
 * Start and end in one frame (two inputs, `시작일` and `종료일`; the end drops to a second row under ~400px).
 * The popup stays open until the end is picked; Escape restores the committed range. Typing a range into one box
 * is no longer supported (breaking: the single `a ~ b` text field is gone).
 */
export function DateRangePicker(props: DateRangePickerProps) {
  return <PickerImpl {...(props as PickerImplProps)} mode="range" />;
}

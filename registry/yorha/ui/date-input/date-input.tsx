import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Calendar, addDays, fromIsoWeekKey, startOfDay, toIsoWeekKey } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldGroupControl, FieldLabel } from "@/components/ui/field";
import { CalendarIcon, ClockIcon } from "@/components/ui/icons";
import { InputGroup, InputGroupButton } from "@/components/ui/input-group";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { MonthPicker } from "./month-picker";
import { formatTime, parseTime, PickerFooter, TimePicker, timeSteps } from "./time-picker";

/** Field popups flip above/below only; never fall back to the side of the field (short viewports). */
const FIELD_POPUP_COLLISION = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const;

export type DateInputType = "date" | "datetime-local" | "month" | "week" | "time";

/** Focused native segment: ink block with on-ink text (replaces the UA blue highlight). Chromium and Safari pseudos. */
const SEGMENT_FOCUS = "[&::-webkit-datetime-edit-year-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-year-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-month-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-month-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-day-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-day-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-hour-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-hour-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-minute-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-minute-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-second-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-second-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-millisecond-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-millisecond-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-meridiem-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-meridiem-field:focus]:text-yorha-on-ink [&::-webkit-datetime-edit-week-field:focus]:bg-yorha-ink [&::-webkit-datetime-edit-week-field:focus]:text-yorha-on-ink";

/** `(pointer: fine)` as an external store; the server snapshot assumes a fine pointer (calendar). */
function subscribePointer(onChange: () => void) {
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener?.("change", onChange);
  return () => mql.removeEventListener?.("change", onChange);
}
const finePointer = () => window.matchMedia("(pointer: fine)").matches;
function useFinePointer(): boolean {
  return React.useSyncExternalStore(subscribePointer, finePointer, () => true);
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
/** `2026-11-14` to a local Date, or null. */
function fromIso(text: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}
const toIso = (d: Date) => `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** `2026-11-14T09:30[:00]` to its date and time parts (either may be empty). */
function splitLocal(text: string | undefined): { date: string; time: string } {
  const [date = "", time = ""] = (text ?? "").split("T");
  return { date, time };
}
/** Writes a value into the native input the way the browser does (input + change), so forms, validation and listeners see it. */
function writeNative(input: HTMLInputElement, next: string) {
  if (input.value === next) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export interface DateInputProps {
  label: React.ReactNode;
  /** date, datetime-local, month, week or time. Values use the native formats (`2026-11-14`, `2026-11-14T09:30`, `2026-11`, `2026-W46`, `09:30`). */
  type?: DateInputType;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  min?: string;
  max?: string;
  /** Native step: days for date, seconds for time and datetime-local, months for month, weeks for week. */
  step?: number;
  /**
   * `auto` (default): the end button opens the kit picker of the type on fine pointers (mouse, trackpad) and the native
   * picker on coarse pointers (phones, tablets). `calendar` (any type: the kit picker) / `native` force one. `true` /
   * `false` are accepted as `calendar` / `native`. Pickers: date = Calendar, week = Calendar in week mode, month =
   * MonthPicker, time = TimePicker, datetime-local = Calendar + TimePicker.
   */
  picker?: "auto" | "calendar" | "native" | boolean;
  /** Accessible name of the end button. Default `달력 열기` (`시간 선택` for type=time, `월 선택` for month, `주 선택` for week). */
  pickerLabel?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  description?: React.ReactNode;
  error?: React.ReactNode;
  locale?: string;
  /** Overrides "today" for the calendar (tests, fixed demos). */
  today?: Date;
  className?: string;
}

/**
 * Native date/time input in one InputGroup frame with a YoRHa icon button at the end (the native indicator is hidden
 * for every type). The native segments stay (best mobile pickers, segment a11y, min/max/step validation); the focused
 * segment is an ink block. The button opens the kit Calendar below the field for type=date on fine pointers
 * (`picker="auto"`), otherwise the browser's picker (`showPicker()`); picking a day writes the ISO value and returns
 * focus to the button. The control inherits `color-scheme` from the theme, so any UA popup follows light/dark.
 * v4 BREAKING: `picker` defaults to `auto` (was off), so type=date now opens the kit Calendar with a mouse.
 * The native control's segment order and month/weekday words follow the browser UI locale, not `lang`: use
 * DatePicker when the text must be Korean.
 */
export function DateInput({
  label,
  type = "date",
  value,
  defaultValue = "",
  onValueChange,
  min,
  max,
  step,
  picker = "auto",
  pickerLabel,
  name,
  disabled,
  required,
  description,
  error,
  locale = "ko-KR",
  today,
  className,
}: DateInputProps) {
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [draftDate, setDraftDate] = React.useState<Date | null>(null);
  const [draftTime, setDraftTime] = React.useState("");
  const frameRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fine = useFinePointer();
  const mode = picker === true ? "calendar" : picker === false ? "native" : picker;
  const showPicker = mode === "calendar" || (mode === "auto" && fine);
  const base = today ?? new Date();
  const buttonLabel = pickerLabel ?? { time: "시간 선택", month: "월 선택", week: "주 선택", date: "달력 열기", "datetime-local": "날짜와 시각 선택" }[type];
  const icon = type === "time" ? <ClockIcon /> : <CalendarIcon />;

  const set = (next: string) => {
    setInner(next);
    onValueChange?.(next);
  };
  // form.reset(): the native input would fall back to the last rendered `value` attribute, so restore defaultValue ourselves
  const setRef = React.useRef(set);
  setRef.current = set;
  React.useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = (e: Event) =>
      queueMicrotask(() => {
        if (!e.defaultPrevented) setRef.current(defaultValue);
      });
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue]);

  const timeSecs = timeSteps(step).seconds;
  const commit = (next: string) => {
    if (inputRef.current) writeNative(inputRef.current, next);
    else set(next);
    setOpen(false);
  };
  const onOpenChange = (next: boolean) => {
    if (next) {
      const parts = splitLocal(current);
      setDraftDate(type === "datetime-local" ? fromIso(parts.date) : null);
      setDraftTime(type === "datetime-local" ? parts.time : type === "time" ? current : "");
    }
    setOpen(next);
  };

  const field = (
    <InputGroup ref={frameRef} invalid={Boolean(error)} disabled={disabled}>
      <FieldGroupControl
        ref={inputRef}
        data-date-input=""
        type={type}
        name={name}
        lang={locale}
        min={min}
        max={max}
        step={step}
        required={required}
        value={current}
        onChange={(e) => set(e.currentTarget.value)}
        className={`yorha-tabular [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden ${SEGMENT_FOCUS}`}
      />
      {showPicker ? (
        <PopoverPrimitive.Trigger
          render={
            <InputGroupButton
              aria-label={buttonLabel}
              disabled={disabled}
              className="data-[popup-open]:bg-yorha-ink data-[popup-open]:text-yorha-on-ink"
            />
          }
        >
          {icon}
        </PopoverPrimitive.Trigger>
      ) : (
        <InputGroupButton
          aria-label={buttonLabel}
          disabled={disabled}
          onClick={() => {
            try {
              inputRef.current?.showPicker?.();
            } catch {
              inputRef.current?.focus();
            }
          }}
        >
          {icon}
        </InputGroupButton>
      )}
    </InputGroup>
  );

  const renderPicker = () => {
    if (type === "month") {
      return (
        <MonthPicker
          value={current}
          min={min}
          max={max}
          today={base}
          autoFocus
          onValueChange={commit}
          onToday={commit}
          onClear={() => commit("")}
        />
      );
    }
    if (type === "week") {
      const weekMin = fromIsoWeekKey(min);
      const weekMax = fromIsoWeekKey(max);
      const monday = fromIsoWeekKey(current);
      return (
        <Calendar
          weekMode
          value={monday}
          defaultMonth={monday ?? base}
          minDate={weekMin ?? undefined}
          maxDate={weekMax ? addDays(weekMax, 6) : undefined}
          today={today}
          locale={locale}
          autoFocus
          showToday
          bordered={false}
          labels={{ today: "이번 주" }}
          onToday={(t) => {
            const key = toIsoWeekKey(t);
            if ((min && key < min) || (max && key > max)) return;
            commit(key);
          }}
          onClear={() => commit("")}
          onValueChange={(next) => commit(next ? toIsoWeekKey(next) : "")}
        />
      );
    }
    if (type === "time" || type === "datetime-local") {
      const withDate = type === "datetime-local";
      const zero = formatTime({ h: 0, m: 0, s: 0 }, timeSecs);
      const dateKey = draftDate ? toIso(draftDate) : "";
      const limit = (bound: string | undefined) => {
        if (!withDate) return bound;
        const b = splitLocal(bound);
        return b.date === dateKey && b.time ? b.time : undefined;
      };
      const nowValue = () => {
        const d = new Date();
        return formatTime({ h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }, timeSecs);
      };
      const confirm = () => {
        const time = parseTime(draftTime) ? draftTime : zero;
        if (!withDate) return commit(time);
        commit(`${toIso(draftDate ?? startOfDay(base))}T${time}`);
      };
      const timePicker = (
        <TimePicker
          value={draftTime}
          step={step}
          min={limit(min)}
          max={limit(max)}
          autoFocus={!withDate}
          onValueChange={setDraftTime}
          onCommit={confirm}
        />
      );
      return (
        <div data-slot="date-input-picker" className="flex flex-col">
          {withDate ? (
            <div className="flex flex-col min-[420px]:flex-row">
              <Calendar
                value={draftDate}
                defaultMonth={draftDate ?? base}
                minDate={fromIso(splitLocal(min).date) ?? undefined}
                maxDate={fromIso(splitLocal(max).date) ?? undefined}
                today={today}
                locale={locale}
                autoFocus
                bordered={false}
                onValueChange={(next) => setDraftDate(next)}
              />
              <div className="border-t border-yorha-separator min-[420px]:border-t-0 min-[420px]:border-l">{timePicker}</div>
            </div>
          ) : (
            timePicker
          )}
          <div className="px-2">
            <PickerFooter
              now={{
                label: "지금",
                onClick: () => {
                  const t = nowValue();
                  if (!withDate) return commit(t);
                  commit(`${toIso(startOfDay(new Date()))}T${t}`);
                },
              }}
              clear={{ onClick: () => commit("") }}
              confirm={{ onClick: confirm }}
            />
          </div>
        </div>
      );
    }
    return (
      <Calendar
        value={fromIso(current)}
        defaultMonth={fromIso(current) ?? today}
        minDate={fromIso(min) ?? undefined}
        maxDate={fromIso(max) ?? undefined}
        today={today}
        locale={locale}
        autoFocus
        showToday
        bordered={false}
        onValueChange={(next) => commit(next ? toIso(next) : "")}
      />
    );
  };

  return (
    <Field invalid={Boolean(error)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      {showPicker ? (
        <Popover open={open} onOpenChange={onOpenChange}>
          {field}
          <PopoverContent
            anchor={frameRef}
            collisionAvoidance={FIELD_POPUP_COLLISION}
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={8}
            aria-label={typeof label === "string" ? label : buttonLabel}
            className="w-auto max-w-none! min-w-0! p-0!"
            initialFocus={() =>
              contentRef.current?.querySelector<HTMLElement>(
                "[data-slot=calendar-day][tabindex='0'], [data-slot=month-picker-month][tabindex='0'], [data-slot=time-picker-option][tabindex='0']",
              ) ?? true
            }
          >
            <div ref={contentRef}>{renderPicker()}</div>
          </PopoverContent>
        </Popover>
      ) : (
        field
      )}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

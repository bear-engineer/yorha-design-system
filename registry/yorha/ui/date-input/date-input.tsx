import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldGroupControl, FieldLabel } from "@/components/ui/field";
import { CalendarIcon, ClockIcon } from "@/components/ui/icons";
import { InputGroup, InputGroupButton } from "@/components/ui/input-group";
import { Popover, PopoverContent } from "@/components/ui/popover";

/** Field popups flip above/below only; never fall back to the side of the field (short viewports). */
const FIELD_POPUP_COLLISION = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const;

export type DateInputType = "date" | "datetime-local" | "month" | "week" | "time";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
/** `2026-11-14` to a local Date, or null. */
function fromIso(text: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}
const toIso = (d: Date) => `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

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
  /** type=date only: the end button opens the kit Calendar instead of the native picker. */
  picker?: boolean;
  /** Accessible name of the end button. Default `달력 열기` (`시간 선택` for type=time). */
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
 * for every type). The button opens the browser's picker (`showPicker()`); with `picker` and type=date it opens the
 * kit Calendar below the field instead, and picking a day writes the ISO value and returns focus to the button.
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
  picker = false,
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
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const showPicker = picker && type === "date";
  const selected = fromIso(current);
  const buttonLabel = pickerLabel ?? (type === "time" ? "시간 선택" : "달력 열기");
  const icon = type === "time" ? <ClockIcon /> : <CalendarIcon />;

  const set = (next: string) => {
    setInner(next);
    onValueChange?.(next);
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
        className="yorha-tabular [&::-webkit-calendar-picker-indicator]:hidden"
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

  return (
    <Field invalid={Boolean(error)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      {showPicker ? (
        <Popover open={open} onOpenChange={setOpen}>
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
            initialFocus={() => calendarRef.current?.querySelector<HTMLElement>("[data-slot=calendar-day][tabindex='0']") ?? true}
          >
            <Calendar
              ref={calendarRef}
              value={selected}
              defaultMonth={selected ?? today}
              minDate={fromIso(min) ?? undefined}
              maxDate={fromIso(max) ?? undefined}
              today={today}
              locale={locale}
              autoFocus
              showToday
              bordered={false}
              onValueChange={(next) => {
                set(next ? toIso(next) : "");
                setOpen(false);
              }}
            />
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

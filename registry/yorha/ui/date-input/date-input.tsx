import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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

function CalendarGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
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
  /** Adds a button that opens the Calendar. Only for type=date. */
  picker?: boolean;
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
 * Native date/time input in the YoRHa control surface. type picks the control; min, max and step pass through.
 * With `picker` (type=date) a button opens the yorha Calendar in a Popover; picking a day writes the ISO value
 * and returns focus to the button.
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
  pickerLabel = "달력 열기",
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
  const showPicker = picker && type === "date";
  const selected = fromIso(current);

  const set = (next: string) => {
    setInner(next);
    onValueChange?.(next);
  };

  return (
    <Field invalid={Boolean(error)} disabled={disabled} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-stretch gap-2">
        <FieldControl
          type={type}
          name={name}
          lang={locale}
          min={min}
          max={max}
          step={step}
          required={required}
          value={current}
          onChange={(e) => set(e.currentTarget.value)}
          className={cn("min-w-0 flex-1", showPicker && "[&::-webkit-calendar-picker-indicator]:hidden")}
        />
        {showPicker ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger aria-label={pickerLabel} disabled={disabled} className="grid size-10 shrink-0 place-items-center p-0">
              <CalendarGlyph />
            </PopoverTrigger>
            <PopoverContent
              aria-label={typeof label === "string" ? label : pickerLabel}
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
                className="p-0!"
                onValueChange={(next) => {
                  set(next ? toIso(next) : "");
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

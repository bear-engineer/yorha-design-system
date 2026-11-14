import * as React from "react";
import type { DateRange } from "./calendar";

// RED stub: renders nothing so play tests fail on assertions.
export function formatDate(_d: Date, _l: string): string {
  return "";
}
export function parseDate(_t: string, _l: string): Date | null {
  return null;
}
interface StubProps {
  label: React.ReactNode;
  today?: Date;
  [key: string]: unknown;
}
export function DatePicker(_props: StubProps & { value?: Date | null; defaultValue?: Date | null; onValueChange?: (d: Date | null) => void }) {
  return <div data-slot="date-picker" />;
}
export function DateRangePicker(_props: StubProps & { value?: DateRange; defaultValue?: DateRange; onValueChange?: (d: DateRange) => void }) {
  return <div data-slot="date-range-picker" />;
}

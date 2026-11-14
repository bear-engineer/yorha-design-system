import * as React from "react";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}
export function getWeekStart(_locale: string): number {
  return 1;
}
type Props = Record<string, unknown> & { mode?: "single" | "range" };
// RED stub: renders nothing so play tests fail on assertions.
export const Calendar = React.forwardRef<HTMLDivElement, Props & Partial<{ today: Date }>>(function Calendar(_props, ref) {
  return <div ref={ref} data-slot="calendar" />;
});

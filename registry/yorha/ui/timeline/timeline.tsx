import * as React from "react";

export type TimelineDate = Date | string | number;
export type TimelineScale = "hour" | "day" | "week";
export type TimelineView = "graph" | "table";
export type TimelineStatus = "info" | "success" | "warn" | "danger";

export interface TimelineGraphProps {
  label: string;
  lanes: { id: string; label: string }[];
  items: { id: string; lane: string; title: string; start: TimelineDate; end?: TimelineDate; dependsOn?: string[] }[];
  range: { start: TimelineDate; end: TimelineDate };
}

/** Red-phase stub. */
export function TimelineGraph({ label }: TimelineGraphProps) {
  return <div role="group" aria-label={label} />;
}

export interface TimelineProps {
  items: { id: string; time: TimelineDate; title: string; body?: React.ReactNode; status?: TimelineStatus }[];
}

export function Timeline(_props: TimelineProps) {
  return <ol />;
}

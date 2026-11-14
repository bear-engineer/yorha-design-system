import type { ReactNode } from "react";

export type SortDirection = "none" | "ascending" | "descending";
export type DataTableDensity = "dense" | "comfortable";

// RED stub: compiles, renders the wrong structure on purpose.
export function DataTable({ caption, children }: { caption: ReactNode; density?: DataTableDensity; zebra?: boolean; children?: ReactNode }) {
  return <div>{children}</div>;
}
export function DataTableHeader({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}
export function DataTableBody({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}
export function DataTableRow({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}
export function DataTableHeadCell({ children }: { children?: ReactNode; sortable?: boolean; sortDirection?: SortDirection; onSortChange?: (next: SortDirection) => void }) {
  return <div>{children}</div>;
}
export function DataTableCell({ children }: { children?: ReactNode; numeric?: boolean }) {
  return <div>{children}</div>;
}

import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: ReactNode;
  /** Router path. Items without `to` render as plain text. The last item is always the current page. */
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Accessible name of the nav landmark. */
  label?: string;
  className?: string;
}

// Links are underlined at all times, so the link state never depends on hover.
const LINK =
  "font-yorha-medium uppercase tracking-yorha-wide text-yorha-fg-soft underline underline-offset-4 decoration-1 " +
  "inline-flex min-h-[24px] min-w-[24px] items-center justify-center focus-visible:yorha-focus";
const CURRENT = "font-yorha-bold uppercase tracking-yorha-wide text-yorha-fg";
const TEXT = "font-yorha-medium uppercase tracking-yorha-wide text-yorha-fg-soft";

/** Location trail in a nav landmark. The last item is the current page: `aria-current="page"`, never a link. */
export function Breadcrumb({ items, label = "경로", className }: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={cn("min-w-0 text-yorha-xs leading-yorha-snug", className)}>
      <ol className="m-0 flex flex-wrap items-center gap-y-1 p-0 list-none">
        {items.map((item, i) => {
          const isCurrent = i === items.length - 1;
          return (
            <li key={i} className="inline-flex items-center">
              {i > 0 && (
                <span data-slot="breadcrumb-separator" aria-hidden="true" className="px-2 text-yorha-fg-soft">
                  /
                </span>
              )}
              {isCurrent ? (
                <span aria-current="page" className={CURRENT}>
                  {item.label}
                </span>
              ) : item.to !== undefined ? (
                <Link to={item.to} className={LINK}>
                  {item.label}
                </Link>
              ) : (
                <span className={TEXT}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

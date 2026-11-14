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
// Text sits on the nav's edge: `-mx-2 px-2` widens the hit target without moving the label, and the
// separator's fixed `mx-2` makes both gaps around it equal. Labels stop at 24ch and end in an ellipsis.
const CLIP = "block max-w-[24ch] overflow-hidden text-ellipsis whitespace-nowrap leading-6";
const LINK =
  `${CLIP} -mx-2 px-2 text-left font-yorha-medium uppercase tracking-yorha-wide text-yorha-fg-soft underline underline-offset-4 decoration-1 ` +
  "focus-visible:yorha-focus";
const CURRENT = `${CLIP} font-yorha-bold uppercase tracking-yorha-wide text-yorha-fg`;
const TEXT = `${CLIP} font-yorha-medium uppercase tracking-yorha-wide text-yorha-fg-soft`;
const titleOf = (label: ReactNode) => (typeof label === "string" ? label : undefined);

/** Location trail in a nav landmark. The last item is the current page: `aria-current="page"`, never a link. */
export function Breadcrumb({ items, label = "경로", className }: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={cn("min-w-0 text-yorha-xs", className)}>
      <ol className="m-0 flex flex-wrap items-center gap-y-1 p-0 list-none">
        {items.map((item, i) => {
          const isCurrent = i === items.length - 1;
          return (
            <li key={i} className="inline-flex min-w-0 items-center">
              {i > 0 && (
                <span data-slot="breadcrumb-separator" aria-hidden="true" className="mx-2 shrink-0 text-yorha-fg-soft">
                  /
                </span>
              )}
              {isCurrent ? (
                <span aria-current="page" title={titleOf(item.label)} className={CURRENT}>
                  {item.label}
                </span>
              ) : item.to !== undefined ? (
                <Link to={item.to} title={titleOf(item.label)} className={LINK}>
                  {item.label}
                </Link>
              ) : (
                <span title={titleOf(item.label)} className={TEXT}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

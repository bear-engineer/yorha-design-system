import type { ReactNode } from "react";
import { Heading } from "@/components/ui/heading";
import { Ornament } from "@/components/ui/ornament";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Rendered as the page's only h1. */
  title: ReactNode;
  /** Breadcrumb trail (or any navigation) shown above the eyebrow, on the 24px baseline of the Breadcrumb. */
  breadcrumb?: ReactNode;
  /** Section code shown above the title, e.g. "SEC-07". */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Action buttons, aligned to the title row. */
  actions?: ReactNode;
  /** Decorative ornament band under the header. Default true. */
  ornament?: boolean;
  className?: string;
}

/** Page title block. Keeps one h1 per page; the ornament band is decorative only and its rule is the block's bottom edge. */
export function PageHeader({ title, breadcrumb, eyebrow, description, actions, ornament = true, className }: PageHeaderProps) {
  return (
    <div data-slot="page-header" className={cn("flex flex-col gap-3 bg-yorha-panel px-6 pt-6 text-yorha-fg", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          {breadcrumb && <div data-slot="page-header-breadcrumb" className="min-w-0 pl-2">{breadcrumb}</div>}
          {eyebrow && (
            <p data-slot="page-header-eyebrow" className="m-0 font-yorha-mono text-yorha-xs uppercase tracking-yorha-wide text-yorha-fg-soft">
              {eyebrow}
            </p>
          )}
          <Heading level={1}>{title}</Heading>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="m-0 max-w-prose text-yorha-sm leading-yorha-body text-yorha-fg-soft">{description}</p>}
      {ornament && <Ornament variant="band" className="mt-2 -mb-1.5" />}
    </div>
  );
}

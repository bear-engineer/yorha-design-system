import type { ReactNode } from "react";
import { Link } from "react-router";
import { Glyph } from "@/components/ui/glyph";
import { Menu, MenuContent, MenuItem, MenuLinkItem, MenuTrigger } from "@/components/ui/menu";
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
  /** More items than this collapse their middle levels into a "..." menu (first item and the last `maxItems - 2` stay). Default 4; minimum 3. */
  maxItems?: number;
  className?: string;
}

/*
 * Anatomy (v4 craft pass). Every item is [label box 24px tall] and every separator is a fixed 12x12 glyph cell with 12px margins:
 *  - the label box is the text plus 4px of ink padding, drawn by an inner span (`-mx-1 px-1`), so hover fill and focus ring hug the label;
 *  - the link around it adds 8px of invisible hit slop (`-mx-2 px-2`) to reach the 24px target; neither state ever moves a neighbour;
 *  - the focus ring (2px + 2px offset) reaches 8px from the text; the separator cell starts 12px from it, so ring and cell never touch;
 *  - hover = 1px underline stays, ink fills the label box (ease-out wipe, background-size only); current = leading diamond glyph + bold, no fill,
 *    so hover and current never look alike. Korean-friendly: no uppercase, no tracking.
 */
const TEXT = "block min-w-0 max-w-[24ch] truncate leading-6";
const LABEL_BOX = "-mx-1 px-1";
const FILL =
  "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-no-repeat bg-[length:0%_100%] bg-left yorha-wipe " +
  "[@media(hover:hover)_and_(pointer:fine)]:group-hover/crumb:bg-[length:100%_100%] [@media(hover:hover)_and_(pointer:fine)]:group-hover/crumb:text-yorha-on-ink " +
  "[@media(hover:hover)_and_(pointer:fine)]:group-hover/crumb:[transition-duration:var(--motion-select),var(--motion-press)]";
const LINK =
  "group/crumb -mx-2 inline-flex min-w-0 px-2 no-underline outline-none focus-visible:outline-hidden";
const LINK_LABEL = cn(
  TEXT,
  LABEL_BOX,
  "font-yorha-medium text-yorha-fg-soft underline underline-offset-4 decoration-1 group-focus-visible/crumb:yorha-focus",
  FILL,
);
const titleOf = (label: ReactNode) => (typeof label === "string" ? label : undefined);

function Separator() {
  return (
    <span data-slot="breadcrumb-separator" aria-hidden="true" className="mx-3 block size-icon-sm shrink-0 text-yorha-fg-soft">
      <Glyph name="chevron-right" />
    </span>
  );
}

/** Location trail in a nav landmark. The last item is the current page: `aria-current="page"`, never a link. */
export function Breadcrumb({ items, label = "경로", maxItems = 4, className }: BreadcrumbProps) {
  const max = Math.max(3, maxItems);
  const collapse = items.length > max;
  const tail = max - 2;
  const hidden = collapse ? items.slice(1, items.length - tail) : [];
  const shown: Array<BreadcrumbItem | "more"> = collapse ? [items[0]!, "more", ...items.slice(items.length - tail)] : items;
  return (
    <nav aria-label={label} data-slot="breadcrumb" className={cn("min-w-0 text-yorha-xs", className)}>
      <ol className="m-0 flex flex-wrap items-center gap-y-1 p-0 list-none">
        {shown.map((item, i) => {
          const isCurrent = i === shown.length - 1;
          return (
            <li key={i} className="inline-flex min-w-0 items-center">
              {i > 0 && <Separator />}
              {item === "more" ? (
                <Menu>
                  <MenuTrigger
                    aria-label={`숨겨진 경로 ${hidden.length}개 보기`}
                    title={`숨겨진 경로 ${hidden.length}개`}
                    data-slot="breadcrumb-more"
                    className="h-6 min-h-6 w-6 min-w-6 border-0 bg-transparent p-0 text-yorha-fg-soft shadow-none hover:text-yorha-fg"
                  >
                    <Glyph name="dots" />
                  </MenuTrigger>
                  <MenuContent>
                    {hidden.map((h, k) =>
                      h.to !== undefined ? (
                        <MenuLinkItem key={k} render={<Link to={h.to} />}>
                          {h.label}
                        </MenuLinkItem>
                      ) : (
                        <MenuItem key={k} disabled>
                          {h.label}
                        </MenuItem>
                      ),
                    )}
                  </MenuContent>
                </Menu>
              ) : isCurrent ? (
                <span aria-current="page" title={titleOf(item.label)} className={cn("inline-flex min-w-0 items-center gap-1.5 font-yorha-bold text-yorha-fg", LABEL_BOX)}>
                  <Glyph name="diamond" box={12} className="text-yorha-fg" data-slot="breadcrumb-current-mark" />
                  <span className={TEXT}>{item.label}</span>
                </span>
              ) : item.to !== undefined ? (
                <Link to={item.to} title={titleOf(item.label)} className={LINK}>
                  <span data-slot="breadcrumb-label" className={LINK_LABEL}>
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span title={titleOf(item.label)} className={cn(TEXT, "font-yorha-medium text-yorha-fg-soft")}>
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

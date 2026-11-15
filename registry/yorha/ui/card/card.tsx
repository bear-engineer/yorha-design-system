import type { ReactNode } from "react";
import { Glyph } from "@/components/ui/glyph";
import { cn } from "@/lib/utils";

export interface CardProps {
  /** Card heading. Becomes the whole-card link text when `href` is set. */
  title: ReactNode;
  meta?: ReactNode;
  /** Optional media slot (image, illustration, glyph). Must not contain interactive elements. */
  media?: ReactNode;
  /** Action row. Rendered above the stretched link, so it stays a separate tab stop. */
  actions?: ReactNode;
  /** Sits at the end of the title row (a drag handle, a menu button). Stays above the stretched link. */
  titleAction?: ReactNode;
  /** Makes the whole card a single link. The link is the only interactive element covering the card. */
  href?: string;
  /** Marks the card as selected: a corner check mark and a 2 px frame (colour-independent), never a size change. */
  selected?: boolean;
  /** Makes the card a toggle: the title becomes a stretched `button[aria-pressed]` (ignored for the toggle role when `href` is set, where `selected` is display-only). */
  onSelectedChange?: (selected: boolean) => void;
  className?: string;
}

/**
 * Content card. With `href`, the title link is stretched over the card with `::after`, so a click
 * anywhere on the card follows it. Actions sit in a `z-10` layer, so they keep their own clicks and
 * stay outside the link (no nested interactive elements, one tab stop for the link).
 */
export function Card({ title, meta, media, actions, titleAction, href, selected, onSelectedChange, className }: CardProps) {
  const toggle = !href && onSelectedChange !== undefined;
  return (
    <article
      data-slot="card"
      data-selected={selected ? "" : undefined}
      className={cn(
        "group/card relative flex flex-col gap-3 rounded-yorha border border-yorha-border bg-yorha-bg p-4 font-yorha text-yorha-fg shadow-yorha-sm",
        (href || toggle) && "yorha-tint transition-colors duration-(--motion-select) ease-yorha-out has-[a:focus-visible]:yorha-focus has-[button[aria-pressed]:focus-visible]:yorha-focus",
        toggle && "cursor-pointer",
        "data-[selected]:border-yorha-ink data-[selected]:inset-ring-1 data-[selected]:inset-ring-yorha-ink",
        className,
      )}
    >
      {selected !== undefined ? (
        <span
          aria-hidden="true"
          data-slot="card-mark"
          className="pointer-events-none absolute top-0 right-0 grid size-4 place-items-center bg-yorha-ink text-yorha-on-ink opacity-0 transition-opacity [transition-duration:max(var(--motion-select),var(--motion-reduced-fade))] ease-yorha-out group-data-[selected]/card:opacity-100"
        >
          <Glyph name="check" box={12} />
        </span>
      ) : null}
      {media ? <div className="overflow-hidden border-b border-yorha-border">{media}</div> : null}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-balance text-yorha-fg-strong">
          {href ? (
            <a href={href} className="rounded-yorha outline-none after:absolute after:inset-0 after:content-['']">
              {title}
            </a>
          ) : toggle ? (
            <button
              type="button"
              aria-pressed={selected === true}
              onClick={() => onSelectedChange?.(!selected)}
              className="cursor-pointer rounded-yorha text-left uppercase outline-none after:absolute after:inset-0 after:content-['']"
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
        {titleAction ? <div className="relative z-10 flex h-7 shrink-0 items-center">{titleAction}</div> : null}
      </div>
      {meta ? <div className="text-yorha-sm text-yorha-fg-soft">{meta}</div> : null}
      {actions ? <div className="relative z-10 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

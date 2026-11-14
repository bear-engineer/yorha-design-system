import type { ReactNode } from "react";
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
  className?: string;
}

/**
 * Content card. With `href`, the title link is stretched over the card with `::after`, so a click
 * anywhere on the card follows it. Actions sit in a `z-10` layer, so they keep their own clicks and
 * stay outside the link (no nested interactive elements, one tab stop for the link).
 */
export function Card({ title, meta, media, actions, titleAction, href, className }: CardProps) {
  return (
    <article
      data-slot="card"
      className={cn(
        "relative flex flex-col gap-3 rounded-yorha border border-yorha-border bg-yorha-bg p-4 font-yorha text-yorha-fg shadow-yorha-sm",
        href && "yorha-tint transition-colors duration-(--motion-select) ease-yorha-out has-[a:focus-visible]:yorha-focus",
        className,
      )}
    >
      {media ? <div className="overflow-hidden border-b border-yorha-border">{media}</div> : null}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-balance text-yorha-fg-strong">
          {href ? (
            <a href={href} className="rounded-yorha outline-none after:absolute after:inset-0 after:content-['']">
              {title}
            </a>
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

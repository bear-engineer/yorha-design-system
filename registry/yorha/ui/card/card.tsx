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
  /** Makes the whole card a single link. The link is the only interactive element covering the card. */
  href?: string;
  className?: string;
}

/**
 * Content card. With `href`, the title link is stretched over the card with `::after`, so a click
 * anywhere on the card follows it. Actions sit in a `z-10` layer, so they keep their own clicks and
 * stay outside the link (no nested interactive elements, one tab stop for the link).
 */
export function Card({ title, meta, media, actions, href, className }: CardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-yorha border border-yorha-border bg-yorha-bg p-4 font-yorha text-yorha-fg shadow-yorha-sm",
        className,
      )}
    >
      {media ? <div className="overflow-hidden border-b border-yorha-border">{media}</div> : null}
      <h3 className="font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-yorha-fg-strong">
        {href ? (
          <a
            href={href}
            className="rounded-yorha after:absolute after:inset-0 after:content-[''] focus-visible:yorha-focus"
          >
            {title}
          </a>
        ) : (
          title
        )}
      </h3>
      {meta ? <div className="text-yorha-sm text-yorha-fg-soft">{meta}</div> : null}
      {actions ? <div className="relative z-10 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

import { useId, type HTMLAttributes, type ReactNode } from "react";
import { Heading, type HeadingLevel } from "@/components/ui/heading";
import { Ornament } from "@/components/ui/ornament";
import { cn } from "@/lib/utils";

export type PanelOrnaments = "none" | "top" | "bottom" | "both";

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Landmark element. `section` and `article` take a name from the title; `div` becomes role=group when titled. */
  as?: "section" | "article" | "div";
  /** Shown in the dark header strip. Also the accessible name. */
  title?: ReactNode;
  titleLevel?: HeadingLevel;
  ornaments?: PanelOrnaments;
}

const SURFACE = "relative flex flex-col border border-yorha-border rounded-yorha bg-yorha-panel text-yorha-fg";
const HEADER = "flex items-center gap-2 bg-yorha-ink px-4 py-2 text-yorha-on-ink";
const BODY = "flex flex-1 flex-col gap-3 p-4";

export function Panel({
  as = "section",
  title,
  titleLevel = 3,
  ornaments = "none",
  className,
  children,
  ...rest
}: PanelProps) {
  const titleId = useId();
  const titled = Boolean(title);
  const Tag = as;
  const showTop = ornaments === "top" || ornaments === "both";
  const showBottom = ornaments === "bottom" || ornaments === "both";

  return (
    <Tag
      {...rest}
      aria-labelledby={titled ? titleId : undefined}
      role={as === "div" && titled ? "group" : undefined}
      className={cn(SURFACE, showTop && "border-t-0", showBottom && "border-b-0", className)}
    >
      {showTop && <Ornament variant="band" />}
      {titled && (
        <div className={HEADER}>
          <Heading id={titleId} level={titleLevel}>
            {title}
          </Heading>
        </div>
      )}
      <div className={BODY}>{children}</div>
      {showBottom && <Ornament variant="band" />}
    </Tag>
  );
}

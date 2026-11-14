import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextSize = "xs" | "sm" | "base" | "lg" | "xl";
export type TextWeight = "regular" | "medium" | "bold";
export type TextTone = "default" | "muted" | "strong";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Rendered element. Default span. */
  as?: "span" | "p" | "div";
  size?: TextSize;
  weight?: TextWeight;
  tone?: TextTone;
  /** Tabular figures, so numbers align in columns. */
  tabular?: boolean;
  /**
   * Single line, ellipsis when clipped. The full text stays in the DOM; `title` (defaulting to a string child)
   * shows it on hover and it is read by assistive tech regardless of clipping.
   */
  truncate?: boolean;
  /** Clamp to N lines with an ellipsis. Same accessibility rule as truncate. Takes precedence over truncate. */
  lineClamp?: number;
}

const SIZE: Record<TextSize, string> = {
  xs: "text-yorha-xs",
  sm: "text-yorha-sm",
  base: "text-yorha-base",
  lg: "text-yorha-lg",
  xl: "text-yorha-xl",
};
const WEIGHT: Record<TextWeight, string> = {
  regular: "font-yorha-regular",
  medium: "font-yorha-medium",
  bold: "font-yorha-bold",
};
const TONE: Record<TextTone, string> = {
  default: "text-yorha-fg",
  muted: "text-yorha-fg-muted",
  strong: "text-yorha-fg-strong",
};

export function Text({
  as = "span",
  size = "base",
  weight = "regular",
  tone = "default",
  tabular = false,
  truncate = false,
  lineClamp,
  title,
  className,
  style,
  children,
  ...rest
}: TextProps) {
  const Tag = as;
  const clamped = lineClamp !== undefined;
  const clipped = clamped || truncate;
  const clampStyle: CSSProperties | undefined = clamped
    ? { display: "-webkit-box", WebkitLineClamp: lineClamp, WebkitBoxOrient: "vertical", overflow: "hidden" }
    : undefined;
  return (
    <Tag
      className={cn(
        SIZE[size],
        WEIGHT[weight],
        TONE[tone],
        tabular && "yorha-tabular",
        truncate && !clamped && "block truncate",
        className,
      )}
      style={{ ...clampStyle, ...style }}
      title={title ?? (clipped && typeof children === "string" ? children : undefined)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

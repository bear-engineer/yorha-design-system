import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type Ref } from "react";
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
  /**
   * With `lineClamp`: an expand/collapse button (`aria-expanded`) appears when the clamp hides text (V4-267).
   * Its 24 px row is always reserved, and the button is visibility-hidden while the text fits.
   */
  expandable?: boolean;
  ref?: Ref<HTMLElement>;
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
  expandable = false,
  title,
  className,
  style,
  children,
  ref,
  ...rest
}: TextProps) {
  const Tag = as;
  const clamped = lineClamp !== undefined;
  const clipped = clamped || truncate;
  const canExpand = expandable && clamped;
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!canExpand) return;
    const el = elRef.current;
    if (!el) return;
    const measure = () => {
      if (!expanded) setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canExpand, expanded]);

  const clampOn = clamped && !(canExpand && expanded);
  const clampStyle: CSSProperties | undefined = clampOn
    ? { display: "-webkit-box", WebkitLineClamp: lineClamp, WebkitBoxOrient: "vertical", overflow: "hidden" }
    : undefined;
  const setRef = (node: HTMLElement | null) => {
    elRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLElement | null }).current = node;
  };

  const body = (
    <Tag
      ref={setRef}
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

  if (!canExpand) return body;
  const showControl = overflowing || expanded;
  return (
    <div data-slot="text-expandable" className="flex flex-col items-start">
      {body}
      <button
        type="button"
        aria-expanded={expanded}
        data-slot="text-expand"
        onClick={() => setExpanded((e) => !e)}
        style={{ visibility: showControl ? "visible" : "hidden" }}
        className="inline-flex h-6 items-center px-1 text-yorha-sm text-yorha-fg-strong yorha-link focus-visible:yorha-focus"
      >
        {expanded ? "접기" : "더 보기"}
      </button>
    </div>
  );
}

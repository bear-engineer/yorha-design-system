import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level, rendered as the matching h1-h6 element. Default 2. */
  level?: HeadingLevel;
}

const SIZE: Record<HeadingLevel, string> = {
  1: "text-yorha-3xl",
  2: "text-yorha-2xl",
  3: "text-yorha-xl",
  4: "text-yorha-lg",
  5: "text-yorha-base",
  6: "text-yorha-sm",
};

// Colour is inherited so the caller's surface decides it (panel header strip, page, etc.).
// Korean: no uppercase transform and no wide tracking (CJK glyphs have no case and break apart).
const BASE =
  "font-yorha font-yorha-bold uppercase tracking-yorha-heading " +
  "[&:lang(ko)]:normal-case [&:lang(ko)]:tracking-yorha-body";
// The offset shadow is for the page title only (36px, Latin). Never on ink strips or below 36px, and CJK glyphs smear.
const SHADOW = "text-shadow-yorha [&:lang(ko)]:text-shadow-none [&:lang(ja)]:text-shadow-none";

export function Heading({ level = 2, className, ...rest }: HeadingProps) {
  const Tag = `h${level}` as const;
  return <Tag className={cn(BASE, SIZE[level], level === 1 && SHADOW, className)} {...rest} />;
}

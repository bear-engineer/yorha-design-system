import { extendTailwindMerge } from "tailwind-merge";

export type ClassValue = string | number | false | null | undefined | ClassValue[];

/** Names from the generated `@theme inline` block (--color-yorha-*, --text-yorha-*, ...), without the `yorha-` prefix. */
const COLORS = ["bg", "panel", "grid", "line-deco", "fg-ink", "fg-strong", "fg", "fg-soft", "fg-muted", "border", "separator", "ink", "on-ink", "on-ink-soft", "control", "on-control", "alert", "alert-ui", "alert-on-ink", "ring", "shadow", "scrim"];
const TEXT_SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "display"];
const LEADINGS = ["tight", "snug", "body", "body-cjk"];
const TRACKINGS = ["body", "wide", "heading"];
const SHADOWS = ["sm", "md", "lg"];
const EASES = ["", "out", "in", "emphasized", "decelerate"];
const FONTS = ["", "ja", "mono"];
const FONT_WEIGHTS = ["light", "regular", "medium", "bold"];
/** Transition motion utilities: they all own transition-property/duration/timing, so the last one wins. */
const MOTION = ["pop", "panel", "fade", "slide-up", "slide-down", "slide-left", "slide-right", "collapse", "press"];

const pre = (names: string[]) => names.map((name) => (name ? `yorha-${name}` : "yorha"));

const twMerge = extendTailwindMerge<"yorha-motion" | "yorha-stagger">({
  extend: {
    theme: {
      color: pre(COLORS),
      text: pre(TEXT_SIZES),
      leading: pre(LEADINGS),
      tracking: pre(TRACKINGS),
      shadow: pre(SHADOWS),
      "text-shadow": ["yorha"],
      radius: ["yorha"],
      ease: pre(EASES),
      font: pre(FONTS),
      "font-weight": pre(FONT_WEIGHTS),
    },
    classGroups: {
      "yorha-motion": MOTION.map((name) => `yorha-${name}`),
      "yorha-stagger": ["yorha-stagger"],
    },
  },
});

/** Join class names and resolve Tailwind conflicts: the last conflicting utility wins (consumer overrides need no `!`). */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    out.push(String(v));
  };
  inputs.forEach(walk);
  return twMerge(out.join(" "));
}

/**
 * Compose a Base UI className prop (string or state => string) with kit classes.
 * Base UI components accept `className` as a function of their state.
 */
export function cnState<S>(
  base: ClassValue,
  className: string | ((state: S) => string | undefined) | undefined,
): string | ((state: S) => string) {
  if (typeof className === "function") return (state: S) => cn(base, className(state));
  return cn(base, className);
}

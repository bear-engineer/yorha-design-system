import * as React from "react";

import { runFx } from "@/lib/fx";
import { cn } from "@/lib/utils";

export interface GlitchHandle {
  /** Starts one `yorha-glitch` run. Returns false when ignored (a run started less than 1000 ms ago). */
  replay: () => boolean;
}

export interface GlitchProps extends Omit<React.ComponentProps<"span">, "children" | "ref"> {
  /** Display text. String only: the glitch layers repeat it through `data-text`. */
  text: string;
  /** Rendered element. Default span; use a heading for display titles. */
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4";
  /** Ref handle with `replay()`. */
  ref?: React.Ref<GlitchHandle>;
}

/** Reduced or off motion (or OS reduced-motion with no setting): no glitch run at all. */
function glitchAllowed(): boolean {
  if (typeof document === "undefined") return false;
  const mode = document.documentElement.dataset.motion;
  if (mode === "reduced" || mode === "off") return false;
  if (mode === "full") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Display text with a one-shot RGB channel-split glitch, for system faults only. It plays once at mount and on
 * `replay()`. The text is the element's only content, so the accessible name is the text; the glitch layers are
 * pseudo-elements with an empty alt text. Never use it on text being read or typed.
 */
export function Glitch({ text, as = "span", className, ref, ...props }: GlitchProps) {
  const hostRef = React.useRef<HTMLSpanElement | null>(null);
  // `as` only picks the element; every allowed tag takes the same ref and props.
  const Tag = as as "span";

  React.useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        if (!glitchAllowed()) return false;
        return runFx(hostRef.current);
      },
    }),
    [],
  );

  React.useEffect(() => {
    if (glitchAllowed()) runFx(hostRef.current);
  }, []);

  return (
    <Tag
      ref={hostRef}
      data-glitch=""
      data-text={text}
      className={cn("yorha-glitch", className)}
      {...props}
    >
      {text}
    </Tag>
  );
}

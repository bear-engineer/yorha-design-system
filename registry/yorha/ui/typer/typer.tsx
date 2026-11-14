import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export interface TyperProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Full text. Always readable by assistive tech from the first render. */
  text: string;
  /** Milliseconds per character. Default 35. */
  speed?: number;
  /** Stops the reveal while true; resumes when false. */
  paused?: boolean;
  /** Shows the full text now (skip). */
  revealAll?: boolean;
  /** Fires once per text when fully revealed (immediately under reduced or off motion). */
  onComplete?: () => void;
  /** Plays the typing-tick cue per revealed character. Off by default; needs a YorhaProvider. */
  sound?: boolean;
}

const DEFAULT_SPEED = 35;

/** Instant when `data-motion` is reduced/off, or when it is unset and the OS prefers reduced motion. */
function isInstantMotion(): boolean {
  if (typeof document === "undefined") return false;
  const motion = document.documentElement.dataset.motion;
  if (motion === "reduced" || motion === "off") return true;
  if (motion === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Tracks {@link isInstantMotion}, re-rendering when the data attribute or the OS setting changes. */
export function useInstantMotion(): boolean {
  const [instant, setInstant] = useState(isInstantMotion);
  useEffect(() => {
    const sync = () => setInstant(isInstantMotion());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    query.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      query.removeEventListener("change", sync);
    };
  }, []);
  return instant;
}

/** Plays the tick once per new revealed character. Rendered only when `sound` is set. */
function TypingTick({ count }: { count: number }) {
  const { play } = useSound();
  useEffect(() => {
    if (count > 0) play("typing-tick");
  }, [count, play]);
  return null;
}

/** Typing reveal: the full text is a visually hidden node; the typed portion is aria-hidden. */
function Typer({ text, speed = DEFAULT_SPEED, paused = false, revealAll = false, onComplete, sound = false, className, ...props }: TyperProps) {
  const chars = Array.from(text);
  const total = chars.length;
  const instant = useInstantMotion();
  const [progress, setProgress] = useState({ text, n: 0 });
  const n = progress.text === text ? progress.n : 0;
  const showAll = instant || revealAll;
  const shown = showAll ? total : n;
  const done = shown >= total;

  useEffect(() => {
    if (paused || showAll || n >= total) return;
    const id = window.setTimeout(() => setProgress({ text, n: n + 1 }), speed);
    return () => window.clearTimeout(id);
  }, [paused, showAll, n, total, text, speed]);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  const firedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!done || firedFor.current === text) return;
    firedFor.current = text;
    onCompleteRef.current?.();
  }, [done, text]);

  return (
    <span data-slot="typer" data-state={done ? "done" : "typing"} className={cn("whitespace-pre-wrap", className)} {...props}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" data-yorha-typed="">
        {chars.slice(0, shown).join("")}
      </span>
      {!done && <span aria-hidden="true" data-yorha-caret="" className="ml-px inline-block h-[1em] w-[0.5em] align-[-0.1em] bg-yorha-fg-strong" />}
      {sound && !instant && !paused && <TypingTick count={shown} />}
    </span>
  );
}

export { Typer };

import { useEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent } from "react";
import { Glyph, type GlyphName } from "@/components/ui/glyph";
import { Glitch } from "@/components/ui/decipher";
import { Typer, useInstantMotion } from "@/components/ui/typer";
import { cn } from "@/lib/utils";

export type BootStatus = "ok" | "warn" | "fail" | "info";

export interface BootLogLine {
  text: string;
  status?: BootStatus;
  /** Milliseconds since boot start. Default: previous line + 250 ms (first line 0). */
  at?: number;
}

export interface BootLogProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  lines: readonly BootLogLine[];
  /** Milliseconds per character. Default 25. */
  speed?: number;
  /** Pause between finished lines, ms. Default 200. */
  gap?: number;
  /** Accessible name of the log. Default "부팅 로그". */
  label?: string;
  /** Plays the typing tick for each character (needs a YorhaProvider). Off by default. */
  sound?: boolean;
  onComplete?: () => void;
}

const DEFAULT_SPEED = 25;
const DEFAULT_GAP = 200;
const LINE_STEP_MS = 250;
const LONG_RUN_MS = 5000;

const TAG: Record<BootStatus, { label: string; className: string }> = {
  ok: { label: "OK", className: "text-yorha-fg-strong" },
  warn: { label: "WARN", className: "text-yorha-fg-strong" },
  fail: { label: "FAIL", className: "text-yorha-alert" },
  info: { label: "INFO", className: "text-yorha-fg-soft" },
};

// Status marks are a glyph plus the text tag, never colour alone (V4-266).
const STATUS_GLYPH: Record<BootStatus, GlyphName> = { ok: "check", warn: "alert", fail: "cross", info: "info" };

function stampsOf(lines: readonly BootLogLine[]): number[] {
  let t = 0;
  return lines.map((line, i) => {
    t = line.at ?? (i === 0 ? 0 : t + LINE_STEP_MS);
    return t;
  });
}

function formatStamp(ms: number): string {
  const whole = Math.floor(ms);
  return `${String(Math.floor(whole / 1000)).padStart(4, "0")}.${String(whole % 1000).padStart(3, "0")}`;
}

const controlClass =
  "inline-flex h-control-sm items-center border border-yorha-border px-pad-sm text-yorha-sm text-yorha-fg hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus yorha-disabled";

/** A fault line: shown at once through Glitch, once. Reports done on mount so the run moves on (V4-263). */
function FaultLine({ text, onDone }: { text: string; onDone: () => void }) {
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    doneRef.current();
  }, []);
  return <Glitch text={text} className="whitespace-pre-wrap" />;
}

/**
 * Boot sequence: lines are typed one after another. Every line is mounted from the first frame; lines not yet
 * reached are hidden (visibility), so the final height is reserved (V4-260). A click or any key on the focused
 * log skips the run. Controls appear when the whole run would exceed 5 s. The log is a polite live region.
 * Reduced or off motion prints every line at once with no controls.
 */
function BootLog({ lines, speed = DEFAULT_SPEED, gap = DEFAULT_GAP, label = "부팅 로그", sound = false, onComplete, className, ...props }: BootLogProps) {
  const instant = useInstantMotion();
  const total = lines.length;
  const [shown, setShown] = useState(1);
  const [lineDone, setLineDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const all = instant || skipped;
  const visible = all ? total : Math.min(shown, total);
  const finished = visible >= total && (all || lineDone);
  const doneUpTo = all ? total : lineDone ? visible : Math.max(0, visible - 1);

  useEffect(() => {
    if (paused || all || !lineDone || shown >= total) return;
    const id = window.setTimeout(() => {
      setShown((s) => s + 1);
      setLineDone(false);
    }, gap);
    return () => window.clearTimeout(id);
  }, [paused, all, lineDone, shown, total, gap]);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  const fired = useRef(false);
  useEffect(() => {
    if (!finished || fired.current) return;
    fired.current = true;
    onCompleteRef.current?.();
  }, [finished]);

  const skip = () => {
    if (!finished) setSkipped(true);
  };
  const onLogKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (finished) return;
    e.preventDefault();
    skip();
  };

  const stamps = stampsOf(lines);
  const runMs = lines.reduce((sum, line) => sum + Array.from(line.text).length, 0) * speed + Math.max(0, total - 1) * gap;
  const longRun = !instant && runMs > LONG_RUN_MS;

  return (
    <div data-slot="boot-log" className={cn("flex flex-col gap-3", className)} {...props}>
      <div
        role="log"
        aria-label={label}
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={finished ? undefined : 0}
        onClick={skip}
        onKeyDown={onLogKey}
        className="flex flex-col gap-1 focus-visible:yorha-focus"
      >
        {lines.map((line, i) => {
          const status = line.status ?? "info";
          const hidden = i >= visible;
          return (
            <div
              key={i}
              data-slot="boot-log-line"
              data-status={status}
              data-done={i < doneUpTo ? "" : undefined}
              className={cn("flex gap-3", hidden && "invisible")}
            >
              <span className="shrink-0 tabular-nums text-yorha-fg-soft">[{formatStamp(stamps[i] ?? 0)}]</span>
              <span className={cn("inline-flex shrink-0 items-center gap-1.5", TAG[status].className)}>
                <Glyph name={STATUS_GLYPH[status]} />
                [{TAG[status].label}]
              </span>
              {status === "fail" ? (
                !hidden && <FaultLine text={line.text} onDone={i === visible - 1 ? () => setLineDone(true) : () => {}} />
              ) : (
                <Typer
                  text={line.text}
                  speed={speed}
                  paused={paused || hidden}
                  revealAll={all}
                  sound={sound}
                  caret={i === visible - 1}
                  onComplete={i === visible - 1 ? () => setLineDone(true) : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
      {longRun && (
        <div className="flex gap-2">
          <button type="button" disabled={finished} onClick={() => setPaused((p) => !p)} className={controlClass}>
            {paused ? "재개" : "일시정지"}
          </button>
          <button type="button" disabled={finished} onClick={() => setSkipped(true)} className={controlClass}>
            건너뛰기
          </button>
        </div>
      )}
    </div>
  );
}

export { BootLog };

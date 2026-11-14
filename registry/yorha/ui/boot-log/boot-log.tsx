// RED stub: compiles, renders the wrong thing (no sequencing, no controls).
import type { HTMLAttributes } from "react";

export type BootStatus = "ok" | "warn" | "fail" | "info";

export interface BootLogLine {
  text: string;
  status?: BootStatus;
  at?: number;
}

export interface BootLogProps extends HTMLAttributes<HTMLDivElement> {
  lines: readonly BootLogLine[];
  speed?: number;
  gap?: number;
  label?: string;
  onComplete?: () => void;
}

export function BootLog({ lines, label = "부팅 로그", speed: _s, gap: _g, onComplete: _o, ...props }: BootLogProps) {
  return (
    <div {...props}>
      <div role="log" aria-label={label} aria-live="polite">
        {lines.map((l, i) => (
          <div key={i}>
            <span className="sr-only">{l.text}</span>
            <span data-yorha-typed="">{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

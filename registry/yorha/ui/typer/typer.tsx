// RED stub: compiles, renders the wrong thing (no typing).
import type { HTMLAttributes } from "react";

export interface TyperProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  text: string;
  speed?: number;
  paused?: boolean;
  revealAll?: boolean;
  onComplete?: () => void;
  sound?: boolean;
}

export function Typer({ text, speed: _s, paused: _p, revealAll: _r, onComplete: _o, sound: _snd, ...props }: TyperProps) {
  return (
    <span data-slot="typer" data-state="done" {...props}>
      <span className="sr-only">{text}</span>
      <span data-yorha-typed="">{text}</span>
    </span>
  );
}

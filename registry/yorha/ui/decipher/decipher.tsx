import * as React from "react";

import { MAX_FLASH_HZ } from "@/components/yorha-provider";
import { cn } from "@/lib/utils";

const POOLS = {
  hangul: Array.from("가나다라마바사아자차카타파하고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후"),
  katakana: Array.from("アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"),
  latin: Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/\\=+*#"),
} as const;

type Pool = keyof typeof POOLS;

const HANGUL = /\p{Script=Hangul}/u;
const KANA = /[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}\u30fc]/u;
const MAX_RUN_MS = 1000;
const DEFAULT_CHAR_MS = 70;

export function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export function poolFor(grapheme: string): Pool {
  if (HANGUL.test(grapheme)) return "hangul";
  if (KANA.test(grapheme)) return "katakana";
  return "latin";
}

function pick(grapheme: string, seed: number | null): string {
  if (/^\s+$/.test(grapheme)) return grapheme;
  const pool = POOLS[poolFor(grapheme)];
  // seed === null → deterministic (first paint / SSR), otherwise random.
  let i = seed === null ? 0 : Math.floor(Math.random() * pool.length);
  if (pool[i] === grapheme) i = (i + 1) % pool.length;
  return pool[i]!;
}

function motionAllowsAnimation(): boolean {
  if (typeof document === "undefined") return false;
  const mode = document.documentElement.dataset.motion;
  if (mode === "reduced" || mode === "off") return false;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--motion-scramble-char").trim();
  return !(raw !== "" && parseFloat(raw) === 0);
}

function charMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--motion-scramble-char").trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_CHAR_MS;
  return raw.endsWith("ms") || !raw.endsWith("s") ? n : n * 1000;
}

interface RunState {
  text: string;
  revealed: number;
  glyphs: string[];
}

function initial(text: string, graphemes: string[], animate: boolean): RunState {
  return {
    text,
    revealed: animate ? 0 : graphemes.length,
    glyphs: graphemes.map((g) => pick(g, null)),
  };
}

export interface DecipherProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** Final text. Always exposed to assistive tech. */
  text: string;
}

/**
 * Scramble → reveal text effect. The final text lives in an sr-only span; the animated glyph
 * layer is aria-hidden. Every grapheme sits in its own cell whose width comes from the FINAL
 * glyph (an invisible ::before copy), and the shown glyph is laid over it, centred and never
 * wrapping, so a wide scramble glyph can neither widen the box nor push a line over. Latin
 * words stay in one nowrap group so line breaks match plain text.
 */
export function Decipher({ text, className, ...props }: DecipherProps) {
  const graphemes = React.useMemo(() => splitGraphemes(text), [text]);
  const [state, setState] = React.useState<RunState>(() =>
    initial(text, graphemes, motionAllowsAnimation()),
  );

  React.useLayoutEffect(() => {
    if (!motionAllowsAnimation()) {
      setState({ text, revealed: graphemes.length, glyphs: graphemes });
      return;
    }
    const n = graphemes.length;
    const step = Math.max(1, Math.min(charMs(), MAX_RUN_MS / Math.max(n, 1)));
    // Flicker cap: a glyph may change at most MAX_FLASH_HZ times per second.
    const rerollMs = 1000 / MAX_FLASH_HZ;
    const start = performance.now();
    let lastReroll = start;
    setState({ text, revealed: 0, glyphs: graphemes.map((g) => pick(g, 0)) });
    const id = window.setInterval(() => {
      const now = performance.now();
      const revealed = Math.min(n, Math.floor((now - start) / step));
      const reroll = now - lastReroll >= rerollMs;
      if (reroll) lastReroll = now;
      setState((prev) => ({
        text,
        revealed,
        glyphs: reroll ? graphemes.map((g) => pick(g, 0)) : prev.glyphs,
      }));
      if (revealed >= n) window.clearInterval(id);
    }, step);
    return () => window.clearInterval(id);
  }, [text, graphemes]);

  const current = state.text === text ? state : initial(text, graphemes, false);
  const shown = graphemes.map((g, i) => (i < current.revealed ? g : (current.glyphs[i] ?? g)));

  const nodes: React.ReactNode[] = [];
  let word: React.ReactNode[] = [];
  const flush = (key: number) => {
    if (word.length === 0) return;
    nodes.push(
      <span key={`w${key}`} className="inline-block whitespace-nowrap">
        {word}
      </span>,
    );
    word = [];
  };
  graphemes.forEach((g, i) => {
    if (/^\s+$/.test(g)) {
      flush(i);
      nodes.push(<span key={i}>{g}</span>);
      return;
    }
    const cell = (
      <span
        key={i}
        data-final={g}
        className="relative inline-block whitespace-pre before:invisible before:content-[attr(data-final)]"
      >
        <span className="absolute inset-0 text-center">{shown[i]}</span>
      </span>
    );
    if (poolFor(g) === "latin") word.push(cell);
    else {
      flush(i);
      nodes.push(cell);
    }
  });
  flush(graphemes.length);

  return (
    <span className={cn("relative inline-block whitespace-pre-wrap", className)} {...props}>
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        data-slot="decipher-glyphs"
        suppressHydrationWarning
        className="pointer-events-none block whitespace-pre-wrap"
      >
        {nodes}
      </span>
    </span>
  );
}

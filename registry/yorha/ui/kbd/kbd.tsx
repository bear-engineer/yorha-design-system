import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type KbdProps = ComponentProps<"kbd">;

export function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center whitespace-nowrap border border-yorha-border border-b-2 bg-yorha-control",
        "rounded-yorha px-1.5 font-yorha-mono text-yorha-xs leading-[17px] text-yorha-on-control",
        className,
      )}
      {...props}
    />
  );
}

/** True on macOS / iOS. Reads `navigator.platform` first (so it can be mocked), then `userAgentData`. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.platform || nav.userAgentData?.platform || "");
}

/** Platform flag resolved in a layout effect (before paint), so server and first client render agree: false until then. */
export function useIsApple(): boolean {
  const [apple, setApple] = useState(false);
  useLayoutEffect(() => setApple(isApplePlatform()), []);
  return apple;
}

type Mod = "mod" | "shift" | "alt" | "ctrl" | "meta";
const MODS: readonly string[] = ["mod", "shift", "alt", "ctrl", "meta"];
const isMod = (k: string): k is Mod => MODS.includes(k.toLowerCase());

function label(key: string, apple: boolean): string {
  switch (key.toLowerCase()) {
    case "mod":
    case "meta":
      return apple ? "\u2318" : key.toLowerCase() === "mod" ? "Ctrl" : "Win";
    case "ctrl":
      return "Ctrl";
    case "alt":
      return apple ? "\u2325" : "Alt";
    case "shift":
      return apple ? "\u21E7" : "Shift";
    case "enter":
      return "Enter";
    case "esc":
    case "escape":
      return "Esc";
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

export interface KbdComboProps extends Omit<ComponentProps<"span">, "children"> {
  /** `mod` = Cmd on Apple platforms, Ctrl elsewhere. Others: shift, alt, ctrl, meta, or a key name / character. */
  keys: readonly string[];
}

/** A key combination: one <kbd> per key. Cmd is the \u2318 mark on Apple platforms (the pixel Cmd glyph arrives with V4-036). */
export function KbdCombo({ keys, className, ...props }: KbdComboProps) {
  const apple = useIsApple();
  return (
    <span data-slot="kbd-combo" className={cn("inline-flex items-center gap-1", className)} {...props}>
      {keys.map((k, i) => (
        <Kbd key={`${k}${i}`}>{label(k, apple)}</Kbd>
      ))}
    </span>
  );
}

export interface UseShortcutOptions {
  enabled?: boolean;
  /** Fire while a text field, textarea, select or contenteditable has focus. Default false. */
  allowInInput?: boolean;
}

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));

/**
 * Document-level shortcut. Modifiers must match exactly. Ignored: key repeats, IME composition, events someone already
 * `preventDefault`ed and (unless `allowInInput`) text fields. Returns `{ "aria-keyshortcuts" }` to spread on the control it triggers.
 */
export function useShortcut(keys: readonly string[], handler: (event: KeyboardEvent) => void, options: UseShortcutOptions = {}) {
  const { enabled = true, allowInInput = false } = options;
  const apple = useIsApple();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const sig = keys.join("+");
  useEffect(() => {
    if (!enabled) return;
    const parts = sig.split("+").filter(Boolean);
    const want = { ctrl: false, meta: false, alt: false, shift: false };
    let main = "";
    for (const k of parts) {
      const l = k.toLowerCase();
      if (!isMod(l)) main = l;
      else if (l === "mod") want[isApplePlatform() ? "meta" : "ctrl"] = true;
      else want[l] = true;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing || e.keyCode === 229) return;
      if (!allowInInput && isEditable(e.target)) return;
      if (e.ctrlKey !== want.ctrl || e.metaKey !== want.meta || e.altKey !== want.alt || e.shiftKey !== want.shift) return;
      if (e.key.toLowerCase() !== main) return;
      handlerRef.current(e);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sig, enabled, allowInInput]);
  const mods = sig
    .split("+")
    .filter(Boolean)
    .map((k) => {
      const l = k.toLowerCase();
      if (l === "mod") return apple ? "Meta" : "Control";
      if (l === "ctrl") return "Control";
      if (isMod(l)) return l[0]!.toUpperCase() + l.slice(1);
      return k.length === 1 ? k.toUpperCase() : k;
    });
  return { "aria-keyshortcuts": mods.join("+") };
}

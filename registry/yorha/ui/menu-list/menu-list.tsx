import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Variant = "listbox" | "navigation";
type Play = (cue: "cursor-move" | "select") => void;

interface MenuContextValue {
  variant: Variant;
  value: string | null;
  tabStop: string | null;
  phase: "ssr" | "pre" | "in";
  setValue: (value: string) => void;
  activate: (value: string) => void;
}

const MenuContext = React.createContext<MenuContextValue | null>(null);

const ITEM = "[data-menu-item]";
const ENABLED = "[data-menu-item]:not([data-disabled])";
const TYPEAHEAD_RESET_MS = 500;
/** Rows past this index enter together so a long list does not take seconds to appear. */
const MAX_STAGGER_INDEX = 12;

export interface MenuListProps extends Omit<React.ComponentProps<"ul">, "defaultValue" | "onChange"> {
  /** `listbox`: role=listbox with options (selection follows the cursor). `navigation`: a list of buttons or links. */
  variant?: Variant;
  /** Controlled cursor row. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Enter, Space or click on a row. */
  onActivate?: (value: string) => void;
  /** Play cursor-move / select cues. Still silent unless the provider enables sound. */
  sound?: boolean;
}

const noop: Play = () => {};

/** Picks the sound hook only when asked, so MenuList works without a provider. */
export function MenuList({ sound = false, ...props }: MenuListProps) {
  return sound ? <SoundedMenuList {...props} /> : <MenuListImpl {...props} play={noop} />;
}

function SoundedMenuList(props: Omit<MenuListProps, "sound">) {
  const { play } = useSound();
  return <MenuListImpl {...props} play={play} />;
}

interface ImplProps extends Omit<MenuListProps, "sound"> {
  play: Play;
}

function MenuListImpl({
  variant = "listbox",
  value: valueProp,
  defaultValue = null,
  onValueChange,
  onActivate,
  play,
  className,
  onKeyDown,
  ...props
}: ImplProps) {
  const ref = React.useRef<HTMLUListElement>(null);
  const [inner, setInner] = React.useState<string | null>(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : inner;
  const [tabStop, setTabStop] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<"ssr" | "pre" | "in">("ssr");
  const buffer = React.useRef({ text: "", timer: 0 });

  const setValue = React.useCallback(
    (next: string) => {
      if (next === value) return;
      if (!controlled) setInner(next);
      onValueChange?.(next);
    },
    [controlled, value, onValueChange],
  );
  const activate = React.useCallback(
    (next: string) => {
      play("select");
      onActivate?.(next);
    },
    [play, onActivate],
  );

  // One tab stop, stagger index per row. Runs after every render: cheap and keeps late rows indexed.
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>(ITEM));
    rows.forEach((row, i) => row.style.setProperty("--menu-i", String(Math.min(i, MAX_STAGGER_INDEX))));
    const enabled = rows.filter((r) => !r.hasAttribute("data-disabled"));
    const current = enabled.find((r) => r.dataset.menuValue === value) ?? enabled[0];
    const next = current?.dataset.menuValue ?? null;
    setTabStop((prev) => (prev === next ? prev : next));
  });

  // Entry stagger runs once on mount: hide before first paint, reveal two frames later.
  React.useLayoutEffect(() => {
    setPhase("pre");
    let b = 0;
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setPhase("in"));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);

  const move = (rows: HTMLElement[], target: HTMLElement | undefined) => {
    if (!target) return;
    target.focus();
    play("cursor-move");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const row = (event.target as HTMLElement).closest<HTMLElement>(ITEM);
    if (!row || !ref.current?.contains(row)) return;
    const rows = Array.from(ref.current.querySelectorAll<HTMLElement>(ENABLED));
    const at = rows.indexOf(row);
    const key = event.key;

    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      const next = rows[key === "ArrowDown" ? Math.min(at + 1, rows.length - 1) : Math.max(at - 1, 0)];
      if (next !== row) move(rows, next);
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      const next = key === "Home" ? rows[0] : rows[rows.length - 1];
      if (next !== row) move(rows, next);
    } else if (key === "Enter" || key === " ") {
      const tag = row.tagName;
      const native = tag === "BUTTON" || (tag === "A" && key === "Enter");
      if (!native && !(key === " " && buffer.current.text)) {
        event.preventDefault();
        row.click();
      }
    } else if (key.length === 1) {
      const b = buffer.current;
      if (key === " " && !b.text) return;
      window.clearTimeout(b.timer);
      b.text += key.toLowerCase();
      b.timer = window.setTimeout(() => (b.text = ""), TYPEAHEAD_RESET_MS);
      const cycle = b.text.length > 1 && [...b.text].every((ch) => ch === b.text[0]) ? b.text[0]! : b.text;
      const ordered = [...rows.slice(at + (cycle.length === 1 ? 1 : 0)), ...rows.slice(0, at + (cycle.length === 1 ? 1 : 0))];
      const hit = ordered.find((r) => (r.dataset.menuText ?? "").startsWith(cycle));
      if (hit) {
        event.preventDefault();
        if (hit !== row) move(rows, hit);
      }
    }
  };

  const ctx = React.useMemo<MenuContextValue>(
    () => ({ variant, value, tabStop, phase, setValue, activate }),
    [variant, value, tabStop, phase, setValue, activate],
  );

  return (
    <MenuContext.Provider value={ctx}>
      <ul
        ref={ref}
        role={variant === "listbox" ? "listbox" : "list"}
        className={cn("m-0 flex list-none flex-col p-0 font-yorha", className)}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </MenuContext.Provider>
  );
}

export interface MenuListItemProps extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue"> {
  /** Stable id of the row; reported by onValueChange and onActivate. */
  value: string;
  disabled?: boolean;
  /** Secondary text under the label. */
  description?: React.ReactNode;
  /** Text used by typeahead; defaults to the label text. */
  textValue?: string;
  /** Navigation variant: this row is the current page (aria-current="page"). */
  current?: boolean;
  /** Replace the interactive element, e.g. `render={<NavLink to="/" />}`. */
  render?: useRender.ComponentProps<"button">["render"];
}

const ROW = cn(
  "group relative flex w-full cursor-pointer items-center gap-3 py-2 pl-8 pr-3 text-left text-yorha-base uppercase tracking-yorha-wide text-yorha-fg",
  "border-y-[length:var(--menu-rule)] border-solid border-transparent",
  "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-no-repeat [background-size:0%_100%]",
  "data-[enter=pre]:-translate-x-2 data-[enter=pre]:opacity-0",
  "data-[selected]:text-yorha-on-ink data-[selected]:border-yorha-border data-[selected]:[background-size:100%_100%]",
  "focus-visible:yorha-focus data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
);

const STAGGER = "calc(var(--motion-stagger) * var(--menu-i, 0))";

/** One row. Selected: ink wipes in left to right, bullet inverts, arrow cursor and rules appear. */
export function MenuListItem({
  value,
  disabled = false,
  description,
  textValue,
  current = false,
  render,
  className,
  children,
  style,
  ...props
}: MenuListItemProps) {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error("MenuListItem must be used inside MenuList");
  const { variant, phase } = ctx;
  const selected = ctx.value === value;
  const label = React.useRef<HTMLSpanElement>(null);
  const [text, setText] = React.useState(textValue ?? "");
  React.useLayoutEffect(() => {
    if (textValue === undefined) setText(label.current?.textContent ?? "");
  }, [textValue, children]);

  const wipe = selected ? "var(--motion-select)" : "var(--motion-select-exit, var(--motion-select))";
  const transition = [
    `opacity var(--motion-panel) ease-out ${STAGGER}`,
    `translate var(--motion-panel) ease-out ${STAGGER}`,
    `background-size ${wipe} ease`,
    `color ${wipe} ease`,
  ].join(", ");

  const listbox = variant === "listbox";
  const internal: Record<string, unknown> = {
        className: cn(ROW, className),
        style: { transition, ...style },
        tabIndex: ctx.tabStop === value && !disabled ? 0 : -1,
        "data-menu-item": "",
        "data-menu-value": value,
        "data-menu-text": (textValue ?? text).toLowerCase(),
        "data-selected": selected ? "" : undefined,
        "data-disabled": disabled ? "" : undefined,
        "data-enter": phase === "pre" ? "pre" : undefined,
        "aria-disabled": disabled || undefined,
        ...(listbox
          ? { role: "option", "aria-selected": selected }
          : { type: "button", "aria-current": current ? "page" : undefined }),
        onFocus: () => {
          if (!disabled) ctx.setValue(value);
        },
        onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
          if (event.pointerType === "mouse" && !disabled) event.currentTarget.focus({ preventScroll: true });
        },
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          ctx.activate(value);
        },
        children: (
          <>
            <span
              data-menu-arrow=""
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-1/2 size-0 -translate-y-1/2 border-y-[0.35rem] border-l-[0.5rem] border-y-transparent border-l-current opacity-0 group-data-[selected]:opacity-100"
            />
            <span data-menu-bullet="" aria-hidden="true" className="size-2 shrink-0 bg-current" />
            <span className="flex min-w-0 flex-col">
              <span ref={label} data-menu-label="">
                {children}
              </span>
              {description ? (
                <span className="text-yorha-xs normal-case tracking-yorha-body opacity-80">{description}</span>
              ) : null}
            </span>
          </>
        ),
      };
  const element = useRender({
    render,
    defaultTagName: listbox ? "li" : "button",
    props: mergeProps<"button">(internal as React.ComponentProps<"button">, props as React.ComponentProps<"button">),
  });

  return listbox ? element : <li>{element}</li>;
}

import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useSound } from "@/lib/sound";
import { TriangleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Variant = "listbox" | "navigation";
type Play = (cue: "cursor-move" | "select") => void;

interface MenuContextValue {
  variant: Variant;
  value: string | null;
  tabStop: string | null;
  setValue: (value: string) => void;
  activate: (value: string) => void;
}

const MenuContext = React.createContext<MenuContextValue | null>(null);

const ITEM = "[data-menu-item]";
const ENABLED = "[data-menu-item]:not([data-disabled])";
const TYPEAHEAD_RESET_MS = 500;

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

/**
 * The selected row is the focused row (selection follows focus), so its ink fill is the focus indicator and no ring is
 * drawn (an inset `Highlight` outline under forced colours). Nothing paints outside the row box.
 * Picks the sound hook only when asked, so MenuList works without a provider.
 */
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
    rows.forEach((row, i) => row.style.setProperty("--yorha-stagger-index", String(i)));
    const enabled = rows.filter((r) => !r.hasAttribute("data-disabled"));
    const current = enabled.find((r) => r.dataset.menuValue === value) ?? enabled[0];
    const next = current?.dataset.menuValue ?? null;
    setTabStop((prev) => (prev === next ? prev : next));
  });

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
    () => ({ variant, value, tabStop, setValue, activate }),
    [variant, value, tabStop, setValue, activate],
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
  "group relative flex min-h-row w-full cursor-pointer items-center gap-2 py-1 pl-2 pr-3 text-left text-yorha-base uppercase tracking-yorha-wide text-yorha-fg",
  // Every row draws a 1px bottom rule; the top edge is reserved (transparent) so selecting never shifts anything.
  "border-y-[length:var(--menu-rule)] border-solid border-t-transparent border-b-yorha-border",
  "bg-[linear-gradient(var(--yorha-ink),var(--yorha-ink))] bg-no-repeat [background-size:0%_100%]",
  "yorha-stream",
  "data-[selected]:text-yorha-on-ink data-[selected]:border-yorha-ink data-[selected]:[background-size:100%_100%]",
  // hover (not yet selected) = 2px left marker; current page = 2px left marker that stays; keyboard focus = 1px inset frame inside the band.
  "[&:hover:not([data-selected],[data-disabled])]:shadow-[inset_2px_0_0_var(--yorha-ink)] aria-[current=page]:shadow-[inset_2px_0_0_var(--yorha-ink)]",
  "outline-none focus-visible:outline-1 focus-visible:-outline-offset-3 focus-visible:outline-[var(--yorha-on-ink)] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[Highlight]",
  "yorha-disabled",
);

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
  const { variant } = ctx;
  const selected = ctx.value === value;
  const label = React.useRef<HTMLSpanElement>(null);
  const [text, setText] = React.useState(textValue ?? "");
  React.useLayoutEffect(() => {
    if (textValue === undefined) setText(label.current?.textContent ?? "");
  }, [textValue, children]);

  // 90ms in, 0 out: the row being left drops at once so only one wipe is on screen (G8).
  const wipe = selected ? "var(--motion-press)" : "0s";
  const transition = [`background-size ${wipe} var(--yorha-ease-out)`, `color ${wipe} var(--yorha-ease-out)`].join(", ");

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
            <TriangleIcon data-menu-arrow="" className="size-icon-sm opacity-0 group-data-[selected]:opacity-100" />
            <span data-menu-bullet="" aria-hidden="true" className="size-bullet shrink-0 bg-current" />
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

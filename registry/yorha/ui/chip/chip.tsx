import { Toggle } from "@base-ui/react/toggle";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CrossIcon } from "@/components/ui/icons";

export interface ChipProps {
  label: string;
  /** Fill ratio 0..1 shown by the striped bar. */
  capacity?: number;
  /** Number of bar segments. Default 5. */
  segments?: number;
  /** Size text shown after the label, e.g. "64 KB". */
  sizeLabel?: string;
  /** Renders a remove button; accessible name is `<label> <removeLabel>`. */
  onRemove?: () => void;
  /** Default "제거". */
  removeLabel?: string;
  /** Turns the whole chip into a toggle button (aria-pressed). Excludes remove. */
  selectable?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  className?: string;
}

const GroupContext = createContext(false);

const CHIP = "[data-slot=chip]";

export type ChipGroupProps = Omit<ComponentProps<"div">, "role"> & {
  /** Announced politely after a chip is removed. Default "제거됨". */
  removedLabel?: string;
};

/**
 * Chips as one composite: a single tab stop with roving focus (Left/Right/Home/End). Backspace / Delete removes the focused
 * chip through its `onRemove`; focus moves to the next chip, else the previous one, else the group, and "제거됨" is announced.
 * Remove buttons inside a group are not tab stops. There is no exit animation and no undo: removal is the consumer's state.
 * Name the group with `aria-label`.
 */
export function ChipGroup({ className, children, removedLabel = "제거됨", onKeyDown, onFocus, ...props }: ChipGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLElement | null>(null);
  const [message, setMessage] = useState("");
  const chips = () => [...(ref.current?.querySelectorAll<HTMLElement>(CHIP) ?? [])];

  useLayoutEffect(() => {
    const all = chips();
    const current = active.current && all.includes(active.current) ? active.current : all[0];
    active.current = current ?? null;
    for (const c of all) c.tabIndex = c === current ? 0 : -1;
  });
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 1500);
    return () => clearTimeout(t);
  }, [message]);

  const keydown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const from = (e.target as HTMLElement).closest<HTMLElement>(CHIP);
    if (!from) return;
    const all = chips();
    const i = all.indexOf(from);
    let next: HTMLElement | undefined;
    if (e.key === "ArrowRight") next = all[(i + 1) % all.length];
    else if (e.key === "ArrowLeft") next = all[(i - 1 + all.length) % all.length];
    else if (e.key === "Home") next = all[0];
    else if (e.key === "End") next = all[all.length - 1];
    else if ((e.key === "Backspace" || e.key === "Delete") && from.dataset.removable !== undefined) {
      e.preventDefault();
      const target = all[i + 1] ?? all[i - 1] ?? ref.current;
      target?.focus();
      from.querySelector<HTMLElement>("[data-slot=chip-remove]")?.click();
      setMessage(removedLabel);
      return;
    } else return;
    e.preventDefault();
    next?.focus();
  };

  return (
    <GroupContext.Provider value>
      <div
        ref={ref}
        role="group"
        tabIndex={-1}
        data-slot="chip-group"
        className={cn("flex flex-wrap items-center gap-2 focus-visible:yorha-focus", className)}
        onKeyDown={keydown}
        onFocus={(e) => {
          onFocus?.(e);
          const c = (e.target as HTMLElement).closest<HTMLElement>(CHIP);
          if (c) {
            active.current = c;
            for (const x of chips()) x.tabIndex = x === c ? 0 : -1;
          }
        }}
        {...props}
      >
        {children}
        <span aria-live="polite" className="sr-only">
          {message}
        </span>
      </div>
    </GroupContext.Provider>
  );
}

const CHIP_BASE =
  "inline-flex h-control-sm max-w-full items-stretch gap-0 rounded-yorha border border-yorha-border bg-yorha-bg font-yorha text-yorha-sm text-yorha-fg";

function Bar({ capacity, segments, decorative }: { capacity: number; segments: number; decorative: boolean }) {
  const ratio = Math.min(1, Math.max(0, capacity));
  const filled = Math.round(ratio * segments);
  const bar = (
    <span className="flex h-full w-16 shrink-0 items-stretch border-l border-yorha-border" data-slot="bar">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("flex-1 border-r border-yorha-border last:border-r-0", i < filled ? "bg-yorha-ink" : "bg-yorha-grid")}
        />
      ))}
    </span>
  );
  if (decorative) return <span aria-hidden="true" className="flex shrink-0">{bar}</span>;
  return (
    <span role="img" aria-label={`용량 ${Math.round(ratio * 100)}%`} className="flex shrink-0">
      {bar}
    </span>
  );
}

function Body({ label, sizeLabel, bar }: { label: string; sizeLabel?: string; bar: ReactNode }) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2 px-2 font-yorha-medium">
        <span data-slot="chip-label" title={label} className="min-w-0 truncate whitespace-nowrap">{label}</span>
        {sizeLabel ? <span className="shrink-0 whitespace-nowrap text-yorha-fg-soft">{sizeLabel}</span> : null}
      </span>
      {bar}
    </>
  );
}

/**
 * Plugin chip: label, optional size text and a striped segment bar showing capacity.
 * Plain chips are static with an optional remove button. `selectable` turns the whole chip into a
 * Base UI toggle. Its accessible name is the visible text (label + size), per WCAG 2.5.3.
 */
export function Chip({
  label,
  capacity = 0,
  segments = 5,
  sizeLabel,
  onRemove,
  removeLabel = "제거",
  selectable = false,
  pressed,
  defaultPressed,
  onPressedChange,
  className,
}: ChipProps) {
  const inGroup = useContext(GroupContext);
  if (selectable) {
    return (
      <Toggle
        pressed={pressed}
        defaultPressed={defaultPressed}
        onPressedChange={(next) => onPressedChange?.(next)}
        data-slot="chip"
        className={cn(
          CHIP_BASE,
          "cursor-pointer transition-[color,background-color] duration-(--motion-select) ease-yorha yorha-tint focus-visible:yorha-focus",
          "data-[pressed]:border-yorha-ink data-[pressed]:bg-yorha-ink data-[pressed]:text-yorha-on-ink",
          className,
        )}
      >
        <Body
          label={label}
          sizeLabel={sizeLabel}
          bar={<Bar capacity={capacity} segments={segments} decorative />}
        />
      </Toggle>
    );
  }

  return (
    <span
      className={cn(CHIP_BASE, inGroup && "focus-visible:yorha-focus", className)}
      data-slot="chip"
      {...(inGroup ? { role: "group", "aria-label": sizeLabel ? `${label} ${sizeLabel}` : label, "aria-keyshortcuts": onRemove ? "Delete" : undefined } : {})}
      data-removable={onRemove ? "" : undefined}
    >
      <Body label={label} sizeLabel={sizeLabel} bar={<Bar capacity={capacity} segments={segments} decorative={false} />} />
      {onRemove ? (
        <button
          type="button"
          aria-label={`${label} ${removeLabel}`}
          data-slot="chip-remove"
          tabIndex={inGroup ? -1 : undefined}
          onClick={onRemove}
          className="-my-px grid w-8 shrink-0 place-items-center border-l border-yorha-border text-yorha-fg yorha-tint focus-visible:yorha-focus-inset"
        >
          <CrossIcon />
        </button>
      ) : null}
    </span>
  );
}

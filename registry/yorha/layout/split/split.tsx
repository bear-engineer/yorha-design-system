import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Glyph } from "@/components/ui/glyph";
import { cn } from "@/lib/utils";

export interface SplitProps {
  /** List pane. First in DOM and reading order. */
  list: ReactNode;
  /** Detail pane. Second in DOM and reading order. */
  detail: ReactNode;
  /** Container width at which the panes go side by side; below it they stack. Default md (28rem). */
  breakpoint?: "sm" | "md" | "lg";
  /** 1px rule between the panes (left of the detail side by side, above it when stacked). Default true. Migration (v3): new in v3, pre-v3 Split drew no rule; pass false when the detail is already framed (system-menu-layout does). */
  divider?: boolean;
  /** Adds a window-splitter between the panes (side by side only; stacked has no handle). Arrows move 16 px (Shift 64), Home/End jump to the limits, Enter or a double click resets to `defaultSize`; a drag shows a ghost rule and commits on release. */
  resizable?: boolean;
  /** Controlled list width in px. */
  size?: number;
  /** Initial and reset list width in px. Default 256. */
  defaultSize?: number;
  /** Smallest list width in px. Default 160. */
  minSize?: number;
  /** Smallest detail width in px (bounds the maximum list width). Default 240. */
  minDetailSize?: number;
  onSizeChange?: (size: number) => void;
  /** Accessible name of the splitter. Default "목록 폭 조절". */
  separatorLabel?: string;
  className?: string;
}

const BREAKPOINT_PX = { sm: 384, md: 448, lg: 512 } as const;
const STEP = 16;
const STEP_BIG = 64;

// Full class names so Tailwind generates them. Each breakpoint is a container query on the split frame.
const LAYOUT: Record<NonNullable<SplitProps["breakpoint"]>, { flow: string; list: string; detail: string }> = {
  sm: { flow: "flex-col @sm:flex-row", list: "pb-4 @sm:w-[min(14rem,40%)] @sm:shrink-0 @sm:pb-0 @sm:pr-4", detail: "pt-4 @sm:pt-0 @sm:pl-4 @sm:border-t-0 @sm:border-l" },
  md: { flow: "flex-col @md:flex-row", list: "pb-4 @md:w-[min(16rem,40%)] @md:shrink-0 @md:pb-0 @md:pr-4", detail: "pt-4 @md:pt-0 @md:pl-4 @md:border-t-0 @md:border-l" },
  lg: { flow: "flex-col @lg:flex-row", list: "pb-4 @lg:w-[min(20rem,40%)] @lg:shrink-0 @lg:pb-0 @lg:pr-4", detail: "pt-4 @lg:pt-0 @lg:pl-4 @lg:border-t-0 @lg:border-l" },
};

/**
 * Two-pane list/detail layout. Fixed panes by default; `resizable` adds a keyboard- and pointer-operable splitter (v4). Side by side in a wide container, stacked (list above detail) in a narrow one.
 * The DOM order is the reading order, so tab order matches the visual stack.
 */
export function Split({
  list,
  detail,
  breakpoint = "md",
  divider = true,
  resizable = false,
  size: sizeProp,
  defaultSize = 256,
  minSize = 160,
  minDetailSize = 240,
  onSizeChange,
  separatorLabel = "목록 폭 조절",
  className,
}: SplitProps) {
  const layout = LAYOUT[breakpoint];
  const frame = useRef<HTMLDivElement>(null);
  const [inner, setInner] = useState(defaultSize);
  const [width, setWidth] = useState(0);
  const [ghost, setGhost] = useState<number | null>(null);
  const drag = useRef<{ startX: number; start: number } | null>(null);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el || !resizable) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [resizable]);

  const stacked = width < BREAKPOINT_PX[breakpoint];
  const max = Math.max(minSize, width - minDetailSize);
  const clamp = useCallback((n: number) => Math.min(max, Math.max(minSize, Math.round(n))), [max, minSize]);
  const size = clamp(sizeProp ?? inner);
  const commit = (next: number) => {
    const value = clamp(next);
    if (sizeProp === undefined) setInner(value);
    if (value !== size) onSizeChange?.(value);
  };
  useEffect(() => () => void (drag.current = null), []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? STEP_BIG : STEP;
    const next: Record<string, number> = {
      ArrowRight: size + step,
      ArrowLeft: size - step,
      Home: minSize,
      End: max,
      Enter: defaultSize,
    };
    const value = next[event.key];
    if (value === undefined) return;
    event.preventDefault();
    commit(value);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic or already-released pointer */
    }
    event.currentTarget.focus();
    drag.current = { startX: event.clientX, start: size };
    setGhost(size);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) setGhost(clamp(d.start + event.clientX - d.startX));
  };
  const finish = (event: PointerEvent<HTMLDivElement>, apply: boolean) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setGhost(null);
    if (apply) commit(d.start + event.clientX - d.startX);
  };

  const split = resizable && !stacked;
  return (
    <div ref={frame} data-slot="split-frame" className={cn("@container relative w-full min-w-0", className)}>
      <div data-slot="split" className={cn("flex min-w-0", layout.flow)}>
        <div
          data-slot="split-list"
          style={split ? { width: size } : undefined}
          className={cn("w-full min-w-0", layout.list, split && "shrink-0")}
        >
          {list}
        </div>
        {split && (
          <div
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label={separatorLabel}
            aria-valuenow={size}
            aria-valuemin={minSize}
            aria-valuemax={max}
            data-slot="split-separator"
            data-dragging={ghost !== null ? "true" : undefined}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => finish(e, true)}
            onPointerCancel={(e) => finish(e, false)}
            onDoubleClick={() => commit(defaultSize)}
            className="relative z-(--yorha-z-raised) -mx-3 flex w-6 shrink-0 cursor-col-resize touch-none items-center justify-center text-yorha-fg-soft select-none hover:text-yorha-fg focus-visible:text-yorha-fg focus-visible:yorha-focus"
          >
            <span className="flex size-3 items-center justify-center bg-yorha-bg">
              <Glyph name="grip" />
            </span>
          </div>
        )}
        <div data-slot="split-detail" className={cn("min-w-0 flex-1", divider && ["border-t border-yorha-separator", layout.detail])}>
          {detail}
        </div>
      </div>
      {ghost !== null && (
        <div
          aria-hidden="true"
          data-part="ghost"
          style={{ transform: `translateX(${ghost}px)` }}
          className="pointer-events-none absolute inset-y-0 left-0 z-(--yorha-z-raised) w-0.5 bg-yorha-ink"
        />
      )}
    </div>
  );
}

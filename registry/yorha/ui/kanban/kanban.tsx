import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Glyph } from "@/components/ui/glyph";
import { GripIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface KanbanCardData {
  /** Unique across every card AND every column of the board (dnd-kit uses one id space). */
  id: string;
  title: ReactNode;
  /** Plain-text title used in screen-reader announcements and the handle's accessible name. Defaults to `title` when it is a string. */
  label?: string;
  meta?: ReactNode;
}

export interface KanbanColumnData {
  id: string;
  title: string;
  cards: KanbanCardData[];
  /** Work-in-progress limit. A warning shows while `cards.length` is above it. */
  wipLimit?: number;
}

export interface KanbanBoardProps {
  /** Controlled state. Updated only through `onChange`, which fires once per completed drop. */
  columns: KanbanColumnData[];
  onChange: (columns: KanbanColumnData[]) => void;
  /** Accessible name of the board region. */
  label?: string;
  /** Rendered in a column footer, e.g. an "add card" button. */
  renderAdd?: (column: KanbanColumnData) => ReactNode;
  emptyText?: string;
  /** Text of the empty-column drop zone shown while a card is held. */
  dropText?: string;
  /** Adds a toggle per column header that collapses its card list. Collapsed columns open while a card is held. */
  collapsible?: boolean;
  className?: string;
}

const FLICKER_LOCKOUT_MS = 1000;
const lastFlicker = new WeakMap<HTMLElement, number>();
/**
 * One-shot `yorha-flicker` on a mounted element: sets `data-run`, clears it when the animation settles, ignores calls within 1000 ms
 * (WCAG 2.3.1). Local copy of the utils `runFx` contract: that file is a non-primary file of `utils`, which items must not import
 * (registry:lint). Swap for `runFx` once the parent splits `@yorha/fx` out of `@yorha/utils`.
 */
function flickerOnce(el: HTMLElement | null) {
  if (!el) return;
  const now = performance.now();
  const last = lastFlicker.get(el);
  if (last !== undefined && now - last < FLICKER_LOCKOUT_MS) return;
  lastFlicker.set(el, now);
  el.setAttribute("data-run", "");
  const animations = el.getAnimations();
  if (animations.length === 0) el.removeAttribute("data-run");
  else void Promise.allSettled(animations.map((a) => a.finished)).then(() => el.removeAttribute("data-run"));
}

/** Edge autoscroll: zone depth in px and top speed in px/s. */
const EDGE_ZONE = 48;
const EDGE_SPEED = 900;
const edgeSpeed = (pos: number, start: number, end: number) => {
  const near = Math.min(EDGE_ZONE, (end - start) / 3);
  if (pos < start + near) return -Math.min(1, (start + near - pos) / near) * EDGE_SPEED;
  if (pos > end - near) return Math.min(1, (pos - (end - near)) / near) * EDGE_SPEED;
  return 0;
};

const CSS_ESCAPE = (value: string) => value.replace(/["\\]/g, "\\$&");

const cardLabel = (card: KanbanCardData) =>
  card.label ?? (typeof card.title === "string" ? card.title : card.id);

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "카드를 옮기려면 이동 버튼에서 스페이스 또는 엔터 키를 눌러 집어 올리세요. 방향키로 위치를 바꾸고, 스페이스 키로 내려놓거나 Esc 키로 취소합니다.",
};

/** Reads a motion token (`240ms`) from CSS so dnd-kit's JS-driven drop animation follows the motion mode. */
function readMotionMs(name: string): number {
  if (typeof document === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith("ms") ? value : value * 1000;
}

function readDropAnimation(): DropAnimation | null {
  const duration = readMotionMs("--motion-select");
  if (duration <= 0) return null;
  const easing = getComputedStyle(document.documentElement)
    .getPropertyValue("--yorha-ease-out")
    .trim();
  return { duration, easing: easing || "ease" };
}

function findColumnOf(columns: KanbanColumnData[], id: UniqueIdentifier) {
  return (
    columns.find((c) => c.id === id) ??
    columns.find((c) => c.cards.some((card) => card.id === id))
  );
}

function findCard(columns: KanbanColumnData[], id: UniqueIdentifier) {
  for (const column of columns) {
    const index = column.cards.findIndex((card) => card.id === id);
    const card = column.cards[index];
    if (card) return { column, index, card };
  }
  return null;
}

/** Moves the active card into the over column (card or column droppable). Same-column order is settled on drop. */
function moveAcross(
  columns: KanbanColumnData[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  below: boolean,
) {
  const from = findCard(columns, activeId);
  const target = findColumnOf(columns, overId);
  if (!from || !target || from.column.id === target.id) return columns;
  const overIndex = target.cards.findIndex((c) => c.id === overId);
  const insertAt =
    overIndex < 0 ? target.cards.length : overIndex + (below ? 1 : 0);
  return columns.map((column) => {
    if (column.id === from.column.id)
      return {
        ...column,
        cards: column.cards.filter((c) => c.id !== activeId),
      };
    if (column.id === target.id) {
      const cards = column.cards.slice();
      cards.splice(insertAt, 0, from.card);
      return { ...column, cards };
    }
    return column;
  });
}

export interface KanbanCardViewProps {
  card: KanbanCardData;
  /** The drag handle button, supplied by `KanbanCard`. */
  handle?: ReactNode;
  className?: string;
}

function KanbanCardView({ card, handle, className }: KanbanCardViewProps) {
  return <Card title={card.title} meta={card.meta} titleAction={handle} className={cn("shadow-none", className)} />;
}

const HANDLE_BOX = "grid size-6 shrink-0 place-items-center text-yorha-fg-soft";

export interface KanbanCardProps {
  card: KanbanCardData;
  /** The card is the last of its list: the insertion marker sits on its trailing edge. */
  last?: boolean;
  /** Accessible name of the drag handle. Defaults to "<card label> 카드 이동". */
  handleLabel?: string;
}

type OverlayScope = { theme?: string; density?: string; lang?: string };
function readScope(el: Element | null): OverlayScope {
  return {
    theme: el?.closest("[data-theme]")?.getAttribute("data-theme") ?? undefined,
    density: el?.closest("[data-density]")?.getAttribute("data-density") ?? undefined,
    lang: el?.closest("[lang]")?.getAttribute("lang") ?? undefined,
  };
}

/**
 * Sortable card. The grip handle (24px, in the title row) is the only drag activator and the only extra tab stop.
 * While dragged, the source stays mounted (so the handle keeps focus) but its content is transparent: an empty dashed
 * slot of the same height, with a 2px insertion line on its top edge.
 */
export function KanbanCard({ card, handleLabel, last = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
    isSorting,
  } = useSortable({
    id: card.id,
    transition: null,
    attributes: { roleDescription: "이동 가능한 카드" },
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isSorting
      ? "transform var(--motion-collapse) var(--yorha-ease-emphasized)"
      : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging ? "" : undefined}
      data-card-id={card.id}
      className="relative list-none snap-start"
    >
      <KanbanCardView
        card={card}
        className={isDragging ? "border-dashed bg-yorha-ink/5 [&>*]:opacity-0" : undefined}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            data-card-handle={card.id}
            aria-label={handleLabel ?? `${cardLabel(card)} 카드 이동`}
            className={cn(
              HANDLE_BOX,
              "yorha-tint cursor-grab touch-none transition-[color,background-color,border-color] duration-(--motion-select) hover:text-yorha-fg focus-visible:yorha-focus active:cursor-grabbing",
            )}
          >
            <GripIcon />
          </button>
        }
      />
      {isDragging ? (
        <span
          data-slot="kanban-drop-indicator"
          data-edge={last ? "end" : "start"}
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-x-0 h-0.5 bg-yorha-ink", last ? "-bottom-px" : "-top-px")}
        >
          <span data-part="cap" className="absolute -left-px -top-px size-1 bg-yorha-ink" />
          <span data-part="cap" className="absolute -right-px -top-px size-1 bg-yorha-ink" />
        </span>
      ) : null}
    </li>
  );
}

export interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  wipLimit?: number;
  emptyText?: string;
  /** Footer slot, e.g. an add button. */
  addSlot?: ReactNode;
  /** `KanbanCard` elements. */
  children?: ReactNode;
  cardIds: string[];
  /** True while a dragged card sits in this column (the drop target), even over a card rather than the empty column area. */
  receiving?: boolean;
  /** A card is held anywhere on the board. */
  dragging?: boolean;
  /** Drop-zone text of an empty column while `dragging`. */
  dropText?: string;
  /** The held card would push this column over its limit: the ring flickers once on entry. */
  overLimitTarget?: boolean;
  /** Renders a collapse toggle in the header. */
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function KanbanColumn({
  id,
  title,
  count,
  wipLimit,
  emptyText = "카드가 없습니다",
  addSlot,
  children,
  cardIds,
  receiving = false,
  dragging = false,
  dropText = "여기에 놓기",
  overLimitTarget = false,
  collapsible = false,
  collapsed = false,
  onCollapsedChange,
}: KanbanColumnProps) {
  const headingId = useId();
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column" } });
  const exceeded = wipLimit !== undefined && count > wipLimit;
  const ringRef = useRef<HTMLLIElement>(null);
  const wasTarget = useRef(false);
  useEffect(() => {
    if (overLimitTarget && !wasTarget.current) flickerOnce(ringRef.current);
    wasTarget.current = overLimitTarget;
  }, [overLimitTarget]);
  const folded = collapsible && collapsed && !dragging;
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      data-over={isOver || receiving ? "" : undefined}
      className={cn(
        "flex w-72 shrink-0 snap-start flex-col gap-3 border border-yorha-border bg-yorha-panel p-3 font-yorha text-yorha-fg",
        exceeded && "shadow-[inset_0_2px_0_0_var(--color-yorha-alert-ui)]",
        (isOver || receiving) &&
          "outline-2 -outline-offset-2 outline-dashed outline-yorha-ring",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {collapsible ? (
          <button
            type="button"
            data-part="collapse"
            aria-expanded={!folded}
            aria-label={`${title} 열 ${folded ? "펼치기" : "접기"}`}
            onClick={() => onCollapsedChange?.(!collapsed)}
            className="yorha-tint grid size-6 shrink-0 place-items-center text-yorha-fg-soft hover:text-yorha-fg focus-visible:yorha-focus"
          >
            <Glyph name={folded ? "chevron-right" : "chevron-down"} />
          </button>
        ) : null}
        <h2
          id={headingId}
          className="mr-auto font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-yorha-fg-strong"
        >
          {title}
        </h2>
        <span
          data-part="count"
          data-exceeded={exceeded ? "" : undefined}
          className={cn("inline-flex items-center gap-1 text-yorha-sm", exceeded ? "text-yorha-alert" : "text-yorha-fg-soft")}
        >
          {exceeded ? <Glyph name="triangle-up" /> : null}
          <span aria-hidden="true">
            {count}
            {wipLimit !== undefined ? ` / ${wipLimit}` : null}
          </span>
          <span className="sr-only">{`카드 ${count}개${wipLimit !== undefined ? `, 한도 ${wipLimit}개` : ""}`}</span>
        </span>
      </div>
      {exceeded ? (
        <p role="status" className="sr-only">
          WIP 한도 초과: {count}/{wipLimit}
        </p>
      ) : null}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          aria-labelledby={headingId}
          data-slot="kanban-list"
          className={cn(
            "yorha-scroll-cue-y relative m-0 flex max-h-96 min-h-16 flex-col gap-3 overflow-y-auto p-0 [--yorha-scroll-ground:var(--yorha-panel)]",
            folded && "hidden",
          )}
        >
          {overLimitTarget ? (
            <li
              ref={ringRef}
              data-part="limit-ring"
              aria-hidden="true"
              className="yorha-flicker pointer-events-none absolute inset-0 list-none outline-2 -outline-offset-2 outline-yorha-alert-ui"
            />
          ) : null}
          {children}
          {count === 0 && dragging ? (
            <li
              data-slot="kanban-drop-zone"
              className="relative list-none border border-dashed border-yorha-border p-4 text-center text-yorha-sm text-yorha-fg"
            >
              <span aria-hidden="true" className="yorha-dither-12 absolute inset-0 bg-yorha-ink" />
              <span className="relative bg-yorha-panel px-1">{dropText}</span>
            </li>
          ) : count === 0 ? (
            <li className="list-none border border-dashed border-yorha-border p-4 text-center text-yorha-sm text-yorha-fg-soft">
              {emptyText}
            </li>
          ) : null}
        </ul>
      </SortableContext>
      {addSlot ? <div className="flex">{addSlot}</div> : null}
    </div>
  );
}

/**
 * Drag-and-drop board. Controlled: `columns` is never mutated; a drag works on a private draft and
 * `onChange` receives the next state once on drop (Escape restores the draft to `columns`).
 * Pointer and touch start from the card's handle button; the keyboard uses the same button
 * (Space/Enter lift, arrows move, Space drop, Esc cancel) with Korean live announcements.
 */
export function KanbanBoard({
  columns,
  onChange,
  label = "칸반 보드",
  renderAdd,
  emptyText,
  dropText,
  collapsible = false,
  className,
}: KanbanBoardProps) {
  const [draft, setDraft] = useState<KanbanColumnData[] | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // The overlay is `position: fixed`; any transformed ancestor (docs pages, route transitions, animated panels) would
  // become its containing block and push it away from the pointer, so it renders in a portal on <body>. The portal keeps
  // the board's theme, density and language, which it would otherwise lose outside the board's subtree.
  const boardRef = useRef<HTMLDivElement>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const [overlayScope, setOverlayScope] = useState<OverlayScope>({});
  useEffect(() => setOverlayHost(document.body), []);
  const draftRef = useRef<KanbanColumnData[] | null>(null);
  const lastDraftRef = useRef<KanbanColumnData[] | null>(null);
  const pickupPendingRef = useRef(false);
  const [dropAnimation, setDropAnimation] = useState<DropAnimation | null>(
    null,
  );
  const view = draft ?? columns;
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set());
  const [holdHeight, setHoldHeight] = useState<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const commitDraft = useCallback((next: KanbanColumnData[] | null) => {
    draftRef.current = next;
    if (next) lastDraftRef.current = next;
    setDraft(next);
  }, []);

  // dnd-kit runs the board's onDragEnd before the announcement, which has already cleared `draftRef`: announcements read
  // `lastDraftRef` (kept until the next drag starts) so they describe where the card is, not where it started.
  const announcements = useMemo<Announcements>(() => {
    const position = (column: KanbanColumnData, index: number, count: number) =>
      `${column.title} 열 ${count}장 중 ${index + 1}번째`;
    const name = (id: UniqueIdentifier) => {
      const found = findCard(lastDraftRef.current ?? columns, id);
      return found ? cardLabel(found.card) : String(id);
    };
    /** Where the card is heading, from the over target; the draft may not have caught up with it yet. */
    const heading = (id: UniqueIdentifier, overId: UniqueIdentifier) => {
      const current = lastDraftRef.current ?? columns;
      const from = findCard(current, id);
      const target = findColumnOf(current, overId);
      if (!from || !target) return "";
      const here = from.column.id === target.id;
      const count = target.cards.length + (here ? 0 : 1);
      const over = findCard(current, overId);
      const index = over ? over.index : count - 1;
      return position(target, index, count);
    };
    /** Where the card ends up on drop: the committed draft, with the same-column reorder applied. */
    const landed = (id: UniqueIdentifier, overId: UniqueIdentifier) => {
      const current = lastDraftRef.current ?? columns;
      const from = findCard(current, id);
      if (!from) return "";
      const to = findCard(current, overId);
      const index = to && to.column.id === from.column.id ? to.index : from.index;
      return position(from.column, index, from.column.cards.length);
    };
    return {
      onDragStart: ({ active }) => {
        const loc = findCard(columns, active.id);
        pickupPendingRef.current = true;
        return `${cardLabel(loc?.card ?? { id: String(active.id), title: "" })} 카드를 집었습니다. 현재 ${loc ? position(loc.column, loc.index, loc.column.cards.length) : ""}입니다.`;
      },
      // dnd-kit fires onDragOver right after start with over = the card itself: keep the pick-up text then.
      onDragOver: ({ active, over }) => {
        if (!over) return `${name(active.id)} 카드가 열 밖에 있습니다.`;
        if (pickupPendingRef.current && over.id === active.id) {
          const loc = findCard(lastDraftRef.current ?? columns, active.id);
          return `${name(active.id)} 카드를 집었습니다. 현재 ${loc ? position(loc.column, loc.index, loc.column.cards.length) : ""}입니다.`;
        }
        pickupPendingRef.current = false;
        return `${name(active.id)} 카드를 ${heading(active.id, over.id)}로 옮기는 중입니다.`;
      },
      onDragEnd: ({ active, over }) =>
        over
          ? `${name(active.id)} 카드를 ${landed(active.id, over.id)}에 놓았습니다.`
          : `${name(active.id)} 카드를 원래 위치에 놓았습니다.`,
      onDragCancel: ({ active }) =>
        `이동을 취소했습니다. ${name(active.id)} 카드가 원래 위치로 돌아갑니다.`,
    };
  }, [columns]);

  const onDragStart = ({ active }: DragStartEvent) => {
    setOverlayScope(readScope(boardRef.current));
    setDropAnimation(readDropAnimation());
    setHoldHeight(boardRef.current?.getBoundingClientRect().height ?? null);
    setActiveId(active.id);
    commitDraft(columns);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const current = draftRef.current;
    if (!over || !current) return;
    const activeRect = active.rect.current.translated;
    const below = activeRect
      ? activeRect.top > over.rect.top + over.rect.height / 2
      : false;
    const next = moveAcross(current, active.id, over.id, below);
    if (next !== current) commitDraft(next);
  };

  const finish = () => {
    setActiveId(null);
    commitDraft(null);
    pointerRef.current = null;
    // The board keeps its height through the settle so content below does not jump under the dropping card.
    window.setTimeout(() => setHoldHeight(null), readMotionMs("--motion-select"));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    let next = draftRef.current;
    if (next && over) {
      const from = findCard(next, active.id);
      const to = findCard(next, over.id);
      if (
        from &&
        to &&
        from.column.id === to.column.id &&
        from.index !== to.index
      ) {
        next = next.map((column) =>
          column.id === from.column.id
            ? {
                ...column,
                cards: arrayMove(column.cards, from.index, to.index),
              }
            : column,
        );
      }
      if (next !== columns) {
        // cross-column moves may have changed the draft, same-column moves just did
        const changed =
          JSON.stringify(next.map((c) => c.cards.map((x) => x.id))) !==
          JSON.stringify(columns.map((c) => c.cards.map((x) => x.id)));
        if (changed) onChange(next);
      }
    }
    finish();
  };

  const onDragCancel = (_event: DragCancelEvent) => finish();

  const activeCard = activeId ? findCard(view, activeId)?.card : undefined;
  const receivingId = activeId ? findColumnOf(view, activeId)?.id : undefined;

  // V4-230: a cross-column move remounts the card; put focus back on the lifted card's handle and keep it in view.
  useLayoutEffect(() => {
    if (!activeId) return;
    const handle = boardRef.current?.querySelector<HTMLElement>(`[data-card-handle="${CSS_ESCAPE(String(activeId))}"]`);
    if (!handle) return;
    if (document.activeElement !== handle) handle.focus({ preventScroll: true });
    handle.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, view]);

  // V4-233: own edge autoscroll on the board and the hovered column list (dnd-kit's autoScroll is off).
  useEffect(() => {
    if (!activeId) return;
    const onMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", onMove);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      const pointer = pointerRef.current;
      const board = boardRef.current;
      if (pointer && board) {
        const rect = board.getBoundingClientRect();
        const dx = edgeSpeed(pointer.x, rect.left, rect.right) * dt;
        if (dx) board.scrollLeft += dx;
        const list = document.elementsFromPoint(pointer.x, pointer.y).find((el): el is HTMLElement => el.matches?.("[data-slot=kanban-list]"));
        if (list) {
          const lr = list.getBoundingClientRect();
          const dy = edgeSpeed(pointer.y, lr.top, lr.bottom) * dt;
          if (dy) list.scrollTop += dy;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [activeId]);

  // Direct manipulation: the whole page shows the grabbing cursor and does not select text while a card is held.
  useEffect(() => {
    if (!activeId) return;
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [activeId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      autoScroll={false}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div
        ref={boardRef}
        role="region"
        aria-label={label}
        style={holdHeight !== null ? { minHeight: holdHeight } : undefined}
        data-dragging={activeId !== null ? "" : undefined}
        className={cn("relative flex snap-x snap-proximity data-[dragging]:snap-none scroll-px-1 items-start gap-4 overflow-x-auto overscroll-x-contain p-1", className)}
      >
        {view.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            count={column.cards.length}
            wipLimit={column.wipLimit}
            emptyText={emptyText}
            addSlot={renderAdd?.(column)}
            cardIds={column.cards.map((c) => c.id)}
            receiving={receivingId === column.id}
            dragging={activeId !== null}
            dropText={dropText}
            overLimitTarget={
              receivingId === column.id &&
              column.wipLimit !== undefined &&
              column.cards.length > column.wipLimit &&
              columns.find((c) => c.id === column.id)?.cards.some((c) => c.id === activeId) !== true
            }
            collapsible={collapsible}
            collapsed={collapsedIds.has(column.id)}
            onCollapsedChange={(next) =>
              setCollapsedIds((prev) => {
                const set = new Set(prev);
                if (next) set.add(column.id);
                else set.delete(column.id);
                return set;
              })
            }
          >
            {column.cards.map((card, index) => (
              <KanbanCard key={card.id} card={card} last={index === column.cards.length - 1 && index > 0} />
            ))}
          </KanbanColumn>
        ))}
      </div>
      {overlayHost
        ? createPortal(
      <DragOverlay dropAnimation={dropAnimation}>
        {activeCard ? (
          <div
            data-slot="kanban-overlay"
            data-theme={overlayScope.theme}
            data-density={overlayScope.density}
            lang={overlayScope.lang}
            className="cursor-grabbing font-yorha text-yorha-fg"
          >
            <KanbanCardView
              card={activeCard}
              className="shadow-yorha-lg"
              handle={
                <span aria-hidden="true" data-part="grip" className={cn(HANDLE_BOX, "text-yorha-ink")}>
                  <GripIcon />
                </span>
              }
            />
          </div>
        ) : null}
      </DragOverlay>,
            overlayHost,
          )
        : null}
    </DndContext>
  );
}

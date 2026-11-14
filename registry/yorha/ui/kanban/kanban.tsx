import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
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
  className?: string;
}

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
  const duration = readMotionMs("--motion-collapse");
  if (duration <= 0) return null;
  const easing = getComputedStyle(document.documentElement)
    .getPropertyValue("--yorha-ease-emphasized")
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
  return (
    <Card
      title={card.title}
      meta={card.meta}
      actions={handle}
      className={className}
    />
  );
}

export interface KanbanCardProps {
  card: KanbanCardData;
  /** Accessible name of the drag handle. Defaults to "<card label> 카드 이동". */
  handleLabel?: string;
}

/** Sortable card. The handle button is the only drag activator and the only extra tab stop. */
export function KanbanCard({ card, handleLabel }: KanbanCardProps) {
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
      className="list-none"
    >
      <KanbanCardView
        card={card}
        className={
          isDragging ? "border-dashed opacity-40 shadow-none" : undefined
        }
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={handleLabel ?? `${cardLabel(card)} 카드 이동`}
            className="yorha-press inline-flex h-8 min-w-8 cursor-grab touch-none items-center justify-center border border-yorha-border bg-yorha-bg px-2 text-yorha-sm text-yorha-fg hover:bg-yorha-ink hover:text-yorha-on-ink focus-visible:yorha-focus active:cursor-grabbing"
          >
            <span aria-hidden="true">⠿</span>
          </button>
        }
      />
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
}: KanbanColumnProps) {
  const headingId = useId();
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column" } });
  const exceeded = wipLimit !== undefined && count > wipLimit;
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      data-over={isOver ? "" : undefined}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 border border-yorha-border bg-yorha-panel p-3 font-yorha text-yorha-fg",
        isOver &&
          "outline-2 -outline-offset-2 outline-dashed outline-yorha-ring",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={headingId}
          className="font-yorha-bold text-yorha-base uppercase tracking-yorha-heading text-yorha-fg-strong"
        >
          {title}
        </h2>
        <span className="text-yorha-sm text-yorha-fg-soft">
          <span aria-hidden="true">
            {count}
            {wipLimit !== undefined ? ` / ${wipLimit}` : null}
          </span>
          <span className="sr-only">{`카드 ${count}개${wipLimit !== undefined ? `, 한도 ${wipLimit}개` : ""}`}</span>
        </span>
      </div>
      {exceeded ? (
        <p
          role="status"
          className="border border-yorha-alert-ui px-2 py-1 text-yorha-sm text-yorha-alert"
        >
          WIP 한도 초과: {count}/{wipLimit}
        </p>
      ) : null}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          aria-labelledby={headingId}
          className="m-0 flex max-h-96 min-h-16 flex-col gap-3 overflow-y-auto p-0"
        >
          {children}
          {count === 0 ? (
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
  className,
}: KanbanBoardProps) {
  const [draft, setDraft] = useState<KanbanColumnData[] | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const draftRef = useRef<KanbanColumnData[] | null>(null);
  const lastColumnRef = useRef<string | null>(null);
  const pickedUpRef = useRef("");
  const [dropAnimation, setDropAnimation] = useState<DropAnimation | null>(
    null,
  );
  const view = draft ?? columns;

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
    setDraft(next);
  }, []);

  const announcements = useMemo<Announcements>(() => {
    const where = (id: UniqueIdentifier, overId?: UniqueIdentifier) => {
      const current = draftRef.current ?? columns;
      const loc = findCard(current, id);
      if (!loc) return "";
      let index = loc.index;
      if (overId !== undefined && lastColumnRef.current === loc.column.id) {
        const over = findCard(current, overId);
        index = over ? over.index : loc.column.cards.length - 1;
      }
      lastColumnRef.current = loc.column.id;
      return `${loc.column.title} 열 ${loc.column.cards.length}장 중 ${index + 1}번째`;
    };
    const name = (id: UniqueIdentifier) => {
      const found = findCard(draftRef.current ?? columns, id);
      return found ? cardLabel(found.card) : String(id);
    };
    return {
      onDragStart: ({ active }) => {
        const loc = findCard(columns, active.id);
        lastColumnRef.current = loc?.column.id ?? null;
        pickedUpRef.current = `${name(active.id)} 카드를 집었습니다. 현재 ${loc ? `${loc.column.title} 열 ${loc.column.cards.length}장 중 ${loc.index + 1}번째` : ""}입니다.`;
        return pickedUpRef.current;
      },
      // dnd-kit fires onDragOver right after start with over = the card itself: keep the pick-up text then.
      onDragOver: ({ active, over }) =>
        over?.id === active.id &&
        lastColumnRef.current ===
          findCard(draftRef.current ?? columns, active.id)?.column.id
          ? pickedUpRef.current
          : over
            ? `${name(active.id)} 카드를 ${where(active.id, over.id)}로 옮기는 중입니다.`
            : `${name(active.id)} 카드가 열 밖에 있습니다.`,
      onDragEnd: ({ active, over }) =>
        over
          ? `${name(active.id)} 카드를 ${where(active.id, over.id)}에 놓았습니다.`
          : `${name(active.id)} 카드를 원래 위치에 놓았습니다.`,
      onDragCancel: ({ active }) =>
        `이동을 취소했습니다. ${name(active.id)} 카드가 원래 위치로 돌아갑니다.`,
    };
  }, [columns]);

  const onDragStart = ({ active }: DragStartEvent) => {
    setDropAnimation(readDropAnimation());
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      autoScroll
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div
        role="region"
        aria-label={label}
        className={cn("flex items-start gap-4 overflow-x-auto p-1", className)}
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
          >
            {column.cards.map((card) => (
              <KanbanCard key={card.id} card={card} />
            ))}
          </KanbanColumn>
        ))}
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeCard ? (
          <KanbanCardView card={activeCard} className="shadow-yorha-lg" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

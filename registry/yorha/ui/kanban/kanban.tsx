import type { ReactNode } from "react";

export interface KanbanCardData { id: string; title: ReactNode; label?: string; meta?: ReactNode }
export interface KanbanColumnData { id: string; title: string; cards: KanbanCardData[]; wipLimit?: number }
export interface KanbanBoardProps {
  columns: KanbanColumnData[];
  onChange: (columns: KanbanColumnData[]) => void;
  label?: string;
  renderAdd?: (column: KanbanColumnData) => ReactNode;
  emptyText?: string;
  className?: string;
}

// RED stub: static markup, no drag and drop.
export function KanbanBoard({ columns, label = "칸반 보드", renderAdd }: KanbanBoardProps) {
  return (
    <div role="region" aria-label={label}>
      {columns.map((column) => (
        <section key={column.id}>
          <h2>{column.title}</h2>
          <ul>
            {column.cards.map((card) => (
              <li key={card.id}>
                <h3>{card.title}</h3>
              </li>
            ))}
          </ul>
          {renderAdd?.(column)}
        </section>
      ))}
    </div>
  );
}

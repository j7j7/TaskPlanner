import { useState } from 'react';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from './Column';
import type { Card as CardType } from '../../types';
import { useBoardStore } from '../../store/useBoardStore';

export function Board() {
  const { currentBoard, moveCard } = useBoardStore();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  if (!currentBoard) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-textMuted">No board selected</p>
      </div>
    );
  }

  const columns = (currentBoard.columns ?? []).sort((a, b) => a.order - b.order);
  const columnIds = columns.map((col) => col.id);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    for (const column of columns) {
      const card = column.cards?.find((c) => c.id === activeId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const fromColumn = columns.find((col) =>
      col.cards?.some((card) => card.id === activeId)
    );

    if (!fromColumn) return;

    const card = fromColumn.cards?.find((c) => c.id === activeId);
    if (!card) return;

    if (activeId === overId) return;

    const toColumn = columns.find((col) => col.id === overId);

    if (toColumn) {
      const overIndex = toColumn.cards?.findIndex((c) => c.id === overId) ?? 0;
      const newIndex = overIndex === -1 ? 0 : overIndex;
      moveCard(activeId, fromColumn.id, toColumn.id, newIndex);
    } else {
      const toColumnSame = columns.find((col) =>
        col.cards?.some((c) => c.id === overId)
      );

      if (toColumnSame && toColumnSame.id !== fromColumn.id) {
        const overIndex = toColumnSame.cards?.findIndex((c) => c.id === overId) ?? 0;
        moveCard(activeId, fromColumn.id, toColumnSame.id, overIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 h-full min-h-0 overflow-auto">
        <SortableContext
          items={columnIds}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="task-card dragging bg-surfaceLight border-2 border-accent rounded-lg p-3 rotate-2 cursor-grabbing">
            <h4 className="font-medium text-text">{activeCard.title}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

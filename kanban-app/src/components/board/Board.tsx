import { useState } from 'react';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    for (const column of currentBoard.columns) {
      const card = column.cards.find((c) => c.id === activeId);
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

    const fromColumn = currentBoard.columns.find((col) =>
      col.cards.some((card) => card.id === activeId)
    );

    if (!fromColumn) return;

    const card = fromColumn.cards.find((c) => c.id === activeId);
    if (!card) return;

    if (activeId === overId) return;

    const toColumn = currentBoard.columns.find((col) => col.id === overId);

    if (toColumn) {
      const overIndex = toColumn.cards.findIndex((c) => c.id === overId);
      const newIndex = overIndex === -1 ? 0 : overIndex;
      moveCard(activeId, fromColumn.id, toColumn.id, newIndex);
    } else {
      const toColumnSame = currentBoard.columns.find((col) =>
        col.cards.some((c) => c.id === overId)
      );

      if (toColumnSame && toColumnSame.id !== fromColumn.id) {
        const overIndex = toColumnSame.cards.findIndex((c) => c.id === overId);
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
      <div className="flex gap-6 h-full overflow-x-auto pb-4">
        <SortableContext
          items={currentBoard.columns.map((col) => col.id)}
          strategy={horizontalListSortingStrategy}
        >
          {currentBoard.columns
            .sort((a, b) => a.order - b.order)
            .map((column) => (
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

import { useState } from 'react';
import { DndContext, type DragEndEvent, type DragOverEvent, DragOverlay, type DragStartEvent, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from './Column';
import type { Card as CardType } from '../../types';
import { useBoardStore } from '../../store/useBoardStore';

export function Board() {
  const { currentBoard, moveCard, moveColumn } = useBoardStore();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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
    
    // Check if it's a column being dragged
    const column = columns.find((col) => col.id === activeId);
    if (column) {
      setActiveColumnId(column.id);
      return;
    }
    
    // Otherwise, it's a card
    for (const column of columns) {
      const card = column.cards?.find((c) => c.id === activeId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setActiveColumnId(null);
    setOverId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if it's a column being dragged
    const activeColumn = columns.find((col) => col.id === activeId);
    if (activeColumn) {
      // Column is being reordered
      const overColumn = columns.find((col) => col.id === overId);
      if (overColumn && activeId !== overId) {
        const newIndex = columns.findIndex((col) => col.id === overId);
        moveColumn(activeId, newIndex);
      }
      return;
    }

    // Otherwise, it's a card being dragged
    const fromColumn = columns.find((col) =>
      col.cards?.some((card) => card.id === activeId)
    );

    if (!fromColumn) return;

    const card = fromColumn.cards?.find((c) => c.id === activeId);
    if (!card) return;

    if (activeId === overId) return;

    // Check if dropping over a column (moving to a different column)
    const toColumn = columns.find((col) => col.id === overId);

    if (toColumn) {
      // Dropping over a column - move to the end of that column
      const newIndex = toColumn.cards.length;
      moveCard(activeId, fromColumn.id, toColumn.id, newIndex);
    } else {
      // Dropping over another card - find which column that card is in
      const toColumnSame = columns.find((col) =>
        col.cards?.some((c) => c.id === overId)
      );

      if (toColumnSame) {
        const overCardIndex = toColumnSame.cards.findIndex((c) => c.id === overId);
        if (overCardIndex === -1) return;

        // Calculate the new index
        // If moving within the same column, adjust index based on direction
        let newIndex = overCardIndex;
        if (toColumnSame.id === fromColumn.id) {
          const fromIndex = fromColumn.cards.findIndex((c) => c.id === activeId);
          // If moving down, insert after the target; if moving up, insert at target position
          if (fromIndex < overCardIndex) {
            newIndex = overCardIndex + 1;
          } else {
            newIndex = overCardIndex;
          }
        }

        moveCard(activeId, fromColumn.id, toColumnSame.id, newIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 h-full min-h-0 overflow-auto">
        <SortableContext
          items={columnIds}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <Column key={column.id} column={column} dragOverId={overId} activeCardId={activeCard?.id || null} />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="task-card dragging cursor-grabbing">
            <h4 className="font-medium text-text">{activeCard.title}</h4>
          </div>
        ) : activeColumnId ? (
          <div className="board-column flex flex-col h-full max-h-full shrink-0 w-72 opacity-90 cursor-grabbing">
            <div className="board-column-header flex flex-col gap-2 flex-shrink-0 p-3 bg-surface border border-border rounded-t-lg">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-text">
                  {columns.find((c) => c.id === activeColumnId)?.title}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

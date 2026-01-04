import { useState, useCallback, useRef, useMemo } from 'react';
import { DndContext, type DragEndEvent, type DragOverEvent, DragOverlay, type DragStartEvent, rectIntersection, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from './Column';
import type { Card as CardType } from '../../types';
import { useBoardStore } from '../../store/useBoardStore';

export function Board({ isRotated = false, onAddColumn }: { isRotated?: boolean; onAddColumn?: () => void }) {
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

  // IMPORTANT: All hooks must be called before any early returns
  // Use refs to track drag over state (must be declared at top level)
  const lastDragOverUpdateRef = useRef<number>(0);
  const dragOverTimeoutRef = useRef<number | null>(null);

  // Memoize columns and columnIds to prevent unnecessary recalculations
  const columns = useMemo(() => 
    (currentBoard?.columns ?? []).sort((a, b) => a.order - b.order),
    [currentBoard?.columns]
  );
  const columnIds = useMemo(() => 
    columns.map((col) => col.id),
    [columns]
  );

  // All callbacks must be defined before early return to maintain hook order
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    const now = Date.now();
    
    // Throttle updates to max once per 16ms (~60fps) to reduce re-renders
    if (now - lastDragOverUpdateRef.current < 16) {
      // Clear any pending timeout and schedule an update
      if (dragOverTimeoutRef.current !== null) {
        clearTimeout(dragOverTimeoutRef.current);
      }
      dragOverTimeoutRef.current = window.setTimeout(() => {
        setOverId(over?.id as string || null);
        lastDragOverUpdateRef.current = Date.now();
        dragOverTimeoutRef.current = null;
      }, 16 - (now - lastDragOverUpdateRef.current));
      return;
    }
    
    lastDragOverUpdateRef.current = now;
    setOverId(over?.id as string || null);
  }, []);

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

        const fromIndex = fromColumn.cards.findIndex((c) => c.id === activeId);
        if (fromIndex === -1) return;

        // Calculate the new index
        let newIndex: number;
        
        if (toColumnSame.id === fromColumn.id) {
          // Moving within the same column
          // The moveCard function will adjust the index based on removal position
          // If moving down (fromIndex < overCardIndex), we want to insert after overCardIndex
          // If moving up (fromIndex > overCardIndex), we want to insert at overCardIndex
          if (fromIndex < overCardIndex) {
            // Moving down: insert after the target card
            // moveCard will adjust: adjustedIndex = fromIndex < (overCardIndex + 1) ? (overCardIndex + 1) - 1 : (overCardIndex + 1)
            // = fromIndex < (overCardIndex + 1) ? overCardIndex : (overCardIndex + 1)
            // Since fromIndex < overCardIndex < overCardIndex + 1, adjustedIndex = overCardIndex
            // This inserts at overCardIndex, which pushes the target card down (inserts after it)
            newIndex = overCardIndex + 1;
          } else {
            // Moving up: insert at the target card's position (before it)
            // moveCard will adjust: adjustedIndex = fromIndex > overCardIndex ? overCardIndex : overCardIndex
            // = overCardIndex (since fromIndex > overCardIndex)
            // This inserts at overCardIndex, pushing the target card down
            newIndex = overCardIndex;
          }
        } else {
          // Moving to a different column - insert at the target card's position
          newIndex = overCardIndex;
        }

        moveCard(activeId, fromColumn.id, toColumnSame.id, newIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`flex gap-3 sm:gap-4 md:gap-6 h-full min-h-0 overflow-auto ${isRotated ? 'flex-col' : 'flex-col sm:flex-row'}`}>
        <SortableContext
          items={columnIds}
          strategy={isRotated ? verticalListSortingStrategy : horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <Column key={column.id} column={column} dragOverId={overId} activeCardId={activeCard?.id || null} isRotated={isRotated} />
          ))}
          {columns.length === 0 && onAddColumn && (
            <button
              onClick={onAddColumn}
              className="shrink-0 w-72 h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-textMuted hover:text-text hover:border-accent hover:bg-surfaceLight/50 transition-all cursor-pointer"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-display font-medium">Add Column</span>
            </button>
          )}
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

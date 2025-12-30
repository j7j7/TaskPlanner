import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column as ColumnType } from '../../types';
import { Card } from './Card';
import { useBoardStore } from '../../store/useBoardStore';

interface ColumnProps {
  column: ColumnType;
}

export function Column({ column }: ColumnProps) {
  const { createCard, deleteColumn, updateColumn, labels } = useBoardStore();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardTitle.trim()) {
      await createCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const handleUpdateTitle = async () => {
    if (editTitle.trim() && editTitle !== column.title) {
      await updateColumn(column.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleDeleteColumn = async () => {
    if (window.confirm('Delete this column and all its cards?')) {
      await deleteColumn(column.id);
    }
  };

  return (
    <div
      className={`board-column flex flex-col h-full transition-all duration-200 shrink-0 sm:shrink ${
        isOver ? 'border-accent bg-surfaceLight/50' : ''
      }`}
    >
      <div
        className="board-column-header flex items-center justify-between"
        style={{ borderColor: column.color }}
      >
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleUpdateTitle}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
            className="bg-surfaceLight border border-border rounded px-2 py-1 text-lg font-display font-semibold outline-none focus:border-accent"
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer hover:text-accent transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {column.title}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-textMuted font-mono bg-surfaceLight px-2 py-0.5 rounded-full">
            {column.cards.length}
          </span>
          <button
            onClick={handleDeleteColumn}
            className="text-textMuted hover:text-danger transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[100px]"
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsAddingCard(true);
          }
        }}
      >
        <SortableContext
          items={column.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              labels={labels}
            />
          ))}
        </SortableContext>

        {isAddingCard ? (
          <form onSubmit={handleAddCard} className="space-y-2">
            <input
              type="text"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter card title..."
              className="input text-sm py-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary text-xs py-1.5 px-3">
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCard(false)}
                className="btn btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {!isAddingCard && (
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-textMuted hover:text-text hover:bg-surfaceLight rounded-lg transition-all text-sm font-display"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Card
          </button>
        </div>
      )}
    </div>
  );
}

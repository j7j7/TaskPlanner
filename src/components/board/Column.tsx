import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column as ColumnType } from '../../types';
import { Card } from './Card';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuth } from '../../hooks/useAuth';
import { UserSelector } from '../ui/UserSelector';

interface ColumnProps {
  column: ColumnType;
}

function getUserColor(userId: string): string {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Column({ column }: ColumnProps) {
  const { createCard, deleteColumn, updateColumn, labels, users, fetchUsers, currentBoard, shareColumn, unshareColumn } = useBoardStore();
  const { user } = useAuth();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  useEffect(() => {
    if (isShareModalOpen) {
      fetchUsers();
    }
  }, [isShareModalOpen, fetchUsers]);

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

  const handleShare = async (userId: string) => {
    if (currentBoard) {
      await shareColumn(currentBoard.id, column.id, userId);
    }
  };

  const handleUnshare = async (userId: string) => {
    if (currentBoard) {
      await unshareColumn(currentBoard.id, column.id, userId);
    }
  };

  const isOwner = column.userId === user?.id;
  const sharedUserIds = column.sharedWith || [];
  const allUserIds = [column.userId, ...sharedUserIds].filter(Boolean);
  const ownerUser = users.find(u => u.id === column.userId);

  const handleRemoveSharedUser = async (userId: string) => {
    await handleUnshare(userId);
  };

  return (
    <>
      <div
        className={`board-column flex flex-col h-full max-h-full transition-all duration-200 shrink-0 sm:shrink w-full sm:w-72 max-w-full ${
          isOver ? 'border-accent bg-surfaceLight/50' : ''
        }`}
      >
        <div
          className="board-column-header flex flex-col gap-2 flex-shrink-0"
          style={{ borderColor: column.color }}
        >
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-1">
              <span className="text-xs text-textMuted font-mono bg-surfaceLight px-2 py-0.5 rounded-full">
                {column.cards.length}
              </span>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="text-textMuted hover:text-accent transition-colors p-1"
                title="Share column"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
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

          <div className="flex items-center gap-1 flex-wrap">
            {allUserIds.map((userId, index) => {
              const u = users.find(x => x.id === userId);
              const isShared = index > 0;
              const canRemove = isShared && isOwner;
              return (
                <div
                  key={userId}
                  className={`group relative flex items-center ${index > 0 ? '-ml-2' : ''}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-surface ${
                      isShared ? 'ring-1 ring-accent' : ''
                    }`}
                    style={{ backgroundColor: getUserColor(userId || 'unknown') }}
                    title={u?.username || 'Unknown'}
                  >
                    <span className="text-background text-xs font-bold">
                      {(u?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {canRemove && (
                    <button
                      onClick={() => handleRemoveSharedUser(userId)}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {index === 0 && (
                    <span className="ml-1 text-[10px] text-textMuted uppercase tracking-wider">
                      Owner
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          ref={setNodeRef}
          className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 scrollbar-thin"
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
          <div className="p-3 border-t border-border flex-shrink-0">
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

      <UserSelector
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSelectUser={handleShare}
        title="Share Column"
        selectedUserIds={sharedUserIds}
        mode="manage"
      />
    </>
  );
}

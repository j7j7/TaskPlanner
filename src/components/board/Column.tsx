import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column as ColumnType, SharedUser } from '../../types';
import { Card } from './Card';
import { useBoardStore, useLabels } from '../../store/useBoardStore';
import { useAuth } from '../../context/AuthContext';
import { UserSelector } from '../ui/UserSelector';

interface ColumnProps {
  column: ColumnType;
  dragOverId?: string | null;
  activeCardId?: string | null;
  isRotated?: boolean;
}

function getUserColor(userId: string): string {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Column({ column, dragOverId, activeCardId, isRotated = false }: ColumnProps) {
  const { createCard, deleteColumn, updateColumn, users, fetchUsers, currentBoard, shareColumn, unshareColumn } = useBoardStore();
  const { user } = useAuth();
  const { labels: allLabels } = useLabels();
  
  // Filter labels by current user
  const labels = allLabels.filter((label) => label.userId === user?.id);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Make column sortable (draggable)
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
  });

  // Make column droppable for cards
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
  });

  // Combine refs for both sortable and droppable
  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

  const handleShare = async (userId: string, permission: 'read' | 'write' = 'write') => {
    if (currentBoard) {
      await shareColumn(currentBoard.id, column.id, userId, permission);
    }
  };

  const handleUpdatePermission = async (userId: string, permission: 'read' | 'write') => {
    if (currentBoard) {
      await shareColumn(currentBoard.id, column.id, userId, permission);
    }
  };

  const handleUnshare = async (userId: string) => {
    if (currentBoard) {
      await unshareColumn(currentBoard.id, column.id, userId);
    }
  };

  const isOwner = column.userId === user?.id;
  const sharedUsers: SharedUser[] = column.sharedWith || [];
  const canWrite = isOwner || sharedUsers.some(su => su.userId === user?.id && su.permission === 'write');
  const allUserIds = isOwner
    ? sharedUsers.map(su => su.userId)
    : [column.userId, ...sharedUsers.map(su => su.userId)].filter(Boolean);

  const getUserDisplay = (userId: string) => {
    const found = users.find(x => x.id === userId);
    if (found) return found;
    if (user?.id === userId) return user;
    return null;
  };

  const getUserTitle = (userId: string) => {
    const u = getUserDisplay(userId);
    if (!u) return 'Unknown';
    const isColumnOwner = userId === column.userId;
    return isColumnOwner ? `${u.username} (Owner)` : u.username;
  };

  const handleRemoveSharedUser = async (userId: string) => {
    await handleUnshare(userId);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`board-column flex flex-col transition-all duration-200 shrink-0 sm:shrink w-full max-w-full ${
          isOver ? 'border-accent bg-surfaceLight/50 drag-over' : ''
        } ${isDragging ? 'opacity-50' : ''} ${
          isRotated 
            ? 'h-full max-h-full min-h-[180px]' 
            : 'sm:h-full sm:max-h-full sm:w-72 h-auto'
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="board-column-header flex flex-col gap-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{ borderColor: column.color }}
        >
          <div className="flex items-center justify-between">
            {canWrite && isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleUpdateTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                onPointerDown={(e) => e.stopPropagation()}
                className="bg-surfaceLight border border-border rounded px-2 py-1 text-lg font-display font-semibold outline-none focus:border-accent"
                autoFocus
              />
            ) : (
              <span
                className={`cursor-pointer hover:text-accent transition-colors ${canWrite ? '' : 'cursor-default'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  canWrite && setIsEditing(true);
                }}
              >
                {column.title}
              </span>
            )}
            <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
              <span className="text-xs text-textMuted font-mono bg-surfaceLight px-2 py-0.5 rounded-full">
                {column.cards.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingCard(true);
                }}
                className="text-textMuted hover:text-accent transition-colors p-1"
                title="Add card"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsShareModalOpen(true);
                }}
                className={`${isOwner ? 'text-textMuted hover:text-accent' : 'opacity-50 cursor-not-allowed'} transition-colors p-1`}
                title={isOwner ? "Share column" : "Only owner can share"}
                disabled={!isOwner}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteColumn();
                  }}
                  className="text-textMuted hover:text-danger transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap" onPointerDown={(e) => e.stopPropagation()}>
            {allUserIds.map((userId, index) => {
              const u = getUserDisplay(userId || '');
              const sharedUser = sharedUsers.find(su => su.userId === userId);
              const canRemove = isOwner;
              return (
                <div
                  key={userId}
                  className={`group relative flex items-center ${index > 0 ? '-ml-2' : ''}`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-surface"
                    style={{ backgroundColor: getUserColor(userId || 'unknown') }}
                    title={getUserTitle(userId || '')}
                  >
                    <span className="text-background text-xs font-bold">
                      {(u?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {sharedUser && (
                    <span className="absolute -top-2 -right-2 text-[10px]" title={`${sharedUser.permission} access`}>
                      {sharedUser.permission === 'write' ? '✏️' : '👁️'}
                    </span>
                  )}
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
                </div>
              );
            })}
            {!isOwner && allUserIds.length === 0 && (
              <span className="text-xs text-textMuted italic">Private</span>
            )}
          </div>
        </div>

        {isAddingCard && (
          <form onSubmit={handleAddCard} className="p-3 border-t border-border bg-surfaceLight/50">
            <input
              type="text"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter card title..."
              className="input text-sm py-2 mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary text-xs py-1.5 px-3">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className="btn btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div
          className={`flex-1 overflow-y-auto p-3 space-y-3 min-h-0 scrollbar-thin ${isRotated ? 'overflow-x-auto overflow-y-hidden' : ''}`}
          onDoubleClick={() => canWrite && setIsAddingCard(true)}
        >
          <SortableContext
            items={column.cards.map((card) => card.id)}
            strategy={isRotated ? horizontalListSortingStrategy : verticalListSortingStrategy}
          >
            <div className={`${isRotated ? 'flex flex-row gap-3 h-full' : 'flex flex-col'}`}>
              {column.cards.map((card, index) => {
                const isOver = dragOverId === card.id && activeCardId !== card.id;
                
                // Find the active card's position
                const activeCardIndex = activeCardId 
                  ? column.cards.findIndex((c) => c.id === activeCardId)
                  : -1;
                
                // Show placeholder above if dragging down, or below if dragging up
                const shouldShowPlaceholderAbove = isOver && activeCardIndex !== -1 && activeCardIndex < index;
                const shouldShowPlaceholderBelow = isOver && activeCardIndex !== -1 && activeCardIndex > index;
                
                return (
                  <div key={card.id} className={isRotated ? 'shrink-0' : ''}>
                    {shouldShowPlaceholderAbove && (
                      <div className="h-2 mx-2 mb-1 bg-accent/30 rounded border-2 border-dashed border-accent transition-all" />
                    )}
                    <Card
                      card={card}
                      labels={labels}
                      isDragOver={isOver}
                    />
                    {shouldShowPlaceholderBelow && (
                      <div className="h-2 mx-2 mt-1 bg-accent/30 rounded border-2 border-dashed border-accent transition-all" />
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>

          {canWrite && isAddingCard ? (
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
      </div>

      <UserSelector
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSelectUser={handleShare}
        onUpdatePermission={handleUpdatePermission}
        title="Share Column"
        selectedUsers={sharedUsers}
        mode="manage"
      />
    </>
  );
}

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
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ColumnProps {
  column: ColumnType;
  dragOverId?: string | null;
  activeCardId?: string | null;
  isRotated?: boolean;
}

const COLUMN_COLORS = [
  // Original colors
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  // Grey colors with progressive brightness and subtle blue tint
  '#b8c0cd', '#8a95a8', '#5d6b7f', '#3f4a5c',
  // Yellow variations (lightest to darkest)
  '#fef3c7', '#fde68a', '#fbbf24', '#f59e0a',
  // Green variations (lightest to darkest)
  '#d1fae5', '#6ee7b7', '#10b981', '#22c55d',
  // Blue variations (lightest to darkest)
  '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f5',
  // Red variations (lightest to darkest)
  '#fee2e2', '#fca5a5', '#f87171', '#ef4445',
  // Orange variations (lightest to darkest)
  '#fed7aa', '#fdba74', '#fb923c', '#f97315',
  // Purple variations (lightest to darkest)
  '#f3e8ff', '#d8b4fe', '#c084fc', '#8b5cf7'
];

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editColor, setEditColor] = useState(column.color);

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

  const handleSaveColumn = async () => {
    if (editTitle.trim()) {
      await updateColumn(column.id, { 
        title: editTitle.trim(),
        color: editColor 
      });
    }
    setIsEditModalOpen(false);
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
        style={{
          ...style,
          background: `linear-gradient(to bottom, ${column.color}33, ${column.color}00)`,
        }}
        className={`board-column flex flex-col transition-all duration-200 shrink-0 w-full max-w-full rounded-lg ${
          isOver ? 'border-accent bg-surfaceLight/50 drag-over' : ''
        } ${isDragging ? 'opacity-50' : ''} ${
          isRotated 
            ? 'sm:h-auto min-h-[100px]' 
            : 'sm:h-full sm:max-h-full sm:w-72 h-auto'
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="board-column-header flex flex-col gap-2 flex-shrink-0 cursor-grab active:cursor-grabbing bg-transparent"
          style={{ borderColor: column.color }}
        >
          <div className="flex items-center justify-between">
            <span
              className={`cursor-pointer hover:text-accent transition-colors ${canWrite ? '' : 'cursor-default'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (canWrite) {
                  setEditTitle(column.title);
                  setEditColor(column.color);
                  setIsEditModalOpen(true);
                }
              }}
            >
              {column.title}
            </span>
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
                data-tooltip="Add card"
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
                data-tooltip={isOwner ? "Share column" : "Only owner can share"}
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
                  data-tooltip="Delete column"
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
                    data-tooltip={getUserTitle(userId || '')}
                  >
                    <span className="text-background text-xs font-bold">
                      {(u?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {sharedUser && (
                    <span className="absolute -top-2 -right-2 text-[10px]" data-tooltip={`${sharedUser.permission} access`}>
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

        <div
          className={`flex-1 overflow-y-auto p-3 space-y-3 min-h-0 scrollbar-thin ${isRotated ? 'overflow-x-auto overflow-y-hidden' : ''}`}
          onDoubleClick={() => canWrite && setIsAddingCard(true)}
        >
          <SortableContext
            items={column.cards.map((card) => card.id)}
            strategy={isRotated ? horizontalListSortingStrategy : verticalListSortingStrategy}
          >
            <div className={`${isRotated ? 'flex flex-row gap-3 h-full' : 'flex flex-col gap-3'}`}>
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
              {column.cards.length === 0 && canWrite && (
                <button
                  onClick={() => setIsAddingCard(true)}
                  className="py-4 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-textMuted hover:text-text hover:border-accent hover:bg-surfaceLight/50 transition-all cursor-pointer"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-display">Add Card</span>
                </button>
              )}
            </div>
          </SortableContext>

          {canWrite && isAddingCard && (
            <form onSubmit={handleAddCard} className="space-y-2 mt-2">
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Column"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
              Column Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input"
              placeholder="e.g., In Review"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textMuted mb-2 font-display">
              Color
            </label>
            <div className="flex gap-2 overflow-x-auto py-1 pb-2 scrollbar-thin">
              {COLUMN_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditColor(color)}
                  className={`rounded-lg transition-all border-2 shrink-0 ${
                    editColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color, width: '22.4px', height: '22.4px' }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveColumn}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

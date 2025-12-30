import { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Card as CardType, Label, SharedUser } from '../../types';
import { CardModal } from './CardModal';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuth } from '../../context/AuthContext';
import { UserSelector } from '../ui/UserSelector';

interface CardProps {
  card: CardType;
  labels: Label[];
  isDragOver?: boolean;
}

function getUserColor(userId: string): string {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Card({ card, labels, isDragOver = false }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { users, fetchUsers, currentBoard, shareCard, unshareCard } = useBoardStore();
  const { user } = useAuth();

  useEffect(() => {
    if (isShareModalOpen) {
      fetchUsers();
    }
  }, [isShareModalOpen, fetchUsers]);

  const cardLabels = labels.filter((l) => card.labels.includes(l.id));

  const priorityColors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    urgent: '#ef4444',
  };

  const isOwner = card.userId === user?.id;
  const sharedUsers: SharedUser[] = card.sharedWith || [];
  const canWrite = isOwner || sharedUsers.some(su => su.userId === user?.id && su.permission === 'write');
  const allUserIds = isOwner
    ? sharedUsers.map(su => su.userId)
    : [card.userId, ...sharedUsers.map(su => su.userId)].filter(Boolean);

  const getUserDisplay = (userId: string) => {
    const found = users.find(x => x.id === userId);
    if (found) return found;
    if (user?.id === userId) return user;
    return null;
  };

  const getUserTitle = (userId: string) => {
    const u = getUserDisplay(userId);
    if (!u) return 'Unknown';
    const isCardOwner = userId === card.userId;
    return isCardOwner ? `${u.username} (Owner)` : u.username;
  };

  const handleShare = async (userId: string, permission?: 'read' | 'write') => {
    if (currentBoard) {
      const column = currentBoard.columns.find(col => col.cards.some(c => c.id === card.id));
      if (column) {
        await shareCard(currentBoard.id, column.id, card.id, userId, permission);
      }
    }
  };

  const handleUpdatePermission = async (userId: string, permission: 'read' | 'write') => {
    if (currentBoard) {
      const column = currentBoard.columns.find(col => col.cards.some(c => c.id === card.id));
      if (column) {
        await shareCard(currentBoard.id, column.id, card.id, userId, permission);
      }
    }
  };

  const handleRemoveSharedUser = async (userId: string) => {
    if (currentBoard) {
      const column = currentBoard.columns.find(col => col.cards.some(c => c.id === card.id));
      if (column) {
        await unshareCard(currentBoard.id, column.id, card.id, userId);
      }
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`task-card group ${isDragging ? 'dragging' : ''} ${isDragOver ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''} ${!canWrite ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.share-btn')) {
            e.stopPropagation();
            setIsShareModalOpen(true);
          } else if (canWrite) {
            setIsModalOpen(true);
          }
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: priorityColors[card.priority] }}
        />

        <div className="pl-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {card.icon && (
                <span className="text-lg flex-shrink-0" title="Card icon">
                  {card.icon}
                </span>
              )}
              <h4 className="font-medium text-text text-sm leading-snug flex-1 truncate">
                {card.title}
              </h4>
            </div>
            <button
              className={`share-btn opacity-0 group-hover:opacity-100 text-textMuted hover:text-accent transition-opacity p-0.5 ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isOwner ? "Share card" : "Only owner can share"}
              onClick={(e) => {
                e.stopPropagation();
                if (isOwner) {
                  setIsShareModalOpen(true);
                }
              }}
              disabled={!isOwner}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          {card.description && (
            <p className="text-xs text-textMuted mb-2 line-clamp-2">
              {card.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {cardLabels.map((label) => (
                <span
                  key={label.id}
                  className="label text-[10px]"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    border: `1px solid ${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {allUserIds.slice(0, 3).map((userId, index) => {
                const u = getUserDisplay(userId || '');
                const sharedUser = sharedUsers.find(su => su.userId === userId);
                const canRemove = isOwner;
                return (
                  <div
                    key={userId}
                    className={`relative ${index > 0 ? '-ml-1' : ''}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border border-surface ${
                        sharedUser?.permission === 'write' ? 'ring-1 ring-accent' : ''
                      }`}
                      style={{ backgroundColor: getUserColor(userId || 'unknown') }}
                      title={getUserTitle(userId || '')}
                    >
                      <span className="text-[10px] text-background font-bold">
                        {(u?.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {sharedUser && (
                      <span className="absolute -top-1.5 -right-1.5 text-[8px]" title={`${sharedUser.permission} access`}>
                        {sharedUser.permission === 'write' ? '✏️' : '👁️'}
                      </span>
                    )}
                    {canRemove && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSharedUser(userId);
                        }}
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}

              {allUserIds.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-surfaceLight flex items-center justify-center -ml-1 text-[10px] text-textMuted">
                  +{allUserIds.length - 3}
                </div>
              )}
            </div>
          </div>

          {card.dueDate && (
            <span className="text-[10px] text-textMuted font-mono bg-surface px-1.5 py-0.5 rounded mt-2 inline-block">
              {new Date(card.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        card={card}
        labels={labels}
        readOnly={!canWrite}
      />

      <UserSelector
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSelectUser={handleShare}
        onUpdatePermission={handleUpdatePermission}
        title="Share Card"
        selectedUsers={sharedUsers}
        mode="manage"
      />
    </>
  );
}

import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, type DragEndEvent, type DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBoardStore, useBoards, useUserPreferences } from '../../store/useBoardStore';
import type { Board } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { UserSelector } from '../ui/UserSelector';

function getBoardColor(boardId: string): string {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < boardId.length; i++) {
    hash = boardId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function hasBoardWriteAccess(board: Board, userId: string | undefined): boolean {
  if (!userId) return false;
  if (board.userId === userId) return true;
  const sharedWith = board.sharedWith || [];
  const share = sharedWith.find((s) => s.userId === userId);
  return share?.permission === 'write';
}

interface SortableBoardItemProps {
  board: Board;
  isCollapsed: boolean;
  currentBoard: Board | null;
  user: { id: string; username?: string } | null;
  onStartEdit: (board: Board, e: React.MouseEvent) => void;
  onOpenShare: (boardId: string, e: React.MouseEvent) => void;
  onDeleteBoard: (boardId: string, e: React.MouseEvent) => void;
  getBoardColor: (boardId: string) => string;
}

function SortableBoardItem({
  board,
  isCollapsed,
  currentBoard,
  user,
  onStartEdit,
  onOpenShare,
  onDeleteBoard,
  getBoardColor,
}: SortableBoardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Only allow dragging for user's own boards
  const canDrag = board.userId === user?.id;

  if (isCollapsed) {
    return (
      <Link
        ref={canDrag ? setNodeRef : undefined}
        to={`/board/${board.id}`}
        className={`block w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
          currentBoard?.id === board.id
            ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
            : 'hover:opacity-80'
        } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ ...style, backgroundColor: getBoardColor(board.id) }}
        data-tooltip={board.title || 'Untitled'}
        {...(canDrag ? { ...attributes, ...listeners } : {})}
      >
        <span className="text-background font-display font-bold text-sm">
          {(board.title || 'U').charAt(0).toUpperCase()}
        </span>
      </Link>
    );
  }

  return (
    <div
      ref={canDrag ? setNodeRef : undefined}
      className={`sidebar-item group ${currentBoard?.id === board.id ? 'active' : ''}`}
      style={style}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
    >
      <Link
        to={`/board/${board.id}`}
        className="flex-1 font-medium flex items-center gap-2 min-w-0"
        onClick={(e) => {
          // Prevent navigation when dragging
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: getBoardColor(board.id) }}
        >
          <span className="text-background text-xs font-bold">
            {(board.title || 'U').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="group-hover:truncate min-w-0 block">{board.title}</span>
          {board.description && (
            <span className="text-xs text-textMuted line-clamp-1 block">{board.description}</span>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-1 w-0 overflow-hidden opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-200">
        {board.userId === user?.id && (
          <button
            onClick={(e) => onOpenShare(board.id, e)}
            className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-accent transition-all p-1"
            data-tooltip="Share board"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        )}
        {hasBoardWriteAccess(board, user?.id) && (
          <button
            onClick={(e) => onStartEdit(board, e)}
            className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-accent transition-all p-1"
            data-tooltip="Edit board"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        {board.userId === user?.id && (
          <button
            onClick={(e) => onDeleteBoard(board.id, e)}
            className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-danger transition-all p-1"
            data-tooltip="Delete board"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user, logout, updateUsername } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentBoard, createBoard, importBoard, updateBoard, deleteBoard, shareBoard, moveBoard, updateDormantDays } = useBoardStore();
  const { boards } = useBoards();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');
  const [editingBoardDescription, setEditingBoardDescription] = useState('');
  const [isEditBoardModalOpen, setIsEditBoardModalOpen] = useState(false);
  const [sharingBoardId, setSharingBoardId] = useState<string | null>(null);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [editingDormantDays, setEditingDormantDays] = useState(30);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dormantDays, preferences } = useUserPreferences(user?.id || null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !user) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Only allow reordering user's own boards
    const activeBoard = boards.find(b => b.id === activeId);
    if (!activeBoard || activeBoard.userId !== user.id) return;

    // Get user's boards sorted by order
    const userBoards = boards
      .filter(b => b.userId === user.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const activeIndex = userBoards.findIndex(b => b.id === activeId);
    const overIndex = userBoards.findIndex(b => b.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    moveBoard(activeId, overIndex, userBoards);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    setIsCreating(true);
    const board = await createBoard(newBoardTitle.trim(), newBoardDescription.trim() || undefined);
    setIsCreating(false);

    if (board) {
      setNewBoardTitle('');
      setNewBoardDescription('');
      setIsCreateModalOpen(false);
      navigate(`/board/${board.id}`);
    }
  };

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const board = boards.find(b => b.id === boardId);
    if (!board || board.userId !== user?.id) return;

    if (window.confirm('Delete this board?')) {
      await deleteBoard(boardId);
      if (currentBoard?.id === boardId) {
        navigate('/');
      }
    }
  };

  const handleStartEdit = (board: Board, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasBoardWriteAccess(board, user?.id)) return;
    setEditingBoardId(board.id);
    setEditingBoardTitle(board.title);
    setEditingBoardDescription(board.description || '');
    setIsEditBoardModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBoardId || !editingBoardTitle.trim()) {
      setIsEditBoardModalOpen(false);
      setEditingBoardId(null);
      return;
    }
    const board = boards.find(b => b.id === editingBoardId);
    if (!board || !hasBoardWriteAccess(board, user?.id)) {
      setIsEditBoardModalOpen(false);
      setEditingBoardId(null);
      return;
    }
    await updateBoard(editingBoardId, {
      title: editingBoardTitle.trim(),
      description: editingBoardDescription.trim() || undefined,
    });
    setIsEditBoardModalOpen(false);
    setEditingBoardId(null);
    setEditingBoardTitle('');
    setEditingBoardDescription('');
  };

  const handleCancelEdit = () => {
    setIsEditBoardModalOpen(false);
    setEditingBoardId(null);
    setEditingBoardTitle('');
    setEditingBoardDescription('');
  };

  const handleOpenShare = (boardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSharingBoardId(boardId);
  };

  const handleShare = async (userId: string, permission: 'read' | 'write' = 'write') => {
    if (sharingBoardId) {
      await shareBoard(sharingBoardId, userId, permission);
    }
  };

  const handleUpdatePermission = async (userId: string, permission: 'read' | 'write') => {
    if (sharingBoardId) {
      await shareBoard(sharingBoardId, userId, permission);
    }
  };

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      boards: boards,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskplanner-boards-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.boards || !Array.isArray(data.boards)) {
        setImportError('Invalid file format. Please select a valid Kanban export file.');
        return;
      }

      let importedCount = 0;
      for (const board of data.boards) {
        await importBoard(
          { title: board.title, id: board.id },
          board.columns || []
        );
        importedCount++;
      }

      setIsImportModalOpen(false);
      setImportError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to import file. Please ensure it is a valid JSON file.');
    }
  };

  const handleOpenUserEdit = () => {
    setEditingUsername(user?.username || '');
    setEditingDormantDays(dormantDays);
    setIsUserEditModalOpen(true);
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUsername.trim() || !user) return;

    setIsUpdatingUsername(true);
    try {
      await updateUsername(editingUsername.trim());
    } catch (error) {
      console.error('Failed to update username:', error);
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setIsUpdatingPreferences(true);
    try {
      await updateDormantDays(user.id, editingDormantDays, preferences?.id);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await handleSaveUsername(e);
    await handleSavePreferences();
    setIsUserEditModalOpen(false);
    setEditingUsername('');
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 bg-surface border-r border-border flex flex-col h-[100dvh] shrink-0">
        <div className="p-3 flex justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
            data-tooltip="Expand sidebar"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={boards.filter(b => b.userId === user?.id).map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col items-center space-y-2">
                {boards.map((board) => (
                  <SortableBoardItem
                    key={board.id}
                    board={board}
                    isCollapsed={true}
                    currentBoard={currentBoard}
                    user={user}
                    onStartEdit={handleStartEdit}
                    onOpenShare={handleOpenShare}
                    onDeleteBoard={handleDeleteBoard}
                    getBoardColor={getBoardColor}
                  />
                ))}

                {boards.length === 0 && (
                  <p className="text-xs text-textMuted text-center py-4">
                    No boards
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="p-3 border-t border-border flex flex-col items-center gap-2 pb-safe">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 bg-surfaceLight rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
            data-tooltip={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleOpenUserEdit}
            className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
            data-tooltip="Edit profile"
          >
            <span className="text-accent font-display font-medium text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 md:w-64 bg-surface border-r border-border flex flex-col h-[100dvh] shrink-0 transition-all duration-300">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-gray-800 font-display font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-text">TaskPlanner</h1>
            <p className="text-xs text-textMuted font-mono">Task Manager</p>
          </div>
        </Link>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-textMuted hover:text-text transition-colors p-1"
          data-tooltip="Collapse sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-display font-semibold text-textMuted uppercase tracking-wider">
            Your Boards
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="text-textMuted hover:text-accent transition-colors p-1"
              data-tooltip="Export boards"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={handleImportClick}
              className="text-textMuted hover:text-accent transition-colors p-1"
              data-tooltip="Import boards"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-textMuted hover:text-accent transition-colors p-1"
              data-tooltip="Create new board"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={boards.filter(b => b.userId === user?.id).map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {boards.map((board) => (
                <SortableBoardItem
                  key={board.id}
                  board={board}
                  isCollapsed={false}
                  currentBoard={currentBoard}
                  user={user}
                  onStartEdit={handleStartEdit}
                  onOpenShare={handleOpenShare}
                  onDeleteBoard={handleDeleteBoard}
                  getBoardColor={getBoardColor}
                />
              ))}

              {boards.length === 0 && (
                <p className="text-sm text-textMuted text-center py-4">
                  No boards yet
                </p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="p-4 border-t border-border pb-safe">
        <div className="flex items-center gap-3 mb-4 px-2">
          <button
            onClick={handleOpenUserEdit}
            className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
            data-tooltip="Edit profile"
          >
            <span className="text-accent font-display font-medium text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{user?.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-textMuted hover:text-text hover:bg-surfaceLight rounded-lg transition-all font-display"
            data-tooltip={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Light</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewBoardTitle('');
          setNewBoardDescription('');
        }}
        title="Create New Board"
        size="sm"
      >
        <form onSubmit={handleCreateBoard} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
              Board Title
            </label>
            <input
              type="text"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="input"
              placeholder="e.g., Side Projects"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
              Description
            </label>
            <textarea
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Add a description for this board..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => {
              setIsCreateModalOpen(false);
              setNewBoardTitle('');
              setNewBoardDescription('');
            }}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Create Board
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportError('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        title="Import Boards"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-textMuted">
            Select a JSON file exported from TaskPlanner to import boards.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-surfaceLight file:text-text hover:file:bg-border cursor-pointer"
          />

          {importError && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
              {importError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => {
              setIsImportModalOpen(false);
              setImportError('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <UserSelector
        isOpen={!!sharingBoardId}
        onClose={() => setSharingBoardId(null)}
        onSelectUser={handleShare}
        onUpdatePermission={handleUpdatePermission}
        title="Share Board"
        selectedUsers={boards.find(b => b.id === sharingBoardId)?.sharedWith || []}
        mode="manage"
      />

      <Modal
        isOpen={isEditBoardModalOpen}
        onClose={handleCancelEdit}
        title="Edit Board"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
              Board Title
            </label>
            <input
              type="text"
              value={editingBoardTitle}
              onChange={(e) => setEditingBoardTitle(e.target.value)}
              className="input"
              placeholder="e.g., Project Roadmap"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
              Description
            </label>
            <textarea
              value={editingBoardDescription}
              onChange={(e) => setEditingBoardDescription(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Add a description for this board..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isUserEditModalOpen}
        onClose={() => {
          setIsUserEditModalOpen(false);
          setEditingUsername('');
        }}
        title="Edit Profile & Settings"
        size="sm"
      >
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-display font-semibold text-textMuted uppercase tracking-wider">Profile</h3>
            <Input
              label="Username"
              type="text"
              value={editingUsername}
              onChange={(e) => setEditingUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-display font-semibold text-textMuted uppercase tracking-wider">Card Settings</h3>
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
                Dormant Days
              </label>
              <p className="text-xs text-textMuted mb-2">
                Cards that haven't been updated for this many days will be hidden from columns.
              </p>
              <input
                type="number"
                min="1"
                max="365"
                value={editingDormantDays}
                onChange={(e) => setEditingDormantDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
                className="input"
                placeholder="30"
                required
              />
              <p className="text-xs text-textMuted mt-1">
                Current: {dormantDays} day{dormantDays !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-2 border-t border-border">
            <Button
              variant="danger"
              type="button"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setIsUserEditModalOpen(false);
                  setEditingUsername('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isUpdatingUsername || isUpdatingPreferences}>
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </aside>
  );
}

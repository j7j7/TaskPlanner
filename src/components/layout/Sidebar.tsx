import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBoardStore } from '../../store/useBoardStore';
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

export function Sidebar() {
  const { user, logout } = useAuth();
  const { boards, currentBoard, fetchBoards, createBoard, updateBoard, deleteBoard, users, fetchUsers, shareBoard, unshareBoard } = useBoardStore();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');
  const [sharingBoardId, setSharingBoardId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBoards();
    fetchUsers();
  }, [fetchBoards, fetchUsers]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    setIsCreating(true);
    const board = await createBoard(newBoardTitle.trim());
    setIsCreating(false);

    if (board) {
      setNewBoardTitle('');
      setIsCreateModalOpen(false);
      navigate(`/board/${board.id}`);
    }
  };

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
    setEditingBoardId(board.id);
    setEditingBoardTitle(board.title);
  };

  const handleSaveEdit = async (boardId: string) => {
    if (!editingBoardTitle.trim()) {
      setEditingBoardId(null);
      return;
    }
    await updateBoard(boardId, { title: editingBoardTitle.trim() });
    setEditingBoardId(null);
  };

  const handleCancelEdit = () => {
    setEditingBoardId(null);
    setEditingBoardTitle('');
  };

  const handleEditKeyDown = (boardId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit(boardId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleOpenShare = (boardId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSharingBoardId(boardId);
  };

  const handleShare = async (userId: string) => {
    if (sharingBoardId) {
      await shareBoard(sharingBoardId, userId);
    }
  };

  const handleUnshare = async (boardId: string, userId: string) => {
    await unshareBoard(boardId, userId);
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

      for (const board of data.boards) {
        await createBoard(board.title);
      }

      setIsImportModalOpen(false);
      setImportError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      setImportError('Failed to parse file. Please ensure it is a valid JSON file.');
    }
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 bg-surface border-r border-border flex flex-col h-screen shrink-0">
        <div className="p-3 border-b border-border flex justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
            title="Expand sidebar"
          >
            <svg className="w-5 h-5 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className={`block w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  currentBoard?.id === board.id
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface'
                    : 'hover:opacity-80'
                }`}
                style={{ backgroundColor: getBoardColor(board.id) }}
                title={board.title || 'Untitled'}
              >
                <span className="text-background font-display font-bold text-sm">
                  {(board.title || 'U').charAt(0).toUpperCase()}
                </span>
              </Link>
            ))}

            {boards.length === 0 && (
              <p className="text-xs text-textMuted text-center py-4">
                No boards
              </p>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border flex justify-center">
          <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
            <span className="text-accent font-display font-medium text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 md:w-64 bg-surface border-r border-border flex flex-col h-screen shrink-0 transition-all duration-300">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-background font-display font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-text">TaskPlanner</h1>
            <p className="text-xs text-textMuted font-mono">Task Manager</p>
          </div>
        </Link>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-textMuted hover:text-text transition-colors p-1"
          title="Collapse sidebar"
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
              title="Export boards"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={handleImportClick}
              className="text-textMuted hover:text-accent transition-colors p-1"
              title="Import boards"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-textMuted hover:text-accent transition-colors p-1"
              title="Create new board"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {boards.map((board) => (
            <div
              key={board.id}
              className={`sidebar-item group ${currentBoard?.id === board.id ? 'active' : ''}`}
            >
              {editingBoardId === board.id ? (
                <input
                  type="text"
                  value={editingBoardTitle ?? ''}
                  onChange={(e) => setEditingBoardTitle(e.target.value)}
                  onBlur={() => handleSaveEdit(board.id)}
                  onKeyDown={(e) => handleEditKeyDown(board.id, e)}
                  className="flex-1 bg-background border border-accent rounded px-2 py-1 text-sm text-text outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <Link
                  to={`/board/${board.id}`}
                  className="flex-1 truncate font-medium flex items-center gap-2"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                    style={{ backgroundColor: getBoardColor(board.id) }}
                  >
                    <span className="text-background text-xs font-bold">
                      {(board.title || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="truncate">{board.title}</span>
                </Link>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleOpenShare(board.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-accent transition-all p-1"
                  title="Share board"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleStartEdit(board, e)}
                  className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-accent transition-all p-1"
                  title="Edit board"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDeleteBoard(board.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-danger transition-all p-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {boards.length === 0 && (
            <p className="text-sm text-textMuted text-center py-4">
              No boards yet
            </p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
            <span className="text-accent font-display font-medium text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{user?.username}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-textMuted hover:text-text hover:bg-surfaceLight rounded-lg transition-all font-display"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Board"
        size="sm"
      >
        <form onSubmit={handleCreateBoard} className="space-y-4">
          <Input
            label="Board Title"
            type="text"
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            placeholder="e.g., Side Projects"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
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
        title="Share Board"
        selectedUserIds={boards.find(b => b.id === sharingBoardId)?.sharedWith || []}
        mode="manage"
      />
    </aside>
  );
}

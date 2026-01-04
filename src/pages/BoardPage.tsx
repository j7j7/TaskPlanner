import { useEffect, useState, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useBoardStore, useBoard, useUsers } from '../store/useBoardStore';
import { Board } from '../components/board/Board';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

function getUserColor(userId: string): string {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { createColumn, setCurrentBoard, clearCurrentBoard, updateBoard, columnsShowingDormant } = useBoardStore();
  const { board, isLoading, error } = useBoard(id || '');
  const { users } = useUsers();
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [isEditBoardModalOpen, setIsEditBoardModalOpen] = useState(false);
  const [editBoardTitle, setEditBoardTitle] = useState('');
  const [editBoardDescription, setEditBoardDescription] = useState('');
  const prevBoardIdRef = useRef<string | null>(null);
  const prevUpdatedAtRef = useRef<string | null>(null);

  // Track columnsShowingDormant to detect changes (compare Set contents, not reference)
  const prevColumnsShowingDormantRef = useRef<Set<string>>(new Set(columnsShowingDormant));
  const columnsShowingDormantSize = columnsShowingDormant.size;
  const columnsShowingDormantStr = Array.from(columnsShowingDormant).sort().join(',');
  
  useEffect(() => {
    // Update currentBoard whenever board data changes (reactive updates from InstantDB)
    // Also update when columnsShowingDormant changes to refresh cards display
    if (board) {
      const boardIdChanged = board.id !== prevBoardIdRef.current;
      const boardUpdated = board.updatedAt !== prevUpdatedAtRef.current;
      // Compare Set contents by comparing sorted string representation
      const prevColumnsStr = Array.from(prevColumnsShowingDormantRef.current).sort().join(',');
      const columnsShowingDormantChanged = columnsShowingDormantStr !== prevColumnsStr;
      
      // Update if it's a different board, if the board data has changed, or if columnsShowingDormant changed
      // (columnsShowingDormant changes affect which cards are displayed)
      if (boardIdChanged || boardUpdated || columnsShowingDormantChanged) {
        prevBoardIdRef.current = board.id;
        prevUpdatedAtRef.current = board.updatedAt;
        prevColumnsShowingDormantRef.current = new Set(columnsShowingDormant);
        // Sync currentBoard with the latest board data from InstantDB
        setCurrentBoard(board);
        // Update edit form fields when board changes (not when columnsShowingDormant changes)
        if (boardIdChanged || boardUpdated) {
          setEditBoardTitle(board.title);
          setEditBoardDescription(board.description || '');
        }
      }
    } else if (prevBoardIdRef.current) {
      // Board was deleted or doesn't exist
      clearCurrentBoard();
      prevBoardIdRef.current = null;
      prevUpdatedAtRef.current = null;
      prevColumnsShowingDormantRef.current = new Set();
    }
    
    return () => {
      if (prevBoardIdRef.current === id) {
        clearCurrentBoard();
        prevBoardIdRef.current = null;
        prevUpdatedAtRef.current = null;
        prevColumnsShowingDormantRef.current = new Set();
      }
    };
  }, [board?.id, board?.updatedAt, board?.title, board?.description, columnsShowingDormantSize, columnsShowingDormantStr, id, setCurrentBoard, clearCurrentBoard]);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    setIsCreating(true);
    await createColumn(newColumnTitle.trim(), newColumnColor);
    setIsCreating(false);
    setNewColumnTitle('');
    setIsAddColumnModalOpen(false);
  };

  const handleSaveBoard = async () => {
    if (!board || !editBoardTitle.trim()) return;
    
    await updateBoard(board.id, {
      title: editBoardTitle.trim(),
      description: editBoardDescription.trim() || undefined,
    });
    setIsEditBoardModalOpen(false);
  };

  const isShared = board && (board.sharedWith?.length ?? 0) > 0;

  const owner = board ? (users.find(u => u.id === board.userId) || { username: 'Unknown' }) : null;

  if (!id) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-danger mb-4">{error instanceof Error ? error.message : String(error)}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            {isShared && owner && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: getUserColor(board?.userId || '') }}
                data-tooltip={`${owner.username} (Owner)`}
              >
                <span className="text-background text-sm font-bold">
                  {owner.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-display font-bold text-text truncate">
                {board?.title || 'Loading...'}
              </h1>
               {board && (
                 <>
                   {board.description && (
                     <p className="text-xs sm:text-sm text-textMuted mt-1 line-clamp-2">
                       {board.description}
                     </p>
                   )}
                 </>
               )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddColumnModalOpen(true)}
              className="p-2 rounded-lg bg-accent text-gray-800 hover:bg-accent/90 transition-colors"
              data-tooltip="Add Column"
            >
              <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => setIsRotated(!isRotated)}
              className={`p-2 rounded-lg border border-border hover:bg-surface transition-colors ${isRotated ? 'bg-accent/10 text-accent' : 'text-textMuted'}`}
              data-tooltip={isRotated ? 'Switch to columns view' : 'Switch to rows view'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-2 sm:p-4">
        {board ? (
          <Board isRotated={isRotated} onAddColumn={() => setIsAddColumnModalOpen(true)} />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-textMuted">Loading board...</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-textMuted">Board not found</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        title="Add New Column"
        size="sm"
      >
        <form onSubmit={handleAddColumn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
              Column Title
            </label>
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              className="input"
              placeholder="e.g., In Review"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textMuted mb-2 font-display">
              Color
            </label>
            <div className="flex gap-2 overflow-x-auto py-1 pb-2 scrollbar-thin">
              {[
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
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColumnColor(color)}
                  className={`rounded-lg transition-all border-2 shrink-0 ${
                    newColumnColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color, width: '22.4px', height: '22.4px' }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddColumnModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Add Column
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditBoardModalOpen}
        onClose={() => setIsEditBoardModalOpen(false)}
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
              value={editBoardTitle}
              onChange={(e) => setEditBoardTitle(e.target.value)}
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
              value={editBoardDescription}
              onChange={(e) => setEditBoardDescription(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Add a description for this board..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsEditBoardModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBoard}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

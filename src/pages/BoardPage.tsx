import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useBoardStore } from '../store/useBoardStore';
import { Board } from '../components/board/Board';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useState } from 'react';

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { currentBoard, fetchBoard, fetchLabels, fetchUsers, createColumn, error, clearError, clearCurrentBoard, isLoading } = useBoardStore();
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (id) {
      clearCurrentBoard();
      fetchBoard(id);
      fetchLabels();
      fetchUsers();
    }
    
    return () => {
      clearCurrentBoard();
    };
  }, [id, fetchBoard, fetchLabels, fetchUsers, clearCurrentBoard]);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    setIsCreating(true);
    await createColumn(newColumnTitle.trim(), newColumnColor);
    setIsCreating(false);
    setNewColumnTitle('');
    setIsAddColumnModalOpen(false);
  };

  if (!id) {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-danger mb-4">{error}</p>
          <Button onClick={() => { clearError(); fetchBoard(id); }}>
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
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-display font-bold text-text truncate">
              {currentBoard?.title || 'Loading...'}
            </h1>
            {currentBoard && (
              <p className="text-xs sm:text-sm text-textMuted mt-1">
                {currentBoard.columns?.length ?? 0} columns
              </p>
            )}
          </div>

          <button
            onClick={() => setIsAddColumnModalOpen(true)}
            className="btn btn-primary shrink-0"
          >
            <svg className="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Column</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {currentBoard ? (
          <Board />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-textMuted">Loading board...</p>
            </div>
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
            <div className="flex gap-2">
              {['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColumnColor(color)}
                  className={`w-8 h-8 rounded-lg transition-all border-2 ${
                    newColumnColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
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
    </div>
  );
}

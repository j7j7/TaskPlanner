import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBoardStore, useBoards } from '../store/useBoardStore';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

console.log('HomePage module loaded');

export function HomePage() {
  try {
    console.log('HomePage function called');
    const { user } = useAuth();
    const { createBoard } = useBoardStore();
    const { boards, isLoading } = useBoards();
    
    console.log('HomePage - boards:', boards?.length, 'isLoading:', isLoading);
    
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

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

    const getBoardStats = (board: NonNullable<typeof boards>[0]) => {
      const columns = board.columns ?? [];
      const totalCards = columns.reduce((sum, col) => sum + (col.cards?.length ?? 0), 0);
      const doneCards = columns.find((c) => c.title.toLowerCase() === 'done')?.cards?.length ?? 0;
      return { totalCards, doneCards };
    };

    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-textMuted">Loading boards...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 md:p-8 overflow-auto" id="homepage-container">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-text mb-2">
              Welcome back, {user?.username}
            </h1>
            <p className="text-textMuted text-sm sm:text-base">
              Select a board to continue or create a new one
            </p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-text">Your Boards</h2>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Board
            </Button>
          </div>

          {(!boards || boards.length === 0) ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h3 className="text-lg font-display font-semibold text-text mb-2">No boards yet</h3>
              <p className="text-textMuted mb-4">Create your first board to get started</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>Create Board</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(boards || []).map((board) => {
                const stats = getBoardStats(board);
                return (
                  <Link
                    key={board.id}
                    to={`/board/${board.id}`}
                    className="card card-hover group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-display font-semibold text-lg text-text group-hover:text-accent transition-colors">
                        {board.title}
                      </h3>
                      <div className="flex -space-x-1">
                        {(board.columns || []).slice(0, 3).map((col) => (
                          <div
                            key={col.id}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: col.color }}
                          />
                        ))}
                      </div>
                    </div>

                      <div className="flex items-center justify-between text-sm text-textMuted">
                        <span>{(board.columns || []).length} columns</span>
                      <span>{stats.totalCards} cards</span>
                    </div>

                  {stats.totalCards > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-textMuted mb-1">
                        <span>Progress</span>
                        <span>{Math.round((stats.doneCards / stats.totalCards) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{
                            width: `${(stats.doneCards / stats.totalCards) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  </Link>
                );
              })}
            </div>
          )}
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
      </div>
    );
  } catch (err) {
    console.error('HomePage render error:', err);
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'red', color: 'white', padding: '50px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold' }}>ERROR in HomePage</h1>
          <p style={{ fontSize: '18px' }}>{err instanceof Error ? err.message : String(err)}</p>
          <pre style={{ fontSize: '12px', marginTop: '20px' }}>{err instanceof Error ? err.stack : ''}</pre>
        </div>
      </div>
    );
  }
}

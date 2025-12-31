import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import db from '../lib/db';

interface OrphanInfo {
  type: 'card' | 'column' | 'label';
  id: string;
  title: string;
  reason: string;
}

interface CleanupResult {
  success: boolean;
  deleted: number;
  errors: string[];
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/boards', label: 'Boards', icon: '📋' },
    { path: '/columns', label: 'Columns', icon: '📑' },
    { path: '/cards', label: 'Cards', icon: '📝' },
    { path: '/labels', label: 'Labels', icon: '🏷️' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/cleanup', label: 'Cleanup', icon: '🧹' },
  ];

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="flex">
        <aside className="w-64 bg-surface border-r border-border min-h-screen p-4">
          <div className="mb-8">
            <h1 className="text-xl font-display font-bold text-accent">Admin Panel</h1>
            <p className="text-xs text-textMuted mt-1">Database Maintenance</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  location.pathname === item.path
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-textMuted hover:text-text hover:bg-surfaceLight'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-display font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-8 pt-4 border-t border-border">
            <a
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-textMuted hover:text-text hover:bg-surfaceLight rounded-lg transition-all"
            >
              <span className="text-lg">🏠</span>
              <span className="font-display font-medium">Back to App</span>
            </a>
          </div>
        </aside>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  const boardsQuery = db.useQuery({ boards: {} }) || {};
  const columnsQuery = db.useQuery({ columns: {} }) || {};
  const cardsQuery = db.useQuery({ cards: {} }) || {};
  const labelsQuery = db.useQuery({ labels: {} }) || {};
  const usersQuery = db.useQuery({ users: {} }) || {};

  const boardsData = (boardsQuery as { data?: { boards?: Record<string, unknown> } })?.data?.boards || {};
  const columnsData = (columnsQuery as { data?: { columns?: Record<string, unknown> } })?.data?.columns || {};
  const cardsData = (cardsQuery as { data?: { cards?: Record<string, unknown> } })?.data?.cards || {};
  const labelsData = (labelsQuery as { data?: { labels?: Record<string, unknown> } })?.data?.labels || {};
  const usersData = (usersQuery as { data?: { users?: Record<string, unknown> } })?.data?.users || {};

  const stats = {
    boards: Object.keys(boardsData).length,
    columns: Object.keys(columnsData).length,
    cards: Object.keys(cardsData).length,
    labels: Object.keys(labelsData).length,
    users: Object.keys(usersData).length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-text">Dashboard</h1>
        <p className="text-textMuted mt-2">Overview of your database entities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: 'Boards', count: stats.boards, icon: '📋', color: 'text-blue-400' },
          { label: 'Columns', count: stats.columns, icon: '📑', color: 'text-green-400' },
          { label: 'Cards', count: stats.cards, icon: '📝', color: 'text-yellow-400' },
          { label: 'Labels', count: stats.labels, icon: '🏷️', color: 'text-purple-400' },
          { label: 'Users', count: stats.users, icon: '👥', color: 'text-pink-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-textMuted text-sm">{stat.label}</p>
                <p className="text-3xl font-display font-bold mt-1">{stat.count}</p>
              </div>
              <span className={`text-4xl ${stat.color}`}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/cleanup" className="btn btn-primary">
            🧹 Run Cleanup
          </Link>
          <Link to="/boards" className="btn btn-secondary">
            📋 View All Boards
          </Link>
          <Link to="/cards" className="btn btn-secondary">
            📝 View All Cards
          </Link>
        </div>
      </div>
    </div>
  );
}

function EntityList({ entityType }: { entityType: 'boards' | 'columns' | 'cards' | 'labels' | 'users' }) {
  const query = db.useQuery({ [entityType]: {} } as { boards?: object; columns?: object; cards?: object; labels?: object; users?: object }) || {};
  const data = (query as { data?: Record<string, Record<string, unknown>> })?.data || {};
  const entities = data[entityType] || {};

  const headers: Record<string, string[]> = {
    boards: ['Title', 'User ID', 'Created', 'Shared With'],
    columns: ['Title', 'Board ID', 'Order', 'Shared With'],
    cards: ['Title', 'Column ID', 'Board ID', 'Priority'],
    labels: ['Name', 'Color', 'User ID'],
    users: ['Username', 'Email', 'Created'],
  };

  const iconMap: Record<string, string> = {
    boards: '📋',
    columns: '📑',
    cards: '📝',
    labels: '🏷️',
    users: '👤',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold capitalize">{iconMap[entityType]} {entityType}</h1>
          <p className="text-textMuted mt-1">{Object.keys(entities).length} total</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surfaceLight border-b border-border">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-textMuted">ID</th>
                {headers[entityType].map((header) => (
                  <th key={header} className="text-left px-6 py-4 text-sm font-medium text-textMuted">
                    {header}
                  </th>
                ))}
                <th className="text-right px-6 py-4 text-sm font-medium text-textMuted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(entities).map(([id, entity]) => (
                <tr key={id} className="hover:bg-surfaceLight/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-textMuted">{id.slice(0, 8)}...</td>
                  {entityType === 'boards' && (
                    <>
                      <td className="px-6 py-4 text-text">{(entity as { title?: string }).title}</td>
                      <td className="px-6 py-4 text-sm text-textMuted">{(entity as { userId?: string }).userId?.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-sm text-textMuted">{(entity as { createdAt?: number }).createdAt ? new Date((entity as { createdAt: number }).createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 text-sm text-textMuted">{Array.isArray((entity as { sharedWith?: unknown[] }).sharedWith) ? (entity as { sharedWith: unknown[] }).sharedWith.length : 0}</td>
                    </>
                  )}
                  {entityType === 'columns' && (
                    <>
                      <td className="px-6 py-4 text-text">{(entity as { title?: string }).title}</td>
                      <td className="px-6 py-4 text-sm font-mono text-textMuted">{(entity as { boardId?: string }).boardId?.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-text">{(entity as { order?: number }).order}</td>
                      <td className="px-6 py-4 text-sm text-textMuted">{Array.isArray((entity as { sharedWith?: unknown[] }).sharedWith) ? (entity as { sharedWith: unknown[] }).sharedWith.length : 0}</td>
                    </>
                  )}
                  {entityType === 'cards' && (
                    <>
                      <td className="px-6 py-4 text-text">{(entity as { title?: string }).title}</td>
                      <td className="px-6 py-4 text-sm font-mono text-textMuted">{(entity as { columnId?: string }).columnId?.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-sm font-mono text-textMuted">{(entity as { boardId?: string }).boardId?.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-text capitalize">{(entity as { priority?: string }).priority}</td>
                    </>
                  )}
                  {entityType === 'labels' && (
                    <>
                      <td className="px-6 py-4 text-text">{(entity as { name?: string }).name}</td>
                      <td className="px-6 py-4">
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: (entity as { color?: string }).color }} />
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-textMuted">{(entity as { userId?: string }).userId?.slice(0, 8)}...</td>
                    </>
                  )}
                  {entityType === 'users' && (
                    <>
                      <td className="px-6 py-4 text-text">{(entity as { username?: string }).username}</td>
                      <td className="px-6 py-4 text-text">{(entity as { email?: string }).email}</td>
                      <td className="px-6 py-4 text-sm text-textMuted">{(entity as { createdAt?: number }).createdAt ? new Date((entity as { createdAt: number }).createdAt).toLocaleDateString() : '-'}</td>
                    </>
                  )}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete this ${entityType.slice(0, -1)}?`)) {
                          db.transact([db.tx[entityType][id].delete()]);
                        }
                      }}
                      className="text-danger hover:text-red-400 transition-colors"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {Object.keys(entities).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-textMuted">
                    No {entityType} found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Cleanup() {
  const boardsQuery = db.useQuery({ boards: {} }) || {};
  const columnsQuery = db.useQuery({ columns: {} }) || {};
  const cardsQuery = db.useQuery({ cards: {} }) || {};
  const labelsQuery = db.useQuery({ labels: {} }) || {};

  const boardsResult = boardsQuery as { data?: { boards?: Record<string, { id: string; title: string }> } };
  const columnsResult = columnsQuery as { data?: { columns?: Record<string, { id: string; boardId: string; title: string }> } };
  const cardsResult = cardsQuery as { data?: { cards?: Record<string, { id: string; columnId: string; title: string }> } };
  const labelsResult = labelsQuery as { data?: { labels?: Record<string, { id: string; userId: string; name: string }> } };

  const boardsData = boardsResult.data?.boards || {};
  const columnsData = columnsResult.data?.columns || {};
  const cardsData = cardsResult.data?.cards || {};
  const labelsData = labelsResult.data?.labels || {};

  const [orphans, setOrphans] = useState<OrphanInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const scanForOrphans = () => {
    const boardIds = new Set(Object.values(boardsData).map(b => b.id));
    const columnIds = new Set(Object.values(columnsData).map(c => c.id));

    const newOrphans: OrphanInfo[] = [];

    Object.entries(columnsData).forEach(([id, column]) => {
      if (!column.boardId || !boardIds.has(column.boardId)) {
        newOrphans.push({
          type: 'column',
          id,
          title: column.title || 'Untitled',
          reason: !column.boardId ? 'Missing boardId' : `Board ${column.boardId.slice(0, 8)}... not found`,
        });
      }
    });

    Object.entries(cardsData).forEach(([id, card]) => {
      if (!card.columnId || !columnIds.has(card.columnId)) {
        newOrphans.push({
          type: 'card',
          id,
          title: card.title || 'Untitled',
          reason: !card.columnId ? 'Missing columnId' : `Column ${card.columnId.slice(0, 8)}... not found`,
        });
      }
    });

    Object.entries(labelsData).forEach(([id, label]) => {
      if (!label.userId) {
        newOrphans.push({
          type: 'label',
          id,
          title: label.name || 'Untitled',
          reason: 'Missing userId',
        });
      }
    });

    setOrphans(newOrphans);
  };

  useEffect(() => {
    scanForOrphans();
  }, [boardsData, columnsData, cardsData, labelsData]);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      scanForOrphans();
      setIsScanning(false);
    }, 500);
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    const errors: string[] = [];
    let deleted = 0;

    try {
      for (const orphan of orphans) {
        try {
          const entityType = orphan.type === 'card' ? 'cards' : orphan.type === 'column' ? 'columns' : 'labels';
          await db.transact([db.tx[entityType][orphan.id].delete()]);
          deleted++;
        } catch (err) {
          errors.push(`Failed to delete ${orphan.type} ${orphan.id}: ${err}`);
        }
      }
      setCleanupResult({ success: errors.length === 0, deleted, errors });
      setOrphans([]);
    } catch (err) {
      setCleanupResult({ success: false, deleted, errors: [String(err)] });
    }

    setIsCleaning(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">🧹 Cleanup</h1>
        <p className="text-textMuted mt-1">Find and remove orphaned database entries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-display font-semibold mb-4">Scan for Orphans</h2>
          <p className="text-textMuted mb-4">
            Scan your database for entries that reference non-existent parent entities.
          </p>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="btn btn-primary w-full"
          >
            {isScanning ? '⏳ Scanning...' : '🔍 Scan Database'}
          </button>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-display font-semibold mb-4">Statistics</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-textMuted">Total Orphans Found</span>
              <span className="font-display font-bold text-xl">{orphans.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Cards</span>
              <span className="text-yellow-400">{orphans.filter(o => o.type === 'card').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Columns</span>
              <span className="text-green-400">{orphans.filter(o => o.type === 'column').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Labels</span>
              <span className="text-purple-400">{orphans.filter(o => o.type === 'label').length}</span>
            </div>
          </div>
        </div>
      </div>

      {orphans.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold">Orphaned Entries ({orphans.length})</h2>
            <button
              onClick={handleCleanup}
              disabled={isCleaning}
              className="btn btn-danger"
            >
              {isCleaning ? '⏳ Cleaning...' : `🗑️ Delete ${orphans.length} Orphans`}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-surfaceLight sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-textMuted">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-textMuted">ID</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-textMuted">Title</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-textMuted">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orphans.map((orphan) => (
                  <tr key={orphan.id} className="hover:bg-surfaceLight/50">
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        orphan.type === 'card' ? 'bg-yellow-400/20 text-yellow-400' :
                        orphan.type === 'column' ? 'bg-green-400/20 text-green-400' :
                        'bg-purple-400/20 text-purple-400'
                      }`}>
                        {orphan.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-mono text-textMuted">{orphan.id.slice(0, 12)}...</td>
                    <td className="px-6 py-3 text-text">{orphan.title}</td>
                    <td className="px-6 py-3 text-sm text-textMuted">{orphan.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cleanupResult && (
        <div className={`border rounded-xl p-6 ${cleanupResult.success ? 'bg-green-400/10 border-green-400/30' : 'bg-red-400/10 border-red-400/30'}`}>
          <h3 className={`font-display font-semibold ${cleanupResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {cleanupResult.success ? '✅ Cleanup Complete' : '❌ Cleanup Failed'}
          </h3>
          <p className="text-textMuted mt-2">
            Deleted {cleanupResult.deleted} orphaned entries.
            {cleanupResult.errors.length > 0 && (
              <span className="text-danger block mt-2">{cleanupResult.errors.join(', ')}</span>
            )}
          </p>
        </div>
      )}

      {orphans.length === 0 && cleanupResult === null && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-xl font-display font-semibold text-text">All Clean!</h3>
          <p className="text-textMuted mt-2">No orphaned entries found in your database.</p>
          <button onClick={handleScan} className="btn btn-secondary mt-6">
            🔄 Rescan Database
          </button>
        </div>
      )}
    </div>
  );
}

function AdminPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-textMuted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/boards" element={<EntityList entityType="boards" />} />
        <Route path="/columns" element={<EntityList entityType="columns" />} />
        <Route path="/cards" element={<EntityList entityType="cards" />} />
        <Route path="/labels" element={<EntityList entityType="labels" />} />
        <Route path="/users" element={<EntityList entityType="users" />} />
        <Route path="/cleanup" element={<Cleanup />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}

export default function AdminApp() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AdminPage />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

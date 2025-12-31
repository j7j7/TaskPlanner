import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { BoardPage } from './pages/BoardPage';
import { useBoardStore, useUsers } from './store/useBoardStore';
import db from './lib/db';

// Component to sync users from InstantDB to the store
function UsersSync() {
  const { user } = useAuth();
  const { users, isLoading, error } = useUsers();
  const setUsers = useBoardStore((state) => state.setUsers);

  // Ensure current user's profile exists in the users entity
  useEffect(() => {
    if (user) {
      const userExists = users.some((u) => u.id === user.id);
      if (!userExists) {
        // Create profile for current user if it doesn't exist
        const now = Date.now();
        db.transact([
          db.tx.users[user.id].update({
            email: user.username.includes('@') ? user.username : `${user.username}@example.com`,
            username: user.username.includes('@') ? user.username.split('@')[0] : user.username,
            createdAt: now,
            updatedAt: now,
          }),
        ]).catch((err) => {
          console.error('Failed to create user profile:', err);
        });
      }
    }
  }, [user, users]);

  useEffect(() => {
    // Always set users, even if empty (to clear store)
    setUsers(users);
  }, [users, setUsers, isLoading, error]);

  return null;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const setCurrentUser = useBoardStore((state) => state.setCurrentUser);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
  }, [user, setCurrentUser]);

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
    <>
      {user && <UsersSync />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route
          path="/"
          element={
            user ? (
              <Layout>
                <HomePage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/board/:id"
          element={
            user ? (
              <Layout>
                <BoardPage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

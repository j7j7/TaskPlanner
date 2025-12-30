import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import db from '../lib/db';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  sendMagicCode: (email: string) => Promise<void>;
  verifyMagicCode: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = 'taskplanner_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    console.log('Checking localStorage for stored user...');
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const parsedUser = JSON.parse(stored);
        console.log('Found stored user:', parsedUser.id);
        setUser(parsedUser);
      } else {
        console.log('No stored user found');
      }
    } catch (err) {
      console.error('Failed to load stored user:', err);
    }
    setIsLoading(false);
  }, [initialized]);

  useEffect(() => {
    console.log('User effect - user:', user?.id);
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      console.log('User saved to localStorage');
    } else if (initialized) {
      localStorage.removeItem(AUTH_KEY);
      console.log('User removed from localStorage');
    }
  }, [user, initialized]);

  const sendMagicCode = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await db.auth.sendMagicCode({ email });
    } catch (err: unknown) {
      console.error('sendMagicCode error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send magic code';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
    setIsLoading(false);
  };

  const verifyMagicCode = async (email: string, code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Verifying magic code for:', email);
      const { user: authUser } = await db.auth.signInWithMagicCode({ email, code });
      console.log('Auth response:', authUser);
      if (authUser) {
        const newUser: User = {
          id: authUser.id,
          username: authUser.email || authUser.id,
          createdAt: new Date().toISOString(),
        };
        console.log('Setting user:', newUser.id);
        setUser(newUser);
      }
    } catch (err: unknown) {
      console.error('verifyMagicCode error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Invalid magic code';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
    setIsLoading(false);
  };

  const logout = async () => {
    setError(null);
    try {
      await db.auth.signOut();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, sendMagicCode, verifyMagicCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

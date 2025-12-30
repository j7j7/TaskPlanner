import { useEffect, useState } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import type { SharePermission } from '../../types';

interface SelectedUser {
  userId: string;
  permission: SharePermission;
}

interface UserSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string, permission?: SharePermission) => void;
  onUpdatePermission?: (userId: string, permission: SharePermission) => void;
  title: string;
  selectedUsers: SelectedUser[];
  mode: 'share' | 'manage';
}

export function UserSelector({
  isOpen,
  onClose,
  onSelectUser,
  onUpdatePermission,
  title,
  selectedUsers: initialSelectedUsers,
  mode,
}: UserSelectorProps) {
  const { users, fetchUsers } = useBoardStore();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>(initialSelectedUsers);
  const [permissionSelectOpen, setPermissionSelectOpen] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchUsers().finally(() => setIsLoading(false));
      setSelectedUsers(initialSelectedUsers);
    }
  }, [isOpen]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase());
    const notSelf = u.id !== user?.id;
    const alreadyShared = selectedUsers.some((su) => su.userId === u.id);
    return matchesSearch && notSelf && !alreadyShared;
  });

  const toggleUser = (userId: string) => {
    if (mode === 'share') {
      onSelectUser(userId);
      onClose();
    } else {
      const alreadySelected = selectedUsers.some((su) => su.userId === userId);
      if (!alreadySelected) {
        setSelectedUsers((prev) => [...prev, { userId, permission: 'read' }]);
      }
    }
  };

  const handleConfirm = () => {
    if (mode === 'manage') {
      selectedUsers.forEach((su) => {
        const original = initialSelectedUsers.find((isu) => isu.userId === su.userId);
        if (!original) {
          onSelectUser(su.userId, su.permission);
        } else if (original.permission !== su.permission && onUpdatePermission) {
          onUpdatePermission(su.userId, su.permission);
        }
      });
    } else {
      selectedUsers.forEach((su) => {
        const alreadySelected = initialSelectedUsers.some((isu) => isu.userId === su.userId);
        if (!alreadySelected) {
          onSelectUser(su.userId, su.permission);
        }
      });
    }
    onClose();
  };

  const handleRemove = (userId: string) => {
    if (mode === 'manage') {
      setSelectedUsers((prev) => prev.filter((su) => su.userId !== userId));
    }
  };

  const handlePermissionChange = (userId: string, permission: SharePermission) => {
    setSelectedUsers((prev) =>
      prev.map((su) => (su.userId === userId ? { ...su, permission } : su))
    );
    setPermissionSelectOpen(null);
  };

  const getSelectedUserObjects = () => {
    return users
      .filter((u) => selectedUsers.some((su) => su.userId === u.id))
      .map((u) => ({
        ...u,
        permission: selectedUsers.find((su) => su.userId === u.id)?.permission || 'read',
      }));
  };

  const renderUserList = () => {
    if (isLoading) {
      return (
        <div className="text-sm text-textMuted text-center py-8">
          Loading users...
        </div>
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <p className="text-sm text-textMuted text-center py-4">
          {users.length <= 1 ? 'No other users available' : 'No users found'}
        </p>
      );
    }

    return filteredUsers.map((u) => {
      const isSelected = selectedUsers.some((su) => su.userId === u.id);
      return (
        <button
          key={u.id}
          onClick={() => toggleUser(u.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isSelected
              ? 'bg-accent/10 border border-accent/30'
              : 'hover:bg-surfaceLight'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isSelected ? 'bg-accent' : 'bg-surfaceLight'
            }`}
          >
            <span
              className={`text-sm font-medium ${
                isSelected ? 'text-background' : 'text-textMuted'
              }`}
            >
              {u.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-text">{u.username}</p>
          </div>
          {isSelected && (
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      );
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="input"
          autoFocus
        />

        {mode === 'manage' && selectedUsers.length > 0 && (
          <div className="p-3 bg-surfaceLight rounded-lg">
            <p className="text-xs text-textMuted mb-2 font-display">Currently shared with:</p>
            <div className="flex flex-wrap gap-2">
              {getSelectedUserObjects().map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-full"
                >
                  <div className="w-5 h-5 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent text-xs font-medium">
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-text">{u.username}</span>
                  <div className="relative">
                    <button
                      onClick={() => setPermissionSelectOpen(permissionSelectOpen === u.id ? null : u.id)}
                      className="text-xs px-1.5 py-0.5 bg-surfaceLight rounded hover:bg-surface ml-1"
                    >
                      {u.permission === 'write' ? '✏️' : '👁️'} {u.permission}
                    </button>
                    {permissionSelectOpen === u.id && (
                      <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => handlePermissionChange(u.id, 'read')}
                          className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surfaceLight"
                        >
                          👁️ Read
                        </button>
                        <button
                          onClick={() => handlePermissionChange(u.id, 'write')}
                          className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surfaceLight"
                        >
                          ✏️ Write
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(u.id)}
                    className="text-textMuted hover:text-danger ml-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-60 overflow-y-auto space-y-1">
          {renderUserList()}
        </div>

        {mode === 'manage' && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

import { Button } from '../ui/Button';

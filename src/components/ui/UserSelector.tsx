import { useEffect, useState } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../ui/Modal';
import type { User } from '../../types';

interface UserSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  title: string;
  selectedUserIds: string[];
  mode: 'share' | 'manage';
}

export function UserSelector({
  isOpen,
  onClose,
  onSelectUser,
  title,
  selectedUserIds,
  mode,
}: UserSelectorProps) {
  const { users, fetchUsers } = useBoardStore();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(selectedUserIds);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUsers(selectedUserIds);
    }
  }, [isOpen, fetchUsers, selectedUserIds]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase());
    const notSelf = u.id !== user?.id;
    return matchesSearch && notSelf;
  });

  const toggleUser = (userId: string) => {
    if (mode === 'manage') {
      setSelectedUsers((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    } else {
      onSelectUser(userId);
      onClose();
    }
  };

  const handleConfirm = () => {
    selectedUsers.forEach((userId) => {
      if (!selectedUserIds.includes(userId)) {
        onSelectUser(userId);
      }
    });
    onClose();
  };

  const handleRemove = (userId: string) => {
    if (mode === 'manage') {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  const getSelectedUserObjects = () => {
    return users.filter((u) => selectedUsers.includes(u.id));
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
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-textMuted text-center py-4">
              No users found
            </p>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUsers.includes(u.id);
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
            })
          )}
        </div>

        {mode === 'manage' && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

import { Button } from '../ui/Button';

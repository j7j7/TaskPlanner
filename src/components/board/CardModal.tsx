import { useState, useEffect } from 'react';
import type { Card as CardType, Label } from '../../types';
import { useBoardStore, useLabels } from '../../store/useBoardStore';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { IconPicker } from '../ui/IconPicker';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardType;
  labels: Label[];
  readOnly?: boolean;
}

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
] as const;

const LABEL_COLORS = [
  // Original colors
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
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
];

export function CardModal({ isOpen, onClose, card, labels: propLabels, readOnly = false }: CardModalProps) {
  const { updateCard, deleteCard, createLabel, updateLabel, deleteLabel, moveCard, currentBoard } = useBoardStore();
  const { user } = useAuth();
  const { labels: allLabels } = useLabels();
  
  const userLabels = allLabels.filter((label) => label.userId === user?.id);
  const labels = propLabels.length > 0 ? propLabels : userLabels;
  
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState<typeof card.priority>(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate || '');
  const [selectedLabels, setSelectedLabels] = useState<string[]>(card.labels);
  const [icon, setIcon] = useState<string>(card.icon || '');
  const [selectedColumnId, setSelectedColumnId] = useState(card.columnId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');

  const columns = currentBoard?.columns?.sort((a, b) => a.order - b.order) || [];

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setPriority(card.priority);
    setDueDate(card.dueDate || '');
    setSelectedLabels(card.labels);
    setIcon(card.icon || '');
    setSelectedColumnId(card.columnId);
  }, [card]);

  const handleColumnChange = async (newColumnId: string) => {
    if (newColumnId === selectedColumnId || readOnly) return;
    
    const fromColumn = columns.find(c => c.id === selectedColumnId);
    const toColumn = columns.find(c => c.id === newColumnId);
    
    if (fromColumn && toColumn) {
      const newIndex = toColumn.cards.length;
      
      await moveCard(card.id, selectedColumnId, newColumnId, newIndex);
      setSelectedColumnId(newColumnId);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || readOnly) return;

    await updateCard(card.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      labels: selectedLabels,
      icon: icon || undefined,
    });
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteCard(card.id);
    onClose();
  };

  const toggleLabel = (labelId: string) => {
    if (readOnly) return;
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim() || !user) return;
    await createLabel(newLabelName.trim(), newLabelColor);
    setNewLabelName('');
    setNewLabelColor(LABEL_COLORS[0]);
    setIsCreatingLabel(false);
  };

  const handleStartEditLabel = (label: Label) => {
    setEditingLabelId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
  };

  const handleSaveEditLabel = async () => {
    if (!editingLabelId || !editLabelName.trim()) {
      setEditingLabelId(null);
      return;
    }
    await updateLabel(editingLabelId, {
      name: editLabelName.trim(),
      color: editLabelColor,
    });
    setEditingLabelId(null);
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (window.confirm('Delete this label? It will be removed from all cards.')) {
      await deleteLabel(labelId);
      setSelectedLabels((prev) => prev.filter((id) => id !== labelId));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
            Title
          </label>
          <div className="flex items-center gap-2">
            {icon && (
              <button
                type="button"
                onClick={() => !readOnly && setIsIconPickerOpen(true)}
                className="text-2xl hover:scale-110 transition-transform flex-shrink-0 mt-1"
                disabled={readOnly}
                data-tooltip="Change icon"
              >
                {icon}
              </button>
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input flex-1"
              placeholder="Card title..."
              disabled={readOnly}
            />
            {!icon && !readOnly && (
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(true)}
                className="px-3 py-2 text-textMuted hover:text-accent hover:bg-surfaceLight rounded-lg transition-colors flex-shrink-0"
                data-tooltip="Add icon"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[80px] sm:min-h-[100px] resize-y"
            placeholder="Add a description..."
            disabled={readOnly}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
            Column
          </label>
          <select
            value={selectedColumnId}
            onChange={(e) => handleColumnChange(e.target.value)}
            className="input"
            disabled={readOnly || columns.length === 0}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-2 font-display">
            Priority
          </label>
          <div className="flex gap-1 sm:gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => !readOnly && setPriority(p.value)}
                className={`flex-1 py-2 px-1 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                  priority === p.value
                    ? 'border-current'
                    : 'border-transparent hover:border-border'
                } ${readOnly ? 'cursor-default opacity-50' : ''}`}
                style={{
                  backgroundColor: priority === p.value ? `${p.color}20` : 'transparent',
                  color: p.color,
                }}
                disabled={readOnly}
              >
                <span className="hidden sm:inline">{p.label}</span>
                <span className="sm:hidden">{p.label[0]}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-textMuted font-display">
              Labels
            </label>
            {!readOnly && user && (
              <button
                type="button"
                onClick={() => setIsCreatingLabel(!isCreatingLabel)}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                {isCreatingLabel ? 'Cancel' : '+ New Label'}
              </button>
            )}
          </div>

          {isCreatingLabel && !readOnly && (
            <div className="mb-3 p-3 bg-surfaceLight rounded-lg border border-border">
              <div className="space-y-2">
                <Input
                  label="Label Name"
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="e.g., Bug, Feature"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateLabel();
                    }
                  }}
                />
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1.5 font-display">
                    Color
                  </label>
                  <div className="flex gap-2 overflow-x-auto py-1 pb-2 scrollbar-thin">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        className={`rounded-lg transition-all border-2 shrink-0 ${
                          newLabelColor === color ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color, width: '22.4px', height: '22.4px' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setIsCreatingLabel(false);
                    setNewLabelName('');
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {labels.map((label) => {
              const isEditing = editingLabelId === label.id;
              const isOwner = label.userId === user?.id;
              
              return (
                <div key={label.id} className="relative group">
                  {isEditing && isOwner ? (
                    <div className="flex items-center gap-1 p-1 bg-surfaceLight rounded-md border border-border">
                      <input
                        type="text"
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditLabel();
                          if (e.key === 'Escape') setEditingLabelId(null);
                        }}
                        className="text-xs px-2 py-1 bg-background border border-border rounded flex-1 min-w-[60px]"
                        autoFocus
                      />
                      <div className="flex gap-1 items-center">
                        <div className="flex gap-1 overflow-x-auto py-0.5 scrollbar-thin">
                          {LABEL_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditLabelColor(color)}
                            className={`rounded border-2 transition-all shrink-0 ${
                              editLabelColor === color ? 'border-white scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color, width: '14px', height: '14px' }}
                            data-tooltip="Select color"
                          />
                          ))}
                        </div>
                          <button
                            type="button"
                            onClick={handleSaveEditLabel}
                            className="text-xs px-1.5 py-0.5 bg-accent text-gray-800 rounded hover:opacity-90"
                          >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLabelId(null)}
                          className="text-xs px-1.5 py-0.5 bg-surfaceLight text-textMuted rounded hover:bg-border"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-all border-2 ${
                          selectedLabels.includes(label.id)
                            ? 'border-current'
                            : 'border-transparent hover:border-border/50'
                        } ${readOnly ? 'cursor-default opacity-70' : ''}`}
                        style={{
                          backgroundColor: selectedLabels.includes(label.id)
                            ? `${label.color}30`
                            : `${label.color}15`,
                          color: label.color,
                        }}
                        disabled={readOnly}
                      >
                        {label.name}
                      </button>
                      {!readOnly && isOwner && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditLabel(label)}
                            className="text-textMuted hover:text-accent p-0.5"
                            data-tooltip="Edit label"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLabel(label.id)}
                            className="text-textMuted hover:text-danger p-0.5"
                            data-tooltip="Delete label"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {labels.length === 0 && !isCreatingLabel && (
              <p className="text-xs text-textMuted italic">No labels yet. Create one to get started.</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input"
            disabled={readOnly}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          {!readOnly && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={isDeleting}
            >
              Delete
            </Button>
          )}
          <div className={`flex gap-2 ${!readOnly ? '' : 'w-full justify-end'}`}>
            <Button variant="ghost" onClick={onClose}>
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && <Button onClick={handleSave}>Save</Button>}
          </div>
        </div>
      </div>

      <IconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(selectedIcon) => setIcon(selectedIcon)}
        currentIcon={icon}
      />
    </Modal>
  );
}

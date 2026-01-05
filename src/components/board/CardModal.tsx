import { useState, useEffect } from 'react';
import type { Card as CardType, Label } from '../../types';
import { useBoardStore, useLabels } from '../../store/useBoardStore';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { IconPicker } from '../ui/IconPicker';
import { RichTextEditor } from '../ui/RichTextEditor';

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
  const [isDone, setIsDone] = useState(card.isDone || false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingLabelModal, setIsCreatingLabelModal] = useState(false);
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
    setIsDone(card.isDone || false);
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
      isDone,
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
    setIsCreatingLabelModal(false);
  };

  const handleStartEditLabel = (label: Label) => {
    setEditingLabelId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
    setIsCreatingLabelModal(false);
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-3 relative">
        {/* Done Status - Top Right */}
        <div className="absolute top-0 right-0">
          <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-xs font-medium text-textMuted font-display group-hover:text-text transition-colors">
              Done
            </span>
            <input
              type="checkbox"
              checked={isDone}
              onChange={(e) => !readOnly && setIsDone(e.target.checked)}
              disabled={readOnly}
              className="w-4 h-4 rounded border-2 border-border bg-background text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>

        {/* Title Section */}
        <div>
          <label className="block text-xs font-medium text-textMuted mb-1 font-display">
            Title
          </label>
          <div className="flex items-center gap-2">
            {icon && (
              <button
                type="button"
                onClick={() => !readOnly && setIsIconPickerOpen(true)}
                className="text-xl hover:scale-110 transition-transform flex-shrink-0"
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
              className="input flex-1 py-2 text-sm"
              placeholder="Card title..."
              disabled={readOnly}
            />
            {!icon && !readOnly && (
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(true)}
                className="px-2 py-2 text-textMuted hover:text-accent hover:bg-surfaceLight rounded-lg transition-colors flex-shrink-0"
                data-tooltip="Add icon"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Description Section - Limited Height */}
        <div>
          <label className="block text-xs font-medium text-textMuted mb-1 font-display">
            Description
          </label>
          <RichTextEditor
            value={description}
            onChange={(html) => setDescription(html)}
            placeholder="Add a description..."
            disabled={readOnly}
            className="max-h-[140px]"
          />
        </div>

        {/* Two Column Layout: Column and Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr] gap-3 items-start">
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1 font-display">
              Column
            </label>
            <select
              value={selectedColumnId}
              onChange={(e) => handleColumnChange(e.target.value)}
              className="input py-2 text-sm"
              disabled={readOnly || columns.length === 0}
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block h-full border-l border-border"></div>

          <div>
            <label className="block text-xs font-medium text-textMuted mb-1 font-display">
              Priority
            </label>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => !readOnly && setPriority(p.value)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all border-2 ${
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
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Two Column Layout: Labels and Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr] gap-3 items-start">
          {/* Labels Section */}
          <div className="min-w-0">
            <div className="relative mb-1">
              <label className="block text-xs font-medium text-textMuted font-display">
                Labels
              </label>
              {!readOnly && user && (
                <button
                  type="button"
                  onClick={() => setIsCreatingLabelModal(true)}
                  className="absolute top-0 right-0 text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  + New Label
                </button>
              )}
            </div>

            <div className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent items-center w-full">
              {labels.map((label) => {
                const isOwner = label.userId === user?.id;
                
                return (
                  <div key={label.id} className="relative group shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all border-2 ${
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
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 bg-surfaceDark rounded-md px-0.5 ml-[-24px]">
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
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {labels.length === 0 && (
                <p className="text-xs text-textMuted italic shrink-0">No labels yet. Create one to get started.</p>
              )}
            </div>
          </div>

          <div className="hidden sm:block h-full border-l border-border"></div>

          {/* Due Date Section */}
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1 font-display">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input py-2 text-sm"
              disabled={readOnly}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
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

      <Modal isOpen={isCreatingLabelModal} onClose={() => setIsCreatingLabelModal(false)} size="sm">
        <div className="space-y-3">
          <h3 className="text-sm font-medium font-display">Create New Label</h3>
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1 font-display">
              Label Name
            </label>
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="e.g., Bug, Feature"
              className="input py-2 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newLabelName.trim()) {
                  e.preventDefault();
                  handleCreateLabel();
                }
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1 font-display">
              Color
            </label>
            <div className="flex gap-1.5 overflow-x-auto py-1 pb-1.5 scrollbar-thin">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewLabelColor(color)}
                  className={`rounded-lg transition-all border-2 shrink-0 ${
                    newLabelColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color, width: '24px', height: '24px' }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreatingLabelModal(false);
                setNewLabelName('');
                setNewLabelColor(LABEL_COLORS[0]);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingLabelId} onClose={() => setEditingLabelId(null)} size="sm">
        <div className="space-y-3">
          <h3 className="text-sm font-medium font-display">Edit Label</h3>
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1 font-display">
              Label Name
            </label>
            <input
              type="text"
              value={editLabelName}
              onChange={(e) => setEditLabelName(e.target.value)}
              className="input py-2 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editLabelName.trim()) {
                  e.preventDefault();
                  handleSaveEditLabel();
                }
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-textMuted mb-1 font-display">
              Color
            </label>
            <div className="flex gap-1.5 overflow-x-auto py-1 pb-1.5 scrollbar-thin">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditLabelColor(color)}
                  className={`rounded-lg transition-all border-2 shrink-0 ${
                    editLabelColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color, width: '24px', height: '24px' }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-between">
            {editingLabelId && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (editingLabelId) {
                    handleDeleteLabel(editingLabelId);
                    setEditingLabelId(null);
                  }
                }}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingLabelId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditLabel}
                disabled={!editLabelName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}


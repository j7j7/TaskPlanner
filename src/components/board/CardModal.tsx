import { useState, useEffect } from 'react';
import type { Card as CardType, Label } from '../../types';
import { useBoardStore } from '../../store/useBoardStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardType;
  labels: Label[];
}

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
] as const;

export function CardModal({ isOpen, onClose, card, labels }: CardModalProps) {
  const { updateCard, deleteCard } = useBoardStore();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState<typeof card.priority>(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate || '');
  const [selectedLabels, setSelectedLabels] = useState<string[]>(card.labels);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setTitle(card.title);
      setDescription(card.description || '');
      setPriority(card.priority);
      setDueDate(card.dueDate || '');
      setSelectedLabels(card.labels);
    }, 0);
  }, [card]);

  const handleSave = async () => {
    if (!title.trim()) return;

    await updateCard(card.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      labels: selectedLabels,
    });
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteCard(card.id);
    onClose();
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Card" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Card title..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-1.5 font-display">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[100px] resize-y"
            placeholder="Add a description..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-2 font-display">
            Priority
          </label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                  priority === p.value
                    ? 'border-current'
                    : 'border-transparent hover:border-border'
                }`}
                style={{
                  backgroundColor: priority === p.value ? `${p.color}20` : 'transparent',
                  color: p.color,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-textMuted mb-2 font-display">
            Labels
          </label>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => toggleLabel(label.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all border-2 ${
                  selectedLabels.includes(label.id)
                    ? 'border-current'
                    : 'border-transparent hover:border-border/50'
                }`}
                style={{
                  backgroundColor: selectedLabels.includes(label.id)
                    ? `${label.color}30`
                    : `${label.color}15`,
                  color: label.color,
                }}
              >
                {label.name}
              </button>
            ))}
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
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            loading={isDeleting}
          >
            Delete Card
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

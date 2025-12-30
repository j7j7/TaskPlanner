import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Card as CardType, Label } from '../../types';
import { CardModal } from './CardModal';

interface CardProps {
  card: CardType;
  labels: Label[];
}

export function Card({ card, labels }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cardLabels = labels.filter((l) => card.labels.includes(l.id));

  const priorityColors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    urgent: '#ef4444',
  };

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`task-card group ${isDragging ? 'dragging' : ''}`}
        onClick={() => setIsModalOpen(true)}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: priorityColors[card.priority] }}
        />

        <div className="pl-3">
          <h4 className="font-medium text-text text-sm mb-2 leading-snug">
            {card.title}
          </h4>

          {card.description && (
            <p className="text-xs text-textMuted mb-2 line-clamp-2">
              {card.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {cardLabels.map((label) => (
                <span
                  key={label.id}
                  className="label text-[10px]"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    border: `1px solid ${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            {card.dueDate && (
              <span className="text-[10px] text-textMuted font-mono bg-surface px-1.5 py-0.5 rounded">
                {new Date(card.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <CardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        card={card}
        labels={labels}
      />
    </>
  );
}

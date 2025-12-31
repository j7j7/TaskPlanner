import { useState } from 'react';
import { Modal } from './Modal';

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (icon: string) => void;
  currentIcon?: string;
}

const ICON_CATEGORIES = [
  {
    name: 'Common',
    icons: ['📋', '📝', '✅', '⭐', '🔥', '💡', '🎯', '🚀', '⚡', '💎', '🎨', '📊'],
  },
  {
    name: 'Tasks',
    icons: ['✓', '☑', '☐', '📌', '📍', '📎', '📄', '📑', '📃', '📋', '📝', '✏️'],
  },
  {
    name: 'Status',
    icons: ['🟢', '🟡', '🟠', '🔴', '⚪', '⚫', '🔵', '🟣', '🟤', '⏸️', '▶️', '⏹️'],
  },
  {
    name: 'Communication',
    icons: ['💬', '📧', '📞', '📱', '📲', '🔔', '🔕', '📢', '📣', '📯', '📮', '✉️'],
  },
  {
    name: 'Files & Folders',
    icons: ['📁', '📂', '📀', '💿', '💾', '📼', '📷', '📹', '🎬', '🎥', '📺', '📻'],
  },
  {
    name: 'Time',
    icons: ['⏰', '⏱️', '⏲️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘'],
  },
  {
    name: 'Symbols',
    icons: ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓'],
  },
  {
    name: 'Objects',
    icons: ['🔑', '💼', '🎒', '👜', '👛', '🛍️', '🛒', '🛎️', '🏮', '🎁', '🎀', '🎊'],
  },
  {
    name: 'Nature',
    icons: ['🌱', '🌿', '🍀', '🌾', '🌷', '🌹', '🌺', '🌻', '🌼', '🌸', '🌲', '🌳'],
  },
  {
    name: 'Food',
    icons: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍'],
  },
  {
    name: 'Activities',
    icons: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒'],
  },
  {
    name: 'Travel',
    icons: ['✈️', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝'],
  },
  {
    name: 'Tech',
    icons: ['💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📱', '📟'],
  },
  {
    name: 'Emotions',
    icons: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊'],
  },
  {
    name: 'Hands',
    icons: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇'],
  },
];

export function IconPicker({ isOpen, onClose, onSelect, currentIcon }: IconPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(ICON_CATEGORIES[0].name);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectIcon = (icon: string) => {
    onSelect(icon);
    onClose();
  };

  const handleRemoveIcon = () => {
    onSelect('');
    onClose();
  };

  const filteredCategories = ICON_CATEGORIES.map((category) => {
    if (!searchQuery) return category;
    
    const filteredIcons = category.icons.filter((icon) =>
      icon.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return {
      ...category,
      icons: filteredIcons,
    };
  }).filter((category) => category.icons.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Icon" size="lg">
      <div className="space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icons..."
            className="input w-full"
            autoFocus
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {ICON_CATEGORIES.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.name
                  ? 'bg-accent text-gray-800'
                  : 'bg-surfaceLight text-textMuted hover:bg-border'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Current Icon Display */}
        {currentIcon && (
          <div className="flex items-center justify-between p-3 bg-surfaceLight rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentIcon}</span>
              <span className="text-sm text-textMuted">Current icon</span>
            </div>
            <button
              onClick={handleRemoveIcon}
              className="text-xs text-danger hover:text-danger/80 transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {/* Icons Grid */}
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
          {filteredCategories
            .filter((category) => selectedCategory === category.name || searchQuery)
            .map((category) => (
              <div key={category.name} className="mb-6">
                <h3 className="text-xs font-semibold text-textMuted mb-2 uppercase tracking-wider">
                  {category.name}
                </h3>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                  {category.icons.map((icon, index) => (
                    <button
                      key={`${category.name}-${index}`}
                      onClick={() => handleSelectIcon(icon)}
                      className={`aspect-square flex items-center justify-center text-2xl rounded-lg transition-all hover:scale-110 hover:bg-surfaceLight border-2 ${
                        currentIcon === icon
                          ? 'border-accent bg-accent/10'
                          : 'border-transparent hover:border-border'
                      }`}
                      data-tooltip={icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* No Results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-textMuted">
            <p>No icons found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </Modal>
  );
}


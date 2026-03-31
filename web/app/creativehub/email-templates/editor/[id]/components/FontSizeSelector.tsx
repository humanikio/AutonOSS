'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

interface FontSizeSelectorProps {
  currentSize?: string;
  onChange: (size: string) => void;
  maxHeight?: number;
}

export default function FontSizeSelector({
  currentSize = '16px',
  onChange,
  maxHeight
}: FontSizeSelectorProps) {
  const [customSize, setCustomSize] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Extract numeric value from current size
  const getCurrentSizeValue = () => {
    const match = currentSize?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 16;
  };

  const currentValue = getCurrentSizeValue();

  // Preset font sizes (email-safe)
  const presetSizes = [
    { label: 'Tiny', value: 10 },
    { label: 'Small', value: 12 },
    { label: 'Normal', value: 14 },
    { label: 'Medium', value: 16 },
    { label: 'Large', value: 18 },
    { label: 'X-Large', value: 20 },
    { label: 'XX-Large', value: 24 },
    { label: 'Huge', value: 28 },
    { label: 'Giant', value: 32 },
    { label: 'Massive', value: 36 },
  ];

  const handleSizeChange = (size: number) => {
    onChange(`${size}px`);
  };

  const handleCustomSize = () => {
    const size = parseInt(customSize);
    if (!isNaN(size) && size > 0 && size <= 200) {
      onChange(`${size}px`);
      setShowCustomInput(false);
      setCustomSize('');
    }
  };

  const containerStyle = maxHeight
    ? { maxHeight: `${maxHeight}px` }
    : { maxHeight: '85vh' };

  return (
    <div
      className="bg-white border border-gray-300 rounded-lg shadow-xl w-[220px] flex flex-col"
      style={containerStyle}
    >
      {/* Preset Sizes */}
      <div className="p-2 overflow-y-auto flex-1">
        <div className="text-xs font-semibold text-gray-500 px-2 py-1.5 mb-1">
          Preset Sizes
        </div>
        {presetSizes.map((size) => (
          <button
            key={size.value}
            onClick={() => handleSizeChange(size.value)}
            className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-md transition-colors text-sm ${
              currentValue === size.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
            }`}
          >
            <span>{size.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">{size.value}px</span>
              {currentValue === size.value && (
                <Check className="h-4 w-4 text-primary-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 flex-shrink-0" />

      {/* Custom Size Input */}
      <div className="p-2 flex-shrink-0">
        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-md transition-colors"
          >
            Custom Size...
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomSize();
                  } else if (e.key === 'Escape') {
                    setShowCustomInput(false);
                    setCustomSize('');
                  }
                }}
                placeholder="16"
                min="1"
                max="200"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                autoFocus
              />
              <span className="text-sm text-gray-500 font-mono">px</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCustomSize}
                className="flex-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomSize('');
                }}
                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

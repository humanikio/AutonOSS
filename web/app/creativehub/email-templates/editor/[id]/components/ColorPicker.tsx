'use client';

import { useState } from 'react';
import { Type, PaintBucket } from 'lucide-react';

interface ColorPickerProps {
  currentTextColor?: string;
  currentBackgroundColor?: string;
  onChange: (color: string, type: 'text' | 'background') => void;
  onClose: () => void;
  maxHeight?: number;
}

export default function ColorPicker({
  currentTextColor = '#000000',
  currentBackgroundColor = 'transparent',
  onChange,
  onClose,
  maxHeight
}: ColorPickerProps) {
  const [colorType, setColorType] = useState<'text' | 'background'>('text');

  // Convert RGB to hex
  const rgbToHex = (rgb: string): string => {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';

    const result = rgb.match(/\d+/g);
    if (!result) return '#000000';

    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);

    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // Get the current color in hex format
  const getCurrentColor = () => {
    if (colorType === 'text') {
      return rgbToHex(currentTextColor);
    } else {
      return rgbToHex(currentBackgroundColor);
    }
  };

  // Common email-safe colors
  const presetColors = [
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Green', value: '#10B981' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Gray', value: '#6B7280' },
    { name: 'Dark', value: '#1F2937' },
  ];

  const handleColorChange = (color: string) => {
    onChange(color, colorType);
  };

  const containerStyle = maxHeight
    ? { maxHeight: `${maxHeight}px` }
    : { maxHeight: '85vh' };

  return (
    <div
      className="bg-white border border-gray-300 rounded-lg shadow-xl w-[280px] overflow-y-auto flex flex-col"
      style={containerStyle}
    >
      <div className="p-4 flex-shrink-0">
      {/* Color Type Toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setColorType('text')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            colorType === 'text'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Type className="h-4 w-4" />
          Text
        </button>
        <button
          onClick={() => setColorType('background')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            colorType === 'background'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <PaintBucket className="h-4 w-4" />
          Background
        </button>
      </div>

      {/* Current Color Display */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Current Color
        </label>
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded border-2 border-gray-300"
            style={{ backgroundColor: getCurrentColor() }}
          />
          <input
            type="color"
            value={getCurrentColor()}
            onChange={(e) => handleColorChange(e.target.value)}
            className="flex-1 h-10 rounded border border-gray-300 cursor-pointer"
          />
        </div>
      </div>

      {/* Hex Input */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Hex Code
        </label>
        <input
          type="text"
          value={getCurrentColor()}
          onChange={(e) => {
            const hex = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(hex)) {
              handleColorChange(hex);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
          placeholder="#000000"
        />
      </div>

      {/* Preset Colors */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Quick Colors
        </label>
        <div className="grid grid-cols-6 gap-2">
          {presetColors.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorChange(color.value)}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-primary-500 transition-colors"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Transparent Option for Background */}
      {colorType === 'background' && (
        <div className="mt-3">
          <button
            onClick={() => handleColorChange('transparent')}
            className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
          >
            Remove Background
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

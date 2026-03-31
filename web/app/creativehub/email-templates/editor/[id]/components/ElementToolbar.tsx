'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Palette, Type, X, ChevronDown } from 'lucide-react';
import ColorPicker from './ColorPicker';
import FontSizeSelector from './FontSizeSelector';

interface ElementToolbarProps {
  selectedElement: HTMLElement | null;
  position: { x: number; y: number; placement: 'above' | 'below'; scrollKey: number };
  onDelete: () => void;
  onColorChange: (color: string, type: 'text' | 'background') => void;
  onFontSizeChange: (size: string) => void;
  onStyleChange: (property: string, value: string) => void;
  onClose: () => void;
}

export default function ElementToolbar({
  selectedElement,
  position,
  onDelete,
  onColorChange,
  onFontSizeChange,
  onStyleChange,
  onClose
}: ElementToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(100);

  // Measure toolbar height
  useEffect(() => {
    if (toolbarRef.current) {
      setToolbarHeight(toolbarRef.current.offsetHeight);
    }
  }, [selectedElement]);

  if (!selectedElement) return null;

  // Get current styles
  const computedStyle = window.getComputedStyle(selectedElement);
  const currentTextColor = selectedElement.style.color || computedStyle.color;
  const currentBgColor = selectedElement.style.backgroundColor || computedStyle.backgroundColor;
  const currentFontSize = selectedElement.style.fontSize || computedStyle.fontSize;

  // Get element info for display
  const elementTag = selectedElement.tagName.toLowerCase();
  const elementText = selectedElement.textContent?.substring(0, 30) || '';

  // Calculate transform based on placement
  const getToolbarTransform = () => {
    if (position.placement === 'above') {
      return 'translateY(-100%) translateY(-8px)';
    } else {
      return 'translateY(0)';
    }
  };

  // Calculate dropdown position to ensure it doesn't go off-screen
  const getDropdownStyle = (horizontalOffset: number = 0) => {
    const dropdownMaxHeight = 450;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let left = position.x + horizontalOffset;

    // Determine vertical positioning relative to toolbar
    let top: number;
    let spaceBelow: number;
    let spaceAbove: number;
    let calculatedMaxHeight = dropdownMaxHeight;

    if (position.placement === 'above') {
      // Toolbar is positioned ABOVE the element (with transform translateY(-100%))
      // So the toolbar's BOTTOM edge is at position.y
      // The toolbar's TOP edge is at position.y - toolbarHeight
      const toolbarTop = position.y - toolbarHeight - 8; // -8 for the translateY(-8px) offset
      const toolbarBottom = position.y;

      spaceBelow = viewportHeight - toolbarBottom;
      spaceAbove = toolbarTop;

      // Prefer placing dropdown BELOW the toolbar (below position.y)
      if (spaceBelow >= Math.min(dropdownMaxHeight, 300)) {
        // Enough space below - place dropdown below toolbar's bottom edge
        top = toolbarBottom + 8;
      } else if (spaceAbove >= Math.min(dropdownMaxHeight, 300)) {
        // Not enough space below, but enough above - place above toolbar's top edge
        top = Math.max(20, toolbarTop - Math.min(dropdownMaxHeight, spaceAbove));
      } else {
        // Limited space - place below and constrain height
        top = Math.max(20, toolbarBottom + 8);
      }
    } else {
      // Toolbar is positioned BELOW the element (no negative transform)
      // Toolbar's top edge is at position.y
      const toolbarBottom = position.y + toolbarHeight;

      spaceBelow = viewportHeight - toolbarBottom;
      spaceAbove = position.y;

      // Prefer placing dropdown BELOW the toolbar
      if (spaceBelow >= Math.min(dropdownMaxHeight, 300)) {
        // Place below toolbar
        top = toolbarBottom + 8;
      } else if (spaceAbove >= Math.min(dropdownMaxHeight, 300)) {
        // Place above toolbar
        top = Math.max(20, position.y - Math.min(dropdownMaxHeight, spaceAbove));
      } else {
        // Default to below with constrained height
        top = Math.max(20, toolbarBottom + 8);
      }
    }

    // Calculate available space from calculated top position
    const availableSpaceBelow = viewportHeight - top - 40; // 40px margin
    const availableSpaceTotal = viewportHeight - 40; // Total available with margins

    // Constrain maxHeight to available space
    calculatedMaxHeight = Math.min(dropdownMaxHeight, availableSpaceBelow);

    // Ensure dropdown doesn't go off bottom of viewport
    if (top + calculatedMaxHeight > viewportHeight - 20) {
      top = Math.max(20, viewportHeight - calculatedMaxHeight - 20);
      // Recalculate max height based on new position
      calculatedMaxHeight = Math.min(calculatedMaxHeight, viewportHeight - top - 20);
    }

    // Ensure dropdown doesn't go off top of viewport
    if (top < 20) {
      const adjustment = 20 - top;
      top = 20;
      // Adjust height if we had to move it down
      calculatedMaxHeight = Math.max(200, calculatedMaxHeight - adjustment);
    }

    // Ensure minimum height
    calculatedMaxHeight = Math.max(250, Math.min(calculatedMaxHeight, availableSpaceTotal));

    // Check horizontal boundaries
    if (left + 280 > viewportWidth) {
      left = viewportWidth - 290; // 280px width + 10px margin
    }
    if (left < 10) {
      left = 10;
    }

    return { top, left, maxHeight: calculatedMaxHeight };
  };

  return (
    <>
      {/* Toolbar */}
      <div
        ref={toolbarRef}
        className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: getToolbarTransform()
        }}
      >
        {/* Element Info Bar */}
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 rounded-t-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-semibold text-primary-600">&lt;{elementTag}&gt;</span>
            {elementText && (
              <span className="text-gray-500 truncate max-w-[150px]">
                {elementText.length > 30 ? `${elementText}...` : elementText}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            title="Close (Esc)"
          >
            <X className="h-3 w-3 text-gray-500" />
          </button>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1 p-2">
          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-red-50 rounded-md transition-colors group text-sm font-medium text-gray-700 hover:text-red-600"
            title="Delete element"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>

          {/* Color Picker Button */}
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowFontSelector(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 hover:bg-purple-50 rounded-md transition-colors text-sm font-medium ${
              showColorPicker ? 'bg-purple-50 text-purple-600' : 'text-gray-700'
            }`}
            title="Change colors"
          >
            <Palette className="h-4 w-4" />
            <span>Color</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* Font Size Button */}
          <button
            onClick={() => {
              setShowFontSelector(!showFontSelector);
              setShowColorPicker(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium ${
              showFontSelector ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
            }`}
            title="Change font size"
          >
            <Type className="h-4 w-4" />
            <span>Font</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Color Picker Dropdown */}
      {showColorPicker && (() => {
        const dropdownPos = getDropdownStyle(0);
        return (
          <div
            key={`color-picker-${position.scrollKey}`}
            className="fixed z-[10000]"
            style={{
              left: `${dropdownPos.left}px`,
              top: `${dropdownPos.top}px`
            }}
          >
            <ColorPicker
              currentTextColor={currentTextColor}
              currentBackgroundColor={currentBgColor}
              onChange={onColorChange}
              onClose={() => setShowColorPicker(false)}
              maxHeight={dropdownPos.maxHeight}
            />
          </div>
        );
      })()}

      {/* Font Size Selector Dropdown */}
      {showFontSelector && (() => {
        const dropdownPos = getDropdownStyle(130);
        return (
          <div
            key={`font-selector-${position.scrollKey}`}
            className="fixed z-[10000]"
            style={{
              left: `${dropdownPos.left}px`,
              top: `${dropdownPos.top}px`
            }}
          >
            <FontSizeSelector
              currentSize={currentFontSize}
              onChange={(size) => {
                onFontSizeChange(size);
                setShowFontSelector(false);
              }}
              maxHeight={dropdownPos.maxHeight}
            />
          </div>
        );
      })()}
    </>
  );
}

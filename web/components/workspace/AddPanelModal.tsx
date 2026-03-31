/**
 * AddPanelModal
 *
 * Modal for selecting and adding new panels to the workspace.
 * Shows all available panel types from the registry.
 */

'use client';

import { X } from 'lucide-react';
import { PanelType } from '@/types/workspace/panel.types';
import { getAllPanelTypes } from './panels/panelRegistry';

interface AddPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPanel: (panelType: PanelType) => void;
}

export default function AddPanelModal({
  isOpen,
  onClose,
  onSelectPanel
}: AddPanelModalProps) {
  if (!isOpen) return null;

  const panelTypes = getAllPanelTypes();

  const handlePanelSelect = (panelType: PanelType) => {
    onSelectPanel(panelType);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Panel</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Panel Type Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {panelTypes.map((panelType) => (
              <button
                key={panelType.type}
                onClick={() => handlePanelSelect(panelType.type)}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-600 hover:bg-gray-50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
                  <span className="text-sm font-bold text-gray-600">{panelType.icon}</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">
                  {panelType.label}
                </h3>
                <p className="text-sm text-gray-600">
                  {panelType.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

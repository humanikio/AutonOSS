/**
 * ToolsPanel
 *
 * Displays available tools for agents.
 * Placeholder for now - will be expanded later.
 */

'use client';

import { Wrench } from 'lucide-react';
import { BasePanelProps, ToolsPanelConfig } from '@/types/workspace/panel.types';
import PanelContainer from './PanelContainer';

interface ToolsPanelProps extends BasePanelProps {
  config: ToolsPanelConfig;
}

export default function ToolsPanel({
  panelId,
  config,
  onClose
}: ToolsPanelProps) {
  return (
    <PanelContainer
      panelId={panelId}
      title={config.title || 'Tools'}
      onClose={onClose}
    >
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Wrench className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 font-medium">Tools Panel</p>
          <p className="text-xs text-gray-500 mt-1">Coming soon</p>
        </div>
      </div>
    </PanelContainer>
  );
}

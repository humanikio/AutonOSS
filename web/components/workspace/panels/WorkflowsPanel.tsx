/**
 * WorkflowsPanel
 *
 * Workflow builder/viewer panel.
 * Placeholder for now - will be expanded later.
 */

'use client';

import { Zap } from 'lucide-react';
import { BasePanelProps, WorkflowsPanelConfig } from '@/types/workspace/panel.types';
import PanelContainer from './PanelContainer';

interface WorkflowsPanelProps extends BasePanelProps {
  config: WorkflowsPanelConfig;
}

export default function WorkflowsPanel({
  panelId,
  config,
  onClose
}: WorkflowsPanelProps) {
  return (
    <PanelContainer
      panelId={panelId}
      title={config.title || 'Workflows'}
      onClose={onClose}
    >
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Zap className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 font-medium">Workflows Panel</p>
          <p className="text-xs text-gray-500 mt-1">Coming soon</p>
        </div>
      </div>
    </PanelContainer>
  );
}

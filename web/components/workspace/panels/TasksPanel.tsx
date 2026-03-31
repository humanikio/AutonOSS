/**
 * TasksPanel
 *
 * Simple task/todo list panel.
 * Shows recent tasks and their status.
 */

'use client';

import { Check, Clock, Circle } from 'lucide-react';
import { BasePanelProps, TasksPanelConfig } from '@/types/workspace/panel.types';
import PanelContainer from './PanelContainer';

interface TasksPanelProps extends BasePanelProps {
  config: TasksPanelConfig;
}

// Mock tasks - TODO: Replace with real data
const MOCK_TASKS = [
  { id: '1', title: 'Follow up with lead', status: 'completed', time: '2h ago' },
  { id: '2', title: 'Review proposal', status: 'in_progress', time: 'Now' },
  { id: '3', title: 'Schedule demo call', status: 'pending', time: 'Today' },
  { id: '4', title: 'Update CRM records', status: 'pending', time: 'Tomorrow' }
];

export default function TasksPanel({
  panelId,
  config,
  onClose
}: TasksPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <PanelContainer
      panelId={panelId}
      title={config.title || 'Tasks'}
      onClose={onClose}
    >
      <div className="p-3 space-y-1">
        {MOCK_TASKS.map((task) => (
          <div
            key={task.id}
            className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            <div className="pt-0.5">
              {getStatusIcon(task.status)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${
                task.status === 'completed'
                  ? 'text-gray-500 line-through'
                  : 'text-gray-900'
              }`}>
                {task.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{task.time}</p>
            </div>
          </div>
        ))}

        <button className="w-full mt-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
          + Add task
        </button>
      </div>
    </PanelContainer>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Clock, AlignLeft, CheckSquare, Trash2 } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '@/lib/api/tasks';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  task: Task | null;
}

export default function EditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  task
}: EditTaskModalProps) {
  const [updating, setUpdating] = useState(false);
  const [isEditingFull, setIsEditingFull] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'todo' as TaskStatus,
    startDate: '',
    estimatedDuration: 0,
    dueDate: '',
    dueTime: ''
  });

  useEffect(() => {
    if (isOpen && task) {
      // Parse dates to YYYY-MM-DD format for date inputs
      let startDateStr = '';
      if (task.startDate) {
        const startDate = new Date(task.startDate);
        startDateStr = startDate.toISOString().split('T')[0];
      } else if (task.dueTime) {
        // If no startDate but dueTime exists, use dueTime as the scheduled start
        const dt = new Date(task.dueTime);
        startDateStr = dt.toISOString().split('T')[0];
      }

      let dueDateStr = '';
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDateStr = dueDate.toISOString().split('T')[0];
      }

      // Parse dueTime to HH:MM format for time input
      let dueTimeStr = '';
      if (task.dueTime) {
        // Check if it's an ISO timestamp or already in HH:MM format
        if (task.dueTime.includes('T') || task.dueTime.includes('Z')) {
          const dt = new Date(task.dueTime);
          dueTimeStr = dt.toISOString().substring(11, 16); // Extract HH:MM
        } else {
          dueTimeStr = task.dueTime;
        }
      }

      setFormData({
        taskName: task.taskName,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        startDate: startDateStr,
        estimatedDuration: task.estimatedDuration || 0,
        dueDate: dueDateStr,
        dueTime: dueTimeStr
      });
      setIsEditingFull(false);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taskName?.trim()) {
      alert('Task name is required');
      return;
    }

    try {
      setUpdating(true);

      const updates: Partial<Task> = {
        taskName: formData.taskName,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        startDate: formData.startDate || undefined,
        estimatedDuration: formData.estimatedDuration || undefined,
        dueDate: formData.dueDate || undefined,
        dueTime: formData.dueTime || undefined
      };

      await onSubmit(task.taskId, updates);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !task) return;

    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task.taskId);
        onClose();
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
      }
    }
  };

  const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' }
  ];

  const statuses: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-700' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
    { value: 'blocked', label: 'Blocked', color: 'bg-orange-100 text-orange-700' }
  ];

  // Quick view
  if (!isEditingFull) {
    return (
      <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] max-w-md w-full">
          {/* Header with actions */}
          <div className="flex items-center justify-end gap-2 p-3 border-b border-gray-100">
            <button
              onClick={() => setIsEditingFull(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Task name and status */}
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-xl font-normal text-gray-900 mb-2">
                  {task.taskName}
                </h2>
                <div className="flex gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    statuses.find(s => s.value === task.status)?.color
                  }`}>
                    {statuses.find(s => s.value === task.status)?.label}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    priorities.find(p => p.value === task.priority)?.color
                  }`}>
                    {priorities.find(p => p.value === task.priority)?.label} Priority
                  </span>
                </div>
              </div>
            </div>

            {/* Scheduled time and duration */}
            {(task.startDate || task.dueTime) && (
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <div>
                    {(() => {
                      const startDt = new Date(task.startDate || task.dueTime!);
                      const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startDt.getUTCDay()];
                      const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][startDt.getUTCMonth()];
                      const day = startDt.getUTCDate();
                      const year = startDt.getUTCFullYear();
                      const hour = startDt.getUTCHours() % 12 || 12;
                      const ampm = startDt.getUTCHours() >= 12 ? 'PM' : 'AM';
                      const minute = String(startDt.getUTCMinutes()).padStart(2, '0');
                      const dateStr = `${weekday}, ${month} ${day}, ${year}`;
                      const timeStr = `${hour}:${minute} ${ampm}`;

                      // Calculate end time if duration exists
                      if (task.estimatedDuration) {
                        const endDt = new Date(startDt.getTime() + task.estimatedDuration * 60000);
                        const endHour = endDt.getUTCHours() % 12 || 12;
                        const endAmpm = endDt.getUTCHours() >= 12 ? 'PM' : 'AM';
                        const endMinute = String(endDt.getUTCMinutes()).padStart(2, '0');
                        const endTimeStr = `${endHour}:${endMinute} ${endAmpm}`;
                        return `${dateStr} from ${timeStr} to ${endTimeStr}`;
                      }

                      return `${dateStr} at ${timeStr}`;
                    })()}
                  </div>
                  {task.estimatedDuration && (
                    <div className="text-gray-600 mt-1">
                      Duration: {task.estimatedDuration} minutes
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <AlignLeft className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>{task.description}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full edit form
  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-w-2xl w-full max-h-[90vh]">
        {/* Header - Sticky */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-2xl font-light text-gray-900">Edit Task</h2>
          <button
            onClick={() => setIsEditingFull(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name *
              </label>
              <input
                type="text"
                required
                value={formData.taskName}
                onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task details..."
                rows={3}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {priorities.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: priority.value })}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      formData.priority === priority.value
                        ? 'ring-2 ring-blue-500 ' + priority.color
                        : priority.color + ' opacity-60 hover:opacity-100'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {statuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: status.value })}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      formData.status === status.value
                        ? 'ring-2 ring-blue-500 ' + status.color
                        : status.color + ' opacity-60 hover:opacity-100'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                step="15"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Duration in minutes"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Due Time (only if due date is set) */}
            {formData.dueDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Time
                </label>
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Submit Buttons - Sticky */}
          <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => setIsEditingFull(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-light"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !formData.taskName?.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : 'Update Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

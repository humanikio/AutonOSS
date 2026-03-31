'use client';

import { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar as CalendarIcon, Clock, AlignLeft, Flag } from 'lucide-react';
import { CreateTaskRequest, TaskPriority, TaskStatus } from '@/lib/api/tasks';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskRequest) => Promise<void>;
  selectedDate?: Date;
  clickPosition?: { x: number; y: number } | null;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  clickPosition
}: CreateTaskModalProps) {
  const [creating, setCreating] = useState(false);
  const [hasDueDate, setHasDueDate] = useState(true);
  const [hasDueTime, setHasDueTime] = useState(false);
  const [formData, setFormData] = useState<CreateTaskRequest>({
    taskName: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
    dueTime: '',
    tags: []
  });

  // Update form data when modal opens or selectedDate changes
  useEffect(() => {
    if (isOpen) {
      let startDateTime: Date;

      if (!selectedDate) {
        startDateTime = new Date();
        startDateTime.setSeconds(0);
        startDateTime.setMilliseconds(0);
      } else {
        // Use selectedDate directly - it's already a Date object with correct time
        startDateTime = selectedDate;
      }

      setFormData({
        taskName: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        dueDate: formatDateLocal(startDateTime),
        dueTime: formatTimeLocal(startDateTime), // Set the clicked time as default
        tags: []
      });
      setHasDueDate(!!selectedDate);
      setHasDueTime(!!selectedDate); // Enable time if a specific slot was clicked
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatTimeLocal(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taskName.trim()) {
      alert('Task name is required');
      return;
    }

    try {
      setCreating(true);

      // Helper to parse local date/time without timezone conversion
      const parseLocalDate = (dateString: string): string => {
        const [year, month, day] = dateString.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        return utcDate.toISOString();
      };

      const parseLocalDateTime = (dateString: string, timeString: string): string => {
        const [year, month, day] = dateString.split('-').map(Number);
        const [hours, minutes] = timeString.split(':').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
        return utcDate.toISOString();
      };

      console.log('Form data:', formData);
      console.log('Has due date:', hasDueDate);
      console.log('Has due time:', hasDueTime);

      const taskData: CreateTaskRequest = {
        ...formData,
        dueDate: hasDueDate && formData.dueDate ? parseLocalDate(formData.dueDate) : undefined,
        dueTime: hasDueTime && formData.dueTime && hasDueDate && formData.dueDate
          ? parseLocalDateTime(formData.dueDate, formData.dueTime)
          : undefined
      };

      console.log('Task data before cleanup:', taskData);

      // Remove empty fields
      if (!taskData.dueDate) delete taskData.dueDate;
      if (!taskData.dueTime) delete taskData.dueTime;
      if (!taskData.description) delete taskData.description;

      console.log('Submitting task data:', taskData);
      await onSubmit(taskData);
      console.log('Task created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' }
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal */}
      <div
        className="backdrop-blur-xl bg-white/95 border border-white/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50/95 to-blue-100/95 border-b border-blue-200/50 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-medium text-gray-900">Create Task</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Name *
            </label>
            <input
              type="text"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <AlignLeft className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Add description (optional)"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Flag className="w-4 h-4" />
              Priority
            </label>
            <div className="flex gap-2">
              {priorities.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: priority.value })}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    formData.priority === priority.value
                      ? `${priority.color} ring-2 ring-blue-500`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasDueDate"
              checked={hasDueDate}
              onChange={(e) => {
                setHasDueDate(e.target.checked);
                if (!e.target.checked) setHasDueTime(false);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="hasDueDate" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              Set due date
            </label>
          </div>

          {/* Due Date */}
          {hasDueDate && (
            <div className="space-y-3">
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Due Time Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasDueTime"
                  checked={hasDueTime}
                  onChange={(e) => setHasDueTime(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="hasDueTime" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Set due time
                </label>
              </div>

              {/* Due Time */}
              {hasDueTime && (
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          )}
          </div>

          {/* Action Buttons - Sticky */}
          <div className="flex gap-2 p-6 pt-4 border-t border-blue-200/50 flex-shrink-0 bg-white/95">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

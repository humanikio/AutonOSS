'use client';

import { Plus } from 'lucide-react';
import { CalendarEvent } from '@/lib/api/events';
import { Task } from '@/lib/api/tasks';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: Task[];
  highlightedDate: Date | null;
  onDayClick: (date: Date, clickEvent: React.MouseEvent) => void;
  onEventClick: (event: CalendarEvent, clickEvent: React.MouseEvent) => void;
  onTaskClick?: (task: Task, clickEvent: React.MouseEvent) => void;
  getEventsForDay: (day: number, month?: number, year?: number) => CalendarEvent[];
}

export default function MonthView({
  currentDate,
  events,
  tasks,
  highlightedDate,
  onDayClick,
  onEventClick,
  onTaskClick,
  getEventsForDay
}: MonthViewProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const days = [];

  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(
      <div key={`empty-${i}`} className="h-[90px] backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl p-2">
      </div>
    );
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday =
      day === new Date().getDate() &&
      currentDate.getMonth() === new Date().getMonth() &&
      currentDate.getFullYear() === new Date().getFullYear();

    const dayEvents = getEventsForDay(day);
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    // Get tasks for this day
    const dayTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      // Use UTC methods since we stored dates as UTC
      return (
        taskDate.getUTCDate() === day &&
        taskDate.getUTCMonth() === currentDate.getMonth() &&
        taskDate.getUTCFullYear() === currentDate.getFullYear()
      );
    });

    const isHighlighted = highlightedDate &&
      day === highlightedDate.getDate() &&
      currentDate.getMonth() === highlightedDate.getMonth() &&
      currentDate.getFullYear() === highlightedDate.getFullYear();

    days.push(
      <div
        key={day}
        className={`h-[90px] backdrop-blur-xl bg-white/40 border rounded-xl p-2 hover:bg-white/60 transition-all duration-300 cursor-pointer group ${
          isToday ? 'ring-2 ring-blue-400' : ''
        } ${
          isHighlighted ? 'ring-2 ring-gray-400 bg-gray-50 border-gray-400 shadow-sm' : 'border-white/50'
        }`}
        onClick={(e) => onDayClick(dayDate, e)}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-sm font-light ${
              isToday
                ? 'flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full font-medium'
                : 'text-gray-700'
            }`}
          >
            {day}
          </span>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(dayDate, e);
            }}
          >
            <Plus className="h-3 w-3 text-blue-600" />
          </button>
        </div>

        <div className="space-y-1">
          {dayEvents.slice(0, 1).map((event) => {
            const isCompleted = event.status === 'completed';
            return (
              <div
                key={event.eventId}
                className={`text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  isCompleted ? 'opacity-50 line-through' : ''
                }`}
                style={{ backgroundColor: event.color || '#3B82F6' }}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event, e);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    onEventClick(event, e as any);
                  }
                }}
              >
                <span className="truncate text-[10px]">{event.eventName}</span>
              </div>
            );
          })}
          {dayTasks.slice(0, 1).map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
            return (
              <div
                key={task.taskId}
                className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer border-l-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  isCompleted ? 'opacity-50 bg-gray-100 border-gray-400' :
                  isOverdue ? 'bg-red-50 border-red-500 text-red-800' :
                  'bg-blue-50 border-blue-500 text-blue-800'
                } ${isCompleted ? 'line-through' : ''}`}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTaskClick) {
                    onTaskClick(task, e);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onTaskClick) {
                    e.stopPropagation();
                    onTaskClick(task, e as any);
                  }
                }}
              >
                <span className="truncate text-[10px]">📋 {task.taskName}</span>
              </div>
            );
          })}
          {(dayEvents.length + dayTasks.length) > 2 && (
            <div className="text-[10px] text-gray-600 px-1.5">
              +{(dayEvents.length + dayTasks.length) - 2} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/50 border border-white/50 rounded-2xl p-6 shadow-xl">
      {/* Day Names */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid gap-2 grid-cols-7">
        {days}
      </div>
    </div>
  );
}
